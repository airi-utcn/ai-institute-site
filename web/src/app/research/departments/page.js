export const metadata = {
  title: "ICIA - Research",
};

import ResearchClient from "./DepartmentsClient";
import {
  getDepartments,
  getSupportUnits,
  getProjects,
  getPublications,
  getStaff,
  transformDepartmentData,
  transformSupportUnitData,
  transformProjectData,
  transformPublicationData,
  transformStaffData,
} from "@/lib/strapi";

export default async function ResearchPage() {
  const [staffData, departmentData, supportUnitsData, projectsData, publicationsData] = await Promise.all([
    getStaff(),
    getDepartments(),
    getSupportUnits(),
    getProjects(),
    getPublications(),
  ]);

  const staff = transformStaffData(staffData);
  const departments = transformDepartmentData(departmentData);
  const supportUnits = transformSupportUnitData(supportUnitsData);
  const projects = transformProjectData(projectsData);
  const publications = transformPublicationData(publicationsData);

  return (
    <ResearchClient
      staffData={staff}
      departments={departments}
      supportUnits={supportUnits}
      projects={projects}
      publications={publications}
    />
  );
}