export const metadata = {
  title: "People",
  description: "Meet the researchers, staff, and visiting scholars of the Artificial Intelligence Research Institute at UTCN.",
};

import { getStaff, transformStaffData, buildPeopleDirectory } from "@/lib/strapi";
import PeopleClient from "./PeopleClient";

export default async function PeoplePage() {
  const staffData = await getStaff();
  const staff = transformStaffData(staffData);

  return <PeopleClient groups={buildPeopleDirectory(staff)} />;
}
