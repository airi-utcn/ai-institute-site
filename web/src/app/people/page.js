export const metadata = {
  title: "AIRi @ UTCN – People",
};

import { getStaff, transformStaffData, PERSON_TYPE_FILTERS } from "@/lib/strapi";
import PeopleClient from "./PeopleClient";

export default async function PeoplePage() {
  // Fetch all person types in parallel
  const [staffData, researchersData, visitingData, alumniData] = await Promise.all([
    getStaff({ types: PERSON_TYPE_FILTERS.staff }),
    getStaff({ types: PERSON_TYPE_FILTERS.researchers }),
    getStaff({ types: PERSON_TYPE_FILTERS.visiting }),
    getStaff({ types: PERSON_TYPE_FILTERS.alumni }),
  ]);

  return (
    <PeopleClient
      staff={transformStaffData(staffData)}
      researchers={transformStaffData(researchersData)}
      visiting={transformStaffData(visitingData)}
      alumni={transformStaffData(alumniData)}
    />
  );
}
