export const metadata = {
  title: "Publications",
  description: "Scientific publications, journal articles, and conference papers from AIRi researchers.",
};

import { cookies } from "next/headers";
import { getPublications, getStaff, getSingleType, transformPublicationData, transformStaffData } from "@/lib/strapi";
import PublicationsClient from "./publicationsClient";

export default async function PublicationPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";

  const [pubsData, staffData, pageData] = await Promise.all([
    getPublications(),
    getStaff(),
    getSingleType("research-page", locale),
  ]);

  const publications = transformPublicationData(pubsData);
  const staff = transformStaffData(staffData);

  return <PublicationsClient publications={publications} staff={staff} pageData={pageData} />;
}
