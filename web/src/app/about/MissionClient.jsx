"use client";

import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { delayChildren: 0.2, staggerChildren: 0.12 } },
};
const item = {
  hidden: { y: 16, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.45, ease: "easeOut" } },
};

export default function MissionClient() {
  return (
    <motion.section id="mission" className="mb-10" variants={container} initial="hidden" animate="visible">
      <motion.h1
        className="heading-1 heading-accent text-center mb-3"
        variants={item}
      >
        Mission
      </motion.h1>

      <motion.p className="text-body text-center max-w-3xl mx-auto" variants={item}>
        The Artificial Intelligence Research Institute (AIRi) is a nexus for collaborative research at the Technical University of Cluj-Napoca.
        AIRi@UTCN promotes excellence in AI theory and practice, bringing together researchers across UTCN around a vision of open collaboration.
        Our work spans interdisciplinary research, AI literacy across disciplines, and impact through business and public co-creation partnerships.
      </motion.p>
    </motion.section>
  );
}
