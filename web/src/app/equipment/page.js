import { cookies } from "next/headers";
import { canonical } from "@/lib/metadata";
import { getSingleType } from "@/lib/strapi";
import EquipmentClient from "./EquipmentClient";

export const metadata = {
  title: "Equipment",
  description: "Browse available equipment and submit reservation requests at AIRi @ UTCN.",
  alternates: canonical('/equipment'),
};

export default async function EquipmentPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const equipmentPage = await getSingleType("equipment-page", locale);

  return <EquipmentClient notice={equipmentPage?.notice || ""} />;
}
