export const metadata = {
  title: "Research Departments",
  description: "Research departments and units within the Artificial Intelligence Research Institute at UTCN.",
};

import { cookies } from "next/headers";
import DepartmentsClient from "./DepartmentsClient";
import {
  getDepartments,
  getProjects,
  getPublications,
  getStaff,
  getSingleType,
  transformDepartmentData,
  transformProjectData,
  transformPublicationData,
  transformStaffData,
} from "@/lib/strapi";

export default async function ResearchPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";

  const [staffData, departmentData, projectsData, publicationsData, pageData] = await Promise.all([
    getStaff(),
    getDepartments({ slim: true }),
    getProjects(),
    getPublications(),
    getSingleType("research-page", locale),
  ]);

  const staff = transformStaffData(staffData);
  const departments = transformDepartmentData(departmentData);
  const projects = transformProjectData(projectsData);
  const publications = transformPublicationData(publicationsData);

  return (
    <DepartmentsClient
      staffData={staff}
      departments={departments}
      projects={projects}
      publications={publications}
      pageData={pageData}
    />
  );
}
