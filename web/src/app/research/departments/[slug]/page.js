import { getDepartments, getDepartmentTeams, getProjects, getPublications, getStaff, transformDepartmentData, transformProjectData, transformPublicationData, transformStaffData } from "@/lib/strapi";
import DepartmentDetailClient from "./DepartmentDetailClient";
import { notFound } from "next/navigation";

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
    return { title: "Department Not Found | AIRi @ UTCN" };
  }

  return {
    title: `${unit.name} | AIRi @ UTCN`,
    description: unit.summary || unit.description || `Learn about ${unit.name} at AIRi @ UTCN`,
  };
}

export default async function DepartmentPage({ params }) {
  const { slug } = await params;
  
  // Fetch department data and filtered data in parallel
  const [departmentData, projectsData, publicationsData, staffData, rawTeams] = await Promise.all([
    getDepartments(),
    getProjects({ domainSlug: slug }),
    getPublications({ domainSlug: slug }),
    getStaff({ departmentSlug: slug }),
    getDepartmentTeams(slug),
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
            name: p.fullName || p.name || '',
            slug: p.slug || '',
            title: p.title || '',
          },
        };
      }),
      projects: toArr(t.projects?.data ?? t.projects).map((proj) => {
        const pr = proj.attributes ?? proj;
        return { title: pr.title || '', phase: pr.phase || '' };
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
    />
  );
}
