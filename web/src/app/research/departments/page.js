export const metadata = {
  title: "ICIA - Research",
};

import ResearchClient from "./DepartmentsClient";
import {
  getDepartments,
  getProjects,
  getPublications,
  getStaff,
  transformDepartmentData,
  transformProjectData,
  transformPublicationData,
  transformStaffData,
} from "@/lib/strapi";

export default async function ResearchPage() {
  const [staffData, departmentData, projectsData, publicationsData] = await Promise.all([
    getStaff(),
    getDepartments(),
    getProjects(),
    getPublications(),
  ]);

  const staff = transformStaffData(staffData);
  const departments = transformDepartmentData(departmentData);
  const projects = transformProjectData(projectsData);
  const publications = transformPublicationData(publicationsData);

  return (
    <ResearchClient
      staffData={staff}
      departments={departments}
      projects={projects}
      publications={publications}
    />
  );
}