import { redirect } from "next/navigation";

export default async function StaffDetailPage({ params }) {
  const resolvedParams = await params;
  const slug = Array.isArray(resolvedParams?.slug) ? resolvedParams.slug[0] : resolvedParams?.slug;

  if (!slug) {
    redirect("/people");
  }

  redirect(`/people/${slug}`);
}
