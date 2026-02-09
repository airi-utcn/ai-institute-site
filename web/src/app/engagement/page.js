export const metadata = { title: "Engagement – AIRi @ UTCN" };

import { Suspense } from "react";
import EngagementClient from "./EngagementClient";
import CollaboratorsClient from "../collaborators/CollaboratorsClient";
import { getProjects, transformProjectData } from "@/lib/strapi";

const partners = [
  { name: "CLAIRE", url: "https://claire-ai.org", blurb: "Confederation of Laboratories for AI Research in Europe." },
  { name: "ELLIS", url: "https://ellis.eu", blurb: "European Laboratory for Learning and Intelligent Systems." },
  { name: "AIoD", url: "https://www.ai4europe.eu", blurb: "AI on Demand Platform." },
  { name: "euRobotics", url: "https://www.eu-robotics.net", blurb: "European robotics association." },
  { name: "ADRA", url: "https://adr-association.eu", blurb: "AI, Data and Robotics Association." },
  { name: "BDVA", url: "https://bdva.eu", blurb: "Big Data Value Association." },
];

export default async function EngagementPage() {
  const strapiProjects = await getProjects();
  const projects = transformProjectData(strapiProjects);

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
