"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FaCalendarAlt,
  FaExternalLinkAlt,
  FaMapMarkerAlt,
} from "react-icons/fa";
import {
  MAX_ROOM_SCHEDULE_DAYS,
  addIsoDays,
  eventIsOngoing,
  isAllDayEvent,
  nowInTimetableTimeZone,
  parseTimetableDateTime,
  roomTimetableUrl,
  todayInTimetableTimeZone,
} from "@/lib/timetable";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

const EmptyState = ({ children }) => (
  <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
    <FaCalendarAlt className="mx-auto mb-3 h-8 w-8 opacity-40" aria-hidden="true" />
    {children}
  </div>
);

function clock(minutes) {
  if (!Number.isFinite(minutes)) return "";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function formatDay(value, today) {
  if (!value) return "";

  if (value === today) return "Today";
  if (value === addIsoDays(today, 1)) return "Tomorrow";

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function timeRange(event) {
  if (isAllDayEvent(event)) return "All day";

  const start = parseTimetableDateTime(event.start);
  const end = parseTimetableDateTime(event.end);
  if (!start) return "";
  if (!end) return clock(start.minutes);
  return `${clock(start.minutes)}–${clock(end.minutes)}`;
}

function currentEndLabel(event) {
  if (isAllDayEvent(event)) return "all day";
  const end = parseTimetableDateTime(event.end);
  return end ? `until ${clock(end.minutes)}` : "";
}

function showPerson(event) {
  const title = String(event.title || "").toLowerCase();
  const person = String(event.person || "").toLowerCase();
  return Boolean(person) && person !== title && !title.includes(person);
}

export default function LaboratorySchedule({ roomNumber }) {
  const [range, setRange] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(null);

  useEffect(() => {
    const from = todayInTimetableTimeZone();
    setRange({ from, to: addIsoDays(from, MAX_ROOM_SCHEDULE_DAYS - 1) });

    const tick = () => setNow(nowInTimetableTimeZone());
    tick();
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!roomNumber) {
      setLoading(false);
      return undefined;
    }

    if (!range) return undefined;

    let cancelled = false;
    const controller = new AbortController();
    const params = new URLSearchParams({
      room: roomNumber,
      from: range.from,
      to: range.to,
    });

    setLoading(true);
    setError("");

    fetch(`/api/timetable/room?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || "Could not load the room schedule.");
        }
        return payload;
      })
      .then((data) => {
        if (cancelled) return;
        setSchedule(data);
        setLoading(false);
      })
      .catch((requestError) => {
        if (cancelled || requestError?.name === "AbortError") return;
        setError(
          requestError?.message || "Could not load the room schedule."
        );
        setSchedule(null);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [range, roomNumber]);

  const events = useMemo(
    () => (Array.isArray(schedule?.events) ? schedule.events : []),
    [schedule]
  );

  const days = useMemo(() => {
    const grouped = new Map();

    for (const event of events) {
      const start = parseTimetableDateTime(event.start);
      if (!start) continue;
      if (!grouped.has(start.date)) grouped.set(start.date, []);
      grouped.get(start.date).push(event);
    }

    return [...grouped.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, dayEvents]) => ({ date, events: dayEvents }));
  }, [events]);

  const current = now
    ? events.find((event) => eventIsOngoing(event, now)) || null
    : null;
  const verified = schedule?.calendar?.verified === true;

  if (!roomNumber) {
    return <EmptyState>This laboratory has no room assigned yet.</EmptyState>;
  }

  if (loading) {
    return (
      <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        Loading the room schedule…
      </p>
    );
  }

  if (error) {
    return <div className="notice notice-warning text-sm">{error}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-300">
            <FaMapMarkerAlt className="h-3.5 w-3.5 text-primary-500" />
            Room {roomNumber}
          </span>
          <span aria-hidden="true">·</span>
          <span>Next {MAX_ROOM_SCHEDULE_DAYS} days</span>
        </div>

        <a
          href={
            schedule?.timetableUrl ||
            roomTimetableUrl(roomNumber, range?.from)
          }
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:underline dark:text-primary-400"
        >
          Open room calendar
          <FaExternalLinkAlt className="h-3 w-3" aria-hidden="true" />
        </a>
      </div>

      <div
        className={`rounded-2xl border p-4 ${
          current
            ? "border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/30"
            : verified
              ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/30"
              : "border-gray-200 bg-gray-50/70 dark:border-gray-800 dark:bg-gray-900/60"
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
              current
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                : verified
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                  : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
            {current
              ? "Occupied now"
              : verified
                ? "Free now"
                : "Availability unknown"}
          </span>
          {current && currentEndLabel(current) && (
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {currentEndLabel(current)}
            </span>
          )}
        </div>

        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          {current ? (
            <>
              <span className="font-semibold">{current.title}</span>
              {showPerson(current) && ` · ${current.person}`}
            </>
          ) : verified ? (
            "No booking is in progress right now."
          ) : (
            "The timetable has not confirmed this room's calendar recently. Check the full timetable before relying on this."
          )}
        </p>
      </div>

      {schedule?.calendar?.name && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Timetable calendar:{' '}
          <span className="font-medium text-gray-600 dark:text-gray-300">
            {schedule.calendar.name}
          </span>
        </p>
      )}

      {days.length === 0 ? (
        <EmptyState>
          {verified
            ? `No room bookings in the next ${MAX_ROOM_SCHEDULE_DAYS} days.`
            : "No confirmed bookings in the next few days. Availability may be incomplete."}
        </EmptyState>
      ) : (
        <motion.div
          className="space-y-5"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {days.map((day) => (
            <motion.section
              key={day.date}
              variants={itemVariants}
              className="space-y-2"
            >
              <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                {formatDay(day.date, range?.from)}
              </h3>

              <div className="space-y-2">
                {day.events.map((event) => {
                  const ongoing = now ? eventIsOngoing(event, now) : false;

                  return (
                    <div
                      key={event.id}
                      className={`flex flex-wrap items-start gap-3 rounded-xl border px-4 py-3 ${
                        ongoing
                          ? "border-primary-200 bg-primary-50/60 dark:border-primary-900/60 dark:bg-primary-900/20"
                          : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                      }`}
                    >
                      <div className="w-28 shrink-0 text-sm font-semibold text-gray-700 dark:text-gray-200">
                        {timeRange(event)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {event.title}
                        </p>
                        {showPerson(event) && (
                          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                            {event.person}
                          </p>
                        )}
                      </div>

                      {ongoing && (
                        <span className="inline-flex shrink-0 items-center rounded-full bg-primary-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                          Now
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.section>
          ))}
        </motion.div>
      )}
    </div>
  );
}
