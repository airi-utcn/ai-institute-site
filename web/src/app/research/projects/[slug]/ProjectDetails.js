'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  FaArrowLeft,
  FaUsers,
  FaInfoCircle,
  FaExternalLinkAlt,
  FaFileAlt,
  FaMapMarkerAlt,
  FaChartLine,
  FaHandshake,
  FaLightbulb,
  FaDatabase,
  FaBookOpen,
  FaFilePdf,
  FaUserTie,
  FaNewspaper,
  FaFlask,
  FaPhone,
  FaCog,
  FaEnvelope,
  FaGithub,
  FaLink,
} from 'react-icons/fa';
import { containerVariants, itemVariants } from '@/lib/animations';
const PROJECT_DETAIL_DEFAULTS = {
  notFound: "Project not found",
  backToProjects: "Back to Projects",
  region: "Region",
  phase: "Phase",
  partners: "Partners",
  partnerCount: "{count} partner",
  partnerCountPlural: "{count} partners",
  officialWebsite: "Official Website",
  documentation: "Documentation",
  start: "Start",
  end: "End",
  phaseNoDate: "Not set",
  phaseOpenEnded: "No end date",
  phaseProgress: "Timeline progress",
  timeline: "Project Journey & Timeline",
  kickoff: "Project Kickoff",
  kickoffDesc: "Official launch of project research activities.",
  completion: "Target Completion",
  completionDesc: "Scheduled delivery of final milestones and objectives.",
  completed: "Completed",
  concluded: "Project Concluded",
  concludedDesc: "All project objectives and deliverables achieved.",
  upcoming: "Upcoming",
  inProgress: "In Progress",
  planned: "Planned to Start",
  today: "Today",
  currentPosition: "Current Position",
  milestonesTracking: "Tracking project schedule from kickoff to completion.",
  continuousOperations: "Continuous Operations",
  continuousOperationsDesc: "Active ongoing research with an open-ended delivery roadmap.",
  timelineEventFallback: "Project milestone",
  noTimeline: "No timeline events available yet.",
  "timelineStates.past": "Completed",
  "timelineStates.current": "Current",
  "timelineStates.upcoming": "Upcoming",
  "tabs.about": "About",
  "tabs.team": "Team",
  "tabs.research": "Research",
  "tabs.publications": "Publications",
  "tabs.results": "Results",
  "tabs.news": "News",
  "tabs.partners": "Partners",
  "tabs.contact": "Contact",
  "tabs.resources": "Resources",
  abstract: "Abstract",
  researchDomains: "Research Domains",
  teams: "Teams",
  memberCount: "{count} member",
  memberCountPlural: "{count} members",
  lead: "Lead",
  noTeamMembers: "No members listed for this team.",
  individualContributors: "Individual Contributors",
  contributors: "Contributors",
  noPeople: "No people assigned to this project.",
  platform: "Platform:",
  noResources: "No resources available for this project.",
  publicationCount: "{count} publication",
  publicationCountPlural: "{count} publications",
  noPublications: "No publications available for this project.",
  authors: "Authors:",
  viewDetails: "View details",
  pdf: "PDF",
  teamProjects: "Projects",
  noResearch: "No research content available",
  noResults: "No results available",
  noNews: "No news linked to this project yet.",
  openArticle: "Open article",
  "newsCategories.announcement": "Announcement",
  "newsCategories.construction": "Construction",
  "newsCategories.collaboration": "Collaboration",
  "newsCategories.award": "Award",
  "newsCategories.press": "Press",
  "newsCategories.other": "Update",
  noPartners: "No partners listed",
  noContact: "No contact information available",
  contactInformation: "Contact Information",
  contactMethods: "Contact Methods",
  "phases.completed": "Completed",
  "phases.planned": "Planned",
  "phases.ongoing": "Ongoing",
  "phases.ended": "Ended",
  "phases.archived": "Archived",
  visitResource: "Visit Resource",
  viewArticle: "View Article",
};
import BodyContentImage from '@/components/shared/BodyContentImage';
import RichMarkdown from '@/components/shared/RichMarkdown';
import DynamicZone from '@/components/shared/DynamicZone';
import ExpandableMarkdown from '@/components/shared/ExpandableMarkdown';
import { getProjectPhase, getPhaseColorClasses } from '@/lib/projectPhase';
import ProjectTimeline from '@/components/project/ProjectTimeline';

// Helper to get person path
function getPersonPath(person) {
  const slug = person?.slug ? encodeURIComponent(person.slug) : '';
  if (!slug) return '/people';
  return `/people/${slug}`;
}

function parseProjectDate(value) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatProjectDate(value) {
  const date = parseProjectDate(value);
  if (!date) return null;

  const hasExplicitTime = typeof value === 'string' && /T\d{2}:\d{2}/.test(value);
  const options = hasExplicitTime
    ? {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }
    : {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      };

  return new Intl.DateTimeFormat(undefined, {
    ...options,
  }).format(date);
}

function truncateText(value, maxLength = 180) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return '';
  if (raw.length <= maxLength) return raw;
  return `${raw.slice(0, maxLength).trimEnd()}...`;
}

function hasNewsLink(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function getNewsCategoryLabel(category, t) {
  const normalized = typeof category === 'string' ? category.trim().toLowerCase() : 'other';
  const key = normalized || 'other';
  if (t.has(`newsCategories.${key}`)) return t(`newsCategories.${key}`);
  if (t.has('newsCategories.other')) return t('newsCategories.other');
  return key.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

// Tab Button Component
function TabButton({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
        active
          ? 'bg-blue-600 text-white shadow-lg'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          active ? 'bg-white/20' : 'bg-gray-300 dark:bg-gray-600'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

// Person Card Component
function PersonCard({ person, role }) {
  const portraitUrl = person?.image || null;

  return (
    <Link href={getPersonPath(person)}>
      <motion.div
        variants={itemVariants}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-4 flex items-center gap-4 group cursor-pointer"
      >
        <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
          {portraitUrl ? (
            <img
              src={portraitUrl}
              alt={person.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <FaUsers className="w-6 h-6" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
            {person.name}
          </h4>
          {role && (
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
              {role}
            </p>
          )}
          {person.title && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {person.title}
            </p>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

// Partner Card Component
function PartnerCard({ partner }) {
  const logoUrl = partner?.logo || null;
  const partnerProfileHref = partner?.slug ? `/engagement/partners/${encodeURIComponent(partner.slug)}` : '';
  const websiteHref = partner?.url || '';

  return (
    <motion.div variants={itemVariants} className="h-full">
      <div
        className={`group relative flex flex-col justify-between h-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 transition-all duration-300 ${partnerProfileHref ? 'hover:-translate-y-1 hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-900' : ''}`}
      >
        <div className="flex flex-col items-center justify-center min-h-[5rem] mb-4">
          {logoUrl ? (
            <>
              <img
                src={logoUrl}
                alt={partner.name}
                className={`object-contain max-h-16 max-w-[140px] mix-blend-multiply dark:mix-blend-normal transition-transform duration-300 ${partnerProfileHref ? 'group-hover:scale-105' : ''}`}
              />
              <span className="mt-3 text-gray-900 dark:text-white font-semibold text-sm text-center leading-tight">
                {partner.name}
              </span>
            </>
          ) : (
            <span className="text-gray-900 dark:text-white font-bold text-lg text-center leading-tight">
              {partner.name}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-gray-100 dark:border-gray-800/60 mt-auto relative z-20">
          {partnerProfileHref ? (
            <>
              {/* Invisible overlay linking the whole card to the profile */}
              <Link href={partnerProfileHref} className="absolute inset-0 z-10" aria-label={`View ${partner.name} profile`} />
              <span 
                className="text-xs font-bold text-black dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors inline-flex items-center gap-1.5"
                aria-hidden="true"
              >
                Profile
                <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </>
          ) : null}
          {websiteHref ? (
            <a 
              href={websiteHref} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="relative z-30 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            >
              Website
            </a>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

// Info Card Component
function InfoCard({ icon: Icon, label, value, href, color = 'blue' }) {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    gray: 'bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400',
  };
  
  const bgClass = colorClasses[color]?.split(' ')[0] || colorClasses.blue.split(' ')[0];
  const textClass = colorClasses[color]?.split(' ').slice(2).join(' ') || colorClasses.blue.split(' ').slice(2).join(' ');
  
  const content = (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 flex items-center gap-3">
      <div className={`p-2 ${bgClass} rounded-lg`}>
        <Icon className={`w-5 h-5 ${textClass}`} />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {label}
        </p>
        <p className="font-semibold text-gray-900 dark:text-white">
          {value || 'N/A'}
        </p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="hover:scale-105 transition-transform">
        {content}
      </Link>
    );
  }

  return content;
}

// Resource Card Component
function ResourceCard({ resource, t }) {
  const iconMap = {
    database: FaDatabase,
    github: FaGithub,
    tool: FaCog,
    code: FaFileAlt,
    document: FaFileAlt,
    book: FaBookOpen,
    api: FaCog,
    cloud: FaDatabase,
    ai: FaLightbulb,
    link: FaExternalLinkAlt,
  };
  
  const categoryColors = {
    resource: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    tool: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    software: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    documentation: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    api: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    library: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    framework: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
    learning: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
    other: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300",
  };
  
  const IconComponent = iconMap[resource.icon] || FaLink;
  const categoryColor = categoryColors[resource.category] || categoryColors.other;
  const categoryLabel = t.has(`categories.${resource.category}`) 
    ? t(`categories.${resource.category}`) 
    : resource.category || 'Other';

  return (
    <motion.a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      variants={itemVariants}
      className="group relative flex flex-col h-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 shadow-sm hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300"
    >
      {/* Header with icon and category */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform shadow-sm">
          <IconComponent className="w-6 h-6" />
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${categoryColor}`}>
          {categoryLabel}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {resource.title}
      </h3>

      {/* Description */}
      {resource.description && (
        <div className="mb-4 flex-grow text-gray-600 dark:text-gray-400 text-sm leading-relaxed line-clamp-3">
          {typeof resource.description === 'string' ? resource.description : ''}
        </div>
      )}

      {/* Footer with link indicator */}
      <div className="flex items-center justify-end pt-3 border-t border-gray-100 dark:border-gray-800 mt-auto">
        <span className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 font-semibold group-hover:translate-x-1 transition-transform">
          {t("visitResource")} <FaExternalLinkAlt className="w-3 h-3" />
        </span>
      </div>
    </motion.a>
  );
}

// Publication Card Component
function PublicationCard({ publication, t }) {
  const slug = publication.slug ? encodeURIComponent(publication.slug) : '';

  return (
    <motion.div
      variants={itemVariants}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-5 group"
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex-shrink-0 mt-0.5">
          <FaBookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h4 className="font-semibold text-gray-900 dark:text-white leading-snug">
            {slug ? (
              <Link
                href={`/research/publications/${slug}`}
                className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              >
                {publication.title}
              </Link>
            ) : (
              publication.title
            )}
          </h4>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {publication.year && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                {publication.year}
              </span>
            )}
            {publication.kind && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {publication.kind}
              </span>
            )}
            {publication.domain && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                {publication.domain}
              </span>
            )}
          </div>

          {/* Authors */}
          {publication.authors && publication.authors.length > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2.5 leading-relaxed">
              <span className="font-medium text-gray-600 dark:text-gray-300">{t("authors")}</span>{' '}
              {publication.authors.join(', ')}
            </p>
          )}

          {/* Description */}
          {publication.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2 leading-relaxed">
              {publication.description}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 mt-3">
            {slug && (
              <Link
                href={`/research/publications/${slug}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
              >
                {t("viewDetails")}
                <FaExternalLinkAlt className="w-3 h-3" />
              </Link>
            )}
            {publication.pdfFile?.url && (
              <a
                href={publication.pdfFile.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
              >
                <FaFilePdf className="w-3.5 h-3.5" />
                {t("pdf")}
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function NewsCard({ item, t }) {
  const categoryLabel = getNewsCategoryLabel(item.category, t);
  const publishedLabel = formatProjectDate(item.date);
  const articleSlug = item?.slug ? encodeURIComponent(item.slug) : '';
  const viewArticleLabel = t.has('viewArticle') ? t('viewArticle') : t('viewDetails');

  return (
    <motion.article
      variants={itemVariants}
      className="group flex flex-col h-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
      <div className="relative h-52 bg-gray-100 dark:bg-gray-800 overflow-hidden">
        {item.image ? (
          <img
            src={item.image}
            alt={item.title || t('tabs.news')}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-100 via-slate-100 to-cyan-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 flex items-center justify-center text-blue-500 dark:text-blue-300">
            <FaNewspaper className="w-10 h-10" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-white/90 dark:bg-gray-900/85 text-slate-700 dark:text-slate-200 border border-white/60 dark:border-gray-700/80 backdrop-blur-sm">
            {categoryLabel}
          </span>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col gap-3">
        {publishedLabel && (
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
            {publishedLabel}
          </p>
        )}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white leading-snug line-clamp-2">
          {item.title || t('tabs.news')}
        </h3>
        {item.summary && (
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3 flex-1">
            {item.summary}
          </p>
        )}
        {Array.isArray(item.tags) && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {item.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="px-5 pb-5 pt-1 mt-auto flex flex-wrap items-center gap-4">
        {articleSlug && (
          <Link
            href={`/news&events/news/${articleSlug}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            {viewArticleLabel}
            <FaExternalLinkAlt className="w-3 h-3" />
          </Link>
        )}
        {hasNewsLink(item.linkUrl) && (
          <a
            href={item.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            {t('openArticle')}
            <FaExternalLinkAlt className="w-3 h-3" />
          </a>
        )}
      </div>
    </motion.article>
  );
}

export default function ProjectDetails({ project }) {
  const [activeTab, setActiveTab] = useState('about');
  const t = (key, params) => {
    let val = PROJECT_DETAIL_DEFAULTS[key] ?? key;
    if (params && typeof params === "object") {
      Object.entries(params).forEach(([k, v]) => {
        val = val.replace(`{${k}}`, v);
      });
    }
    return val;
  };
  t.has = (key) => key in PROJECT_DETAIL_DEFAULTS;

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">{t("notFound")}</p>
      </div>
    );
  }

  const heroImageUrl = project.heroImage || null;
  const teams = project.teams || [];
  const contributors = project.contributors || [];
  const themes = (project.themesData && project.themesData.length > 0)
    ? project.themesData
    : (project.themes || []).map((name) => ({ name, slug: '' }));
  const partners = (project.partnersData && project.partnersData.length > 0)
    ? project.partnersData
    : (project.partners || []).map((name) => ({ name, slug: '' }));
  const projectNews = project.news || [];

  const phase = getProjectPhase(project.startDate, project.endDate);
  const phaseLabelKey = phase.status === 'ended'
    ? (t.has('phases.ended') ? 'phases.ended' : 'phases.completed')
    : `phases.${phase.status}`;
  const phaseLabel = t.has(phaseLabelKey) ? t(phaseLabelKey) : t('phase');
  const startLabel = formatProjectDate(phase.start);
  const endLabel = formatProjectDate(phase.end);
  const markdownClassName = 'prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300';
  const resolveMediaSource = (media) => {
    if (!media) return '';
    if (typeof media === 'string') return media;
    return media.url || media.src || '';
  };

  const peopleCount = teams.length + contributors.length;
  const resultsCount = project.results?.length || 0;
  const hasResearch = project.researchContent && project.researchContent.length > 0;
  const hasContact = project.contactInfo?.contactEntries?.length > 0 || project.contactInfo?.generalInfo;
  
  const tabs = [
    { id: 'about', label: t('tabs.about'), icon: FaInfoCircle },
    { id: 'team', label: t('tabs.team'), icon: FaUsers, count: peopleCount > 0 ? peopleCount : undefined },
    { id: 'research', label: t('tabs.research'), icon: FaFlask },
    { id: 'publications', label: t('tabs.publications'), icon: FaBookOpen, count: project.publications?.length },
    { id: 'results', label: t('tabs.results'), icon: FaCog, count: resultsCount > 0 ? resultsCount : undefined },
    { id: 'news', label: t('tabs.news'), icon: FaNewspaper, count: projectNews.length > 0 ? projectNews.length : undefined },
    { id: 'partners', label: t('tabs.partners'), icon: FaHandshake, count: partners.length > 0 ? partners.length : undefined },
    { id: 'contact', label: t('tabs.contact'), icon: FaPhone },
  ];

  if (project.resources && project.resources.length > 0) {
    tabs.splice(5, 0, { id: 'resources', label: t('tabs.resources'), icon: FaDatabase, count: project.resources.length });
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-gray-50 dark:bg-gray-900"
    >
      {/* Hero Section */}
      <div className="relative h-64 md:h-80 bg-gradient-to-r from-blue-600 to-blue-800">
        {heroImageUrl && (
          <img
            src={heroImageUrl}
            alt={project.title}
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
          <div className="max-w-7xl mx-auto">
            <Link
              href="/research/projects"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
            >
              <FaArrowLeft className="w-4 h-4" />
              <span>{t("backToProjects")}</span>
            </Link>
            <motion.h1
              variants={itemVariants}
              className="text-3xl md:text-4xl font-bold text-white mb-2"
            >
              {project.title}
            </motion.h1>
            {themes && themes.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {themes.map(theme => (
                  theme.slug ? (
                    <Link
                      key={theme.slug}
                      href={`/research/projects?theme=${encodeURIComponent(theme.name)}`}
                      className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm text-white hover:bg-white/30 transition-colors"
                    >
                      {theme.name}
                    </Link>
                  ) : (
                    <span
                      key={theme.name}
                      className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm text-white"
                    >
                      {theme.name}
                    </span>
                  )
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Info Cards */}
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 -mt-12 mb-8 relative z-10"
        >
          {project.region && (
            <InfoCard icon={FaMapMarkerAlt} label={t("region")} value={project.region} />
          )}
          {project.partners && project.partners.length > 0 && (
            <InfoCard
              icon={FaHandshake}
              label={t("partners")}
              value={project.partners.length === 1 
                ? t("partnerCount", { count: project.partners.length })
                : t("partnerCountPlural", { count: project.partners.length })
              }
            />
          )}
        </motion.div>

        {/* Tabs */}
        <motion.div variants={itemVariants} className="flex flex-wrap gap-2 mb-8">
          {tabs.map(tab => (
            <TabButton
              key={tab.id}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              icon={tab.icon}
              label={tab.label}
              count={tab.count}
            />
          ))}
        </motion.div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'about' && (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className="space-y-8"
            >
              {/* Project Phase */}
              <motion.div
                variants={itemVariants}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <FaChartLine className="text-blue-500" />
                    {t("phase")}
                  </h2>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getPhaseColorClasses(phase.status)}`}>
                    {phaseLabel}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      {t("start")}
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {startLabel || t("phaseNoDate")}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      {t("end")}
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {endLabel || (phase.status === 'ongoing' ? t("phaseOpenEnded") : t("phaseNoDate"))}
                    </p>
                  </div>
                </div>

                
                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700/60">
                  <ProjectTimeline
                    startDate={project.startDate}
                    endDate={project.endDate}
                    timeline={project.timeline}
                    t={t}
                  />
                </div>
              </motion.div>

              {/* Abstract */}
              {project.abstract && (
                <motion.div
                  variants={itemVariants}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
                >
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <FaLightbulb className="text-yellow-500" />
                    {t("abstract")}
                  </h2>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {project.abstract}
                  </p>
                </motion.div>
              )}

              {/* Body Content */}
              {project.body && project.body.length > 0 && (
                <motion.div
                  variants={itemVariants}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
                >
                  <DynamicZone blocks={project.body} />
                </motion.div>
              )}

              {/* Domains / Research Themes */}
              {project.domains && project.domains.length > 0 && (
                <motion.div
                  variants={itemVariants}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
                >
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    {t("researchDomains")}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {project.domains.map(domain => (
                      <Link
                        key={domain.slug}
                        href={`/research/departments/${domain.slug}`}
                        className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        {domain.name}
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'team' && (
            <div className="space-y-10">
              {/* ── Teams ── */}
              {teams.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                      <FaUsers className="w-4 h-4" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t("teams")}</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                      {teams.length}
                    </span>
                  </div>
                  {teams.map((team) => (
                    <div key={team.slug || team.id} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{team.name}</h3>
                        {team.department && (
                          <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                            {team.department.name}
                          </span>
                        )}
                      </div>
                      {team.description && (
                        <ExpandableMarkdown
                          content={team.description}
                          previewLength={190}
                          collapsedTextClassName="text-sm text-gray-500 dark:text-gray-400 leading-relaxed"
                          markdownClassName="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 prose-p:my-1 prose-headings:my-2"
                        />
                      )}
                      {team.members.length > 0 ? (
                        <motion.div
                          initial="hidden"
                          animate="visible"
                          variants={containerVariants}
                          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                        >
                          {team.members.map((m, i) => (
                            <div key={m.person?.slug || i} className="relative">
                              {m.isLead && (
                                <span className="absolute top-2 right-2 z-10 text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full font-medium">
                                  {t("lead")}
                                </span>
                              )}
                              <PersonCard person={m.person} role={m.role} />
                            </div>
                          ))}
                        </motion.div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t("noTeamMembers")}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ── Individual Contributors ── */}
              {contributors.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                      <FaUserTie className="w-4 h-4" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      {teams.length > 0 ? t("individualContributors") : t("contributors")}
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                      {contributors.length}
                    </span>
                  </div>
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                  >
                    {contributors.map((person) => (
                      <motion.div
                        key={person.slug || person.name}
                        variants={itemVariants}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-4"
                      >
                        <Link href={person.slug ? `/people/${encodeURIComponent(person.slug)}` : '/people'} className="block text-center group">
                          <div className="w-20 h-20 mx-auto mb-3">
                            <img
                              src={person.image || '/people/Basic_avatar_image.png'}
                              alt={person.name}
                              className="w-full h-full rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-800"
                            />
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {person.name}
                          </h3>
                          {person.title && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{person.title}</p>
                          )}
                        </Link>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              )}

              {/* ── Empty state ── */}
              {teams.length === 0 && contributors.length === 0 && (
                <div className="text-center py-12">
                  <FaUsers className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {t("noPeople")}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="space-y-6">
              {project.resources && project.resources.length > 0 ? (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={containerVariants}
                  className="grid gap-4 md:grid-cols-2"
                >
                  {project.resources.map((resource, index) => (
                    <ResourceCard key={resource.slug || index} resource={resource} t={t} />
                  ))}
                </motion.div>
              ) : (
                <div className="text-center py-12">
                  <FaDatabase className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {t("noResources")}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'publications' && (
            <div className="space-y-6">
              {project.publications && project.publications.length > 0 ? (
                <>
                  {/* Group publications by year */}
                  {(() => {
                    const sorted = [...project.publications].sort((a, b) => (b.year || 0) - (a.year || 0));
                    const grouped = sorted.reduce((acc, pub) => {
                      const key = pub.year || 'Other';
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(pub);
                      return acc;
                    }, {});

                    return Object.entries(grouped).map(([year, pubs]) => (
                      <div key={year}>
                        <div className="flex items-center gap-3 mb-4">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {year}
                          </h3>
                          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                            {pubs.length === 1 
                              ? t("publicationCount", { count: pubs.length })
                              : t("publicationCountPlural", { count: pubs.length })
                            }
                          </span>
                        </div>
                        <motion.div
                          initial="hidden"
                          animate="visible"
                          variants={containerVariants}
                          className="grid gap-4"
                        >
                          {pubs.map((pub, index) => (
                            <PublicationCard key={pub.slug || pub.id || index} publication={pub} t={t} />
                          ))}
                        </motion.div>
                      </div>
                    ));
                  })()}
                </>
              ) : (
                <div className="text-center py-12">
                  <FaBookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {t("noPublications")}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Research Tab */}
          {activeTab === 'research' && (
            <div className="space-y-6">
              {project.researchContent && project.researchContent.length > 0 ? (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={containerVariants}
                  className="space-y-8"
                >
                  <DynamicZone blocks={project.researchContent} />
                </motion.div>
              ) : (
                <div className="text-center py-12">
                  <FaFlask className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {t('noResearch')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Results Tab */}
          {activeTab === 'results' && (
            <div className="space-y-6">
              {project.results && project.results.length > 0 ? (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={containerVariants}
                  className="grid gap-4 md:grid-cols-2"
                >
                  {project.results.map((result) => (
                    <Link
                      key={result.id}
                      href={`/research/results/${result.slug}`}
                      className="block group"
                    >
                      <motion.div
                        variants={itemVariants}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 hover:shadow-lg transition h-full flex flex-col"
                      >
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 mb-2">
                          {result.title}
                        </h3>
                        {result.description && (
                          <p className="text-gray-600 dark:text-gray-300 line-clamp-3 mb-3 flex-1">
                            {result.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mt-auto">
                          {result.publishedDate && (
                            <span>
                              {new Date(result.publishedDate).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long' 
                              })}
                            </span>
                          )}
                          {result.attachments?.length > 0 && (
                            <span>
                              📎 {result.attachments.length} {result.attachments.length === 1 ? t('attachment') : t('attachments')}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    </Link>
                  ))}
                </motion.div>
              ) : (
                <div className="text-center py-12">
                  <FaCog className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {t('noResults')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* News Tab */}
          {activeTab === 'news' && (
            <div className="space-y-6">
              {projectNews.length > 0 ? (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={containerVariants}
                  className="grid gap-6 md:grid-cols-2 xl:grid-cols-3"
                >
                  {projectNews.map((item) => (
                    <NewsCard
                      key={item.id || item.slug || item.title}
                      item={item}
                      t={t}
                    />
                  ))}
                </motion.div>
              ) : (
                <div className="text-center py-12">
                  <FaNewspaper className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {t('noNews')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Partners Tab */}
          {activeTab === 'partners' && (
            <div className="space-y-6">
              {partners && partners.length > 0 ? (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={containerVariants}
                  className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
                >
                  {partners.map((partner) => (
                    <PartnerCard key={partner.id} partner={partner} />
                  ))}
                </motion.div>
              ) : (
                <div className="text-center py-12">
                  <FaHandshake className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {t('noPartners')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Contact Tab */}
          {activeTab === 'contact' && (
            <div className="space-y-6">
              {project.contactInfo ? (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={containerVariants}
                >
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    {t('contactInformation')}
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column: Contact Entries */}
                    <motion.div
                      variants={itemVariants}
                      className="space-y-4"
                    >
                      {project.contactInfo.contactEntries && project.contactInfo.contactEntries.length > 0 ? (
                        <>
                          {project.contactInfo.contactEntries.map((entry, index) => {
                            const getIcon = (type) => {
                              switch(type) {
                                case 'email': return FaEnvelope;
                                case 'phone': return FaPhone;
                                case 'address': return FaMapMarkerAlt;
                                case 'website': return FaExternalLinkAlt;
                                case 'social': return FaUserTie;
                                default: return FaInfoCircle;
                              }
                            };
                            
                            const getIconColor = (type) => {
                              switch(type) {
                                case 'email': return 'text-blue-600';
                                case 'phone': return 'text-green-600';
                                case 'address': return 'text-red-600';
                                case 'website': return 'text-purple-600';
                                case 'social': return 'text-cyan-600';
                                default: return 'text-gray-600';
                              }
                            };
                            
                            const linkValue = (type, value) => {
                              if (type === 'email') {
                                return <a href={`mailto:${value}`} className="text-blue-600 dark:text-blue-400 hover:underline break-all">{value}</a>;
                              }
                              if (type === 'phone') {
                                return <a href={`tel:${value}`} className="text-blue-600 dark:text-blue-400 hover:underline">{value}</a>;
                              }
                              if (type === 'website') {
                                return <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline break-all">{value}</a>;
                              }
                              return <span className="text-gray-700 dark:text-gray-300">{value}</span>;
                            };
                            
                            const Icon = getIcon(entry.type);
                            
                            return (
                              <div key={index} className="flex items-start gap-3 p-4 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                                <div className="mt-1 flex-shrink-0">
                                  <Icon className={`w-5 h-5 ${getIconColor(entry.type)}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-gray-900 dark:text-white mb-1">
                                    {entry.label}
                                  </div>
                                  <div className="mb-1">
                                    {linkValue(entry.type, entry.value)}
                                  </div>
                                  {entry.description && (
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                      {entry.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </>
                      ) : null}
                    </motion.div>
                    
                    {/* Right Column: General Info */}
                    {project.contactInfo.generalInfo && (
                      <motion.div
                        variants={itemVariants}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700"
                      >
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          {t('generalSupport')}
                        </h3>
                        <div className="prose dark:prose-invert max-w-none">
                          <RichMarkdown content={project.contactInfo.generalInfo} />
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <div className="text-center py-12">
                  <FaPhone className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {t('noContact')}
                  </p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
