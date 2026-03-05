export const metadata = {
  title: "Projects",
  description: "Research projects and funded initiatives at the Artificial Intelligence Research Institute.",
};

import ProjectsClient from "./projectClient";
import { getProjects, transformProjectData } from "@/lib/strapi";

export default async function ProjectPage() {
  const strapiProjects = await getProjects();
  const projects = transformProjectData(strapiProjects);

  return <ProjectsClient projects={projects} />;
}
