export const metadata = { title: "Engagement – AIRi @ UTCN" };

import { Suspense } from "react";
import EngagementClient from "./EngagementClient";
import CollaboratorsClient from "../collaborators/CollaboratorsClient";
import { getPartners, getProjects, transformProjectData } from "@/lib/strapi";


export default async function EngagementPage() {
  const strapiProjects = await getProjects();
  const projects = transformProjectData(strapiProjects);
  const partners = await getPartners();

  return (
    <Suspense fallback={null}>
      <EngagementClient
        projects={projects}
        partners={partners}
        CollaboratorsClient={CollaboratorsClient}
      />
    </Suspense>
  );
}
