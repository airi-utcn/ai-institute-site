import { canonical } from "@/lib/metadata";
import { cookies } from "next/headers";
import { getSingleType } from "@/lib/strapi";
import MediaClient from "./MediaClient";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const media = await getSingleType("media-page", locale);

  const cleanDescription = (media?.headerSubtitle || "")
    .replace(/https?:\/\/[^\s]+/gi, "")
    .replace(/\s+at\s+flickr\s*:?$/i, "")
    .trim();

  return {
    title: media?.headerTitle || "Media Gallery",
    description:
      cleanDescription ||
      "Photos, albums on Flickr, press coverage, and media resources from AIRi at UTCN.",
    alternates: canonical('/media'),
  };
}

export default async function MediaPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const media = await getSingleType("media-page", locale);

  return <MediaClient mediaData={media} />;
}
