"use client";

import { VerticalTimeline, VerticalTimelineElement } from "react-vertical-timeline-component";
import "react-vertical-timeline-component/style.min.css";
import { FaBuilding, FaFirefox, FaUserTie } from "react-icons/fa";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";

export default function TimelineClient() {
    const t = useTranslations("timeline");
    const locale = useLocale();

    // Dynamically localized "today"
    const today = new Date().toLocaleDateString(locale, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });

    const events = [
        {
            date: t("events.event1.date"),
            title: t("events.event1.title"),
            description: t("events.event1.description"),
            icon: <FaBuilding />,
        },
        {
            date: t("events.event2.date"),
            title: t("events.event2.title"),
            description: t("events.event2.description"),
            icon: <FaUserTie />,
        },
        {
            date: t("events.event3.date"),
            title: t("events.event3.title"),
            description: t("events.event3.description"),
            icon: <FaBuilding />,
        },
        {
            date: t("events.event4.date"),
            title: t("events.event4.title"),
            description: t("events.event4.description"),
            icon: <FaFirefox />,
        },
        {
            date: today,
            title: t("events.event5.title"),
            description: (
                <>
                    {t("events.event5.descriptionPart1")}<br />
                    {t("events.event5.descriptionPart2")}<br />
                    <a href="http://webcam.obs.utcluj.ro/" target="_blank" rel="noopener noreferrer" className="link-accent">
                        http://webcam.obs.utcluj.ro/
                    </a>
                </>
            ),
            icon: <FaBuilding />,
        },
    ];
      
    const [isDark, setIsDark] = useState(false);
    useEffect(() => {
        if (typeof window !== "undefined") {
            setIsDark(document.documentElement.classList.contains("dark"));
            const observer = new MutationObserver(() => {
                setIsDark(document.documentElement.classList.contains("dark"));
            });
            observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
            return () => observer.disconnect();
        }
    }, []);

    return (
        <main className="page-container">
            <div className="content-wrapper content-padding">
                <div className="card p-6 md:p-10">
                    <motion.h1
                        className="heading-1 heading-accent text-center mb-8"
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1 }}
                    >
                        {t("title")}
                    </motion.h1>
                    <VerticalTimeline>
                        {events.map((event, index) => (
                            <VerticalTimelineElement
                                key={index}
                                className="vertical-timeline-element--work"
                                contentStyle={{ background: isDark ? "#111827" : "#f9fafb", color: isDark ? "#f3f4f6" : "#111827" }}
                                contentArrowStyle={{ borderRight: isDark ? "7px solid #111827" : "7px solid #f9fafb" }}
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
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.5, delay: index * 0.2 }}
                                >
                                    {event.description}
                                </motion.p>
                            </VerticalTimelineElement>
                        ))}
                    </VerticalTimeline>
                </div>
            </div>
        </main>
    );
}