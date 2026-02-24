export const metadata = {
  title: "AIRI - Resources",
  description: "Explore tools, resources, APIs, and learning materials curated by the Artificial Intelligence Research Institute",
};

import ResourcesClient from "./resourcesClient";
import { getResources, transformResourceData } from "@/lib/strapi";

export default async function ResourcesPage() {
  const strapiResources = await getResources();
  const resources = transformResourceData(strapiResources);

  return <ResourcesClient resources={resources} />;
}
