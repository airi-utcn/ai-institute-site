export const metadata = {
  title: "Reserve Equipment",
  description: "Submit a reservation request for institute equipment at AIRi @ UTCN.",
  robots: { index: false, follow: false },
};

import { requireUser } from "@/lib/auth/session";
import ReserveClient from "./ReserveClient";

export default async function ReservePage({ params }) {
  const { id } = await params;
  const user = await requireUser(`/reserve/${encodeURIComponent(id)}`);

  return <ReserveClient user={user} />;
}
