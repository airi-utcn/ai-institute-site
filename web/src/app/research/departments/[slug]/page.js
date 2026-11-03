import { canonical } from "@/lib/metadata";
import { 
  getDepartments,
  getDepartmentBySlug, 
  getDepartmentTeams, 
  getProjects, 
  getPublications, 
  getStaff, 
  getSingleType, 
  transformDepartmentData, 
  transformProjectData, 
  transformPublicationData, 
  transformStaffData,
  transformTeamData,
} from "@/lib/strapi";
import DepartmentDetailClient from "./DepartmentDetailClient";
import { notFound } from "next/navigation";
import FallbackDisclaimer from "@/components/FallbackDisclaimer";
import { cookies, draftMode } from "next/headers";

// Generate static paths for all departments
export async function generateStaticParams() {
  const departmentData = await getDepartments();
  const departments = transformDepartmentData(departmentData);

  return departments
    .filter((unit) => unit.slug)
    .map((unit) => ({
      slug: unit.slug,
    }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const { isEnabled } = await draftMode();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";

  const departmentStrapi = await getDepartmentBySlug(
    slug,
    locale,
    isEnabled ? { status: "draft" } : {},
    isEnabled ? { cache: "no-store" } : {},
  );
  const department = departmentStrapi ? transformDepartmentData([departmentStrapi])[0] : null;

  if (!department) {
    return { title: "Department Not Found" };
  }

  return {
    title: department.name,
    description: department.summary || department.description || `Learn about ${department.name} at AIRi @ UTCN`,
    alternates: canonical(`/research/departments/${encodeURIComponent(slug)}`),
  };
}

export default async function DepartmentPage({ params }) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const { isEnabled } = await draftMode();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  
  // Fetch department data and filtered data in parallel
  const [departmentStrapi, projectsData, publicationsData, staffData, rawTeams, pageData] = await Promise.all([
    getDepartmentBySlug(
      slug,
      locale,
      isEnabled ? { status: "draft" } : {},
      isEnabled ? { cache: "no-store" } : {},
    ),
    getProjects({
      domainSlug: slug,
      locale,
      ...(isEnabled ? { status: "draft" } : {}),
    }),
    getPublications({ domainSlug: slug, locale }),
    getStaff({ departmentSlug: slug }),
    getDepartmentTeams(slug),
    getSingleType(
      "departments-page",
      locale,
      "*",
      isEnabled ? { cache: "no-store" } : {},
      isEnabled ? { status: "draft" } : {},
    ),
  ]);
  
  if (!departmentStrapi) notFound();
  const department = transformDepartmentData([departmentStrapi])[0];
  if (!department) notFound();

  const projects = transformProjectData(projectsData);
  const publications = transformPublicationData(publicationsData);
  const staff = transformStaffData(staffData);
  const teams = transformTeamData(rawTeams).filter((team) => !team.isArchived);

  return (
    <>
      <FallbackDisclaimer isFallback={department._isFallback || pageData?._isFallback} />
      <DepartmentDetailClient
      department={department}
      projects={projects}
      publications={publications}
      staff={staff}
      teams={teams}
      pageData={pageData}
    />
    </>
  );
}
