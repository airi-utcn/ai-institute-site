import 'dotenv/config';
import { env } from "process";
import fs from "fs-extra";
import path from "path";
import { parse } from "csv-parse/sync";
import fetch from "node-fetch";


// Config
const STRAPI_URL = env.STRAPI_URL;
const ADMIN_EMAIL = env.ADMIN_EMAIL;
const ADMIN_PASSWORD = env.ADMIN_PASSWORD;
// const CSV_PATH = path.join(process.cwd(), "public", "doc1.csv");
const CSV_PATH = path.join(process.cwd(), "csv-file");
const LOG_FILE = "output-log-file";

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
    delimiter: "\t", 
    relax_column_count: true,
  });
}

function normalizeName(str) {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") 
    .replace(/[-_.,]/g, " ")      
    .replace(/[^a-zA-Z0-9\s]/g, "") 
    .replace(/\s+/g, " ")            
    .trim()
    .toLowerCase();
}

function getTokens(normalizedName) {
    return normalizedName.split(" ").filter(t => t.length > 0);
}

function areNamesMatching(nameA, nameB) {
    const tokensA = getTokens(nameA);
    const tokensB = getTokens(nameB);

    // Count matches
    const matchesAtoB = tokensA.filter(token => tokensB.includes(token)).length;
    const matchesBtoA = tokensB.filter(token => tokensA.includes(token)).length;

    const isSubsetA = matchesAtoB === tokensA.length;
    const isSubsetB = matchesBtoA === tokensB.length;

    return isSubsetA || isSubsetB;
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
      //console.log(`valid: ${link.url}`);
      validLinks.push(link);
    } else {
     // console.log(`invalid: ${link.url}`);
    }
  }
  return validLinks;
}


async function fetchAllUsers(token) {
  const users = [];
  let page = 1;
  const pageSize = 1000;

  console.log("Fetching users from Strapi...");

  while (true) {
    const res = await fetch(
      `${STRAPI_URL}/content-manager/collection-types/api::person.person?page=${page}&pageSize=${pageSize}&sort=fullName:ASC&populate=*`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const json = await res.json();
    
    const items = json?.results || json?.data || [];

    if (items.length === 0) break;

    const simplified = items.map((u) => ({
      id: u.id,
      documentId: u.documentId,
      fullName: u.fullName, 
      normalizedName: normalizeName(u.fullName), 
      departmentNormalized: u.department ? normalizeName(u.department.name) : "",
      slug: u.slug, 
      existingLinks: u.socialLinks || [],  // save the previous records
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

  const successfulUsers = [];
  const failedUsers = [];
  const logMessages = [];
  const log = (msg) => logMessages.push(msg);

  log(`Start Time: ${new Date().toISOString()}`);
  log(`Total Strapi Users to Process: ${users.length}`);
  log("--------------------------------------------------");

  console.log("\nStarting processing...\n");

  let processedCount = 0;

  for (const person of users) {
    const strapiName = person.fullName;
    const strapiTokens = getTokens(person.normalizedName);

    let bestMatchRow = null;
    let bestScore = -999;
    let matchCount = 0; 

    for (const row of rows) {
      const csvNameRaw = row["Name"]?.trim();
      if (!csvNameRaw) continue;
      
      const csvTokens = getTokens(normalizeName(csvNameRaw));
      
      const intersection = strapiTokens.filter(t => csvTokens.includes(t)).length;
      const minTokens = Math.min(strapiTokens.length, csvTokens.length);

      if (intersection >= minTokens && intersection > 0) {
          
          const lengthPenalty = Math.abs(strapiTokens.length - csvTokens.length);
          let facultyBonus = 0;

          const csvFac = normalizeName(row["Faculty"]?.trim());
          const strapiFac = person.departmentNormalized;

          if (csvFac && strapiFac) {
              if (strapiFac.includes(csvFac) || csvFac.includes(strapiFac)) {
                  facultyBonus = 50;  
              } else {
                  facultyBonus = -50; 
              }
          }

          const score = (intersection * 10) - lengthPenalty + facultyBonus;

          if (score > bestScore) {
              bestScore = score;
              bestMatchRow = row;
              matchCount = 1;
          } else if (score === bestScore) {
              matchCount++; 
          }
      }
    }

    if (!bestMatchRow) {
        failedUsers.push(`${strapiName} (Reason: Not found in CSV)`);
        continue;
    }
    
    if (matchCount > 1 && bestScore < 50) {
        failedUsers.push(`${strapiName} (Reason: Multiple identical name matches in CSV, couldn't resolve without exact Faculty data)`);
        continue;
    }

    const rawLinks = buildLinks(bestMatchRow);
    if (rawLinks.length === 0) {
      failedUsers.push(`${strapiName} (Reason: No social links in CSV)`);
      continue;
    }

    const validLinks = await validateLinks(rawLinks);
    if (validLinks.length === 0) {
      failedUsers.push(`${strapiName} (Reason: Links found in CSV but all were invalid/broken)`);
      continue;
    }

    const existingUrls = new Set(person.existingLinks.map(link => link.url));

    const newLinksToAdd = validLinks.filter(link => !existingUrls.has(link.url));

    if (newLinksToAdd.length === 0) {
       failedUsers.push(`${strapiName} (Reason: Skipped - All CSV links already exist on this profile)`);
       continue;
    }

    const mergedLinks = [...person.existingLinks, ...newLinksToAdd];

    const updateResult = await updatePersonLinks(token, person.documentId, mergedLinks);
    if (updateResult.error) {
       const errorDetails = updateResult.error.message || JSON.stringify(updateResult.error.details) || "Unknown Error";
       failedUsers.push(`${strapiName} (Reason: Strapi API Error on Update -> ${errorDetails})`);
       continue;
    }

    try {
      const freshJson = await getPersonData(token, person.documentId);
      const freshData = freshJson.data || freshJson; 
      const payload = cleanDataForPublish(freshData);
      const publishResult = await publishPerson(token, person.documentId, payload);

      if (publishResult.error) {
         const pubError = publishResult.error.message || JSON.stringify(publishResult.error.details);
         failedUsers.push(`${strapiName} (Reason: Strapi API Error on Publish -> ${pubError})`);
      } else {
         processedCount++;
         successfulUsers.push(strapiName);
         console.log(`${processedCount}. Successfully processed: ${strapiName}`);
      }
    } catch (err) {
      failedUsers.push(`${strapiName} (Reason: Script Error during Publish - ${err.message})`);
    }
  }

  // --- FINAL REPORT ---
  console.log(`\n==================================================`);
  console.log(`Finished!`);
  console.log(`Successfully Processed: ${successfulUsers.length}`);
  console.log(`Failed / Skipped: ${failedUsers.length}`);
  console.log(`Log saved to: ${LOG_FILE}`);

  log(`\n--- SUCCESSFUL USERS (${successfulUsers.length}) ---`);
  successfulUsers.forEach(u => log(`[OK] ${u}`));

  log(`\n--- FAILED / SKIPPED USERS (${failedUsers.length}) ---`);
  failedUsers.forEach(u => log(`[FAIL] ${u}`));

  fs.writeFileSync(LOG_FILE, logMessages.join('\n'), 'utf-8');
}

main().catch(console.error);