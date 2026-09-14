"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Head from "next/head";
import {
  FacebookShareButton,
  TwitterShareButton,
  LinkedinShareButton,
  PinterestShareButton,
  EmailShareButton,
  FacebookIcon,
  TwitterIcon,
  LinkedinIcon,
  PinterestIcon,
  EmailIcon,
} from "next-share";

const mediaItems = [
  {
    type: "image",
    src: "/media/Construction1.png",
    alt: "ICIA Construction Site",
    title: "Construction Progress",
  },
  {
    type: "image",
    src: "/media/Construction2.png",
    alt: "ICIA Research Team",
    title: "Research Team at Work",
  },
  {
    type: "pdf",
    src: "/media/Brosura Prezentare ICIA.pdf",
    alt: "ICIA Document",
    title: "Presentation brochure",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.3,
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

export default function MediaClient({ mediaData }) {
  const [selectedMedia, setSelectedMedia] = useState(null);

  const headerTitle = mediaData?.headerTitle || "Media Gallery";
  const headerSubtitle = mediaData?.headerSubtitle || "Explore photos, documents, and media resources from the Artificial Intelligence Research Institute.";

  const shareUrl = typeof window !== "undefined" ? window.location.href : "localhost:3000"; 
  const title = selectedMedia ? selectedMedia.title : "ICIA Media"; 

  return (
    <>
      <Head>
        <title>ICIA - Media</title>
      </Head>
      <div className="page-container">
        <motion.div
          className="content-wrapper content-padding"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="page-header" variants={itemVariants}>
            <h1 className="page-header-title"> {headerTitle} </h1>
            <p className="page-header-subtitle">
              {headerSubtitle}
            </p>
          </motion.div>

          {/* Media grid */}
          <motion.div
            className="grid-cards"
            variants={containerVariants}
          >
              {mediaItems.map((item, index) => (
                <motion.div
                  key={index}
                  className="card card-hover overflow-hidden cursor-pointer"
                  variants={itemVariants}
                  onClick={() => setSelectedMedia(item)}
                >
                  {item.type === "image" ? (
                    <Image
                      src={item.src}
                      alt={item.alt}
                      width={600}
                      height={400}
                      unoptimized
                      className="w-full h-full object-cover object-center"
                    />
                  ) : item.thumbnail ? (
                    <Image
                      src={item.thumbnail}
                      alt={item.alt}
                      width={600}
                      height={400}
                      unoptimized
                      className="w-full h-full object-cover object-center"
                    />
                  ) : item.type === "pdf" ? (
                    <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <span className="text-gray-500 dark:text-gray-400 font-medium">📄 PDF Document</span>
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <span className="text-gray-500 dark:text-gray-400 font-medium">🎬 Video</span>
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="heading-3 mb-2">{item.title}</h3>
                  </div>
                </motion.div>
              ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Modal */}
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
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedMedia(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
              {selectedMedia.type === "image" && (
                <div className="relative h-[60vh]">
                  <Image
                    src={selectedMedia.src}
                    alt={selectedMedia.alt}
                    fill
                    unoptimized
                    className="object-contain"
                  />
                </div>
              )}
              {selectedMedia.type === "pdf" && (
                <div className="p-8 text-center">
                  <h3 className="heading-2 mb-4">{selectedMedia.title}</h3>
                  <a
                    href={selectedMedia.src}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-accent"
                  >
                    Open PDF in new tab
                  </a>
                </div>
              )}
              <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <h3 className="heading-3">{selectedMedia.title}</h3>
                <div className="flex gap-2">
                  <FacebookShareButton url={shareUrl} quote={title}>
                    <FacebookIcon size={32} round />
                  </FacebookShareButton>
                  <TwitterShareButton url={shareUrl} title={title}>
                    <TwitterIcon size={32} round />
                  </TwitterShareButton>
                  <LinkedinShareButton url={shareUrl} title={title}>
                    <LinkedinIcon size={32} round />
                  </LinkedinShareButton>
                  <EmailShareButton url={shareUrl} subject={title}>
                    <EmailIcon size={32} round />
                  </EmailShareButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
