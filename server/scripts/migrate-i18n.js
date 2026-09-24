'use strict';

const path = require('path');
const fs = require('fs-extra');

const MESSAGES_DIR = fs.existsSync(path.resolve(__dirname, '..', 'messages'))
  ? path.resolve(__dirname, '..', 'messages')
  : path.resolve(__dirname, '..', '..', 'web', 'src', 'messages');

const LOCALE_NAMES = {
  en: 'English (en)',
  ro: 'Română (ro)',
  fr: 'Français (fr)',
  de: 'Deutsch (de)',
  es: 'Español (es)',
  it: 'Italiano (it)',
  el: 'Ελληνικά (el)',
  tr: 'Türkçe (tr)',
  bg: 'Български (bg)',
  lv: 'Latviešu (lv)',
  zh: '简体中文 (zh)',
};

async function ensureLocales(app) {
  const localesService = app.plugin('i18n').service('locales');
  const existing = await localesService.find();
  const existingCodes = new Set(existing.map((l) => l.code));

  for (const [code, name] of Object.entries(LOCALE_NAMES)) {
    if (!existingCodes.has(code)) {
      try {
        await localesService.create({ name, code });
        console.log(`  ✅ Added Strapi locale: ${name} (${code})`);
      } catch (err) {
        console.warn(`  ⚠️ Could not add locale ${code}:`, err.message);
      }
    }
  }
}

function loadAllMessages() {
  const messages = {};
  const files = fs.readdirSync(MESSAGES_DIR).filter((f) => f.endsWith('.json'));

  for (const file of files) {
    const locale = path.basename(file, '.json');
    try {
      messages[locale] = fs.readJsonSync(path.join(MESSAGES_DIR, file));
    } catch (e) {
      console.warn(`Failed reading ${file}:`, e.message);
    }
  }
  return messages;
}

function parseDateForStrapi(d) {
  if (!d) return null;
  const pt = new Date(d);
  if (isNaN(pt.getTime())) return null;
  return pt.toISOString().split("T")[0];
}

function mapGlobal(msg) {
  const f = msg?.footer || {};
  const n = msg?.navbar || {};
  const nl = n.navLinks || {};
  const rm = n.researchMenu || {};
  const nm = n.newsMenu || {};
  const am = n.aboutMenu || {};
  const s = n.search || {};
  const fc = f.contact || {};
  const ql = f.quickLinks || {};

  return {
    siteName: 'AIRi @ UTCN',
    siteDescription: 'The Artificial Intelligence Research Institute at UTCN',
    navbar: {
      navResearch: nl.research || 'Research',
      navEngagement: nl.engagement || 'Engagement',
      navPeople: nl.people || 'People',
      navNews: nl.news || 'News',
      navAbout: nl.about || 'About',
      menuDepartments: rm.departments || 'Departments',
      menuThemes: rm.themes || 'Research Themes',
      menuProjects: rm.projects || 'Projects',
      menuPublications: rm.publications || 'Publications',
      menuResources: rm.resources || 'Resources',
      menuPaperGraph: rm.paperGraph || 'Paper Graph',
      menuPeopleGraph: rm.peopleGraph || 'People Graph',
      menuNews: nm.news || 'News',
      menuEvents: nm.events || 'Events',
      menuSeminars: nm.seminars || 'Seminars',
      menuCalls: nm.calls || 'Calls for Projects',
      menuAwards: nm.awards || 'Awards',
      menuCareers: nm.careers || 'Careers',
      menuMission: am.mission || 'Mission',
      menuOrganigram: am.organigram || 'Organigram',
      menuSitemap: am.sitemap || 'Sitemap',
      menuReports: am.reports || 'Reports',
      menuRegulations: am.regulations || 'Regulations',
      menuGuidelines: am.guidelines || 'Guidelines',
      menuTour: am.tour || 'Virtual Tour',
      menuRooms: am.rooms || 'Rooms & Calendar',
      menuContact: am.contact || 'Contact',
      searchPlaceholder: s.placeholder || 'Type to search pages…',
      searchMobilePlaceholder: s.mobilePlaceholder || 'Search…',
      searchButton: s.button || 'Search',
      chatbotLabel: s.chatbot || 'Chatbot',
      knowledgeGraphLabel: s.knowledgeGraph || 'Knowledge Graph',
    },
    footer: {
      contactTitle: fc.title || 'Contact',
      addressLine1: fc.addressLine1 || 'Strada Observatorului 2',
      addressLine2: fc.addressLine2 || 'Cluj-Napoca 400347, Romania',
      addressLine3: fc.addressLine3 || '',
      quickLinksTitle: ql.title || 'Quick Links',
      projectsLabel: ql.projects || 'Projects',
      sitemapLabel: ql.sitemap || 'Sitemap',
      roomsLabel: ql.rooms || 'Rooms & Calendar',
      disseminationLabel: ql.dissemination || 'Dissemination Materials',
      contactUsLabel: ql.contactUs || 'Contact Us',
      copyright: f.copyright || '© {year} Artificial Intelligence Research Institute. All rights reserved.',
    },
  };
}

function mapHomePage(msg) {
  const h = msg?.home || {};
  const m = h.metadata || h.meta || {};
  const hr = h.Hero || h.hero || {};
  const not = h.Notice || h.notice || {};
  const ab = h.About || h.about || {};
  const cd = h.Cards || h.cards || {};
  const ln = h.LatestNews || h.latestNews || {};
  const sc = h.Social || h.social || {};

  return {
    metaTitle: m.title || 'AIRI - Home',
    metaDescription: m.description || '',
    heroTitle: hr.title || 'Artificial Intelligence Research Institute',
    heroSubtitle: hr.subtitle || '',
    heroLearnMore: hr.learnMore || 'Learn More',
    heroAltHero: hr.altHero || 'AI Research Hero',
    heroAltQr: hr.altQr || 'Sign up QR code',
    noticeText: not.text || '',
    aboutTitle: ab.title || 'About Us',
    aboutDescription: ab.description || '',
    researchCardTitle: cd.research?.title || 'Research',
    researchCardDescription: cd.research?.description || '',
    peopleCardTitle: cd.people?.title || 'People',
    peopleCardDescription: cd.people?.description || '',
    resourcesCardTitle: cd.resources?.title || 'Resources',
    resourcesCardDescription: cd.resources?.description || '',
    latestNewsTitle: ln.title || 'Latest News',
    latestNewsViewAll: ln.viewAll || 'View All News →',
    latestNewsViewArticle: ln.viewArticle || 'View article',
    latestNewsReadMore: ln.readMore || 'Read more',
    latestNewsEmptyState: ln.emptyState || 'News articles will appear here once published.',
    latestNewsVisitNews: ln.visitNews || 'Visit News & Events →',
    socialTitle: sc.title || 'Follow Us on LinkedIn',
    socialVisit: sc.visit || 'Visit LinkedIn →',
  };
}

function mapAboutPage(msg) {
  const a = msg?.about || {};
  const ms = a.mission || {};
  const gl = a.guidelines || {};
  const og = a.organigram || {};
  const rg = a.regulations || {};
  const rp = a.reports || {};
  const rc = a.roomsCalendar || {};
  const sm = a.sitemap || {};
  const vt = a.virtualTour || {};

  return {
    missionTitle: ms.title || a.missionTitle || 'Mission',
    missionText: ms.text || a.missionText || '',
    guidelinesTitle: gl.title || a.guidelinesTitle || 'Just for you',
    guidelinesStudents: gl.students || a.guidelinesStudents || 'Students',
    guidelinesFaculty: gl.faculty || a.guidelinesFaculty || 'Faculty',
    guidelinesResearchers: gl.researchers || a.guidelinesResearchers || 'Researchers',
    guidelinesStaff: gl.staff || a.guidelinesStaff || 'Staff',
    organigramTitle: og.title || a.organigramTitle || 'Organigram',
    organigramDescription: og.description || a.organigramDescription || '',
    organigramDirectorCommittee: og.directorCommittee || a.organigramDirectorCommittee || 'Director Committee',
    organigramViewDirectorStructure: og.viewDirectorStructure || a.organigramViewDirectorStructure || 'View structure:',
    organigramScientificCommittee: og.scientificCommittee || a.organigramScientificCommittee || 'Scientific Committee',
    organigramViewScientificStructure: og.viewScientificStructure || a.organigramViewScientificStructure || 'View structure:',
    organigramDownloadPdf: og.downloadPdf || a.organigramDownloadPdf || 'Download PDF',
    organigramViewPng: og.viewPng || a.organigramViewPng || 'View PNG',
    regulationsTitle: rg.title || a.regulationsTitle || 'Regulations',
    regulationsComingSoon: rg.comingSoon || a.regulationsComingSoon || 'Content coming soon.',
    reportsTitle: rp.title || a.reportsTitle || 'Reports',
    reportsComingSoon: rp.comingSoon || a.reportsComingSoon || 'Content coming soon.',
    roomsCalendarTitle: rc.title || a.roomsCalendarTitle || 'Rooms & Calendar',
    roomsCalendarComingSoon: rc.comingSoon || a.roomsCalendarComingSoon || 'Content coming soon.',
    sitemapTitle: sm.title || a.sitemapTitle || 'Sitemap',
    sitemapFilterPlaceholder: sm.filterPlaceholder || a.sitemapFilterPlaceholder || 'Filter pages…',
    sitemapClear: sm.clear || a.sitemapClear || 'Clear',
    sitemapNoResults: sm.noResults || a.sitemapNoResults || 'No results.',
    virtualTourTitle: vt.title || a.virtualTourTitle || 'Virtual Tour',
    virtualTourComingSoon: vt.comingSoon || a.virtualTourComingSoon || 'Content coming soon.',
  };
}

function mapContactPage(msg) {
  const c = msg?.contact || {};
  const ph = c.PageHeader || c.header || {};
  const sc = c.Social || c.social || {};
  const fm = c.Form || c.form || {};
  const lc = c.Location || c.location || {};

  return {
    headerTitle: ph.title || 'Contact Us',
    headerSubtitle: ph.subtitle || '',
    socialTitle: sc.title || 'Connect With Us',
    formTitle: fm.title || 'Contact Form',
    formIframeTitle: fm.iframeTitle || 'Contact Us Form',
    locationTitle: lc.title || 'Our Location',
    locationAddress: lc.address || 'Strada Observatorului 2, Cluj-Napoca',
    locationIframeTitle: lc.iframeTitle || 'Location Map',
  };
}

function mapEngagementPage(msg) {
  const e = msg?.engagement || {};
  const m = e.main || e.basic || {};
  const hero = m.Hero || {};
  const tabs = m.Tabs || {};
  const subtabs = m.SubTabs || {};
  const pub = m.Public || m.PublicContent || {};
  const acad = e.academic || {};
  const hs = e['high-school'] || e.highSchool || {};
  const phd = e['industrial-phd'] || e.phd || {};
  const ind = e.industry || {};
  const indBtns = ind.Buttons || {};
  const part = e.partners || m.Partners || {};

  return {
    heroTitle: hero.title || 'Engagement',
    heroSubtitle: hero.subtitle || '',
    tabPublic: tabs.public || 'Public',
    tabAcademic: tabs.academic || 'Academic',
    tabIndustry: tabs.industry || 'Industry',
    tabHighSchool: tabs['high-school'] || tabs.highSchool || 'High-School',
    tabPartners: tabs.partners || 'Partners',
    tabPhd: tabs.phd || 'Industrial PhD',
    subtabPartnerships: subtabs.academic?.partnerships || subtabs.partnerships || 'Partnerships',
    subtabTeaching: subtabs.academic?.teaching || subtabs.teaching || 'Teaching',
    subtabCourses: subtabs.academic?.courses || subtabs.courses || 'Courses',
    subtabMobility: subtabs.academic?.mobility || subtabs.mobility || 'Mobility',
    subtabOverview: subtabs.industry?.overview || subtabs.overview || 'Overview',
    subtabProjects: subtabs.industry?.projects || subtabs.projects || 'Projects',
    subtabEngagement: subtabs.industry?.engagement || subtabs.engagement || 'How We Work',
    publicTitle: pub.title || 'Public Engagement',
    publicDesc: pub.desc || '',
    publicBtnMedia: pub.btnMedia || 'View Media & Press',
    publicBtnNews: pub.btnNews || 'News & Events',
    academicTitle: acad.title || 'Academic engagement',
    academicDescription: acad.description || '',
    academicContactButton: acad.contactButton || 'Contact the academic team',
    highSchoolTitle: hs.title || 'High-school engagement',
    highSchoolDescription: hs.description || '',
    highSchoolBtnFramework: hs.linkText || 'AILIT Framework – Resources',
    phdTitle: phd.title || 'Industrial PhD',
    phdP1: phd.p1 || '',
    phdP2: phd.p2 || '',
    phdP3: phd.p3 || '',
    phdBtnContact: m.PhD?.btnContact || phd.btnContact || 'Contact Us',
    industryTitle: ind.title || 'Industry engagement',
    industryDescription: ind.description || '',
    industryBtnContact: indBtns.contact || 'Contact the industry team',
    industryBtnExplore: indBtns.explore || 'Explore all projects',
    partnersTitle: part.title || 'Partners',
    partnersMapTitle: part.mapTitle || 'Partners Map',
  };
}

function mapNewsPage(msg) {
  const ne = msg?.['news&events'] || {};
  const nw = ne.news || {};
  const cat = nw.categories || {};
  const art = nw.article || {};

  return {
    newsTitle: nw.title || 'News & Events',
    newsSubtitle: nw.subtitle || '',
    newsLatest: nw.latest || 'Latest from AIRI',
    newsQuickFilters: nw.quickFilters || 'Quick filters',
    newsSearchLabel: nw.searchLabel || 'Search news',
    newsSearchPlaceholder: nw.searchPlaceholder || 'Search titles...',
    newsStories: nw.stories || 'stories',
    newsReadStory: nw.readStory || 'Read story',
    newsSpotlight: nw.spotlight || 'Spotlight',
    newsNoSummary: nw.noSummary || 'No summary provided yet.',
    newsOpenArticle: nw.openArticle || 'Open article',
    newsEmptyState: nw.emptyState || 'No news available.',
    newsNoImage: nw.noImage || 'No image',
    newsReadMore: nw.readMore || 'Read more',
    newsViewArticle: nw.viewArticle || 'View article',
    categoryAll: cat.all || 'All',
    categoryAnnouncement: cat.announcement || 'Announcements',
    categoryConstruction: cat.construction || 'Construction',
    categoryCollaboration: cat.collaboration || 'Collaborations',
    categoryAward: cat.award || 'Awards',
    categoryPress: cat.press || 'Press',
    categoryOther: cat.other || 'Other',
    articleBackToNews: art.backToNews || 'Back to News',
    articleReadOnLinkedIn: art.readOnLinkedIn || 'Read on LinkedIn',
    articleGallery: art.gallery || 'Gallery',
    articleTags: art.tags || 'Tags',
    articleRelatedProjects: art.relatedProjects || 'Related Projects',
    articleFeaturedPeople: art.featuredPeople || 'Featured People',
    articleRelatedDepartments: art.relatedDepartments || 'Related Departments',
  };
}

function mapAwardsPage(msg) {
  const ne = msg?.['news&events'] || {};
  const aw = ne.awards || {};
  const art = ne.news?.article || {};
  return {
    awardsTitle: aw.title || 'Awards',
    awardsSubtitle: aw.subtitle || '',
    awardsSearchLabel: 'Search awards',
    awardsSearchPlaceholder: 'Search by keyword, recipient, or tag...',
    awardsStories: 'awards',
    awardsReadStory: 'Read full story',
    awardsViewArticle: 'View article',
    awardsEmptyState: 'No awards found matching your criteria.',
    awardsNoImage: 'No image available',
    awardsBackToAwards: 'Back to Awards',
    articleReadOnLinkedIn: art.readOnLinkedIn || 'Read on LinkedIn',
    articleGallery: art.gallery || 'Gallery',
    articleTags: art.tags || 'Tags',
    articleRelatedProjects: art.relatedProjects || 'Related Projects',
    articleFeaturedPeople: art.featuredPeople || 'Featured People',
    articleRelatedDepartments: art.relatedDepartments || 'Related Departments',
  };
}

function mapEventsPage(msg) {
  const ne = msg?.['news&events'] || {};
  const ev = ne.events || {};
  return {
    eventsTitle: ev.title || 'Events',
    eventsSubtitle: ev.subtitle || '',
    eventsCalendarTitle: ev['calendar-title'] || ev.calendarTitle || 'Institute Calendar',
    eventsNoEvents: ev['no-events'] || ev.noEvents || 'No events available.',
    eventsStartLabel: 'Start:',
    eventsEndLabel: 'End:',
    eventsLocationLabel: 'Location:',
    eventsAgendaTitle: 'Event Agenda',
    eventsSpeakersTitle: 'Speakers & Guests',
    eventsResourcesTitle: 'Resources & Downloads',
    eventsRegisterButton: 'Register Now',
    eventsRegistrationClosed: 'Registration Closed',
    eventsSaveToCalendar: 'Save to Calendar',
    eventsBackToEvents: 'Back to Events'
  };
}

function mapCareersPage(msg) {
  const ne = msg?.['news&events'] || {};
  const cr = ne.careers || {};
  return {
    careersTitle: cr.title || 'Career Opportunities',
    careersSubtitle: cr.subtitle || '',
    careersComingSoon: cr['coming-soon'] || cr.comingSoon || 'More information coming soon.',
    careersUndergrad: cr.undergraduate || cr.undergrad || 'As an Undergraduate Student',
    careersPostgrad: cr.postgraduate || cr.postgrad || 'As a Post-Graduate Student',
    careersPostdoc: cr.postdoctoral || cr.postdoc || 'As a Postdoctoral Researcher',
    careersVisiting: cr['visiting-researcher'] || cr.visiting || 'As a Visiting Researcher',
    careersSoftwareEngineer: cr['software-engineer'] || cr.softwareEngineer || 'As a Software Engineer',
  };
}

function mapOpenCallsPage(msg) {
  const ne = msg?.['news&events'] || {};
  const op = ne['open-project-calls'] || ne.openCalls || {};
  return {
    openCallsTitle: op.title || 'Calls for Projects',
    openCallsSubtitle: op.subtitle || '',
    openCallsComingSoon: op['coming-soon'] || op.comingSoon || 'More updates coming soon.',
  };
}

function mapSeminarsPage(msg) {
  const ne = msg?.['news&events'] || {};
  const sm = ne.seminars || {};
  return {
    seminarsTitle: sm.title || 'Seminars',
    seminarsSubtitle: sm.subtitle || '',
    seminarsEmptyState: sm.emptyState || 'No seminars available.',
    seminarsWhatYouWillLearn: sm.whatYouWillLearn || 'What you will learn',
    seminarsModules: sm.modules || 'Modules',
  };
}

function mapPeoplePage(msg) {
  const p = msg?.people || {};
  const t = p.tabs || {};
  const d = p.details || {};
  const pr = p.projectDetails || p.project || {};
  const ph = pr.phases || {};

  return {
    title: p.title || 'People',
    subtitle: p.subtitle || 'Meet the team behind AIRi @ UTCN',
    searchPlaceholder: p.searchPlaceholder || 'Search by name...',
    clearSearch: p.clearSearch || 'Clear search',
    tabResearchers: t.researchers || 'Researchers',
    tabStaff: t.staff || 'Staff',
    tabStudents: t.students || 'Students',
    tabVisiting: t.visiting || 'Visiting Researchers',
    tabExternal: t.external || 'External Collaborators',
    tabAlumni: t.alumni || 'Alumni',
    resultsSingular: p.results || p.resultsSingular || 'Found {count} member',
    resultsPlural: p.resultsPlural || 'Found {count} members',
    emptySearch: p.emptySearch || 'No members match search.',
    emptyTab: p.emptyTab || 'No members found in this category.',
    detailsPublications: d.publications || 'Publications',
    detailsTeams: d.teams || 'Teams',
    detailsSearchPubs: d.searchPubs || 'Search publications...',
    detailsAllYears: d.allYears || 'All Years',
    detailsAllTypes: d.allTypes || 'All Types',
    detailsAllDomains: d.allDomains || 'All Research Areas',
    detailsClear: d.clear || 'Clear',
    detailsViewDetails: d.viewDetails || 'View Details',
    detailsPdf: d.pdf || 'PDF',
    detailsLead: d.lead || 'Lead',
    detailsProjects: d.projects || 'Projects',
    detailsNoPubs: d.noPubs || 'No publications found.',
    detailsNoPubsMatch: d.noPubsMatch || 'No publications match search.',
    detailsNoTeams: d.noTeams || 'No teams assigned.',
    projectBackToProfile: pr.backToProfile || '← Back to Profile',
    projectBackToStaffProfile: pr.backToStaffProfile || '← Back to Staff Profile',
    projectDetailsTitle: pr.projectDetails || pr.detailsTitle || 'Project Details',
    projectVisitWebsite: pr.visitWebsite || 'Visit Project Website',
    projectDocumentation: pr.documentation || 'Project Documentation',
    projectTimeline: pr.projectTimeline || pr.timeline || 'Timeline',
    projectResources: pr.resources || 'Resources',
    projectRelatedPublications: pr.relatedPublications || 'Related Publications',
    projectTeam: pr.projectTeam || pr.team || 'Project Team',
    projectLead: pr.lead || 'Project Lead',
    projectMembers: pr.members || 'Project Members',
    projectPartners: pr.partners || 'Partners',
    projectThemes: pr.themes || 'Research Themes',
    projectResearchAreas: pr.researchAreas || 'Research Areas',
    phaseCompleted: ph.completed || 'Completed',
    phasePlanned: ph.planned || 'Planned',
    phaseOngoing: ph.ongoing || 'Ongoing',
  };
}

function mapResearchPage(msg) {
  const r = msg?.research || {};
  const d = r.departments || {};
  const dt = d.types || {};
  const dp = d.departmentDetails || r.department || {};
  const dpTabs = dp.tabs || {};
  const dpProj = dp.projects || {};
  const dpPubs = dp.publications || {};
  const dpMemb = dp.members || {};
  const pr = r.projects || {};
  const pb = r.publications || {};
  const th = r.themes || {};

  return {
    departmentsTitle: d.title || 'Departments',
    departmentsSubtitle: d.subtitle || '',
    departmentsMembersCount: d.members || d.membersCount || '{count} members',
    departmentsProjectsCount: d.projects || d.projectsCount || '{count} projects',
    departmentTypeResearch: dt.research || 'Research Departments',
    departmentTypeNetworks: dt.research_networks || dt.networks || 'Research Networks',
    departmentTypeSupport: dt.support || 'Support Departments',
    departmentTypeOther: dt.other || 'Departments',
    depBackToDepartments: dp.backToDepartments || '← Back to Departments',
    depNotFound: dp.notFound || 'Department not found.',
    depTabOverview: dpTabs.overview || 'Overview',
    depTabMembers: dpTabs.members || 'Members',
    depTabProjects: dpTabs.projects || 'Projects',
    depTabPublications: dpTabs.publications || 'Publications',
    depProjectsDescription: dpProj.noProjects || '',
    depPublicationsDescription: dpPubs.noPublications || '',
    depNoMembers: dpMemb.noMembers || 'No members.',
    depNoProjects: dpProj.noProjects || 'No projects.',
    depNoPublications: dpPubs.noPublications || 'No publications.',
    projectsTitle: pr.title || 'Projects',
    projectsSubtitle: pr.subtitle || '',
    projectsSearchPlaceholder: pr.searchPlaceholder || 'Search projects...',
    projectsAllRegions: pr.allRegions || 'All Regions',
    projectsAllDepartments: pr.allDepartments || 'All Departments',
    projectsAllLeads: pr.allLeads || 'All Project Leads',
    projectsAllMembers: pr.allMembers || 'All Project Members',
    projectsResultsSingular: pr.projectsFound || pr.resultsSingular || 'Found {count} project',
    projectsResultsPlural: pr.projectsFoundPlural || pr.resultsPlural || 'Found {count} projects',
    projectsEmptyState: pr.noProjects || pr.emptyState || 'No projects match.',
    publicationsTitle: pb.title || 'Publications',
    publicationsSubtitle: pb.subtitle || '',
    publicationsSearchPlaceholder: pb.searchPlaceholder || 'Search publications...',
    publicationsAllYears: pb.allYears || 'All Years',
    publicationsAllTypes: pb.allTypes || 'All Types',
    publicationsAllThemes: pb.allThemes || 'All Themes',
    publicationsAllAuthors: pb.allAuthors || 'All Authors',
    publicationsResultsSingular: pb.publicationsFound || pb.resultsSingular || 'Found {count} publication',
    publicationsResultsPlural: pb.publicationsFoundPlural || pb.resultsPlural || 'Found {count} publications',
    publicationsEmptyState: pb.noPublications || pb.emptyState || 'No publications match.',
    themesTitle: th.title || 'Research Themes',
    themesSubtitle: th.subtitle || '',
    themesSearchPlaceholder: pr.searchPlaceholder || 'Search themes...',
  };
}

function mapResourcesPage(msg) {
  const res = msg?.resources || {};
  return {
    title: res.title || 'Resources',
    subtitle: res.subtitle || '',
    searchPlaceholder: res.searchPlaceholder || 'Search resources...',
    allCategories: res.allCategories || 'All categories',
    clearFilters: res.clearFilters || 'Clear filters',
    clearAllFilters: res.clearAllFilters || 'Clear all filters',
    showingText: res.showing || res.showingText || 'Showing {filtered} of {total} resources',
    filteredText: res.filtered || res.filteredText || '(filtered from {total})',
    featuredResources: res.featuredResources || 'Featured Resources',
    allResources: res.allResources || 'All Resources',
    noResourcesFound: res.noResourcesFound || 'No resources found',
    noResourcesFilterMatch: res.noResourcesFilterMatch || 'No resources match criteria.',
    noResourcesYet: res.noResourcesYet || 'Resources will appear here.',
    visitResource: res.visitResource || 'Visit Resource',
  };
}

function mapMediaPage(msg) {
  const m = msg?.media || {};
  return {
    headerTitle: m['header-title'] || m.headerTitle || 'Media Gallery',
    headerSubtitle: m['header-subtitle'] || m.headerSubtitle || '',
  };
}

function mapSearchPage(msg) {
  const s = msg?.search || {};
  const cb = s.chatbot || {};
  const cl = s.classic || {};
  const kg = s.knowledgeGraph || s.graph || {};

  return {
    chatbotTitle: cb.title || 'AIRi Chatbot',
    chatbotCardTitle: cb.cardTitle || 'AIRi Chatbot',
    chatbotComingSoon: cb.comingSoon || 'Coming soon...',
    classicTitle: cl.title || '🔍 Search',
    classicPlaceholder: cl.placeholder || 'Type to search...',
    classicResultsSingular: cl.resultsSingular || '{count} result for',
    classicResultsPlural: cl.resultsPlural || '{count} results for',
    classicNoMatches: cl.noMatches || 'No matches!',
    classicFilterAll: 'All',
    classicFilterPages: 'Pages',
    classicFilterArticles: 'Articles',
    classicFilterPeople: 'People',
    classicFilterProjects: 'Projects',
    graphTitle: kg.title || 'Knowledge Graphs',
    graphCardTitle: kg.cardTitle || 'Interactive Graphs',
    graphComingSoon: kg.comingSoon || 'Visual knowledge graphs...',
  };
}

function mapTimelinePage(msg) {
  const tl = msg?.timeline || msg?.about?.history || {};
  const rawEvents = tl.events || (msg?.about?.history ? msg.about.history : {});

  const events = Object.entries(rawEvents)
    .filter(([k]) => k.startsWith('event'))
    .sort(([k1], [k2]) => k1.localeCompare(k2))
    .map(([_, e]) => ({
      date: parseDateForStrapi(e.date),
      title: e.title || '',
      description: e.description || [e.descriptionPart1, e.descriptionPart2].filter(Boolean).join(' ') || '',
    }));

  return {
    title: tl.title || '📅 AIRI Timeline',
    events,
  };
}

const MAPPERS = {
  'api::global.global': mapGlobal,
  'api::home-page.home-page': mapHomePage,
  'api::about-page.about-page': mapAboutPage,
  'api::contact-page.contact-page': mapContactPage,
  'api::engagement-page.engagement-page': mapEngagementPage,
  'api::news-page.news-page': mapNewsPage,
  'api::awards-page.awards-page': mapAwardsPage,
  'api::events-page.events-page': mapEventsPage,
  'api::careers-page.careers-page': mapCareersPage,
  'api::open-calls-page.open-calls-page': mapOpenCallsPage,
  'api::seminars-page.seminars-page': mapSeminarsPage,
  'api::people-page.people-page': mapPeoplePage,
  'api::research-page.research-page': mapResearchPage,
  'api::resources-page.resources-page': mapResourcesPage,
  'api::media-page.media-page': mapMediaPage,
  'api::search-page.search-page': mapSearchPage,
  'api::timeline-page.timeline-page': mapTimelinePage,
};

async function migrateSingleType(app, uid, mapper, allMessages) {
  const docService = app.documents(uid);

  // 1. Fetch all existing documents across all locales
  const existingDocs = await docService.findMany({ locale: '*' });

  // Find the primary document (prefer 'en')
  let primary = existingDocs.find((d) => d.locale === 'en') || existingDocs[0];
  let documentId = primary?.documentId;

  const enData = mapper(allMessages['en'] || {});

  if (!primary) {
    primary = await docService.create({
      data: enData,
      locale: 'en',
    });
    documentId = primary.documentId;
    console.log(`  ➕ Created primary [${uid}] in locale [en]`);
  } else {
    documentId = primary.documentId;
    await docService.update({
      documentId,
      locale: 'en',
      data: enData,
    });
    console.log(`  🔄 Updated [${uid}] in locale [en] (docId: ${documentId})`);
  }

  // Delete any orphan documents that have a DIFFERENT documentId
  const orphanEntries = existingDocs.filter((d) => d.documentId !== documentId);
  for (const orphan of orphanEntries) {
    try {
      await docService.delete({ documentId: orphan.documentId, locale: orphan.locale });
      console.log(`  🗑️ Deleted orphan [${uid}] docId: ${orphan.documentId} locale: ${orphan.locale}`);
    } catch (e) {
      console.warn(`  ⚠️ Failed to delete orphan docId ${orphan.documentId} locale ${orphan.locale}:`, e.message);
    }
  }

  // 2. Loop over all other locales and ensure they are under the same documentId
  for (const [locale, messages] of Object.entries(allMessages)) {
    if (locale === 'en') continue;

    const localizedData = mapper(messages);
    try {
      const existingInTargetDoc = await docService.findOne({
        documentId,
        locale,
      });

      if (!existingInTargetDoc) {
        await docService.create({
          documentId,
          locale,
          data: localizedData,
        });
        console.log(`    ➕ Added [${uid}] locale: ${locale}`);
      } else {
        await docService.update({
          documentId,
          locale,
          data: localizedData,
        });
        console.log(`    🔄 Updated [${uid}] locale: ${locale}`);
      }
    } catch (err) {
      console.warn(`    ⚠️ Failed locale ${locale} for [${uid}]:`, err.message);
    }
  }
}

async function run() {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');

  console.log('🚀 Booting Strapi for i18n data migration...');
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  app.log.level = 'error';

  try {
    console.log('\n🌍 Checking and creating Strapi locales...');
    await ensureLocales(app);

    console.log('\n📖 Loading JSON messages...');
    const allMessages = loadAllMessages();
    console.log(`Found ${Object.keys(allMessages).length} locales: ${Object.keys(allMessages).join(', ')}`);

    console.log('\n💾 Migrating Single Types and translations into Strapi...');
    for (const [uid, mapper] of Object.entries(MAPPERS)) {
      console.log(`\n📦 Processing: ${uid}`);
      await migrateSingleType(app, uid, mapper, allMessages);
    }

    console.log('\n🎉 Successfully migrated all internationalized content to Strapi!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await app.destroy();
    process.exit(0);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
