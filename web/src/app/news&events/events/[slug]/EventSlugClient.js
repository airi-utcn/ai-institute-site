"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import RichMarkdown from "@/components/shared/RichMarkdown";
import DynamicZone from "@/components/shared/DynamicZone";
import {
  FaArrowLeft,
  FaCalendar,
  FaMapMarkerAlt,
  FaVideo,
  FaLanguage,
  FaUsers,
  FaEnvelope,
  FaInfoCircle,
  FaRegImage,
  FaShareAlt,
  FaLock,
  FaBuilding,
  FaUserTie,
} from "react-icons/fa";

export default function EventSlugClient({ event }) {
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  if (!event) return null;

  const formatDate = (dateString) => {
    if (!dateString) return null;
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const startStr = formatDate(event.startDate);
  const endStr = formatDate(event.endDate);
  const deadlineStr = formatDate(event.registrationDeadline);

  const getFormatIcon = (format) => {
    switch (format) {
      case "online":
        return <FaVideo className="text-gray-400 mt-1 flex-shrink-0" />;
      case "hybrid":
      default:
        return <FaMapMarkerAlt className="text-gray-400 mt-1 flex-shrink-0" />;
    }
  };

  const bodyBlocks = Array.isArray(event.body) ? event.body : [];
  const markdownClassName =
    "prose prose-lg prose-blue dark:prose-invert max-w-none text-gray-700 dark:text-gray-300";

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Back Link */}
        <Link
          href="/news&events/events"
          className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-6 font-medium"
        >
          <FaArrowLeft className="w-3.5 h-3.5" />
          Back to Events
        </Link>

        {/* Event Header */}
        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 capitalize">
              {(event.category || "event").replace(/_/g, " ")}
            </span>
            {event.format && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 capitalize">
                {event.format}
              </span>
            )}
            {startStr && (
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <FaCalendar className="w-3 h-3" />
                {startStr}
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight mb-4">
            {event.title}
          </h1>
        </header>

        {/* Hero Banner Image */}
        {event.image && (
          <div className="mb-10">
            <div className="w-full h-64 sm:h-80 md:h-[420px] relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm bg-gray-100 dark:bg-gray-900">
              <img
                src={event.image}
                alt={event.title}
                style={
                  event.focalPoint
                    ? {
                        objectPosition: `${event.focalPoint.x || 50}% ${
                          event.focalPoint.y || 25
                        }%`,
                      }
                    : undefined
                }
                className="w-full h-full object-cover"
              />
            </div>
            {event.photoCredits && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-right">
                <FaRegImage className="inline mr-1" />
                Photo credits: {event.photoCredits}
              </p>
            )}
          </div>
        )}

        {/* Two-Column Layout */}
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Main Content Area */}
          <div className="flex-1 space-y-10 min-w-0">
            {/* Description Abstract */}
            {event.description && (
              <section className={markdownClassName}>
                <RichMarkdown content={event.description} />
              </section>
            )}

            {/* Dynamic Zone Body Content */}
            {bodyBlocks.length > 0 && (
              <DynamicZone blocks={bodyBlocks} />
            )}

            {/* Speakers & Participants */}
            {event.participants && event.participants.length > 0 && (
              <section className="space-y-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FaUserTie className="text-blue-600 dark:text-blue-400" />
                  Speakers & Participants
                </h2>
                <div className="grid grid-cols-1 gap-5">
                  {event.participants.map((p, idx) => {
                    const person = p.person || p || {};
                    const avatarImg = p.image || person.image;
                    const displayName = p.name || person.name || "Speaker";
                    const displayTitle = p.title || person.title;
                    const displayBio = p.bio || person.bio;

                    return (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row gap-5 bg-gray-50 dark:bg-gray-900/60 p-6 rounded-2xl border border-gray-200/80 dark:border-gray-800 transition-colors"
                      >
                        {/* Portrait */}
                        <div className="flex-shrink-0">
                          {avatarImg ? (
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-white dark:border-gray-800 shadow-md">
                              <img
                                src={avatarImg}
                                alt={displayName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-md">
                              {displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                              {person.slug ? (
                                <Link
                                  href={`/people/${encodeURIComponent(
                                    person.slug
                                  )}`}
                                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                >
                                  {displayName}
                                </Link>
                              ) : (
                                displayName
                              )}
                            </h3>
                            {p.role && (
                              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 capitalize">
                                {p.role.replace(/_/g, " ")}
                              </span>
                            )}
                          </div>

                          {displayTitle && (
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                              {displayTitle}
                            </p>
                          )}

                          {displayBio && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed pt-1">
                              {displayBio}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Registration & Access Conditions */}
            {event.accessConditions && (
              <section className="bg-blue-50 dark:bg-blue-950/30 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/40">
                <h3 className="font-bold flex items-center gap-2 mb-2 text-blue-900 dark:text-blue-200 text-base">
                  <FaLock /> Registration & Access Conditions
                </h3>
                <div className="prose dark:prose-invert prose-sm max-w-none text-blue-950 dark:text-blue-100">
                  <RichMarkdown content={event.accessConditions} />
                </div>
              </section>
            )}

            {/* Additional Notes */}
            {event.additionalNotes && (
              <section className="bg-amber-50 dark:bg-amber-950/30 p-6 rounded-2xl border border-amber-200/80 dark:border-amber-900/40">
                <h3 className="font-bold flex items-center gap-2 mb-2 text-amber-900 dark:text-amber-200 text-base">
                  <FaInfoCircle /> Additional Notes
                </h3>
                <div className="prose dark:prose-invert prose-sm max-w-none text-amber-950 dark:text-amber-100">
                  <RichMarkdown content={event.additionalNotes} />
                </div>
              </section>
            )}

            {/* Privacy / Recording Notice */}
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-12 pt-6 border-t border-gray-200 dark:border-gray-800 leading-relaxed">
              <p>
                <strong>Privacy Notice:</strong>{" "}
                {event.privacyNotice ||
                  "By participating in this event, you acknowledge that photography, audio, and video recording may occur. By entering the event premises, you consent to interview(s), photography, audio recording, video recording and its/their release, publication, exhibition, or reproduction to be used for news, web casts, promotional purposes, telecasts, advertising, inclusion on websites, social media, or any other purpose by AIRi and its affiliates and representatives."}
              </p>
            </div>
          </div>

          {/* Right Column: Sidebar */}
          <aside className="w-full lg:w-80 flex-shrink-0 space-y-6">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 border border-gray-200/80 dark:border-gray-800 space-y-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Event Details
              </h3>

              <div className="space-y-4 text-sm">
                <div className="flex gap-3">
                  <FaCalendar className="text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      Date & Time
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      {startStr ? (
                        <>
                          <div>{startStr}</div>
                          {endStr && event.endDate !== event.startDate && (
                            <div className="text-gray-500 text-xs mt-0.5">
                              to {endStr}
                            </div>
                          )}
                        </>
                      ) : (
                        "To be announced"
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  {getFormatIcon(event.format)}
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white pb-1">
                      Location / Format
                    </div>
                    {event.format && (
                      <span className="inline-block mb-1 text-xs px-2.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 capitalize font-medium">
                        {event.format}
                      </span>
                    )}
                    <div className="text-gray-600 dark:text-gray-400">
                      {event.address && <div>{event.address}</div>}
                      {event.roomOrLink && (
                        <div className="mt-0.5">
                          {event.format === "online" &&
                          event.roomOrLink.startsWith("http") ? (
                            <a
                              href={event.roomOrLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Join Online Meeting
                            </a>
                          ) : (
                            event.roomOrLink
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {event.audience && (
                  <div className="flex gap-3">
                    <FaUsers className="text-gray-400 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        Audience
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 capitalize">
                        {Array.isArray(event.audience)
                          ? event.audience
                              .map((a) => a.replace(/_/g, " "))
                              .join(", ")
                          : event.audience.replace(/_/g, " ")}
                      </div>
                    </div>
                  </div>
                )}

                {event.language && (
                  <div className="flex gap-3">
                    <FaLanguage className="text-gray-400 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        Language
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 capitalize">
                        {event.language.replace(/_/g, " ")}
                      </div>
                    </div>
                  </div>
                )}

                {event.partnerInstitutions && (
                  <div className="flex gap-3">
                    <FaBuilding className="text-gray-400 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        Partners
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        {event.partnerInstitutions}
                      </div>
                    </div>
                  </div>
                )}

                {(event.contactEmail || event.contactName) && (
                  <div className="flex gap-3">
                    <FaEnvelope className="text-gray-400 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        Contact
                      </div>
                      {event.contactName && (
                        <div className="text-gray-800 dark:text-gray-200">
                          {event.contactName}
                        </div>
                      )}
                      {event.contactEmail && (
                        <a
                          href={`mailto:${event.contactEmail}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                        >
                          {event.contactEmail}
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {event.registrationDeadline && (
                  <div className="flex gap-3">
                    <FaCalendar className="text-orange-500 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        Registration Deadline
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 text-xs">
                        {deadlineStr}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions & Buttons */}
              <div className="pt-6 border-t border-gray-200 dark:border-gray-800 space-y-3">
                <a
                  href={`/api/events/${event.slug}/ics`}
                  className="block w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-center rounded-xl font-semibold transition-colors shadow-sm"
                >
                  Add to Calendar (.ics)
                </a>

                {/* Google Calendar */}
                <a
                  href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
                    event.title
                  )}&dates=${
                    event.startDate
                      ? event.startDate
                          .replace(/[-:]/g, "")
                          .replace(/\.\d{3}/, "")
                      : ""
                  }/${
                    event.endDate
                      ? event.endDate
                          .replace(/[-:]/g, "")
                          .replace(/\.\d{3}/, "")
                      : ""
                  }&details=${encodeURIComponent(
                    "AIRi Event Details: " + currentUrl
                  )}&location=${encodeURIComponent(
                    event.address || event.roomOrLink || ""
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-2.5 px-4 bg-white hover:bg-gray-100 border border-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-center rounded-xl font-medium transition-colors"
                >
                  Google Calendar
                </a>

                {event.registrationRequired &&
                  event.registrationLinkOrEmail && (
                    <a
                      href={
                        event.registrationLinkOrEmail.startsWith("http")
                          ? event.registrationLinkOrEmail
                          : `mailto:${event.registrationLinkOrEmail}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full py-2.5 px-4 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 dark:text-gray-950 text-white text-center rounded-xl font-bold transition-colors mt-3"
                    >
                      Register Now
                    </a>
                  )}
              </div>
            </div>

            {/* Social Share */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 border border-gray-200/80 dark:border-gray-800 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FaShareAlt className="text-gray-500" /> Share Event
              </h3>
              <div className="flex gap-2">
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
                    currentUrl
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-4 bg-[#0a66c2] hover:bg-[#004182] text-white text-center rounded-lg font-medium text-sm transition-colors"
                >
                  LinkedIn
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(
                    currentUrl
                  )}&text=${encodeURIComponent(event.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-4 bg-black hover:bg-gray-800 text-white text-center rounded-lg font-medium text-sm transition-colors"
                >
                  X (Twitter)
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
