'use strict';

const path = require('path');
const fs = require('fs-extra');

const resolveDataRoot = () => {
  const fromEnv = process.env.MIGRATION_DATA_ROOT;
  if (fromEnv) {
    const absolute = path.resolve(fromEnv);
    if (fs.existsSync(absolute)) {
      return absolute;
    }
    console.warn(`⚠️  MIGRATION_DATA_ROOT provided but not found: ${absolute}`);
  }

  const candidates = [
    path.resolve(process.cwd(), '..', 'web', 'src', 'app', 'data'),
    path.resolve(process.cwd(), 'web', 'src', 'app', 'data'),
    path.resolve(__dirname, '..', '..', 'web', 'src', 'app', 'data'),
    path.resolve(__dirname, '..', 'web', 'src', 'app', 'data'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Unable to locate JSON data folder. Checked locations:\n${candidates
      .map((entry) => `  - ${entry}`)
      .join('\n')}\nSet MIGRATION_DATA_ROOT to override.`
  );
};

const DATA_ROOT = resolveDataRoot();
console.log(`Using migration data root: ${DATA_ROOT}`);

const nowISO = () => new Date().toISOString();

// Helper to publish a document after creation
const publishDocument = async (uid, documentId) => {
  try {
    await strapi.documents(uid).publish({ documentId });
  } catch (error) {
    console.warn(`  ⚠️  Failed to publish ${uid} ${documentId}:`, error.message);
  }
};

const TYPE_MAP = {
  // staff / personal
  personal: 'staff',
  Personal: 'staff',
  staff: 'staff',
  Staff: 'staff',
  // researchers
  researchers: 'researcher',
  Researchers: 'researcher',
  researcher: 'researcher',
  Researcher: 'researcher',
  // alumni
  alumni: 'alumni',
  Alumni: 'alumni',
  // visiting / visitors
  visiting: 'visitor',
  Visiting: 'visitor',
  visitor: 'visitor',
  Visitor: 'visitor',
  'visiting researchers': 'visitor',
  'Visiting Researchers': 'visitor',
  visitingresearchers: 'visitor',
  visitingresearcher: 'visitor',
  // external / collaborators
  external: 'external',
  External: 'external',
  collaborator: 'external',
  Collaborator: 'external',
};

const toKey = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const toSlug = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const readJson = async (...segments) => {
  const absPath = path.join(DATA_ROOT, ...segments);
  if (!(await fs.pathExists(absPath))) {
    throw new Error(`Missing JSON data file: ${absPath}`);
  }
  return fs.readJSON(absPath);
};

const hasJson = async (...segments) => {
  const absPath = path.join(DATA_ROOT, ...segments);
  return fs.pathExists(absPath);
};

const extractArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return [value];
};

const extractString = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((line) => String(line || '').trim())
      .filter(Boolean)
      .join('\n');
  }
  return value ? String(value).trim() : '';
};

const extractParagraphs = (value) => {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return list
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);
};

const toRichTextBlocks = (paragraphs) => {
  if (!paragraphs.length) return [];
  return [
    {
      __component: 'shared.rich-text',
      body: paragraphs.join('\n\n'),
    },
  ];
};

const toFocusItems = (elements = []) =>
  elements
    .map((element) => {
      const description = extractString(element?.content).trim();
      if (!element?.text && !description) return null;
      return {
        title: element?.text || 'Details',
        description,
        richContent: description,
      };
    })
    .filter(Boolean);

const getDocId = (doc) => (doc && (doc.documentId || doc.id || doc.document_id)) || null;


async function findDocument(uid, filters) {
  const payload = {
    filters,
    publicationState: 'preview',
    pagination: { page: 1, pageSize: 1 },
  };
  const res = await strapi.documents(uid).findMany(payload);
  const results = Array.isArray(res?.results) ? res.results : Array.isArray(res) ? res : [];
  return results.length ? results[0] : null;
}

async function importDepartments(state) {
  const units = await readJson('departments', 'researchUnitsData.json');
  console.log(`\n⏳ Importing departments (${units.length} units detected)`);

  for (const unit of units) {
    const name = String(unit?.name || '').trim();
    if (!name) continue;

    const normalizedKey = toKey(name);
    const paragraphs = extractParagraphs(unit?.description);
    const description = paragraphs.join('\n\n');
    const focusItems = toFocusItems(unit?.elements);

    const existing = await findDocument('api::department.department', {
      name: { $eqi: name },
    });

    const baseData = {
      name,
      slug: toSlug(name),
      summary: paragraphs[0] || '',
      description,
      body: toRichTextBlocks(paragraphs),
      focusItems,
      contactLinks: unit?.contactLinks || [],
      type: unit?.type || 'research',
    };

    let departmentDoc;
    if (existing) {
      departmentDoc = await strapi
        .documents('api::department.department')
        .update({
          documentId: getDocId(existing),
          data: { ...baseData, publishedAt: nowISO() },
        });
      await publishDocument('api::department.department', getDocId(departmentDoc));
      console.log(`  🔁 updated department: ${name}`);
    } else {
      departmentDoc = await strapi
        .documents('api::department.department')
        .create({
          data: {
            ...baseData,
            publishedAt: nowISO(),
          },
        });
      await publishDocument('api::department.department', getDocId(departmentDoc));
      console.log(`  ✅ created department: ${name}`);
    }

    state.departments[normalizedKey] = departmentDoc;
    state.departmentsByName[name] = departmentDoc;
    state.departmentMeta[normalizedKey] = {
      coordinator: unit?.coordonator || unit?.coordinator || '',
      coCoordinator: unit?.['co-coordonator'] || unit?.deputy_coordinator || '',
    };
  }
}

async function importSupportUnits(state) {
  const exists = await hasJson('departments', 'supportUnitsData.json');
  if (!exists) {
    console.warn('⚠️  supportUnitsData.json not found. Skipping support units import.');
    return;
  }
  const units = await readJson('departments', 'supportUnitsData.json');
  console.log(`\n⏳ Importing support units (${units.length} units detected)`);

  for (const unit of units) {
    const name = String(unit?.name || '').trim();
    if (!name) continue;

    const key = toKey(name);
    const paragraphs = extractParagraphs(unit?.description);
    const services = toFocusItems(unit?.elements);

    const existing = await findDocument('api::support-unit.support-unit', {
      name: { $eqi: name },
    });

    const baseData = {
      name,
      slug: toSlug(name),
      summary: paragraphs[0] || '',
      mission: paragraphs.join('\n\n'),
      body: toRichTextBlocks(paragraphs),
      services,
      contactLinks: unit?.contactLinks || [],
    };

    let supportDoc;
    if (existing) {
      supportDoc = await strapi
        .documents('api::support-unit.support-unit')
        .update({
          documentId: getDocId(existing),
          data: { ...baseData, publishedAt: nowISO() },
        });
      await publishDocument('api::support-unit.support-unit', getDocId(supportDoc));
      console.log(`  🔁 updated support unit: ${name}`);
    } else {
      supportDoc = await strapi
        .documents('api::support-unit.support-unit')
        .create({
          data: {
            ...baseData,
            publishedAt: nowISO(),
          },
        });
      await publishDocument('api::support-unit.support-unit', getDocId(supportDoc));
      console.log(`  ✅ created support unit: ${name}`);
    }

    state.supportUnits[key] = supportDoc;
  }
}

async function importPeople(state) {
  const raw = await readJson('staff', 'staffData.json');
  const people = [];

  for (const [category, list] of Object.entries(raw || {})) {
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      people.push({ ...entry, category });
    }
  }

  console.log(`\n⏳ Importing people (${people.length} records found)`);

  for (const person of people) {
    const fullName = String(person?.name || '').trim();
    if (!fullName) continue;

    const slug = String(person?.slug || '').trim() || toSlug(fullName);
    const normalizedSlug = toKey(slug);
    const categoryKey = toKey(person?.category);
    const typeValue = TYPE_MAP[person?.category] || TYPE_MAP[categoryKey] || 'staff';

    if (state.peopleBySlug[slug] || state.peopleByKey[normalizedSlug]) {
      continue;
    }

    const existing = await findDocument('api::person.person', {
      slug: { $eqi: slug },
    });

    if (existing) {
      state.peopleBySlug[slug] = existing;
      state.peopleByKey[normalizedSlug] = existing;
      state.peopleByKey[toKey(fullName)] = existing;
      console.log(`  ◼︎ skipped existing person: ${fullName}`);
      continue;
    }

    const departmentName = String(person?.department || '').trim();
    let departmentId = null;
    if (departmentName) {
      const departmentDoc =
        state.departments[toKey(departmentName)] ||
        (await findDocument('api::department.department', { name: { $eqi: departmentName } }));
      departmentId = getDocId(departmentDoc);
    }

    const payload = {
      fullName,
      slug,
      type: typeValue,
      titles: person?.title ? [person.title] : [],
      position: person?.title || '',
      phone: person?.phone || '',
      email: person?.email || '',
    };

    if (departmentId) {
      payload.department = { connect: [departmentId] };
    }

    const created = await strapi.documents('api::person.person').create({
      data: payload,
    });

    await publishDocument('api::person.person', getDocId(created));
    console.log(`  ✅ created person: ${fullName}`);

    state.peopleBySlug[slug] = created;
    state.peopleByKey[normalizedSlug] = created;
    state.peopleByKey[toKey(fullName)] = created;
  }
}

function lookupPerson(state, value) {
  const slug = String(value || '').trim();
  if (!slug) return null;
  const bySlug = state.peopleBySlug[slug];
  if (bySlug) return bySlug;

  const normalized = toKey(slug);
  if (state.peopleByKey[normalized]) return state.peopleByKey[normalized];

  return null;
}

async function ensureTheme(state, name) {
  const label = String(name || '').trim();
  if (!label) return null;
  const key = toKey(label);
  if (state.themes[key]) return state.themes[key];

  const slug = toSlug(label);
  const existing = await findDocument('api::research-theme.research-theme', {
    slug: { $eqi: slug },
  });

  if (existing) {
    state.themes[key] = existing;
    return existing;
  }

  const created = await strapi.documents('api::research-theme.research-theme').create({
    data: {
      name: label,
      slug,
      summary: '',
    },
  });

  state.themes[key] = created;
  return created;
}

async function ensurePartner(state, name) {
  const label = String(name || '').trim();
  if (!label) return null;
  const key = toKey(label);
  if (state.partners[key]) return state.partners[key];

  const slug = toSlug(label);
  const existing = await findDocument('api::partner.partner', {
    slug: { $eqi: slug },
  });

  if (existing) {
    state.partners[key] = existing;
    return existing;
  }

  const created = await strapi.documents('api::partner.partner').create({
    data: {
      name: label,
      slug,
      description: '',
    },
  });

  state.partners[key] = created;
  return created;
}

async function attachDepartmentLeads(state) {
  console.log('\n⏳ Linking department coordinators');

  for (const [key, meta] of Object.entries(state.departmentMeta)) {
    const department = state.departments[key];
    if (!department) continue;

    const data = {};
    const coordinatorDoc = lookupPerson(state, meta?.coordinator);
    const deputyDoc = lookupPerson(state, meta?.coCoordinator);

    if (coordinatorDoc) {
      const coordinatorId = getDocId(coordinatorDoc);
      if (coordinatorId) data.coordinator = { connect: [coordinatorId] };
    }

    if (deputyDoc) {
      const deputyId = getDocId(deputyDoc);
      if (deputyId) data.coCoordinator = { connect: [deputyId] };
    }

    if (!Object.keys(data).length) continue;

    await strapi.documents('api::department.department').update({
      documentId: getDocId(department),
      data,
    });
  }
}

async function importPublications(state) {
  const publications = await readJson('staff', 'pubData.json');
  console.log(`\n⏳ Importing publications (${publications.length} records found)`);

  for (const pub of publications) {
    const title = String(pub?.title || '').trim();
    if (!title) continue;

    const slug = toSlug(title);
    if (state.publications[slug]) continue;

    const existing = await findDocument('api::publication.publication', {
      slug: { $eqi: slug },
    });

    if (existing) {
      state.publications[slug] = existing;
      // ensure published
      await publishDocument('api::publication.publication', getDocId(existing));
      continue;
    }

    const departmentName = String(pub?.domain || '').trim();
    let departmentId = null;
    if (departmentName) {
      const departmentDoc =
        state.departments[toKey(departmentName)] ||
        (await findDocument('api::department.department', { name: { $eqi: departmentName } }));
      departmentId = getDocId(departmentDoc);
    }

    const authorIds = [];
    const authorValues = Array.isArray(pub?.authors) ? pub.authors : [];
    for (const author of authorValues) {
      const authorDoc = lookupPerson(state, author);
      const id = getDocId(authorDoc);
      if (id) authorIds.push(id);
    }

    const payload = {
      title,
      slug,
      year: Number.isFinite(pub?.year) ? pub.year : null,
      kind: pub?.kind || '',
      description: extractString(pub?.description),
      doc_url: pub?.docUrl || pub?.doc_url || '',
      external_url: pub?.externalUrl || pub?.external_url || '',
      metadata: pub?.metadata || null,
      publishedAt: nowISO(),
    };

    if (departmentId) {
      payload.domain = { connect: [departmentId] };
    }

    if (authorIds.length) {
      payload.authors = { connect: authorIds };
    }

    const created = await strapi.documents('api::publication.publication').create({
      data: payload,
    });
    await publishDocument('api::publication.publication', getDocId(created));

    console.log(`  ✅ created publication: ${title}`);

    state.publications[slug] = created;
  }
}

async function importProjects(state) {
  const projects = await readJson('staff', 'proData.json');
  console.log(`\n⏳ Importing projects (${projects.length} records found)`);

  for (const proj of projects) {
    const title = String(proj?.title || '').trim();
    if (!title) continue;

    const slug = toSlug(title);
    if (state.projects[slug]) continue;

    const existing = await findDocument('api::project.project', {
      slug: { $eqi: slug },
    });

    if (existing) {
      state.projects[slug] = existing;
      await publishDocument('api::project.project', getDocId(existing));
      continue;
    }

    const domainNames = Array.isArray(proj?.domain) ? proj.domain : extractArray(proj?.domain);
    const domainIds = [];
    for (const name of domainNames) {
      const depDoc = state.departments[toKey(name)] || (await findDocument('api::department.department', { name: { $eqi: name } }));
      const id = getDocId(depDoc);
      if (id) domainIds.push(id);
    }

    const memberDocs = Array.isArray(proj?.teams) ? proj.teams : [];
    const memberIds = [];
    for (const member of memberDocs) {
      const personDoc = lookupPerson(state, member?.name || member?.slug || member);
      const id = getDocId(personDoc);
      if (id) memberIds.push(id);
    }

    const leadDoc = lookupPerson(state, proj?.lead);
    const leadId = getDocId(leadDoc);

    const relatedPublicationTitle = String(proj?.publication || '').trim();
    const publicationSlug = relatedPublicationTitle ? toSlug(relatedPublicationTitle) : null;
    const publicationDoc = publicationSlug ? state.publications[publicationSlug] : null;
    const publicationId = getDocId(publicationDoc);

    const partners = extractArray(proj?.partners).filter(Boolean);

    const themeIds = [];
    const themeNames = extractArray(proj?.themes);
    for (const themeName of themeNames) {
      const themeDoc = await ensureTheme(state, themeName);
      const id = getDocId(themeDoc);
      if (id) themeIds.push(id);
    }

    const partnerIds = [];
    const partnerNames = partners.length ? partners : [];
    for (const partnerName of partnerNames) {
      const partnerDoc = await ensurePartner(state, partnerName);
      const id = getDocId(partnerDoc);
      if (id) partnerIds.push(id);
    }

    const payload = {
      title,
      slug,
      abstract: proj?.abstract || '',
      phase: proj?.phase || proj?.status || 'ongoing',
      region: proj?.region || 'national',
      body: toRichTextBlocks(extractParagraphs(proj?.abstract)),
      docUrl: proj?.docUrl || proj?.doc_url || '',
      officialUrl: proj?.oficialUrl || proj?.officialUrl || '',
      publishedAt: nowISO(),
    };

    if (leadId) {
      payload.lead = { connect: [leadId] };
    }

    if (memberIds.length) {
      payload.members = { connect: memberIds };
    }

    if (domainIds.length) {
      payload.domains = { connect: domainIds };
    }

    if (publicationId) {
      payload.publications = { connect: [publicationId] };
    }

    if (themeIds.length) {
      payload.themes = { connect: themeIds };
    }

    if (partnerIds.length) {
      payload.partners = { connect: partnerIds };
    }

    const created = await strapi.documents('api::project.project').create({
      data: payload,
    });
    await publishDocument('api::project.project', getDocId(created));

    console.log(`  ✅ created project: ${title}`);

    state.projects[slug] = created;
  }
}

async function importEvents(state) {
  try {
    const events = await readJson('news&events', 'eventsData.json');
    console.log(`\n⏳ Importing events (${events.length} records found)`);

    for (const evt of events) {
      const title = String(evt?.title || '').trim();
      if (!title) continue;

      const slug = toSlug(title);
      
      const existing = await findDocument('api::event.event', {
        slug: { $eqi: slug },
      });

      if (existing) {
        await publishDocument('api::event.event', getDocId(existing));
        continue;
      }

      const payload = {
        title,
        slug,
        description: '', // JSON has no description
        startDate: nowISO(), // Default to now as JSON has no date
        location: '', 
        category: 'event',
        ctaLabel: 'See Post',
        ctaUrl: evt?.url || '',
        publishedAt: nowISO(),
      };

      const created = await strapi.documents('api::event.event').create({
        data: payload,
      });
      await publishDocument('api::event.event', getDocId(created));
      console.log(`  ✅ created event: ${title}`);
    }
  } catch (err) {
    if (err.message.includes('Missing JSON')) {
      console.log('  ⚠️  No eventsData.json found - skipping.');
    } else {
      throw err;
    }
  }
}

async function importSeminars(state) {
  try {
    const seminars = await readJson('news&events', 'seminarsData.json');
    console.log(`\n⏳ Importing seminars (${seminars.length} records found)`);

    for (const sem of seminars) {
      const title = String(sem?.title || '').trim();
      if (!title) continue;

      const slug = toSlug(title);

      const existing = await findDocument('api::seminar.seminar', {
        slug: { $eqi: slug },
      });

      if (existing) {
        await publishDocument('api::seminar.seminar', getDocId(existing));
        continue;
      }

      const summary = extractString(sem?.about);
      const modules = (sem?.modules || []).map(m => ({
        __component: 'shared.focus-item',
        title: String(m).trim(),
        description: ''
      }));

      const payload = {
        title,
        slug,
        provider: 'Coursera', // JSON links imply Coursera
        summary: summary,
        modules,
        ctaUrl: sem?.url || '',
        ctaLabel: 'See Course',
        publishedAt: nowISO(),
      };

      const created = await strapi.documents('api::seminar.seminar').create({
        data: payload,
      });
      await publishDocument('api::seminar.seminar', getDocId(created));
      console.log(`  ✅ created seminar: ${title}`);
    }
  } catch (err) {
    if (err.message.includes('Missing JSON')) {
      console.log('  ⚠️  No seminarsData.json found - skipping.');
    } else {
      throw err;
    }
  }
}

async function runMigration() {
  const state = {
    departments: {},
    departmentsByName: {},
    departmentMeta: {},
    supportUnits: {},
    peopleBySlug: {},
    peopleByKey: {},
    publications: {},
    projects: {},
    resources: {},
    themes: {},
    partners: {},
  };

  await importDepartments(state);
  await importSupportUnits(state);
  await importPeople(state);
  await attachDepartmentLeads(state);
  await importPublications(state);
  await importProjects(state);
  await importEvents(state);
  await importSeminars(state);

  console.log('\n🎉 JSON migration script finished.');
}

async function main() {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');

  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  app.log.level = 'error';

  try {
    await runMigration();
  } catch (error) {
    console.error('Migration failed:', error);
  }

  await app.destroy();

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
