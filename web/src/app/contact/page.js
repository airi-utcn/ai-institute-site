import { cookies } from "next/headers";
import { getSingleType } from "@/lib/strapi";
import ContactClient from "./ContactClient";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const contact = await getSingleType("contact-page", locale);

  return {
    title: contact?.headerTitle || "Contact",
    description: contact?.headerSubtitle || "Get in touch with the Artificial Intelligence Research Institute at the Technical University of Cluj-Napoca.",
  };
}

export default async function ContactPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const contact = await getSingleType("contact-page", locale);

  return <ContactClient contactData={contact} />;
}
