"use client";

import { VerticalTimeline, VerticalTimelineElement } from "react-vertical-timeline-component";
import "react-vertical-timeline-component/style.min.css";
import { FaBuilding, FaUserFriends, FaMicrochip } from "react-icons/fa";
import { useTranslations } from "next-intl";

export default function HistorySection({ items }) {
  const t = useTranslations("about.history");

  const defaultEvents = [
    {
      date: t("event1.date"),
      title: t("event1.title"),
      description: t("event1.description"),
      icon: <FaBuilding />,
    },
    {
      date: t("event2.date"),
      title: t("event2.title"),
      description: t("event2.description"),
      icon: <FaUserFriends />,
    },
    {
      date: t("event3.date"),
      title: t("event3.title"),
      description: t("event3.description"),
      icon: <FaBuilding />,
    },
    {
      date: t("event4.date"),
      title: t("event4.title"),
      description: t("event4.description"),
      icon: <FaMicrochip />,
    },
    {
      date: t("event5.date"),
      title: t("event5.title"),
      description: (
        <>
          {t("event5.descriptionPart1")}
          <br />
          {t("event5.descriptionPart2")}
          <br />
          <a
            href="http://webcam.obs.utcluj.ro/"
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: "underline" }}
          >
            http://webcam.obs.utcluj.ro/
          </a>
        </>
      ),
      icon: <FaBuilding />,
    },
  ];

  const displayItems = items || defaultEvents;

  return (
    <>
      <VerticalTimeline lineColor="var(--icia-line)">
        {displayItems.map((ev) => (
          <VerticalTimelineElement
            key={`${ev.title}-${ev.date}`}
            date={ev.date}
            dateClassName="timeline-date"
            icon={ev.icon}
            iconStyle={{
              background: "#dc2626",
              color: "#ffffff",
              boxShadow: "0 0 0 6px #ffffff, inset 0 0 0 2px #111827",
            }}
            contentStyle={{
              background: "var(--icia-card-bg)",
              color: "var(--icia-card-text)",
              border: "1px solid var(--icia-card-border)",
              borderRadius: "10px",
              boxShadow: "0 2px 0 rgba(203,213,225,1), 0 10px 40px rgba(0,0,0,.08)",
              padding: "22px",
            }}
            contentArrowStyle={{ borderRight: "7px solid var(--icia-card-border)" }}
          >
            <h3
              style={{
                marginBottom: "8px",
                fontSize: "1.35rem",
                fontWeight: 700,
                color: "var(--icia-card-text)",
              }}
            >
              {ev.title}
            </h3>
            <div style={{ margin: 0, color: "var(--icia-card-text)", opacity: 0.9, lineHeight: 1.6 }}>
              {ev.description}
            </div>
          </VerticalTimelineElement>
        ))}
      </VerticalTimeline>

      <style jsx global>{`
        .icia-wrapper .vertical-timeline-element-date,
        .icia-wrapper .timeline-date {
          color: var(--icia-date) !important;
          font-weight: 600;
        }
      `}</style>
    </>
  );
}