"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaBoxOpen } from "react-icons/fa";
import EquipmentCard from "@/components/equipment/EquipmentCard";

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

export default function EquipmentClient() {
  const [assets, setAssets] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/equipment")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Could not load equipment");
        }
        return res.json();
      })
      .then((data) => setAssets(Array.isArray(data) ? data : []))
      .catch(() => {
        setError("Could not load the equipment list. Please try again later.");
        setAssets([]);
      });
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

        {error && (
          <div className="notice notice-warning max-w-lg mx-auto mb-6">
            <p className="text-sm">{error}</p>
          </div>
        )}

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
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch"
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                {assets.map((a) => (
                  <EquipmentCard key={a.id} asset={a} variants={itemVariants} />
                ))}
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
