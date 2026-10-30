// redirect to the previous partners view on the engagement page
// matches how /engagement/partners redirects to /engagement?tab=partners
import { redirect } from 'next/navigation';

export default function PreviousPartnersPage() {
  redirect('/engagement?tab=partners&view=previous');
}
