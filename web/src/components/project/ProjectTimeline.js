'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  FaPlay,
  FaFlag,
  FaFlagCheckered,
  FaCheck,
  FaClock,
  FaCalendarAlt,
  FaCalendarCheck,
  FaTrophy,
  FaArrowRight,
  FaInfoCircle,
  FaHourglassHalf,
  FaCircle,
  FaMapMarkerAlt,
} from 'react-icons/fa';

/**
 * Parse an input value to a valid Date instance without timezone day drift.
 */
function parseProjectDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const str = String(value).trim();
  if (/^\d{4}$/.test(str)) {
    return new Date(Date.UTC(Number(str), 0, 1));
  }
  if (/^\d{4}-\d{2}$/.test(str)) {
    const [y, m] = str.split('-');
    return new Date(Date.UTC(Number(y), Number(m) - 1, 1));
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-');
    return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  }
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Format a date nicely for project display.
 */
function formatProjectDate(value, locale = 'en') {
  if (!value) return '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{4}$/.test(trimmed)) return trimmed;
    if (/^\d{4}-\d{2}$/.test(trimmed)) {
      const [y, m] = trimmed.split('-');
      const d = new Date(Date.UTC(Number(y), Number(m) - 1, 1));
      return new Intl.DateTimeFormat(locale, {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(d);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-');
      const dateObj = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
      return new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(dateObj);
    }
  }

  const d = value instanceof Date ? value : parseProjectDate(value);
  if (!d) return '';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/**
 * Compute friendly relative time description (e.g. "3 months ago", "in 45 days").
 */
function getRelativeTimeDescription(targetDate, baseDate) {
  if (!targetDate || !baseDate) return '';
  const diffMs = targetDate.getTime() - baseDate.getTime();
  const isPast = diffMs < 0;
  const absDays = Math.max(1, Math.round(Math.abs(diffMs) / (1000 * 60 * 60 * 24)));

  if (absDays < 30) {
    return isPast
      ? `${absDays} ${absDays === 1 ? 'day' : 'days'} ago`
      : `in ${absDays} ${absDays === 1 ? 'day' : 'days'}`;
  }

  const absMonths = Math.round(absDays / 30.4375);
  if (absMonths < 12) {
    return isPast
      ? `${absMonths} ${absMonths === 1 ? 'month' : 'months'} ago`
      : `in ${absMonths} ${absMonths === 1 ? 'month' : 'months'}`;
  }

  const absYears = (absDays / 365.25).toFixed(1).replace(/\.0$/, '');
  return isPast
    ? `${absYears} ${absYears === '1' ? 'year' : 'years'} ago`
    : `in ${absYears} ${absYears === '1' ? 'year' : 'years'}`;
}

const DEFAULT_TIMELINE_LABELS = {
  timeline: 'Project Journey & Timeline',
  kickoff: 'Project Kickoff',
  kickoffDesc: 'Official launch of project research activities.',
  completion: 'Target Completion',
  completionDesc: 'Scheduled delivery of final milestones and objectives.',
  completed: 'Completed',
  concluded: 'Project Concluded',
  concludedDesc: 'All project objectives and deliverables achieved.',
  upcoming: 'Upcoming',
  inProgress: 'In Progress',
  planned: 'Planned to Start',
  today: 'Today',
  currentPosition: 'Current Position',
  elapsed: 'elapsed',
  remaining: 'remaining',
  noTimeline: 'No timeline schedule published yet.',
  milestonesTracking: 'Tracking project schedule from kickoff to completion.',
  continuousOperations: 'Continuous Operations',
  continuousOperationsDesc: 'Active ongoing research with an open-ended delivery roadmap.',
  milestoneFallback: 'Project Milestone',
  daysRemainingLabel: '{count} days remaining',
  daysElapsedLabel: '{count} days elapsed',
};

export default function ProjectTimeline({
  startDate,
  endDate,
  timeline = [],
  t = (key) => DEFAULT_TIMELINE_LABELS[key] || key,
  now = null,
}) {
  const currentDate = parseProjectDate(now) || new Date();
  const start = parseProjectDate(startDate);
  const end = parseProjectDate(endDate);

  const translate = (key, fallback) => {
    const val = t(key);
    return val && val !== key ? val : (DEFAULT_TIMELINE_LABELS[key] || fallback || key);
  };

  // Determine overall status
  let status = 'unknown';
  if (end && currentDate > end) {
    status = 'ended';
  } else if (start && currentDate < start) {
    status = 'planned';
  } else if (start || end) {
    status = 'ongoing';
  }

  // Parse raw milestone events
  const rawMilestones = (Array.isArray(timeline) ? timeline : [])
    .map((event, index) => {
      const parsedDate = parseProjectDate(event?.date);
      return {
        id: `milestone-${index}-${event?.label || 'event'}`,
        type: 'milestone',
        label: event?.label || translate('milestoneFallback', 'Project Milestone'),
        rawDate: event?.date || '',
        date: parsedDate,
        dateLabel: formatProjectDate(event?.date || parsedDate),
        description: event?.description || '',
      };
    })
    .filter((m) => !!m.date);

  // If no start/end but milestones exist, infer status
  if (status === 'unknown' && rawMilestones.length > 0) {
    const earliest = rawMilestones[0].date;
    const latest = rawMilestones[rawMilestones.length - 1].date;
    if (currentDate > latest) status = 'ended';
    else if (currentDate < earliest) status = 'planned';
    else status = 'ongoing';
  }

  // Calculate progress percentage
  let progressPercent = null;
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  let daysElapsed = null;
  let daysRemaining = null;
  let timeUntilStart = null;
  let timeSinceEnd = null;

  if (status === 'ended') {
    progressPercent = 100;
    if (end) {
      timeSinceEnd = getRelativeTimeDescription(end, currentDate);
    }
  } else if (status === 'planned') {
    progressPercent = 0;
    if (start) {
      timeUntilStart = getRelativeTimeDescription(start, currentDate);
    }
  } else if (status === 'ongoing') {
    if (start && end && end.getTime() > start.getTime()) {
      const total = end.getTime() - start.getTime();
      const elapsed = currentDate.getTime() - start.getTime();
      progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
      daysElapsed = Math.max(0, Math.floor(elapsed / MS_PER_DAY));
      daysRemaining = Math.max(0, Math.ceil((end.getTime() - currentDate.getTime()) / MS_PER_DAY));
    } else if (start) {
      // Open-ended ongoing
      daysElapsed = Math.max(0, Math.floor((currentDate.getTime() - start.getTime()) / MS_PER_DAY));
    }
  }

  // Format key dates
  const startFormatted = formatProjectDate(startDate || start);
  const endFormatted = formatProjectDate(endDate || end);
  const todayFormatted = formatProjectDate(currentDate);

  // Build the complete chronological list of timeline nodes
  const timelineNodes = [];

  // 1. Start node
  if (start) {
    timelineNodes.push({
      id: 'node-start',
      type: 'start',
      label: translate('kickoff', 'Project Kickoff'),
      date: start,
      dateLabel: startFormatted,
      description: translate('kickoffDesc', 'Official launch of project research activities.'),
      state: currentDate >= start ? 'completed' : 'upcoming',
      badge: translate('kickoff', 'Kickoff'),
    });
  }

  // 2. Intermediary milestone nodes
  rawMilestones.forEach((m) => {
    let state = 'upcoming';
    if (m.date.getTime() < currentDate.getTime()) {
      state = 'completed';
    } else if (m.date.toDateString() === currentDate.toDateString()) {
      state = 'current';
    }
    timelineNodes.push({
      ...m,
      state,
      badge: state === 'completed'
        ? translate('completed', 'Completed')
        : state === 'current'
        ? translate('inProgress', 'In Progress')
        : translate('upcoming', 'Upcoming'),
    });
  });

  // 3. TODAY Node - Contextualized for the project status
  let todayDescription = '';
  let todayBadge = translate('today', 'Today');

  if (status === 'ended') {
    todayBadge = translate('concluded', 'Project Concluded');
    todayDescription = endFormatted
      ? `Project successfully completed all milestones on ${endFormatted} (${timeSinceEnd}). Current status: Archived / Operational.`
      : `Project has already ended. Current status: Completed.`;
  } else if (status === 'planned') {
    todayBadge = translate('planned', 'Pre-kickoff Phase');
    todayDescription = startFormatted
      ? `Project preparation phase. Scheduled kickoff is on ${startFormatted} (${timeUntilStart}).`
      : `Project is currently in the planning stage.`;
  } else {
    todayBadge = translate('currentPosition', 'Current Position');
    todayDescription = progressPercent !== null
      ? `Active project execution — ${progressPercent}% of timeline completed.${daysRemaining !== null ? ` ${daysRemaining} days remaining until target completion.` : ''}`
      : `Active project execution in progress.`;
  }

  timelineNodes.push({
    id: 'node-today',
    type: 'today',
    label: `${translate('today', 'Today')} • ${todayFormatted}`,
    date: currentDate,
    dateLabel: todayFormatted,
    description: todayDescription,
    state: 'today',
    badge: todayBadge,
  });

  // 4. End node
  if (end) {
    timelineNodes.push({
      id: 'node-end',
      type: 'end',
      label: status === 'ended'
        ? translate('concluded', 'Project Concluded')
        : translate('completion', 'Target Completion'),
      date: end,
      dateLabel: endFormatted,
      description: status === 'ended'
        ? translate('concludedDesc', 'All project objectives and deliverables achieved.')
        : translate('completionDesc', 'Scheduled delivery of final milestones and objectives.'),
      state: currentDate >= end ? 'completed' : 'upcoming',
      badge: status === 'ended' ? translate('completed', 'Completed') : translate('completion', 'Target Goal'),
    });
  } else if (start && status === 'ongoing') {
    // Open-ended continuation
    timelineNodes.push({
      id: 'node-open-ended',
      type: 'open-ended',
      label: translate('continuousOperations', 'Continuous Operations'),
      date: new Date(currentDate.getTime() + 1000 * 60 * 60 * 24 * 365 * 10),
      dateLabel: 'Ongoing',
      description: translate('continuousOperationsDesc', 'Active ongoing research with an open-ended delivery roadmap.'),
      state: 'upcoming',
      badge: translate('inProgress', 'Active'),
    });
  }

  // Sort chronologically with a stable tie-breaker
  timelineNodes.sort((a, b) => {
    const diff = a.date.getTime() - b.date.getTime();
    if (diff !== 0) return diff;
    const priority = { start: 1, milestone: 2, today: 3, end: 4, 'open-ended': 5 };
    return (priority[a.type] || 3) - (priority[b.type] || 3);
  });

  // If no dates exist at all
  if (timelineNodes.length === 1 && timelineNodes[0].type === 'today' && !start && !end && rawMilestones.length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700">
        <FaInfoCircle className="mx-auto text-3xl text-gray-400 mb-3" />
        <p className="text-gray-600 dark:text-gray-300 font-medium">
          {translate('noTimeline', 'No timeline schedule published yet.')}
        </p>
      </div>
    );
  }

  // Visual status pill configuration
  const statusConfig = {
    ongoing: {
      label: translate('inProgress', 'In Progress'),
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 ring-1 ring-emerald-300 dark:ring-emerald-700',
      dot: 'bg-emerald-500',
    },
    ended: {
      label: translate('completed', 'Completed'),
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-700',
      dot: 'bg-blue-500',
    },
    planned: {
      label: translate('planned', 'Planned'),
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 ring-1 ring-amber-300 dark:ring-amber-700',
      dot: 'bg-amber-500',
    },
    unknown: {
      label: 'Scheduled',
      badge: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      dot: 'bg-gray-400',
    },
  }[status];

  return (
    <div className="space-y-8">
      {/* ── Progress Horizon & Summary Card ── */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-gray-800/80 dark:to-gray-850 border border-gray-200 dark:border-gray-700 shadow-sm">
        {/* Top Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-600 text-white dark:bg-blue-500 shadow-sm">
              <FaCalendarCheck className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug">
                {translate('timeline', 'Project Journey & Timeline')}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Today is <span className="font-semibold text-gray-800 dark:text-gray-200">{todayFormatted}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${statusConfig.badge}`}>
              <span className={`w-2 h-2 rounded-full ${statusConfig.dot} ${status === 'ongoing' ? 'animate-pulse' : ''}`} />
              {statusConfig.label}
            </span>
            {progressPercent !== null && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 shadow-2xs">
                {progressPercent}%
              </span>
            )}
          </div>
        </div>

        {/* Horizontal Progress Horizon Bar */}
        {(start || end) && (
          <div className="mt-4 mb-2">
            {/* Progress Track */}
            <div className="relative w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
              {status === 'ongoing' && progressPercent !== null && (
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.max(2, progressPercent)}%` }}
                />
              )}
              {status === 'ended' && (
                <div className="h-full w-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full" />
              )}
              {status === 'planned' && (
                <div className="h-full w-1 bg-amber-400 rounded-full" />
              )}
            </div>

            {/* Marker labels under horizon */}
            <div className="flex justify-between items-center text-xs mt-2.5 text-gray-500 dark:text-gray-400 font-medium">
              <span className="flex items-center gap-1">
                <FaPlay className="w-2.5 h-2.5 text-blue-500" />
                <span>Start: {startFormatted || 'Kickoff'}</span>
              </span>

              {status === 'ongoing' && progressPercent !== null && (
                <span className="hidden sm:inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Today: {progressPercent}% elapsed
                </span>
              )}

              <span className="flex items-center gap-1">
                {status === 'ended' ? (
                  <>
                    <FaTrophy className="w-2.5 h-2.5 text-emerald-500" />
                    <span>Concluded: {endFormatted}</span>
                  </>
                ) : (
                  <>
                    <FaFlagCheckered className="w-2.5 h-2.5 text-gray-400" />
                    <span>End: {endFormatted || 'Open-ended'}</span>
                  </>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Contextual Status Banner */}
        <div className="mt-4 pt-3 border-t border-gray-200/80 dark:border-gray-700/80">
          {status === 'ended' && (
            <div className="flex items-center gap-2.5 text-xs text-blue-900 dark:text-blue-200 bg-blue-50 dark:bg-blue-950/40 px-3.5 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800">
              <FaTrophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                This project concluded on <strong>{endFormatted}</strong> ({timeSinceEnd}). Today ({todayFormatted}) is in the post-completion period. All milestones have been achieved.
              </span>
            </div>
          )}

          {status === 'planned' && (
            <div className="flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 px-3.5 py-2.5 rounded-xl border border-amber-200 dark:border-amber-800">
              <FaHourglassHalf className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                This project is scheduled to begin on <strong>{startFormatted}</strong> ({timeUntilStart}). Today ({todayFormatted}) is in the preparation and planning stage.
              </span>
            </div>
          )}

          {status === 'ongoing' && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-700 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span>
                  Active development underway. Today ({todayFormatted}) marks{' '}
                  <strong>{progressPercent !== null ? `${progressPercent}% progress` : 'current execution'}</strong>.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {daysElapsed !== null && (
                  <span className="px-2.5 py-0.5 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium">
                    {daysElapsed} days elapsed
                  </span>
                )}
                {daysRemaining !== null && (
                  <span className="px-2.5 py-0.5 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-emerald-700 dark:text-emerald-300 font-semibold">
                    {daysRemaining} days remaining
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Chronological Vertical Stream ── */}
      <div className="relative pl-6 sm:pl-8">
        {/* Continuous background vertical line */}
        <div className="absolute left-[13px] sm:left-[17px] top-4 bottom-6 w-[2px] bg-gray-200 dark:bg-gray-700 z-0" />

        {/* Render each node */}
        <div className="space-y-6 relative z-10">
          {timelineNodes.map((node, index) => {
            const isToday = node.type === 'today';
            const isCompleted = node.state === 'completed';
            const isCurrent = node.state === 'current';
            const isUpcoming = node.state === 'upcoming';

            return (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.05 }}
                className="relative flex items-start gap-4 sm:gap-6 group"
              >
                {/* Node Spine Icon / Beacon */}
                <div className="relative -ml-[19px] sm:-ml-[23px] shrink-0 mt-1">
                  {isToday ? (
                    // TODAY BEACON
                    <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 ring-4 ring-emerald-400/30 dark:ring-emerald-500/40 z-20">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                      <FaMapMarkerAlt className="w-4 h-4 relative z-10" />
                    </div>
                  ) : node.type === 'start' ? (
                    // START NODE
                    <div
                      className={`flex items-center justify-center w-7 h-7 rounded-full text-white shadow-sm ring-4 ring-white dark:ring-gray-900 z-10 ${
                        isCompleted
                          ? 'bg-blue-600 dark:bg-blue-500'
                          : 'bg-amber-500 dark:bg-amber-600'
                      }`}
                    >
                      <FaPlay className="w-2.5 h-2.5 ml-0.5" />
                    </div>
                  ) : node.type === 'end' ? (
                    // END NODE
                    <div
                      className={`flex items-center justify-center w-7 h-7 rounded-full text-white shadow-sm ring-4 ring-white dark:ring-gray-900 z-10 ${
                        isCompleted
                          ? 'bg-emerald-600 dark:bg-emerald-500'
                          : 'bg-gray-400 dark:bg-gray-600'
                      }`}
                    >
                      {status === 'ended' ? (
                        <FaTrophy className="w-3.5 h-3.5" />
                      ) : (
                        <FaFlagCheckered className="w-3.5 h-3.5" />
                      )}
                    </div>
                  ) : node.type === 'open-ended' ? (
                    // OPEN-ENDED NODE
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-cyan-500 text-white shadow-sm ring-4 ring-white dark:ring-gray-900 z-10">
                      <FaArrowRight className="w-3 h-3 animate-pulse" />
                    </div>
                  ) : isCompleted ? (
                    // COMPLETED MILESTONE
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white shadow-sm ring-4 ring-white dark:ring-gray-900 z-10">
                      <FaCheck className="w-3 h-3" />
                    </div>
                  ) : isCurrent ? (
                    // ACTIVE / CURRENT MILESTONE
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-cyan-500 text-white shadow-sm ring-4 ring-white dark:ring-gray-900 z-10">
                      <FaClock className="w-3 h-3" />
                    </div>
                  ) : (
                    // UPCOMING MILESTONE
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 ring-4 ring-white dark:ring-gray-900 z-10">
                      <FaCircle className="w-2 h-2" />
                    </div>
                  )}
                </div>

                {/* Node Content Card */}
                <div className="flex-1 min-w-0">
                  {isToday ? (
                    // ── TODAY SPECIAL CARD ──
                    <div className="p-4 sm:p-5 rounded-2xl border-2 border-emerald-500/80 dark:border-emerald-400 bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-white dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-gray-800/80 shadow-md ring-2 ring-emerald-400/20 transition-all duration-200">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold tracking-wide uppercase bg-emerald-600 text-white dark:bg-emerald-500 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                            {node.badge}
                          </span>
                          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                            {node.dateLabel}
                          </span>
                        </div>

                        {status === 'ongoing' && progressPercent !== null && (
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700">
                            {progressPercent}% Complete
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                        {node.description}
                      </p>

                      {status === 'ongoing' && progressPercent !== null && (
                        <div className="mt-3 pt-3 border-t border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                          <span>Progress to date</span>
                          <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                            {daysElapsed !== null ? `${daysElapsed} days completed` : ''}
                            {daysRemaining !== null ? ` • ${daysRemaining} days remaining` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    // ── REGULAR NODE CARD ──
                    <div
                      className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${
                        isCompleted
                          ? 'bg-white dark:bg-gray-800/90 border-emerald-200/80 dark:border-emerald-900/50'
                          : 'bg-white/80 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 opacity-90'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-snug">
                          {node.label}
                        </h4>

                        <div className="flex items-center gap-2 shrink-0">
                          {node.dateLabel && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                              <FaCalendarAlt className="w-3 h-3 opacity-70" />
                              {node.dateLabel}
                            </span>
                          )}

                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                              isCompleted
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-600'
                            }`}
                          >
                            {node.badge}
                          </span>
                        </div>
                      </div>

                      {node.description && (
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed mt-1">
                          {node.description}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Subtle note when no intermediate milestones are available */}
      {rawMilestones.length === 0 && (start || end) && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-700/80 text-xs text-gray-500 dark:text-gray-400">
          <FaInfoCircle className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>
            {translate('milestonesTracking', 'Tracking project schedule from kickoff to completion. Detailed milestones will appear as project deliverables are published.')}
          </span>
        </div>
      )}
    </div>
  );
}
