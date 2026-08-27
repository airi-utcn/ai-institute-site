export const metadata = {
  title: "Equipment",
  description: "Browse available equipment and submit reservation requests at AIRi @ UTCN.",
};

import EquipmentClient from "./EquipmentClient";

export default function EquipmentPage() {
  return <EquipmentClient />;
}