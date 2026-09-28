"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FaBuilding, FaProjectDiagram, FaUsers } from "react-icons/fa";
import ExpandableMarkdown from "@/components/shared/ExpandableMarkdown";
import PersonChip from "@/components/shared/PersonChip";
import { itemVariants } from "@/lib/animations";

const PHASE_STYLES = {
  ongoing: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  planned: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  ended: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
  archived: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
};

export default function TeamCard({
  team,
  staffLookup = {},
  showProjects = true,
  t = (k) => k,
}) {
  if (!team) return null;

  // Order leads first, then regular members
  const leads = (team.members || []).filter((m) => m.isLead);
  const others = (team.members || []).filter((m) => !m.isLead);
  const orderedMembers = [...leads, ...others];

  const getTranslatedPhase = (phase) => {
    if (!phase) return "";
    const lowerPhase = phase.toLowerCase();
    if (typeof t === "function") {
      const translated = t(`phases.${lowerPhase}`);
      if (translated && translated !== `phases.${lowerPhase}`) return translated;
    }
    return phase;
  };

  const getLabel = (key, fallback) => {
    if (typeof t === "function") {
      const val = t(key);
      if (val && val !== key) return val;
    }
    return fallback;
  };

  return (
    <motion.div
      variants={itemVariants}
      className="card card-hover flex flex-col justify-between p-5 h-full relative overflow-hidden"
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white leading-snug">
                {team.name}
              </h3>
              {team.isLead && (
                <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full font-medium shrink-0">
                  {getLabel("lead", "Team Lead")}
                </span>
              )}
            </div>
            {team.role && (
              <p className="text-xs text-primary-600 dark:text-accent-400 font-medium">
                {team.role}
              </p>
            )}
          </div>
          {team.type && (
            <span className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full shrink-0">
              {team.type}
            </span>
          )}
        </div>

        {/* Department */}
        {team.department && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3">
            <FaBuilding className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            {team.department.slug ? (
              <Link
                href={`/research/departments/${encodeURIComponent(team.department.slug)}`}
                className="hover:text-primary-600 dark:hover:text-accent-400 transition-colors truncate"
              >
                {team.department.name}
              </Link>
            ) : (
              <span className="truncate">{team.department.name}</span>
            )}
          </div>
        )}

        {/* Description */}
        {team.description && (
          <ExpandableMarkdown
            content={team.description}
            previewLength={160}
            collapsedTextClassName="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3"
            markdownClassName="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 prose-p:my-1 prose-headings:my-2 mb-3"
          />
        )}

        {/* Team Members with PersonChip */}
        {orderedMembers.length > 0 && (
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 mb-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              <FaUsers className="w-3.5 h-3.5 text-primary-500 shrink-0" />
              <span>
                {getLabel("members.teams", getLabel("members", "Members"))} ({orderedMembers.length})
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 -mx-2">
              {orderedMembers.map((m, idx) => {
                const person = m.person || {};
                const personSlug = person.slug || m.slug || "";
                const staffInfo = staffLookup?.[personSlug];
                return (
                  <PersonChip
                    key={person.id || personSlug || idx}
                    person={person}
                    role={m.role}
                    isLead={m.isLead}
                    image={staffInfo?.image || person.image}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Projects */}
      {showProjects && team.projects && team.projects.length > 0 && (
        <div className="pt-3 border-t border-gray-100 dark:border-gray-800 mt-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
            <FaProjectDiagram className="w-3.5 h-3.5 text-primary-500 shrink-0" />
            <span className="uppercase tracking-wide">
              {getLabel("members.projects", getLabel("projects", "Projects"))} ({team.projects.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {team.projects.map((p, idx) => {
              const phaseClass = PHASE_STYLES[p.phase] || PHASE_STYLES.planned;
              return (
                <span key={p.id || p.slug || idx}>
                  {p.slug ? (
                    <Link
                      href={`/research/projects/${encodeURIComponent(p.slug)}`}
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors font-medium"
                    >
                      <span>{p.title}</span>
                      {p.phase && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${phaseClass}`}>
                          {getTranslatedPhase(p.phase)}
                        </span>
                      )}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                      <span>{p.title}</span>
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
