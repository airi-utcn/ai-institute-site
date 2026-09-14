export const metadata = {
  title: "Thesis",
  description: "Doctoral and master's theses supervised by AIRi researchers at UTCN.",
};

import { cookies } from "next/headers";
import ThesisClient from "./thesisClient";
import { getSingleType } from "@/lib/strapi";

export default async function ThesisPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const pageData = await getSingleType("research-page", locale);

  return <ThesisClient pageData={pageData} />;
}
