import fs from "fs-extra";
import { parse } from "csv-parse/sync";
import fetch from "node-fetch";
import { fetchAPI, fetchApi } from "../../web/src/lib/strapi.js";

const CSV_PATH = "../public/export_groza_adrian_petru_researchers_new.csv";

const PLATFORM_LINK_BUILDERS = {
  wos: (id) =>
    `https://www.webofscience.com/wos/author/record/${id}`,

  scopus: (id) =>
    `https://www.scopus.com/authid/detail.uri?authorId=${id}`,

  scholar: (id) =>
    `https://scholar.google.com/citations?user=${id}`,

  erih: (id) =>
    `https://kanalregister.hkdir.no/publiseringskanaler/erihplus/person/${id}`,
};

async function validateUrl(url) {
    try {
        const res = await fetch(
            url=url,
            init={
                method: "HEAD",
                redirect: "follow"
            }
        );
    } catch {
        return false;
    }
}

function normalizeName(name) {
  return name
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function findPersonByName(name) {
    const params = new URLSearchParams();
    params.set("filters[fullName][$eq]", name);

    const data = await fetchAPI(`/people?${params.toString()}`);

    return data?.data?.[0] || null;
}

async function updatePersonLinks(id, socialLinks) {
    return fetchAPI(`/people/${id}`,
        {
            method: "PUT",
            body: {
                data: {
                    socialLinks,
                },
            },
        },
    );
}

function buildLinks(row) {
  const links = [];

  if (row["WOS ResearcherID"]) {
    const id = row["WOS ResearcherID"].split(",")[0].trim();
    links.push({
      label: "Web of Science",
      url: PLATFORM_LINK_BUILDERS.wos(id),
      icon: "link",
    });
  }

  if (row["Scopus id"]) {
    const id = row["Scopus id"].split(",")[0].trim();
    links.push({
      label: "Scopus",
      url: PLATFORM_LINK_BUILDERS.scopus(id),
      icon: "link",
    });
  }

  if (row["GScholar id"]) {
    const id = row["GScholar id"].trim();
    links.push({
      label: "Google Scholar",
      url: PLATFORM_LINK_BUILDERS.scholar(id),
      icon: "graduation-cap",
    });
  }

  if (row["ERIHPLUS Id"]) {
    const id = row["ERIHPLUS Id"].trim();
    links.push({
      label: "ERIHPLUS",
      url: PLATFORM_LINK_BUILDERS.erih(id),
      icon: "book",
    });
  }

  return links;
}

async function validateLinks(links) {
    const valid = [];

    for (const link of links) {
        const ok = await validateUrl(link);

        if (ok) {
            console.log("valid: ", link.url);
        } else {
            console.log("invalid: ", link.url);
        }
    }   
}

async function main() {
    const file = fs.read(CSV_PATH);

    const records = parse(file, {
        columns:true,
        skip_empty_lines:true,
    });

    for (const row in records) {
        const name = row["Name"]?.trim();

        if (!name) continue;

        console.log("\nsuccesfully parsed: ",name);

        const person = await findPersonByName(name);

        if (!person) {
            console("person not found: ", name);
            continue;
        }

        const links = buildLinks(row);

        if (links.length == 0) {
            console.log("no links");
            continue;
        }

        const validLinks = await validateLinks(links);

        if (validLinks == 0) {
            console.log("no valid links");
            continue;
        }

        await updatePersonLinks(person.id, validLinks);

        console.log("successfully updated: ", name);
    }
}

main();