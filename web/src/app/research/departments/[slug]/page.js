import { getDepartments, getDepartmentTeams, getProjects, getPublications, getStaff, getSingleType, transformDepartmentData, transformProjectData, transformPublicationData, transformStaffData } from "@/lib/strapi";
import DepartmentDetailClient from "./DepartmentDetailClient";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getProjectPhase } from "@/lib/projectPhase";

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
    getSingleType("research-page", locale),
  ]);

  const departments = transformDepartmentData(departmentData);
  const department = departments.find((u) => u.slug === slug);
  if (!department) notFound();

  const projects = transformProjectData(projectsData);
  const publications = transformPublicationData(publicationsData);
  const staff = transformStaffData(staffData);

  // Normalize teams
  const toArr = (v) => (Array.isArray(v) ? v : v?.data ? v.data : []);
  const teams = toArr(rawTeams).map((raw) => {
    const t = raw.attributes ?? raw;
    return {
      id: raw.id,
      name: t.name || '',
      description: t.description || '',
      members: toArr(t.members).map((m) => {
        const p = m.person?.attributes ?? m.person ?? {};
        return {
          role: m.role || '',
          isLead: !!m.isLead,
          person: {
            name: p.name || '',
            slug: p.slug || '',
            title: p.title || '',
          },
        };
      }),
      projects: toArr(t.projects?.data ?? t.projects).map((proj) => {
        const pr = proj.attributes ?? proj;
        const phase = getProjectPhase(pr.startDate, pr.endDate).status;
        return {
          title: pr.title || '',
          phase: phase === 'unknown' ? '' : phase,
        };
      }),
    };
  });

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
