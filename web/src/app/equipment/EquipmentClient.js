"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FaBoxOpen, FaCheckCircle } from "react-icons/fa";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

function EquipmentCard({ asset }) {
  const content = (
    <motion.article
      className="card card-hover p-5 transition-all duration-200 hover:shadow-lg dark:hover:shadow-lg/50"
      variants={itemVariants}
      layout
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="w-11 h-11 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
          <FaBoxOpen className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        </div>

        <span
          className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
            asset.available
              ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          {asset.available && (
            <FaCheckCircle className="w-2.5 h-2.5" />
          )}

          {asset.available ? "Available" : "Currently unavailable"}
        </span>
      </div>

      <h3 className="heading-3 mb-1 text-gray-900 dark:text-white">
        {asset.name}
      </h3>

      <p className="text-muted text-sm">
        {asset.available
          ? "Available for reservation"
          : "Currently unavailable, but you can reserve it for a future date"}
      </p>
    </motion.article>
  );

  return (
    <Link href={`/reserve/${asset.id}`} className="block">
      {content}
    </Link>
  );
}

export default function EquipmentClient() {
  const [assets, setAssets] = useState(null);

  useEffect(() => {
    fetch("/api/equipment")
      .then((res) => res.json())
      .then((data) => setAssets(Array.isArray(data) ? data : []))
      .catch(() => setAssets([]));
  }, []);

  return (
    <div className="page-container">
      <div className="content-wrapper content-padding">
        <motion.div
          className="page-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="page-header-title">Equipment</h1>
          <p className="page-header-subtitle">
            Browse available equipment and submit a reservation request
          </p>
        </motion.div>

        {!assets && (
          <p className="text-body text-center py-12">Loading...</p>
        )}

        <AnimatePresence mode="wait">
          {assets?.length === 0 ? (
            <motion.div
              key="empty"
              className="empty-state py-16 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <FaBoxOpen className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-lg">No equipment available yet.</p>
            </motion.div>
          ) : (
            assets && (
              <motion.div
                key="grid"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                {assets.map((a) => (
                  <EquipmentCard key={a.id} asset={a} />
                ))}
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}