import { canonical } from "@/lib/metadata";
import FallbackDisclaimer from "@/components/FallbackDisclaimer";
import { cookies } from "next/headers";
import { Suspense } from "react";
import EngagementClient from "./EngagementClient";
import CollaboratorsClient from "../collaborators/CollaboratorsClient";
import { getPartners, getProjects, transformPartnerData, transformProjectData, getSingleType } from "@/lib/strapi";

const DYNAMIC_ZONE_POPULATE = {
  on: {
      "shared.cta": {},
      "shared.focus-item": {},
      "shared.card": {
        populate: {
          image: {},
        },
      },
      "shared.card-grid": {
        populate: {
          cards: {
            populate: {
              image: {},
            },
          },
        },
      },
      "shared.rich-text": {},
      "shared.quote": {},
      "shared.section": {
        populate: {
          media: {},
        },
      },
      "shared.media": {
        populate: {
          file: {},
        },
      },
      "shared.slider": {
        populate: {
          files: {},
        },
      },
      "shared.separator": {},
  },
};

const ENGAGEMENT_PAGE_POPULATE = {
  publicContent: DYNAMIC_ZONE_POPULATE,
  academicContent: DYNAMIC_ZONE_POPULATE,
  industryContent: DYNAMIC_ZONE_POPULATE,
  highSchoolContent: DYNAMIC_ZONE_POPULATE,
};
export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const engagement = await getSingleType(
    "engagement-page",
    locale,
    ENGAGEMENT_PAGE_POPULATE,
  );

  return {
    title: engagement?.heroTitle || "Engagement",
    description: engagement?.heroSubtitle || "Discover how AIRi engages with industry, academia, high-school students, and the public through partnerships and programs.",
    alternates: canonical('/engagement'),
  };
}

export default async function EngagementPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";

  const [strapiProjects, partnerRows, pageData] = await Promise.all([
    getProjects({ locale }),
    getPartners({ locale }),
    getSingleType(
      "engagement-page",
      locale,
      ENGAGEMENT_PAGE_POPULATE,
    ),
  ]);

  const projects = transformProjectData(strapiProjects);
  const partners = transformPartnerData(partnerRows);

  return (
    <>
      <FallbackDisclaimer isFallback={pageData?._isFallback} />
      <Suspense fallback={null}>
      <EngagementClient
        projects={projects}
        partners={partners}
        CollaboratorsClient={CollaboratorsClient}
        pageData={pageData}
      />
    </Suspense>
    </>
  );
}
