import { getDepartments, getProjects, getPublications, getStaff, transformDepartmentData, transformProjectData, transformPublicationData, transformStaffData } from "@/lib/strapi";
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
  
  const [departmentData, projectsData, publicationsData, staffData] = await Promise.all([
    getDepartments(),
    getProjects(),
    getPublications(),
    getStaff(),
  ]);

  const departments = transformDepartmentData(departmentData);
  const projects = transformProjectData(projectsData);
  const publications = transformPublicationData(publicationsData);
  const staff = transformStaffData(staffData);

  const department = departments.find((u) => u.slug === slug);

  if (!department) {
    notFound();
  }

  // Filter projects for this department
  const departmentProjects = projects.filter((p) => {
    const domains = Array.isArray(p.domain) ? p.domain : [];
    return domains.some((d) => {
      const domainName = typeof d === 'string' ? d : d?.name;
      return domainName?.toLowerCase() === department.name?.toLowerCase();
    });
  });

  // Filter publications for this department
  const departmentPublications = publications.filter((p) => {
    return p.domain?.toLowerCase() === department.name?.toLowerCase();
  });

  // Filter staff for this department
  const departmentStaff = staff.filter((p) => {
    const depName = String(p?.department || "").trim().toLowerCase();
    const depSlug = String(p?.departmentInfo?.slug || "").trim();
    return depName === department.name?.toLowerCase() || depSlug === slug;
  });

  return (
    <DepartmentDetailClient
      department={department}
      projects={departmentProjects}
      publications={departmentPublications}
      staff={departmentStaff}
    />
  );
}
