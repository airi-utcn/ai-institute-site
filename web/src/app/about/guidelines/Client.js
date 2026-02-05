"use client";

import { motion } from "framer-motion";
import { FaBookOpen, FaChalkboardTeacher, FaFlask, FaIdBadge } from "react-icons/fa";

const ITEMS = [
  { label: "Students",    href: "/engagement/academic",  icon: FaBookOpen },
  { label: "Faculty",     href: "/people/alumni",       icon: FaChalkboardTeacher },
  { label: "Researchers", href: "/research/departments", icon: FaFlask },
  { label: "Staff",       href: "/people",             icon: FaIdBadge },
];

function Tile({ label, href, icon: Icon }) {
  const Wrapper = href ? "a" : "div";
  return (
    <Wrapper
      {...(href ? { href } : {})}
      className={`group flex flex-col items-center gap-3 p-4 rounded-xl ${
        href
          ? "focus:outline-none focus-visible:ring-2 ring-offset-2 ring-blue-500 cursor-pointer transition hover:bg-gray-50 dark:hover:bg-gray-800/60"
          : "opacity-60 cursor-default"
      }`}
    >
      <span className="grid place-items-center h-16 w-16 rounded-full bg-[#0b3160] text-white shadow-md group-hover:scale-105 transition">
        <Icon className="h-8 w-8" aria-hidden />
      </span>
      <span className="text-[15px] text-slate-700 dark:text-slate-300 group-hover:underline text-center">
        {label}
      </span>
    </Wrapper>
  );
}

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { delayChildren: 0.2, staggerChildren: 0.08 } },
};
const item = {
  hidden: { y: 16, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.45, ease: "easeOut" } },
};

export default function Client() {
  return (
    <main className="flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 py-12">
      <motion.div
        className="container max-w-6xl mx-auto bg-white dark:bg-gray-950 rounded-2xl shadow-xl p-6 md:p-10"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        <motion.h1
          className="text-2xl md:text-3xl font-extrabold mb-10 text-blue-600 dark:text-yellow-400 tracking-tight text-center"
          variants={item}
        >
          Just For You
        </motion.h1>

        <motion.section
          className="grid grid-cols-2 md:grid-cols-4 gap-x-12 gap-y-10"
          variants={container}
        >
          {ITEMS.map((it) => (
            <motion.div key={it.label} variants={item}>
              <Tile {...it} />
            </motion.div>
          ))}
        </motion.section>
      </motion.div>
    </main>
  );
}
