"use client";

import Link from "next/link";
import { FaStar } from "react-icons/fa";

/**
 * Reusable PersonChip component for displaying a team member or person
 * with avatar, name, role/title, and lead indicator.
 */
export default function PersonChip({ person, role, isLead, image }) {
  const slug = person?.slug;
  const name = person?.name || (person?.firstName ? `${person.firstName} ${person.lastName || ""}`.trim() : "");
  const title = person?.title || "";
  const avatarUrl = image || person?.image || person?.portrait?.url || "/people/Basic_avatar_image.png";

  const inner = (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
        slug ? "hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer group" : ""
      }`}
    >
      <div className="relative shrink-0">
        <img
          src={avatarUrl}
          alt={name || "Avatar"}
          className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-gray-800 shadow-sm"
        />
        {isLead && (
          <span
            className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center shadow-sm"
            title="Team Lead"
          >
            <FaStar className="w-2 h-2 text-yellow-800" />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-semibold text-gray-900 dark:text-white truncate ${
            slug ? "group-hover:text-primary-600 dark:group-hover:text-accent-400 transition-colors" : ""
          }`}
        >
          {name}
        </p>
        {(role || title) && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {role || title}
          </p>
        )}
      </div>
    </div>
  );

  return slug ? <Link href={`/people/${encodeURIComponent(slug)}`}>{inner}</Link> : inner;
}
