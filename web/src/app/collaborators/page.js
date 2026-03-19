/* export const metadata = {
  title: "ICIA - Collaborators",
};

import CollaboratorsClient from "./CollaboratorsClient";

// Massive workaround, just to get it to display the right title
// TODO: Come up with something better

export default function Page() {
  return (
    <div className="min-h-screen">
      <CollaboratorsClient />
    </div>
  );
}
  */
 import { notFound } from 'next/navigation';

export default function Page() {
  notFound();
}
