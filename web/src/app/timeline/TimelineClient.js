"use client";

import { VerticalTimeline, VerticalTimelineElement } from "react-vertical-timeline-component";
import "react-vertical-timeline-component/style.min.css";
import { FaBuilding, FaFirefox, FaUserTie } from "react-icons/fa";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useLocale } from "@/context/LocaleContext";

const EVENT_ICONS = [
  <FaBuilding key="1" />,
  <FaUserTie key="2" />,
  <FaBuilding key="3" />,
  <FaFirefox key="4" />,
  <FaBuilding key="5" />,
];

export default function TimelineClient({ timelineData }) {
  const locale = useLocale();

  const today = new Date().toLocaleDateString(locale === "ro" ? "ro-RO" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const rawEvents = timelineData?.events || [];
  const events = rawEvents.map((item, idx) => {
    const isLiveProgress = !item.date || idx === rawEvents.length - 1;
    return {
      date: isLiveProgress ? today : item.date,
      title: item.title,
      description: isLiveProgress ? (
        <>
          {item.description}
          <br />
          <a
            href="http://webcam.obs.utcluj.ro/"
            target="_blank"
            rel="noopener noreferrer"
            className="link-accent"
          >
            http://webcam.obs.utcluj.ro/
          </a>
        </>
      ) : (
        item.description
      ),
      icon: EVENT_ICONS[idx % EVENT_ICONS.length],
    };
  });

  const title = timelineData?.title || "AIRI Timeline";

  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsDark(document.documentElement.classList.contains("dark"));
      const observer = new MutationObserver(() => {
        setIsDark(document.documentElement.classList.contains("dark"));
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
      return () => observer.disconnect();
    }
  }, []);

  return (
    <div className="page-container">
      <div className="content-wrapper content-padding">
        <div className="card p-6 md:p-10">
          <motion.h1
            className="heading-1 heading-accent text-center mb-8"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            {title}
          </motion.h1>
          <VerticalTimeline>
            {events.map((event, index) => (
              <VerticalTimelineElement
                key={index}
                className="vertical-timeline-element--work"
                contentStyle={{
                  background: isDark ? "#111827" : "#f9fafb",
                  color: isDark ? "#f3f4f6" : "#111827",
                }}
                contentArrowStyle={{
                  borderRight: isDark ? "7px solid #111827" : "7px solid #f9fafb",
                }}
                date={event.date}
                dateClassName="text-primary-600 dark:text-accent-400 font-semibold"
                iconStyle={{ background: "#dc2626", color: "#fff" }}
                icon={event.icon}
              >
                <motion.h3
                  className="text-xl font-bold"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                >
                  {event.title}
                </motion.h3>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                  className="text-body"
                >
                  {event.description}
                </motion.div>
              </VerticalTimelineElement>
            ))}
          </VerticalTimeline>
        </div>
      </div>
    </div>
  );
}
