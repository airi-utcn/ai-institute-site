import fs from "fs-extra";
import path from "path";
import { parse } from "csv-parse/sync";
import fetch from "node-fetch";

// Config


// Platform link builders
const PLATFORM_LINK_BUILDERS = {
  wos: (id) => `https://www.webofscience.com/wos/author/record/${id}`,
  scopus: (id) => `https://www.scopus.com/authid/detail.uri?authorId=${id}`,
  scholar: (id) => `https://scholar.google.com/citations?user=${id}`,
  erih: (id) => `https://kanalregister.hkdir.no/publiseringskanaler/erihplus/person/${id}`,
};


async function login() {
  const res = await fetch(`${STRAPI_URL}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const data = await res.json();
  return data.data.token;
}

function readCsv() {
  const file = fs.readFileSync(CSV_PATH, "utf-8");
  return parse(file, { 
    columns: true, 
    skip_empty_lines: true, 
    delimiter: "\t", // Ensure this matches your CSV format
    relax_column_count: true,
  });
}

function normalizeName(name) {
  if (!name) return "";
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function buildLinks(row) {
  const links = [];
  if (row["WOS ResearcherID"]) {
    const id = row["WOS ResearcherID"].split(",")[0].trim();
    links.push({ label: "Web of Science", url: PLATFORM_LINK_BUILDERS.wos(id), icon: "link" });
  }
  if (row["Scopus id"]) {
    const id = row["Scopus id"].split(",")[0].trim();
    links.push({ label: "Scopus", url: PLATFORM_LINK_BUILDERS.scopus(id), icon: "link" });
  }
  if (row["GScholar id"]) {
    const id = row["GScholar id"].trim();
    links.push({ label: "Google Scholar", url: PLATFORM_LINK_BUILDERS.scholar(id), icon: "link" });
  }
  if (row["ERIHPLUS Id"]) {
    const id = row["ERIHPLUS Id"].trim();
    links.push({ label: "ERIHPLUS", url: PLATFORM_LINK_BUILDERS.erih(id), icon: "book" });
  }
  return links;
}

async function validateUrl(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      method: "GET", 
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
    });

    clearTimeout(timeoutId);

    // 403 usually means "Forbidden" (bot protection), but implies the link exists
    if (res.ok || res.status === 403) {
      return true;
    }
    return false;
  } catch (error) {
    if (error.name === 'AbortError') {
       console.log(`   Timeout validating: ${url}`);
    }
    return false;
  }
}

async function validateLinks(links) {
  const validLinks = [];
  for (const link of links) {
    const ok = await validateUrl(link.url);
    if (ok) {
      console.log(`   ✅ valid: ${link.url}`);
      validLinks.push(link);
    } else {
      console.log(`   ❌ invalid: ${link.url}`);
    }
  }
  return validLinks;
}

// --- STRAPI ACTIONS ---

async function fetchAllUsers(token) {
  const users = [];
  let page = 1;
  const pageSize = 100;

  while (true) {
    const res = await fetch(
      `${STRAPI_URL}/content-manager/collection-types/api::person.person?page=${page}&pageSize=${pageSize}&sort=fullName:ASC`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const json = await res.json();
    
    // Check 'results' vs 'data' depending on your specific Strapi version response
    const items = json?.results || json?.data || [];

    if (items.length === 0) break;

    const simplified = items.map((u) => ({
      id: u.id,
      documentId: u.documentId,
      fullName: u.fullName, // Keep original for display
      normalizedName: normalizeName(u.fullName), // Use normalized for matching
      slug: u.slug, 
    }));

    users.push(...simplified);
    
    if (json.pagination && page >= json.pagination.pageCount) break;
    page++;
  }
  console.log(`Fetched ${users.length} users from Strapi.`);
  return users;
}

async function updatePersonLinks(token, documentId, socialLinks) {
  const url = `${STRAPI_URL}/content-manager/collection-types/api::person.person/${documentId}`;
  
  const res = await fetch(url, {
    method: "PUT",
    headers: { 
      "Authorization": `Bearer ${token}`, 
      "Content-Type": "application/json" 
    },
    body: JSON.stringify({ socialLinks }), 
  });

  return res.json();
}

async function getPersonData(token, documentId) {
  const res = await fetch(
    `${STRAPI_URL}/content-manager/collection-types/api::person.person/${documentId}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.json();
}

function cleanDataForPublish(apiResponse) {
  const data = apiResponse.data || apiResponse; 
  const payload = { ...data };

  const readOnlyFields = [
    "id", "createdAt", "updatedAt", "publishedAt", "createdBy", "updatedBy", 
    "localizations", "locale", "status", "availableStatus"
  ];
  readOnlyFields.forEach(field => delete payload[field]);

  // Remove relation counts
  for (const key in payload) {
    if (payload[key] && typeof payload[key] === 'object' && 'count' in payload[key]) {
      delete payload[key];
    }
  }
  return payload;
}

async function publishPerson(token, documentId, cleanedPayload) {
  const res = await fetch(
    `${STRAPI_URL}/content-manager/collection-types/api::person.person/${documentId}/actions/publish`, 
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(cleanedPayload),
    }
  );
  return res.json();
}



async function main() {
  const token = await login();
  if (!token) {
    console.error("Cannot get the access token. Check credentials.");
    return;
  }
  console.log("Logged in successfully.");

  const rows = readCsv();
  console.log(`Read ${rows.length} rows from CSV.`);

  const users = await fetchAllUsers(token);

  const userMap = {};
  for (const u of users) {
    userMap[u.normalizedName] = u;
  }

  let processed = 0;

  for (const row of rows) {
    const name = row["Name"]?.trim();
    if (!name) continue;

    console.log(`\n--------------------------------------------------`);
    console.log(`${processed + 1}. Processing: ${name}`);

    const normalized = normalizeName(name);
    const person = userMap[normalized];

    if (!person) {
      console.log(`Person not found in Strapi: ${name}`);
      continue;
    }

    const links = buildLinks(row);
    if (links.length === 0) {
      console.log(`No links found in CSV.`);
      continue;
    }

    // 1. Validate
    const validLinks = await validateLinks(links);
    if (validLinks.length === 0) {
      console.log(`No valid links to add.`);
      continue;
    }

    // 2. Update
    const updateResult = await updatePersonLinks(token, person.documentId, validLinks);
    if (updateResult.error) {
        console.error(`Error updating:`, updateResult.error);
        continue;
    }
    console.log(`Updated links in Draft.`);

    // 3. Get Fresh Data 
    const freshJson = await getPersonData(token, person.documentId);
    
    // 4. Clean Data
    const payload = cleanDataForPublish(freshJson);

    // 5. Publish 
    const publishResult = await publishPerson(token, person.documentId, payload);
    
    if (publishResult.error) {
        console.error(`Error Publishing:`, publishResult.error);
    } else {
        console.log(`PUBLISHED successfully!`);
        processed++;
    }
  }

  console.log(`\n==================================================`);
  console.log(`Finished. Successfully processed and published ${processed} users.`);
}

main().catch(console.error);