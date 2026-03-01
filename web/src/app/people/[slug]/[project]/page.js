import { notFound } from "next/navigation";
import {
  getProjectBySlug,
  getStaffMember,
  transformProjectData,
  transformPublicationData,
  transformStaffData,
} from "@/lib/strapi";
import ProjectDetailClient from "./ProjectDetailClient";

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

  // Projects are now resolved via getProjectBySlug; person no longer carries project relations
  let projectEntry = null;
  let projectStrapi = null;

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

  const projectData = projectStrapi?.attributes ?? projectStrapi;
  const publications = transformPublicationData(
    projectData?.publications?.data ?? projectData?.publications ?? []
  ).map(({ _strapi: _ignored, ...item }) => item);

  // Build flat team member list from the teams relation
  const teamMembers = (projectEntry.teams || []).flatMap((team) =>
    (team.members || []).map((m) => ({
      ...(m.person || {}),
      role: m.role || '',
      isLead: !!m.isLead,
      teamName: team.name || '',
      isPrimary: m.person?.slug === person.slug,
    }))
  );

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
