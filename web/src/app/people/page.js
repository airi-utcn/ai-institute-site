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
  getTeamsGraphData 
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

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const people = await getSingleType("people-page", locale);

  return {
    title: people?.title || "People",
    description: people?.subtitle || "Meet the researchers, staff, and visiting scholars of the Artificial Intelligence Research Institute at UTCN.",
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
      rawTeams
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
    ]);

    const staff = transformStaffData(staffData);
    const researchers = transformStaffData(researchersData);
    const visiting = transformStaffData(visitingData);
    const students = transformStaffData(studentsData);
    const external = transformStaffData(externalData);
    const alumni = transformStaffData(alumniData);

    const enrichedResearchers = await attachScholarCitationCounts(researchers);
    const enrichedGraphPeople = await attachScholarCitationCounts(graphPeopleData);

    const { nodes, links, departmentColors } = buildGraph(enrichedGraphPeople, normalizeTeams(rawTeams));

    return (
    <>
      <FallbackDisclaimer isFallback={pageData?._isFallback} />
      <PeopleClient
        staff={staff}
        researchers={enrichedResearchers}
        visiting={visiting}
        students={students}
        external={external}
        alumni={alumni}
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
