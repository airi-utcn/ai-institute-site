"use client";

import { VerticalTimeline, VerticalTimelineElement } from "react-vertical-timeline-component";
import "react-vertical-timeline-component/style.min.css";
import { FaBuilding, FaUserFriends, FaMicrochip } from "react-icons/fa";

const EVENT_ICONS = [
  <FaBuilding key="1" />,
  <FaUserFriends key="2" />,
  <FaBuilding key="3" />,
  <FaMicrochip key="4" />,
  <FaBuilding key="5" />,
];

export default function HistorySection({ items, aboutData }) {
  const rawEvents = aboutData?.timelineEvents || [];
  
  const formattedEvents = rawEvents.map((ev, idx) => {
    const isLiveWebcam = !ev.date || idx === rawEvents.length - 1;
    return {
      date: ev.date || "Today",
      title: ev.title,
      description: isLiveWebcam ? (
        <>
          {ev.description}
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
      ) : (
        ev.description
      ),
      icon: EVENT_ICONS[idx % EVENT_ICONS.length],
    };
  });

  const displayItems = items || formattedEvents;

  return (
    <>
      <VerticalTimeline lineColor="var(--icia-line)">
        {displayItems.map((ev, idx) => (
          <VerticalTimelineElement
            key={`${ev.title}-${ev.date || idx}`}
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
