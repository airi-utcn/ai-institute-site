import { 
  getDepartments, 
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
import { cookies } from "next/headers";

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
  const departmentData = await getDepartments();
  const departments = transformDepartmentData(departmentData);

  const unit = departments.find((u) => u.slug === slug);

  if (!unit) {
    return { title: "Department Not Found" };
  }

  return {
    title: unit.name,
    description: unit.summary || unit.description || `Learn about ${unit.name} at AIRi @ UTCN`,
  };
}

export default async function DepartmentPage({ params }) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  
  // Fetch department data and filtered data in parallel
  const [departmentData, projectsData, publicationsData, staffData, rawTeams, pageData] = await Promise.all([
    getDepartments({ locale }),
    getProjects({ domainSlug: slug, locale }),
    getPublications({ domainSlug: slug, locale }),
    getStaff({ departmentSlug: slug }),
    getDepartmentTeams(slug, locale),
    getSingleType("departments-page", locale),
  ]);

  const departments = transformDepartmentData(departmentData);
  const department = departments.find((u) => u.slug === slug);
  if (!department) notFound();

  const projects = transformProjectData(projectsData);
  const publications = transformPublicationData(publicationsData);
  const staff = transformStaffData(staffData);
  const teams = transformTeamData(rawTeams);

  return (
    <DepartmentDetailClient
      department={department}
      projects={projects}
      publications={publications}
      staff={staff}
      teams={teams}
      pageData={pageData}
    />
  );
}
