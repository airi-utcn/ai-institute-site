"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  FaExternalLinkAlt,
  FaImages,
  FaNewspaper,
  FaFilePdf,
  FaFolderOpen,
  FaSearch,
  FaTimes,
  FaCalendarAlt,
} from "react-icons/fa";
import {
  FacebookShareButton,
  TwitterShareButton,
  LinkedinShareButton,
  EmailShareButton,
  FacebookIcon,
  TwitterIcon,
  LinkedinIcon,
  EmailIcon,
} from "next-share";
import {
  FLICKR_ALBUMS_URL,
  flickrAlbums,
  pressArticles,
  institutionalMedia,
} from "@/app/data/mediaGalleryData";

// animation transitions for page elements
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.1,
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { y: 15, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.35,
      ease: "easeOut",
    },
  },
};

export default function MediaClient({ mediaData }) {
  // active tab state: 'all', 'albums', 'press', 'docs'
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMedia, setSelectedMedia] = useState(null);

  const headerTitle = mediaData?.headerTitle || "Media Gallery";

  // clean raw urls from subtitle text if present
  const rawSubtitle = mediaData?.headerSubtitle || "";
  const cleanedSubtitle = rawSubtitle
    .replace(/https?:\/\/[^\s]+/gi, "")
    .replace(/\s+at\s+flickr\s*:?$/i, "")
    .trim();

  const headerSubtitle =
    cleanedSubtitle ||
    "Explore photo albums, press coverage, and institutional media resources.";

  const shareUrl =
    typeof window !== "undefined" ? window.location.href : "https://airi.utcluj.ro/media";
  const modalTitle = selectedMedia ? selectedMedia.title : "AIRI Media";

  // tab options
  const tabs = [
    { id: "all", label: "All Media", icon: FaFolderOpen },
    { id: "albums", label: "Photo Albums (Flickr)", icon: FaImages, count: flickrAlbums.length },
    { id: "press", label: "In the Press", icon: FaNewspaper, count: pressArticles.length },
    { id: "docs", label: "Documents & Assets", icon: FaFilePdf, count: institutionalMedia.length },
  ];

  // filter albums based on search query
  const filteredAlbums = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return flickrAlbums;
    return flickrAlbums.filter(
      (album) =>
        album.title.toLowerCase().includes(q) ||
        (album.description && album.description.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  // filter press articles based on search query
  const filteredPress = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return pressArticles;
    return pressArticles.filter(
      (article) =>
        article.title.toLowerCase().includes(q) ||
        article.outlet.toLowerCase().includes(q) ||
        (article.snippet && article.snippet.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  // filter documents based on search query
  const filteredDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return institutionalMedia;
    return institutionalMedia.filter(
      (doc) =>
        doc.title.toLowerCase().includes(q) ||
        (doc.description && doc.description.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const showAlbums = activeTab === "all" || activeTab === "albums";
  const showPress = activeTab === "all" || activeTab === "press";
  const showDocs = activeTab === "all" || activeTab === "docs";

  const totalResults =
    (showAlbums ? filteredAlbums.length : 0) +
    (showPress ? filteredPress.length : 0) +
    (showDocs ? filteredDocs.length : 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* page title & intro */}
        <motion.div
          className="space-y-3"
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            {headerTitle}
          </h1>
          {headerSubtitle && (
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-3xl leading-relaxed">
              {headerSubtitle}
            </p>
          )}
        </motion.div>

        {/* flickr albums banner */}
        <motion.section
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="relative overflow-hidden rounded-2xl bg-slate-900 text-white p-6 sm:p-8"
        >
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1.5 max-w-2xl">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                AIRi Photo Albums on Flickr
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Browse photo albums from conferences, campus construction, invited lectures, and events.
              </p>
            </div>
            <a
              href={FLICKR_ALBUMS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-gray-900 hover:bg-gray-100 font-medium text-sm transition-colors shrink-0 shadow-sm"
            >
              <span>Explore All Flickr Albums</span>
              <FaExternalLinkAlt className="w-3 h-3 text-gray-500" />
            </a>
          </div>
        </motion.section>

        {/* navigation tabs and search filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2 border-b border-gray-200 dark:border-gray-800 pb-4">
          {/* tabs */}
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        isActive
                          ? "bg-blue-700 text-blue-100"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* search box */}
          <div className="relative min-w-[220px]">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search media..."
              className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <FaTimes className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* empty search state */}
        {totalResults === 0 && (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
            <FaSearch className="w-8 h-8 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              No media matches found for &ldquo;{searchQuery}&rdquo;.
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Clear search filter
            </button>
          </div>
        )}

        {/* section 1: flickr photo albums */}
        {showAlbums && filteredAlbums.length > 0 && (
          <motion.section
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FaImages className="text-blue-600 dark:text-blue-400 w-5 h-5" />
                  <span>Photo Albums</span>
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Direct albums on Flickr showcasing events, invited lectures, and building facilities.
                </p>
              </div>
              <a
                href={FLICKR_ALBUMS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline inline-flex items-center gap-1"
              >
                <span>View all on Flickr</span>
                <FaExternalLinkAlt className="w-3 h-3" />
              </a>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAlbums.map((album, index) => (
                <motion.article
                  key={album.id}
                  variants={itemVariants}
                  className="group rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
                >
                  <a
                    href={album.albumUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block relative aspect-video overflow-hidden bg-gray-100 dark:bg-gray-800"
                  >
                    <Image
                      src={album.coverUrl}
                      alt={album.title}
                      fill
                      priority={index < 3}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5">
                      <FaImages className="w-3 h-3 text-blue-400" />
                      <span>{album.photoCount} photos</span>
                    </div>
                  </a>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <FaCalendarAlt className="w-3 h-3" />
                        <span>{album.date}</span>
                      </div>
                      <h3 className="font-bold text-base text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        <a
                          href={album.albumUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {album.title}
                        </a>
                      </h3>
                      {album.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                          {album.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
                      <span className="inline-flex items-center gap-1 group-hover:underline">
                        <span>Open album</span>
                        <FaExternalLinkAlt className="w-3 h-3" />
                      </span>
                      <span className="text-gray-400 dark:text-gray-500 font-normal">Flickr</span>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </motion.section>
        )}

        {/* section 2: articles in the press */}
        {showPress && filteredPress.length > 0 && (
          <motion.section
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4 pt-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FaNewspaper className="text-blue-600 dark:text-blue-400 w-5 h-5" />
                  <span>Articles in the Press</span>
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Media appearances, press articles, and coverage mentioning AIRi @ UTCN.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPress.map((article) => (
                <motion.article
                  key={article.id}
                  variants={itemVariants}
                  className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                        {article.outlet}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{article.date}</span>
                    </div>

                    <h3 className="font-bold text-base text-gray-900 dark:text-white leading-snug">
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {article.title}
                      </a>
                    </h3>

                    {article.snippet && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-3 leading-relaxed">
                        {article.snippet}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
                    {article.tag && (
                      <span className="text-gray-500 dark:text-gray-400 text-[11px]">
                        #{article.tag}
                      </span>
                    )}
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      <span>Read article</span>
                      <FaExternalLinkAlt className="w-3 h-3" />
                    </a>
                  </div>
                </motion.article>
              ))}
            </div>
          </motion.section>
        )}

        {/* section 3: institutional documents and local media */}
        {showDocs && filteredDocs.length > 0 && (
          <motion.section
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4 pt-4"
          >
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FaFilePdf className="text-blue-600 dark:text-blue-400 w-5 h-5" />
                <span>Documents & Institutional Resources</span>
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Official presentation brochure, facility progress photographs, and downloadable assets.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDocs.map((item, index) => (
                <motion.div
                  key={item.id}
                  variants={itemVariants}
                  onClick={() => setSelectedMedia(item)}
                  className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer group flex flex-col justify-between"
                >
                  {item.type === "image" ? (
                    <div className="relative aspect-video overflow-hidden bg-gray-100 dark:bg-gray-800">
                      <Image
                        src={item.src}
                        alt={item.alt || item.title}
                        width={600}
                        height={400}
                        priority={index < 3}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 flex flex-col items-center justify-center gap-2 border-b border-gray-100 dark:border-gray-800">
                      <FaFilePdf className="w-12 h-12 text-red-500" />
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                        PDF Document
                      </span>
                    </div>
                  )}

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      {item.badge && (
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                          {item.badge}
                        </span>
                      )}
                      <h3 className="font-bold text-base text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
                      <span>{item.type === "pdf" ? "Open brochure" : "View photo"}</span>
                      <span>→</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </div>

      {/* modal preview for images and documents */}
      <AnimatePresence>
        {selectedMedia && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedMedia(null)}
          >
            <motion.div
              className="relative max-w-4xl w-full bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedMedia(null)}
                className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                aria-label="Close"
              >
                <FaTimes className="w-4 h-4" />
              </button>

              {selectedMedia.type === "image" && (
                <div className="relative h-[65vh] bg-black">
                  <Image
                    src={selectedMedia.src}
                    alt={selectedMedia.alt || selectedMedia.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 90vw"
                    className="object-contain"
                  />
                </div>
              )}

              {selectedMedia.type === "pdf" && (
                <div className="p-8 sm:p-12 text-center space-y-4">
                  <FaFilePdf className="w-16 h-16 text-red-500 mx-auto" />
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedMedia.title}
                  </h3>
                  {selectedMedia.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 max-w-lg mx-auto">
                      {selectedMedia.description}
                    </p>
                  )}
                  <div className="pt-2">
                    <a
                      href={selectedMedia.src}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors shadow-md"
                    >
                      <FaExternalLinkAlt className="w-3.5 h-3.5" />
                      <span>Open PDF in new tab</span>
                    </a>
                  </div>
                </div>
              )}

              {/* modal footer with title and social share */}
              <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">
                    {selectedMedia.title}
                  </h3>
                  {selectedMedia.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                      {selectedMedia.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-400 mr-1 hidden sm:inline">Share:</span>
                  <FacebookShareButton url={shareUrl} quote={modalTitle}>
                    <FacebookIcon size={30} round />
                  </FacebookShareButton>
                  <TwitterShareButton url={shareUrl} title={modalTitle}>
                    <TwitterIcon size={30} round />
                  </TwitterShareButton>
                  <LinkedinShareButton url={shareUrl} title={modalTitle}>
                    <LinkedinIcon size={30} round />
                  </LinkedinShareButton>
                  <EmailShareButton url={shareUrl} subject={modalTitle}>
                    <EmailIcon size={30} round />
                  </EmailShareButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
