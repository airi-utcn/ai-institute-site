/**
 * app/people/page.js
 *
 * Server component — fetches people from Strapi, enriches researchers with
 * Google Scholar citation counts, then hands everything to PeopleClient.
 */

export const metadata = {
  title: "People",
  description:
    "Meet the researchers, staff, and visiting scholars of the Artificial Intelligence Research Institute at UTCN.",
};

import { getStaff, transformStaffData, PERSON_TYPE_FILTERS } from "@/lib/strapi";
import { attachScholarCitationCounts } from "@/lib/googleScholar";
import PeopleClient from "./PeopleClient";

export default async function PeoplePage() {
  try {
    const [staffData, researchersData, visitingData, studentsData, externalData, alumniData] = await Promise.all([
      getStaff({ types: PERSON_TYPE_FILTERS.staff }),
      getStaff({ types: PERSON_TYPE_FILTERS.researchers }),
      getStaff({ types: PERSON_TYPE_FILTERS.visiting }),
      getStaff({ types: PERSON_TYPE_FILTERS.students }),
      getStaff({ types: PERSON_TYPE_FILTERS.external }),
      getStaff({ types: PERSON_TYPE_FILTERS.alumni }),
    ]);

    const staff = transformStaffData(staffData);
    const researchers = transformStaffData(researchersData);
    const visiting = transformStaffData(visitingData);
    const students = transformStaffData(studentsData);
    const external = transformStaffData(externalData);
    const alumni = transformStaffData(alumniData);

    const enrichedResearchers = await attachScholarCitationCounts(researchers);

    return (
      <PeopleClient
        staff={staff}
        researchers={enrichedResearchers}
        visiting={visiting}
        students={students}
        external={external}
        alumni={alumni}
      />
    );
  } catch (error) {
    console.error("Error fetching people data:", error);
    return <div>Error loading data. Please try again later.</div>;
  }
}
