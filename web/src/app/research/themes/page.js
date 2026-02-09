export const metadata = {
  title: "ICIA - Themes",
};

import ThemesClient from "./themesClient";
import { getResearchThemes } from "@/lib/strapi";

export default async function ThemesPage() {
  const themes = await getResearchThemes();

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

  return <ThemesClient themes={normalizedThemes} />;
}
