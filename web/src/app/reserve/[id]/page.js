export const metadata = {
  title: "Reserve Equipment",
  description: "Submit a reservation request for institute equipment at AIRi @ UTCN.",
  robots: { index: false, follow: false },
};

import ReserveClient from "./ReserveClient";

export default function ReservePage() {
  return <ReserveClient />;
}