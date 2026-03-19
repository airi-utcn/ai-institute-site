"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { delayChildren: 0.2, staggerChildren: 0.12 } },
};
const item = {
  hidden: { y: 16, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.45, ease: "easeOut" } },
};

export default function MissionClient() {
  const t = useTranslations("about.mission");

  return (
    <motion.section id="mission" className="mb-10" variants={container} initial="hidden" animate="visible">
      <motion.h1
        className="heading-1 heading-accent text-center mb-3"
        variants={item}
      >
        {t("title")}
      </motion.h1>

      <motion.p className="text-body text-center max-w-3xl mx-auto" variants={item}>
        {t("text")}
      </motion.p>
    </motion.section>
  );
}