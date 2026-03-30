export const metadata = {
  title: "People",
  description: "Meet the researchers, staff, and visiting scholars of the Artificial Intelligence Research Institute at UTCN.",
};

import { getStaff, transformStaffData, PERSON_TYPE_FILTERS } from "@/lib/strapi";
import PeopleClient from "./PeopleClient";

export default async function PeoplePage() {
  // Fetch all person types in parallel
  const [staffData, researchersData, visitingData, studentsData, externalData, alumniData] = await Promise.all([
    getStaff({ types: PERSON_TYPE_FILTERS.staff }),
    getStaff({ types: PERSON_TYPE_FILTERS.researchers }),
    getStaff({ types: PERSON_TYPE_FILTERS.visiting }),
    getStaff({ types: PERSON_TYPE_FILTERS.students }),
    getStaff({ types: PERSON_TYPE_FILTERS.external }),
    getStaff({ types: PERSON_TYPE_FILTERS.alumni }),
  ]);

  return (
    <PeopleClient
      staff={transformStaffData(staffData)}
      researchers={transformStaffData(researchersData)}
      visiting={transformStaffData(visitingData)}
      students={transformStaffData(studentsData)}
      external={transformStaffData(externalData)}
      alumni={transformStaffData(alumniData)}
    />
  );
}
