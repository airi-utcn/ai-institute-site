import FallbackDisclaimer from "@/components/FallbackDisclaimer";
import { cookies } from "next/headers";
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
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  try {
    const projectData = await getProjectBySlug(slug, locale);
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
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const projectData = await getProjectBySlug(slug, locale);
  const project = transformProjectData([projectData])[0];

  return (
    <>
      <FallbackDisclaimer isFallback={project._isFallback} />
      <JsonLd data={projectJsonLd(project)} />
      <ProjectDetailsClient project={project} />
    </>
  );
}
