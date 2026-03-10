/**
 * JSON-LD structured data helpers for SEO.
 * @see https://schema.org
 * @see https://developers.google.com/search/docs/appearance/structured-data
 */

const SITE_URL = "https://airi.utcluj.ro";
const ORG_NAME = "AIRi – Artificial Intelligence Research Institute";
const PARENT_ORG = "Technical University of Cluj-Napoca";

// ─── Organisation ────────────────────────────────────────────────────────────

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ResearchOrganization",
    name: ORG_NAME,
    alternateName: ["AIRi", "AIRi @ UTCN", "AIRI"],
    url: SITE_URL,
    logo: `${SITE_URL}/media/Logos/airi-logo.png`,
    description:
      "The Artificial Intelligence Research Institute at the Technical University of Cluj-Napoca advances research, innovation, and interdisciplinary collaboration in AI.",
    parentOrganization: {
      "@type": "CollegeOrUniversity",
      name: PARENT_ORG,
      url: "https://www.utcluj.ro",
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Cluj-Napoca",
      addressCountry: "RO",
    },
  };
}

// ─── WebSite (enables site-level search in Google) ───────────────────────────

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: ORG_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search/classic?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

// ─── Person (researcher profile) ─────────────────────────────────────────────

export function personJsonLd(person) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: person.name,
    url: `${SITE_URL}/people/${person.slug}`,
    affiliation: {
      "@type": "ResearchOrganization",
      name: ORG_NAME,
      url: SITE_URL,
    },
  };

  if (person.title) data.jobTitle = person.title;
  if (person.email) data.email = `mailto:${person.email}`;
  if (person.image) data.image = person.image;
  if (person.department) {
    data.worksFor = {
      "@type": "Organization",
      name: person.department,
    };
  }

  return data;
}

// ─── Article (news article) ──────────────────────────────────────────────────

export function articleJsonLd(article) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description || article.excerpt || "",
    url: article.url || `${SITE_URL}/news&events/news`,
    publisher: {
      "@type": "Organization",
      name: ORG_NAME,
      url: SITE_URL,
    },
  };

  if (article.datePublished) data.datePublished = article.datePublished;
  if (article.dateModified) data.dateModified = article.dateModified;
  if (article.image) data.image = article.image;
  if (article.author) {
    data.author = {
      "@type": "Person",
      name: article.author,
    };
  }

  return data;
}

// ─── ResearchProject ─────────────────────────────────────────────────────────

export function projectJsonLd(project) {
  const data = {
    "@context": "https://schema.org",
    "@type": "ResearchProject",
    name: project.title,
    url: `${SITE_URL}/research/projects/${project.slug}`,
    description: project.abstract || project.description || "",
    parentOrganization: {
      "@type": "ResearchOrganization",
      name: ORG_NAME,
      url: SITE_URL,
    },
  };

  if (project.startDate) data.startDate = project.startDate;
  if (project.endDate) data.endDate = project.endDate;
  if (project.funder) {
    data.funder = { "@type": "Organization", name: project.funder };
  }

  return data;
}

// ─── ScholarlyArticle (publication) ──────────────────────────────────────────

export function publicationJsonLd(pub) {
  const data = {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    headline: pub.title,
    url: `${SITE_URL}/research/publications/${pub.slug}`,
  };

  if (pub.year) data.datePublished = String(pub.year);
  if (pub.description) data.description = pub.description;
  if (pub.domain) data.about = pub.domain;

  const authors = Array.isArray(pub.authors)
    ? pub.authors.map((a) => ({
        "@type": "Person",
        name: typeof a === "string" ? a : a?.name || "",
      })).filter((a) => a.name)
    : [];
  if (authors.length) data.author = authors;

  return data;
}

// ─── Event ───────────────────────────────────────────────────────────────────

export function eventJsonLd(event) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title || event.name,
    description: event.description || "",
    organizer: {
      "@type": "Organization",
      name: ORG_NAME,
      url: SITE_URL,
    },
    location: {
      "@type": "Place",
      name: event.location || "Technical University of Cluj-Napoca",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Cluj-Napoca",
        addressCountry: "RO",
      },
    },
  };

  if (event.startDate) data.startDate = event.startDate;
  if (event.endDate) data.endDate = event.endDate;
  if (event.url) data.url = event.url;

  return data;
}

// ─── BreadcrumbList ──────────────────────────────────────────────────────────

export function breadcrumbJsonLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url ? `${SITE_URL}${item.url}` : undefined,
    })),
  };
}

// ─── Helper: render a JSON-LD script tag ─────────────────────────────────────

export function JsonLd({ data }) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}