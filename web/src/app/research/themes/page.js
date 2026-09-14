export const metadata = {
  title: "Research Themes",
  description: "Explore the core research themes and focus areas of the AI Research Institute at UTCN.",
};

import { cookies } from "next/headers";
import ThemesClient from "./themesClient";
import { getResearchThemes, getSingleType } from "@/lib/strapi";

export default async function ThemesPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";

  const [themes, pageData] = await Promise.all([
    getResearchThemes(),
    getSingleType("research-page", locale),
  ]);

  const normalizedThemes = Array.isArray(themes)
    ? themes.map((entry) => {
        const attributes = entry?.attributes ?? entry ?? {};
        return {
          name: attributes.name || "",
          slug: attributes.slug || "",
          summary: attributes.summary || "",
          color: attributes.color || "",
        };
      })
    : [];

  return <ThemesClient themes={normalizedThemes} pageData={pageData} />;
}
