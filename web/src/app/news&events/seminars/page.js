export const metadata = {
  title: "ICIA - Seminars",
};

import SeminarsClient from "./seminarsClient";
import { getSeminars, transformSeminarData } from "@/lib/strapi";

export default async function SeminarsPage() {
  const seminarsData = await getSeminars();
  const seminars = transformSeminarData(seminarsData);
  return <SeminarsClient seminars={seminars} />;
}
