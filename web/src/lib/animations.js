/**
 * Shared Framer Motion animation variants
 * Import these instead of duplicating animation definitions
 */

export const containerVariants = {
  hidden: { opacity: 0.9 },
  visible: {
    opacity: 1,
    transition: { delayChildren: 0.1, staggerChildren: 0.06 },
  },
};

export const itemVariants = {
  hidden: { y: 10, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

export const fadeInVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

export const slideUpVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4 } },
};
