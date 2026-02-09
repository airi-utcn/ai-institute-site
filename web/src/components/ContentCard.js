"use client";

import Link from "next/link";
import { motion } from "framer-motion";

/**
 * Reusable content card component for consistent card styling.
 * 
 * @param {string} title - Card title
 * @param {string} description - Card description
 * @param {string} href - Link destination (if provided, card becomes a link)
 * @param {string} image - Optional image URL
 * @param {string} imageAlt - Image alt text
 * @param {string} badge - Optional badge text
 * @param {string} badgeVariant - Badge variant: 'primary', 'accent', 'gray'
 * @param {boolean} animate - Whether to animate on mount
 * @param {object} animationVariants - Custom animation variants
 * @param {React.ReactNode} children - Additional content
 * @param {string} className - Additional CSS classes
 */
export default function ContentCard({
  title,
  description,
  href,
  image,
  imageAlt,
  badge,
  badgeVariant = "gray",
  animate = false,
  animationVariants,
  children,
  className = "",
}) {
  const badgeClass = {
    primary: "badge-primary",
    accent: "badge-accent",
    gray: "badge-gray",
  }[badgeVariant] || "badge-gray";

  const cardContent = (
    <>
      {image && (
        <div className="aspect-video overflow-hidden rounded-t-2xl bg-gray-100 dark:bg-gray-800">
          <img
            src={image}
            alt={imageAlt || title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-5 sm:p-6">
        {badge && (
          <span className={`${badgeClass} mb-3`}>{badge}</span>
        )}
        {title && (
          <h3 className="heading-3 mb-2">{title}</h3>
        )}
        {description && (
          <p className="text-muted text-sm line-clamp-3">{description}</p>
        )}
        {children}
      </div>
    </>
  );

  const cardClasses = `card-interactive ${className}`;

  // If href is provided, render as a Link
  if (href) {
    const linkCard = (
      <Link href={href} className={cardClasses}>
        {cardContent}
      </Link>
    );

    if (animate && animationVariants) {
      return (
        <motion.div variants={animationVariants}>
          {linkCard}
        </motion.div>
      );
    }

    return linkCard;
  }

  // Otherwise render as a div
  if (animate && animationVariants) {
    return (
      <motion.article className={cardClasses} variants={animationVariants}>
        {cardContent}
      </motion.article>
    );
  }

  return (
    <article className={cardClasses}>
      {cardContent}
    </article>
  );
}
