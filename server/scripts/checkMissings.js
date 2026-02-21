import 'dotenv/config';
import fs from "fs-extra";
import { env } from "process";

const STRAPI_URL = env.STRAPI_URL; 
const ADMIN_EMAIL = env.ADMIN_EMAIL;       
const ADMIN_PASSWORD = env.ADMIN_PASSWORD;             
const REPORT_FILE = `./researchers-status-${Date.now()}.txt`;

async function login() {
  const res = await fetch(`${STRAPI_URL}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const data = await res.json();
  return data.data?.token;
}

async function fetchAllUsers(token) {
  const users = [];
  let page = 1;
  const pageSize = 1000;

  console.log("Fetching all users from Strapi...");

  while (true) {
    const res = await fetch(
      `${STRAPI_URL}/content-manager/collection-types/api::person.person?page=${page}&pageSize=${pageSize}&sort=fullName:ASC&populate=*`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const json = await res.json();
    const items = json?.results || json?.data || [];

    if (items.length === 0) break;

    users.push(...items);
    if (json.pagination && page >= json.pagination.pageCount) break;
    page++;
  }
  console.log(`Fetched ${users.length} users.`);
  return users;
}

async function main() {
  const token = await login();
  if (!token) {
    console.error("Cannot get the access token. Check credentials.");
    return;
  }
  console.log("Logged in successfully.");

  const users = await fetchAllUsers(token);

  const completeUsers = [];
  const missingPortraitOnly = [];
  const missingLinksOnly = [];
  const missingBoth = [];

  for (const user of users) {
    const name = user.fullName || "Unknown Name";
    
    // Check fields
    const hasPortrait = user.portrait !== null && user.portrait !== undefined;
    const hasLinks = Array.isArray(user.socialLinks) && user.socialLinks.length > 0;

    if (hasPortrait && hasLinks) {
      completeUsers.push(name);
    } else if (!hasPortrait && hasLinks) {
      missingPortraitOnly.push(name);
    } else if (hasPortrait && !hasLinks) {
      missingLinksOnly.push(name);
    } else {
      missingBoth.push(name);
    }
  }

  const reportLines = [];
  
  reportLines.push(`=== PEOPLE STATUS ===`);
  reportLines.push(`Generated: ${new Date().toISOString()}`);
  reportLines.push(`Total Researchers Evaluated: ${users.length}`);
  reportLines.push(`================================\n`);

  reportLines.push(`[OK] (${completeUsers.length})`);
  reportLines.push(`--------------------------------------------------`);
  completeUsers.forEach(u => reportLines.push(`- ${u}`));
  reportLines.push(`\n`);

  reportLines.push(`[OK*] (${missingPortraitOnly.length}) - no profile photo`);
  reportLines.push(`--------------------------------------------------`);
  missingPortraitOnly.forEach(u => reportLines.push(`- ${u}`));
  reportLines.push(`\n`);

  reportLines.push(`[FAIL] (${missingLinksOnly.length}) - no social links`);
  reportLines.push(`--------------------------------------------------`);
  missingLinksOnly.forEach(u => reportLines.push(`- ${u}`));
  reportLines.push(`\n`);

  reportLines.push(`[FAIL] (${missingBoth.length}) - no profile photo and no social links`);
  reportLines.push(`--------------------------------------------------`);
  missingBoth.forEach(u => reportLines.push(`- ${u}`));

  const finalReport = reportLines.join('\n');
  fs.writeFileSync(REPORT_FILE, finalReport, 'utf-8');

  console.log(`\nComplete!`);
  console.log(`Fully Complete: ${completeUsers.length}`);
  console.log(`Missing Portrait: ${missingPortraitOnly.length}`);
  console.log(`Missing Links: ${missingLinksOnly.length}`);
  console.log(`Missing Both: ${missingBoth.length}`);
  console.log(`\nDetailed report saved to: ${REPORT_FILE}`);
}

main().catch(console.error);