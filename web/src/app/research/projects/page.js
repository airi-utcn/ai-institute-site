export const metadata = {
  title: "ICIA - Projects",
};

import ProjectsClient from "./projectClient";
import { getProjects, transformProjectData } from "@/lib/strapi";

export default async function ProjectPage() {
  const strapiProjects = await getProjects();
  const projects = transformProjectData(strapiProjects);

  return <ProjectsClient projects={projects} />;
}
