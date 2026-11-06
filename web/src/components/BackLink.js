"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

const isModifiedClick = (event) =>
  event.button !== 0 ||
  event.metaKey ||
  event.ctrlKey ||
  event.shiftKey ||
  event.altKey;

/**
 * A "Back to ..." link that behaves like the browser Back button when the
 * current entry was reached through client-side navigation. That means the
 * destination keeps its restored filters/tabs instead of being pushed as a
 * brand-new history entry.
 *
 * Direct visits (external links, bookmarks, hard reloads) fall back to the
 * normal href so the link still takes the user to the expected list page.
 */
export default function BackLink({ href, onClick, ...props }) {
  const router = useRouter();
  const { bfcacheId } = router;

  const handleClick = (event) => {
    onClick?.(event);

    if (event.defaultPrevented || isModifiedClick(event)) return;
    if (event.currentTarget.target === "_blank") return;

    // Next's initial route segment uses the fixed _b_0_ id. A different id
    // means this entry was created by an in-app navigation, so there is a
    // previous app entry to return to. After a hard reload we fall back to the
    // href, because the browser history may not belong to this site.
    if (bfcacheId && bfcacheId !== "_b_0_") {
      event.preventDefault();
      router.back();
    }
  };

  return <Link href={href} {...props} onClick={handleClick} />;
}
