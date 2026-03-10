import { getProjects, getProjectBySlug, transformProjectData } from "@/lib/strapi";
import ProjectDetailsClient from "./ProjectDetails";
import { JsonLd, projectJsonLd } from "@/lib/jsonld";

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
      title: project?.title || "Project Details",
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

  return (
    <>
      <JsonLd data={projectJsonLd(project)} />
      <ProjectDetailsClient project={project} />
    </>
  );
}
