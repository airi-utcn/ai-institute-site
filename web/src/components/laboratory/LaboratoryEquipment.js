'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaBoxOpen } from 'react-icons/fa';
import EquipmentCard from '@/components/equipment/EquipmentCard';
import { normalizeRoomNumber } from '@/lib/rooms';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

const EmptyState = ({ children }) => (
  <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 p-10 text-center text-sm text-gray-500 dark:text-gray-400">
    <FaBoxOpen className="w-8 h-8 mx-auto mb-3 opacity-40" aria-hidden="true" />
    {children}
  </div>
);

export default function LaboratoryEquipment({ roomNumber, emptyMessage }) {
  const targetRoom = normalizeRoomNumber(roomNumber);
  const [assets, setAssets] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!targetRoom) {
      setAssets([]);
      return undefined;
    }

    let cancelled = false;
    setAssets(null);
    setError(false);

    fetch('/api/equipment')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Could not load equipment');
        }
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        const rows = Array.isArray(data) ? data : [];
        setAssets(
          rows.filter(
            (asset) => normalizeRoomNumber(asset?.roomNumber) === targetRoom
          )
        );
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setAssets([]);
      });

    return () => {
      cancelled = true;
    };
  }, [targetRoom]);

  if (!targetRoom) {
    return <EmptyState>{emptyMessage}</EmptyState>;
  }

  if (error) {
    return (
      <div className="notice notice-warning text-sm">
        Equipment information is currently unavailable. Please try again later.
      </div>
    );
  }

  if (!assets) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
        Loading equipment…
      </p>
    );
  }

  if (assets.length === 0) {
    return <EmptyState>{emptyMessage}</EmptyState>;
  }

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {assets.map((asset) => (
        <EquipmentCard key={asset.id} asset={asset} variants={itemVariants} />
      ))}
    </motion.div>
  );
}
