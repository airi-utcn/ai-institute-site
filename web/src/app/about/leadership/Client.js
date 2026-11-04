"use client";

import Link from "next/link";
import { FaCrown, FaUsers, FaUniversity, FaEnvelope, FaMapMarkerAlt, FaExternalLinkAlt } from "react-icons/fa";

/**
 * Featured Hero Card for the primary institute leader (e.g. Rector / Director)
 */
function ExecutiveLeadHeroCard({ member, teamSubtitle }) {
  const person = member.person || {};
  const avatarUrl = person.image || "/people/Basic_avatar_image.png";
  const name = person.name || "";
  const slug = person.slug;

  const content = (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-50/80 via-white to-amber-50/50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 border border-primary-200/80 dark:border-primary-900/50 p-6 md:p-8 shadow-lg hover:shadow-xl transition-all duration-300">
      {/* Decorative accent background flare */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-primary-100/40 dark:bg-primary-900/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 relative z-10">
        {/* Leader Portrait */}
        <div className="relative shrink-0">
          <div className="relative">
            <img
              src={avatarUrl}
              srcSet={person.imageSrcSet || undefined}
              sizes="(max-width: 768px) 144px, 176px"
              alt={name || "Institute Leader"}
              loading="eager"
              decoding="async"
              className="w-36 h-36 md:w-44 md:h-44 rounded-2xl object-cover ring-4 ring-white dark:ring-gray-800 shadow-xl"
            />
            <span
              className="absolute -top-2 -right-2 w-9 h-9 bg-amber-400 dark:bg-amber-500 rounded-full flex items-center justify-center shadow-md ring-2 ring-white dark:ring-gray-900"
              title="Leadership Head"
            >
              <FaCrown className="w-4 h-4 text-amber-950" />
            </span>
          </div>
        </div>

        {/* Leader Details */}
        <div className="flex-1 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-300 mb-2">
            <FaCrown className="w-3 h-3 text-amber-500" />
            <span>{member.role || "Executive Lead"}</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            {name}
          </h2>

          {person.title && (
            <p className="text-base text-gray-600 dark:text-gray-300 font-medium mt-1">
              {person.title}
            </p>
          )}

          {teamSubtitle && (
            <p className="text-sm text-primary-600 dark:text-accent-400 font-medium mt-1">
              {teamSubtitle}
            </p>
          )}

          {person.bio && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 line-clamp-3 leading-relaxed max-w-2xl">
              {person.bio}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-gray-500 dark:text-gray-400">
            {person.email && (
              <span className="inline-flex items-center gap-1.5">
                <FaEnvelope className="w-3.5 h-3.5 text-primary-500" />
                <span>{person.email}</span>
              </span>
            )}
            {person.location && (
              <span className="inline-flex items-center gap-1.5">
                <FaMapMarkerAlt className="w-3.5 h-3.5 text-primary-500" />
                <span>Room {person.location}</span>
              </span>
            )}
            {slug && (
              <span className="inline-flex items-center gap-1 text-primary-600 dark:text-accent-400 font-medium hover:underline">
                <span>View Full Profile</span>
                <FaExternalLinkAlt className="w-2.5 h-2.5" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return slug ? (
    <Link href={`/people/${encodeURIComponent(slug)}`} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}

/**
 * Card for executive / board members
 */
function ExecutiveMemberCard({ member, highlight = false }) {
  const person = member.person || {};
  const avatarUrl = person.image || "/people/Basic_avatar_image.png";
  const name = person.name || "";
  const slug = person.slug;

  const content = (
    <div
      className={`h-full flex flex-col items-center text-center p-5 rounded-xl border transition-all duration-200 ${
        slug ? "hover:shadow-lg hover:-translate-y-0.5 cursor-pointer group" : ""
      } ${
        highlight || member.isLead
          ? "border-primary-200 dark:border-primary-800 bg-gradient-to-b from-primary-50/40 to-white dark:from-primary-950/20 dark:to-gray-950"
          : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 hover:border-gray-300 dark:hover:border-gray-700"
      }`}
    >
      <div className="relative mb-3">
        <img
          src={avatarUrl}
          srcSet={person.imageSrcSet || undefined}
          sizes="96px"
          alt={name || "Member"}
          loading="lazy"
          decoding="async"
          className="w-24 h-24 rounded-full object-cover ring-2 ring-white dark:ring-gray-800 shadow-md group-hover:ring-primary-400 transition-all"
        />
        {member.isLead && (
          <span
            className="absolute -top-1 -right-1 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center shadow-sm ring-1 ring-white dark:ring-gray-900"
            title="Lead"
          >
            <FaCrown className="w-3 h-3 text-amber-950" />
          </span>
        )}
      </div>

      <h3
        className={`text-base font-bold text-gray-900 dark:text-white line-clamp-1 w-full ${
          slug ? "group-hover:text-primary-600 dark:group-hover:text-accent-400 transition-colors" : ""
        }`}
      >
        {name}
      </h3>

      {member.role && (
        <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 line-clamp-1">
          {member.role}
        </span>
      )}

      {person.title && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
          {person.title}
        </p>
      )}

      {person.email && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-auto pt-2 truncate w-full">
          {person.email}
        </p>
      )}
    </div>
  );

  return slug ? (
    <Link href={`/people/${encodeURIComponent(slug)}`} className="block h-full">
      {content}
    </Link>
  ) : (
    content
  );
}

/**
 * Standard member card for committees and broader boards
 */
function CommitteeMemberCard({ member }) {
  const person = member.person || {};
  const avatarUrl = person.image || "/people/Basic_avatar_image.png";
  const name = person.name || "";
  const slug = person.slug;

  const content = (
    <div
      className={`h-full flex flex-col items-center text-center p-4 rounded-xl border transition-all duration-200 ${
        slug ? "hover:shadow-md hover:border-primary-300 dark:hover:border-accent-500 cursor-pointer group" : ""
      } ${
        member.isLead
          ? "border-amber-300 dark:border-amber-700/50 bg-amber-50/30 dark:bg-amber-950/10"
          : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
      }`}
    >
      <div className="relative mb-2.5">
        <img
          src={avatarUrl}
          srcSet={person.imageSrcSet || undefined}
          sizes="64px"
          alt={name || "Member"}
          loading="lazy"
          decoding="async"
          className="w-16 h-16 rounded-full object-cover ring-2 ring-white dark:ring-gray-800 shadow-sm"
        />
        {member.isLead && (
          <span
            className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center shadow-sm"
            title="Committee Chair / Lead"
          >
            <FaCrown className="w-2.5 h-2.5 text-amber-950" />
          </span>
        )}
      </div>

      <p
        className={`text-sm font-semibold text-gray-900 dark:text-white line-clamp-1 w-full ${
          slug ? "group-hover:text-primary-600 dark:group-hover:text-accent-400 transition-colors" : ""
        }`}
      >
        {name}
      </p>

      {member.role ? (
        <span className="text-xs text-primary-600 dark:text-accent-400 font-medium mt-0.5 line-clamp-1 w-full">
          {member.role}
        </span>
      ) : person.title ? (
        <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1 w-full">
          {person.title}
        </span>
      ) : null}
    </div>
  );

  return slug ? (
    <Link href={`/people/${encodeURIComponent(slug)}`} className="block h-full">
      {content}
    </Link>
  ) : (
    content
  );
}

/**
 * Section for a governance team / committee
 */
function GovernanceSection({ team, isSecond = false }) {
  const leads = (team.members || []).filter((m) => m.isLead);
  const others = (team.members || []).filter((m) => !m.isLead);
  const orderedMembers = [...leads, ...others];

  return (
    <section className="mb-12 last:mb-0">
      {/* Section Header */}
      <div className="flex items-start sm:items-center justify-between gap-4 mb-5 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              {team.name}
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
              {orderedMembers.length} {orderedMembers.length === 1 ? "member" : "members"}
            </span>
          </div>

          {team.subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {team.subtitle}
            </p>
          )}
        </div>
      </div>

      {team.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5 leading-relaxed max-w-3xl">
          {team.description}
        </p>
      )}

      {/* Grid of members */}
      {isSecond ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {orderedMembers.map((m, idx) => (
            <ExecutiveMemberCard
              key={m.person?.id || m.person?.slug || idx}
              member={m}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
          {orderedMembers.map((m, idx) => (
            <CommitteeMemberCard
              key={m.person?.id || m.person?.slug || idx}
              member={m}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function Client({ aboutData, teams = [] }) {
  const title = aboutData?.leadershipTitle || "Leadership & Governance";
  const description =
    aboutData?.leadershipDescription ||
    "The executive leadership, directorate, and advisory bodies directing research excellence and institutional strategy at AIRI.";

  // Sort leadership teams by displayOrder ascending, then name
  const sortedTeams = [...teams].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || (a.name || "").localeCompare(b.name || "")
  );

  // The first team gets executive/hero treatment
  const executiveTeam = sortedTeams[0];
  const otherTeams = sortedTeams.slice(1);

  // Within the first team, find the lead member for the hero card
  const executiveLead = executiveTeam?.members?.find((m) => m.isLead) || executiveTeam?.members?.[0];
  const otherExecutiveMembers =
    executiveTeam?.members?.filter((m) => m !== executiveLead) || [];

  return (
    <main className="flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 py-10 md:py-14 min-h-[70vh]">
      <div className="container max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-xl p-6 md:p-10 border border-gray-100 dark:border-gray-800/80 animate-fade-in">
          {/* Page Header */}
          <header className="text-center mb-10 pb-8 border-b border-gray-100 dark:border-gray-800 animate-slide-down">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-accent-400 mb-3 shadow-sm">
              <FaUniversity className="w-6 h-6" />
            </div>

            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-blue-600 dark:text-yellow-400 tracking-tight">
              {title}
            </h1>

            {description && (
              <p className="text-gray-600 dark:text-gray-300 mt-3 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
                {description}
              </p>
            )}
          </header>

          {/* Executive Leadership (Top Tier) */}
          {executiveTeam && (
            <section className="mb-12 animate-slide-up animate-delay-1">
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                    {executiveTeam.name}
                  </h2>
                </div>
                {executiveTeam.subtitle && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {executiveTeam.subtitle}
                  </p>
                )}
              </div>

              {/* Primary Leader Hero Card */}
              {executiveLead && (
                <div className="mb-6">
                  <ExecutiveLeadHeroCard
                    member={executiveLead}
                    teamSubtitle={executiveTeam.subtitle}
                  />
                </div>
              )}

              {/* Other members of the primary executive team */}
              {otherExecutiveMembers.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {otherExecutiveMembers.map((m, idx) => (
                    <ExecutiveMemberCard
                      key={m.person?.id || m.person?.slug || idx}
                      member={m}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Subsequent Governance Bodies / Committees */}
          {otherTeams.length > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-800 pt-10">
              {otherTeams.map((team, idx) => (
                <GovernanceSection
                  key={team.id || team.slug || idx}
                  team={team}
                  isSecond={idx === 0}
                />
              ))}
            </div>
          )}

          {/* Fallback / Empty state */}
          {sortedTeams.length === 0 && (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
              <FaUsers className="w-12 h-12 mx-auto mb-3 opacity-30 text-primary-500" />
              <p className="text-base font-medium">Leadership information coming soon.</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Teams marked with category &quot;leadership&quot; in the administration panel will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
