import { getProjects, getProjectBySlug, transformProjectData } from "@/lib/strapi";
import ProjectDetailsClient from "./ProjectDetails";

export async function generateStaticParams() {
  try {
    const projects = await getProjects();
    return (projects || [])
      .filter((p) => p?.slug)
      .map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  try {
    const projectData = await getProjectBySlug(slug);
    const project = transformProjectData([projectData])[0];
    return {
      title: project?.title ? `${project.title} – Projects` : "Project Details",
      description: project?.abstract?.slice(0, 160) || "Project details",
    };
  } catch {
    return { title: "Project Details" };
  }
}

export default async function ProjectPage({ params }) {
  const { slug } = await params;
  const projectData = await getProjectBySlug(slug);
  const project = transformProjectData([projectData])[0];

  return <ProjectDetailsClient project={project} />;
}
