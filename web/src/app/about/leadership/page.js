import { canonical } from "@/lib/metadata";
import { cookies } from "next/headers";
import { getSingleType, getLeadershipTeams } from "@/lib/strapi";
import FallbackDisclaimer from "@/components/FallbackDisclaimer";
import Client from "./Client";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const about = await getSingleType("about-page", locale);

  return {
    title: about?.leadershipTitle || "Leadership & Governance",
    description:
      about?.leadershipDescription ||
      "Leadership board, executive committee, and governance structure of the Artificial Intelligence Research Institute at UTCN.",
    alternates: canonical('/about/leadership'),
  };
}

export default async function LeadershipPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const [about, teams] = await Promise.all([
    getSingleType("about-page", locale),
    getLeadershipTeams(),
  ]);

  return (
    <>
      <FallbackDisclaimer isFallback={about?._isFallback} />
      <Client aboutData={about} teams={teams} />
    </>
  );
}
