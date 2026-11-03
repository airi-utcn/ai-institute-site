import { canonical } from "@/lib/metadata";
import { cookies, draftMode } from "next/headers";
import FallbackDisclaimer from "@/components/FallbackDisclaimer";
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

export async function generateMetadata() {
  const cookieStore = await cookies();
  const { isEnabled } = await draftMode();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const pageData = await getSingleType(
    "departments-page",
    locale,
    "*",
    isEnabled ? { cache: "no-store" } : {},
    isEnabled ? { status: "draft" } : {},
  );

  return {
    title: pageData?.title || "Research Departments",
    description: pageData?.subtitle || "Research departments and units within the Artificial Intelligence Research Institute at UTCN.",
    alternates: canonical('/research/departments'),
  };
}

export default async function ResearchPage() {
  const cookieStore = await cookies();
  const { isEnabled } = await draftMode();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";

  const [staffData, departmentData, projectsData, publicationsData, pageData] = await Promise.all([
    getStaff(),
    getDepartments(
      { slim: true, locale, ...(isEnabled ? { status: "draft" } : {}) },
      isEnabled ? { cache: "no-store" } : {},
    ),
    getProjects({ locale, ...(isEnabled ? { status: "draft" } : {}) }),
    getPublications({ locale }),
    getSingleType(
      "departments-page",
      locale,
      "*",
      isEnabled ? { cache: "no-store" } : {},
      isEnabled ? { status: "draft" } : {},
    ),
  ]);

  const staff = transformStaffData(staffData);
  const departments = transformDepartmentData(departmentData);
  const projects = transformProjectData(projectsData);
  const publications = transformPublicationData(publicationsData);

  return (
    <>
      <FallbackDisclaimer isFallback={pageData?._isFallback} />
      <DepartmentsClient
        staffData={staff}
        departments={departments}
        projects={projects}
        publications={publications}
        pageData={pageData}
      />
    </>
  );
}
