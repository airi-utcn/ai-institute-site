/**
 * app/people/page.js
 *
 * Server component — fetches people from Strapi, enriches researchers with
 * Google Scholar citation counts, then hands everything to PeopleClient.
 *
 * NOTE: The citation-based *sorting* is intentionally left to PeopleClient
 * so the dropdown feels instant (no round-trip) and the default order remains
 * the Strapi-defined alphabetical order until the user changes it.
 */

export const metadata = {
  title: "People",
  description:
    "Meet the researchers, staff, and visiting scholars of the Artificial Intelligence Research Institute at UTCN.",
};

import { getStaff, transformStaffData, PERSON_TYPE_FILTERS } from "@/lib/strapi";
import { attachScholarCitationCounts } from "@/lib/googleScholar";
import PeopleClient from "./PeopleClient";

export default async function PeoplePage() {
  try {
    // Fetch all person categories in parallel.
    const [staffData, researchersData, visitingData, alumniData] = await Promise.all([
      getStaff({ types: PERSON_TYPE_FILTERS.staff }),
      getStaff({ types: PERSON_TYPE_FILTERS.researchers }),
      getStaff({ types: PERSON_TYPE_FILTERS.visiting }),
      getStaff({ types: PERSON_TYPE_FILTERS.alumni }),
    ]);

    // Transform Strapi responses into the frontend shape.
    const staff = transformStaffData(staffData);
    const researchers = transformStaffData(researchersData);
    const visiting = transformStaffData(visitingData);
    const alumni = transformStaffData(alumniData);

    // Enrich researchers with Google Scholar citation counts.
    const enrichedResearchers = await attachScholarCitationCounts(researchers);

    // Debug: log citation counts to the server console for verification.
    if (process.env.NODE_ENV === "development") {
      console.log(
        "[Scholar] Citation counts:",
        enrichedResearchers.map((p) => ({
          name: p.name,
          scholarCitationCount: p.scholarCitationCount,
          googleScholarUrl: p.googleScholarUrl,
        }))
      );
    }

    return (
      <PeopleClient
        staff={staff}
        researchers={enrichedResearchers}
        visiting={visiting}
        alumni={alumni}
      />
    );
  } catch (error) {
    console.error("Error fetching people data:", error);
    // Return a user-friendly error component.
    return <div>Error loading data. Please try again later.</div>; 
  }
}
