import { canonical } from "@/lib/metadata";
import FallbackDisclaimer from "@/components/FallbackDisclaimer";
/**
 * app/people/page.js
 *
 * Server component — fetches people from Strapi, enriches researchers with
 * Google Scholar citation counts, and builds graph connection data, then hands
 * everything to PeopleClient.
 */

import { cookies } from "next/headers";
import { 
  getStaff, 
  transformStaffData, 
  PERSON_TYPE_FILTERS, 
  getSingleType,
  getPeopleGraphData, 
  getTeamsGraphData,
  getProjectsGraphData,
  getTeams,
  transformTeamData,
  isProjectArchived,
  isFormerResearcher as isFormerResearcherRecord
} from "@/lib/strapi";
import { attachScholarCitationCounts } from "@/lib/googleScholar";
import { buildGraph } from "./graphModel";
import PeopleClient from "./PeopleClient";

function normalizeTeams(rawTeams) {
  return (rawTeams || []).map((t) => {
    const attr = t?.attributes ?? t ?? {};
    const memberIds = (attr.members || [])
      .map((m) => {
        const person = m?.person?.data ?? m?.person;
        return person?.id ?? null;
      })
      .filter((id) => id != null);
    return { id: t?.id ?? null, name: attr.name || null, memberIds };
  });
}

function normalizeProjects(rawProjects) {
  return (rawProjects || []).map((p) => {
    const attr = p?.attributes ?? p ?? {};
    const memberIds = (attr.individualContributors || [])
      .map((m) => {
        const person = m?.person?.data ?? m?.person;
        return person?.id ?? null;
      })
      .filter((id) => id != null);
    return {
      id: p?.id ?? null,
      title: attr.title || null,
      memberIds,
      startDate: attr.startDate || null,
      endDate: attr.endDate || null,
      isArchived: isProjectArchived(p),
    };
  });
}

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const people = await getSingleType("people-page", locale);

  return {
    title: people?.title || "People",
    description: people?.subtitle || "Meet the researchers, staff, and visiting scholars of the Artificial Intelligence Research Institute at UTCN.",
    alternates: canonical('/people'),
  };
}

export default async function PeoplePage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";

  try {
    const [
      staffData, 
      researchersData, 
      visitingData, 
      studentsData, 
      externalData, 
      alumniData, 
      pageData,
      graphPeopleData,
      rawTeams,
      rawProjects,
      allTeamsRaw
    ] = await Promise.all([
      getStaff({ types: PERSON_TYPE_FILTERS.staff }),
      getStaff({ types: PERSON_TYPE_FILTERS.researchers }),
      getStaff({ types: PERSON_TYPE_FILTERS.visiting }),
      getStaff({ types: PERSON_TYPE_FILTERS.students }),
      getStaff({ types: PERSON_TYPE_FILTERS.external }),
      getStaff({ types: PERSON_TYPE_FILTERS.alumni }),
      getSingleType("people-page", locale),
      getPeopleGraphData(),
      getTeamsGraphData(),
      getProjectsGraphData(),
      getTeams(),
    ]);

    const staff = transformStaffData(staffData);
    const researchers = transformStaffData(researchersData);
    const visiting = transformStaffData(visitingData);
    const students = transformStaffData(studentsData);
    const external = transformStaffData(externalData);
    const alumni = transformStaffData(alumniData);

    const enrichedResearchers = await attachScholarCitationCounts(researchers);
    const enrichedGraphPeople = await attachScholarCitationCounts(graphPeopleData);

    const allTeams = transformTeamData(allTeamsRaw);
    const activeTeams = allTeams.filter((t) => !t.isArchived);
    const archivedTeams = allTeams.filter((t) => t.isArchived);
    const projects = normalizeProjects(rawProjects);

    // A researcher is "former" when they are linked to at least one project and
    // none of those projects are still running. People with no project data at
    // all are kept in the active list rather than guessed at.
    const teamsByPersonSlug = new Map();
    for (const team of allTeams) {
      for (const member of team.members || []) {
        const slug = member?.person?.slug;
        if (!slug) continue;
        if (!teamsByPersonSlug.has(slug)) teamsByPersonSlug.set(slug, []);
        teamsByPersonSlug.get(slug).push(team);
      }
    }

    const projectsByPersonId = new Map();
    for (const project of projects) {
      for (const personId of project.memberIds || []) {
        if (!projectsByPersonId.has(personId)) projectsByPersonId.set(personId, []);
        projectsByPersonId.get(personId).push(project);
      }
    }

    const isFormerResearcher = (person) => {
      const personTeams = teamsByPersonSlug.get(person.slug) || [];
      const associatedProjects = [
        ...personTeams.flatMap((team) => team.projects || []),
        ...(projectsByPersonId.get(person.id) || []),
      ];
      if (associatedProjects.length === 0) return false;
      return isFormerResearcherRecord(person, associatedProjects);
    };

    const formerResearchers = enrichedResearchers.filter(isFormerResearcher);
    const activeResearchers = enrichedResearchers.filter((person) => !isFormerResearcher(person));

    const { nodes, links, departmentColors } = buildGraph(
      enrichedGraphPeople,
      normalizeTeams(rawTeams),
      projects
    );

    return (
    <>
      <FallbackDisclaimer isFallback={pageData?._isFallback} />
      <PeopleClient
        staff={staff}
        researchers={activeResearchers}
        formerResearchers={formerResearchers}
        visiting={visiting}
        students={students}
        external={external}
        alumni={alumni}
        teams={activeTeams}
        archivedTeams={archivedTeams}
        pageData={pageData}
        graphNodes={nodes}
        graphLinks={links}
        departmentColors={departmentColors}
      />
    </>
    );
  } catch (error) {
    console.error("Error fetching people data:", error);
    return <div>Error loading data. Please try again later.</div>;
  }
}
