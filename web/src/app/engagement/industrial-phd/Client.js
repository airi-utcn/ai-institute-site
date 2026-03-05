"use client";

import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { delayChildren: 0.2, staggerChildren: 0.12 } },
};
const itemVariants = {
  hidden: { y: 16, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.45, ease: "easeOut" } },
};

export default function Client() {
  return (
    <div className="flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 py-12">
      <motion.div
        className="container max-w-6xl mx-auto bg-white dark:bg-gray-950 rounded-2xl shadow-xl"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <section className="p-6 md:p-8 space-y-4">
          <motion.h1
            className="text-2xl md:text-3xl font-extrabold mb-4 text-blue-600 dark:text-yellow-400 tracking-tight text-center"
            variants={itemVariants}
          >
            Industrial PhD
          </motion.h1>

          <motion.p className="text-gray-700 dark:text-gray-300" variants={itemVariants}>
            An Industrial PhD is known as a university training program that qualifies for the award of a doctorate
            through an industrial research or experimental development project, that was created collaboratively between
            a company and an academic environment, which will become the subject of a doctoral thesis by a doctoral
            student.
          </motion.p>

          <motion.p className="text-gray-700 dark:text-gray-300" variants={itemVariants}>
            If you are a company and are interested in carrying out an industrial PhD, contact us via email.
          </motion.p>

          <motion.p className="text-gray-700 dark:text-gray-300" variants={itemVariants}>
            If you want to come and do an Industrial Doctorate in Artificial Intelligence with us in any of the proposed
            topics, get in touch via email.
          </motion.p>
        </section>
      </motion.div>
    </div>
  );
}
