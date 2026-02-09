import { notFound } from "next/navigation";
import {
  getProjectBySlug,
  getStaffMember,
  transformProjectData,
  transformPublicationData,
  transformStaffData,
} from "@/lib/strapi";
import ProjectDetailClient from "./ProjectDetailClient";

const toSlug = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const slugMatchesProject = (project, target) => {
  if (!project) return false;
  const normalizedTarget = toSlug(target);
  const candidates = [
    project.slug,
    toSlug(project.slug),
    toSlug(project.title),
  ].filter(Boolean);
  return candidates.some((candidate) => candidate === target || candidate === normalizedTarget);
};

const matchesPerson = (value, person) => {
  if (!value || !person) return false;
  const key = toSlug(value);
  return key === toSlug(person.slug) || key === toSlug(person.name);
};

export default async function ProjectDetailPage({ params }) {
  // In Next.js 15+, params is a Promise
  const resolvedParams = await params;
  const slugParam = Array.isArray(resolvedParams?.slug) ? resolvedParams.slug[0] : resolvedParams?.slug;
  const projectParam = Array.isArray(resolvedParams?.project) ? resolvedParams.project[0] : resolvedParams?.project;

  if (!slugParam || !projectParam) {
    notFound();
  }

  const strapiPerson = await getStaffMember(slugParam);
  if (!strapiPerson) {
    notFound();
  }

  const [person] = transformStaffData([strapiPerson]);
  if (!person) {
    notFound();
  }

  // Handle both Strapi 4 (with attributes) and Strapi 5 (flat) formats
  const personData = strapiPerson.attributes ?? strapiPerson;

  const memberProjectsRaw = transformProjectData(
    personData.projects?.data ?? personData.projects ?? []
  );
  const leadingProjectsRaw = transformProjectData(
    personData.leading_projects?.data ?? personData.leading_projects ?? []
  );

  const combinedProjects = [...leadingProjectsRaw, ...memberProjectsRaw];

  let projectEntry = combinedProjects.find((project) =>
    slugMatchesProject(project, projectParam)
  );

  let projectStrapi = projectEntry?._strapi ?? null;

  if (!projectEntry || !projectStrapi) {
    const fetchedProject = await getProjectBySlug(projectParam);
    if (!fetchedProject) {
      notFound();
    }
    projectEntry = transformProjectData([fetchedProject])[0];
    projectStrapi = fetchedProject;
  }

  if (!projectEntry) {
    notFound();
  }

  if (!Array.isArray(projectEntry.body) || projectEntry.body.length === 0) {
    const fullProject = await getProjectBySlug(projectEntry.slug || projectParam);
    if (fullProject) {
      projectEntry = transformProjectData([fullProject])[0];
      projectStrapi = fullProject;
    }
  }

  const leadSlug = projectEntry.leadSlug || projectEntry.leadDetails?.slug || "";
  const leadName = projectEntry.leadName || projectEntry.lead || projectEntry.leadDetails?.name || "";

  const isLead = matchesPerson(leadSlug, person) || matchesPerson(leadName, person);
  const isMember = (projectEntry.members || []).some(
    (member) => matchesPerson(member.slug, person) || matchesPerson(member.name, person)
  );

  if (!isLead && !isMember) {
    notFound();
  }

  const projectData = projectStrapi?.attributes ?? projectStrapi;
  const publications = transformPublicationData(
    projectData?.publications?.data ?? projectData?.publications ?? []
  ).map(({ _strapi: _ignored, ...item }) => item);

  const leadIdentifier = projectEntry.leadDetails?.slug || projectEntry.leadSlug || "";

  let teamMembers = Array.isArray(projectEntry.members)
    ? projectEntry.members.map((member) => ({
        ...member,
        isLead:
          !!leadIdentifier && !!member?.slug && member.slug === leadIdentifier,
      }))
    : [];

  const hasLeadInTeam = teamMembers.some((member) => member.isLead);

  if (!hasLeadInTeam && (projectEntry.leadDetails?.name || projectEntry.leadName || projectEntry.lead)) {
    teamMembers = [
      {
        ...(projectEntry.leadDetails || {
          name: projectEntry.leadName || projectEntry.lead,
          slug: leadIdentifier,
        }),
        isLead: true,
      },
      ...teamMembers,
    ];
  }

  teamMembers = teamMembers.map((member) => ({
    ...member,
    isPrimary: member?.slug === person.slug,
  }));

  const { _strapi: _projectRaw, ...projectSerializable } = projectEntry;
  const teamSerializable = teamMembers.map(({ _strapi: _memberRaw, ...member }) => member);

  return (
    <ProjectDetailClient
      staffSlug={person.slug}
      project={projectSerializable}
      publications={publications}
      teamMembers={teamSerializable}
    />
  );
}
