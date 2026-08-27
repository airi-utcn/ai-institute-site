export const metadata = {
  title: "Reserve Equipment",
  description: "Submit a reservation request for institute equipment at AIRi @ UTCN.",
};

import ReserveClient from "./ReserveClient";

export default function ReservePage() {
  return <ReserveClient />;
}