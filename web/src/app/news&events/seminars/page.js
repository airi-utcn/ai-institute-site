export const metadata = {
  title: "Seminars",
  description: "Research seminars and talks hosted by AIRi at the Technical University of Cluj-Napoca.",
};

import SeminarsClient from "./seminarsClient";
import { getSeminars, transformSeminarData } from "@/lib/strapi";

export default async function SeminarsPage() {
  const seminarsData = await getSeminars();
  const seminars = transformSeminarData(seminarsData);
  return <SeminarsClient seminars={seminars} />;
}
