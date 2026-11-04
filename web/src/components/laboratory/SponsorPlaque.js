'use client';

import Link from 'next/link';
import { FaHandshake, FaExternalLinkAlt } from 'react-icons/fa';
import PartnerRoleBadge, { getPartnerRoleConfig } from '@/components/PartnerRoleBadge';

export default function SponsorPlaque({
  partners = [],
  className = '',
}) {
  const list = Array.isArray(partners) ? partners.filter(Boolean) : [];
  if (list.length === 0) return null;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-amber-500/25 dark:border-amber-400/20 bg-gradient-to-br from-amber-50/60 via-white to-orange-50/40 dark:from-amber-950/20 dark:via-gray-900 dark:to-orange-950/15 p-6 sm:p-8 shadow-sm ${className}`}
    >
      {/* Subtle decorative gold/amber top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-amber-200/50 dark:border-amber-800/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 ring-1 ring-amber-500/20">
            <FaHandshake className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-amber-700 dark:text-amber-400">
              Sponsored Space
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
              Sponsor Recognition
            </h2>
          </div>
        </div>

        <Link
          href="/engagement/partners"
          className="text-xs text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1 font-medium"
        >
          <span>View all institute partners</span>
          <FaExternalLinkAlt className="w-2.5 h-2.5" />
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {list.map((partner) => {
          const logoUrl = partner.logo?.url || partner.logo || partner.logoUrl;
          const website = partner.website;
          const partnerHref = partner.slug
            ? `/engagement/partners/${encodeURIComponent(partner.slug)}`
            : null;
          const roleConfig = getPartnerRoleConfig(partner.tier || partner.role);

          return (
            <div
              key={partner.id || partner.slug || partner.name}
              className={`flex items-center gap-4 rounded-xl border-2 ${roleConfig.cardBorder} bg-white/80 dark:bg-gray-900/80 p-4 backdrop-blur-sm transition-all hover:shadow-md`}
            >
              {logoUrl ? (
                <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-white dark:bg-gray-800 flex-shrink-0 border border-gray-100 dark:border-gray-800 p-2 flex items-center justify-center">
                  <img
                    src={logoUrl}
                    alt={partner.logoAlt || partner.name || 'Partner logo'}
                    loading="lazy"
                    decoding="async"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 font-bold text-lg flex-shrink-0">
                  {(partner.name || 'P').charAt(0)}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {partnerHref ? (
                    <Link
                      href={partnerHref}
                      className="text-base font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 hover:underline truncate"
                    >
                      {partner.name}
                    </Link>
                  ) : (
                    <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                      {partner.name}
                    </h3>
                  )}
                  {partner.tier && (
                    <PartnerRoleBadge role={partner.tier} size="sm" />
                  )}
                </div>

                {partner.country && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {partner.country}
                  </p>
                )}

                {website && (
                  <a
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    <span>Visit website</span>
                    <FaExternalLinkAlt className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
