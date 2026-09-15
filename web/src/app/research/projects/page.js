export const metadata = {
  title: "Projects",
  description: "Research projects and funded initiatives at the Artificial Intelligence Research Institute.",
};

import { cookies } from "next/headers";
import ProjectsClient from "./projectClient";
import { getProjects, getSingleType, transformProjectData } from "@/lib/strapi";

export default async function ProjectPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";

  const [strapiProjects, pageData] = await Promise.all([
    getProjects({ locale }),
    getSingleType("research-page", locale),
  ]);

  const projects = transformProjectData(strapiProjects);

  return <ProjectsClient projects={projects} pageData={pageData} />;
}
