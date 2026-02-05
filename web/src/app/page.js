import Image from "next/image";
import Link from "next/link";
import LinkedInWidget from "@/components/LinkedInWidget";
import { getNewsArticles, transformNewsData } from "@/lib/strapi";

export const metadata = {
  title: "AIRI - Home",
  description:
    "Advancing research, innovation, and exploration in artificial intelligence at the Technical University of Cluj-Napoca - AIRi@UTCN",
};

export default async function Home() {
  // Fetch latest news for the homepage
  let latestNews = [];
  try {
    const newsData = await getNewsArticles({ pageSize: 3 });
    latestNews = transformNewsData(newsData);
  } catch (error) {
    console.error('Failed to fetch news for homepage:', error);
  }

  return (
    <main>
      {/* Hero Section */}
      <section className="relative isolate h-[55vh] md:h-[65vh] flex items-center justify-center overflow-hidden bg-gray-900">
        <Image
          src="/homepage/hero5.png"
          alt="AI Research Hero"
          fill
          priority
          sizes="100vw"
          unoptimized
          className="absolute inset-0 object-cover opacity-60"
        />
        <div
          className="absolute inset-0 bg-gradient-to-br from-primary-600/40 via-primary-700/30 to-primary-900/50 dark:from-gray-950/80 dark:via-gray-900/70 dark:to-gray-950/90"
          aria-hidden="true"
        />
        <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight drop-shadow-lg mb-6">
            Artificial Intelligence Research Institute
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl font-medium mb-8 max-w-3xl mx-auto drop-shadow text-white/90">
            Advancing research, innovation, and exploration in the field of
            artificial intelligence at the Technical University of Cluj-Napoca.
          </p>
          <Link
            href="#about"
            className="btn-accent btn-lg shadow-lg"
          >
            Learn More
          </Link>
        </div>
        <div className="absolute bottom-6 left-6 z-10 hidden sm:block">
          <Image
            src="/homepage/qrSignup.jpg"
            alt="Sign up QR code"
            width={160}
            height={160}
            className="w-28 h-28 md:w-40 md:h-40 object-contain rounded-xl shadow-xl border-4 border-white/90 dark:border-gray-800"
            priority
            unoptimized
          />
        </div>
      </section>

      {/* Construction Notice */}
      <section className="page-container py-8">
        <div className="notice-warning">
          <p className="text-base sm:text-lg font-semibold">
            AIRi@UTCN is currently under construction. Follow our channels for updates.
          </p>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="page-container py-12">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="heading-2 heading-accent mb-6">
            About Us
          </h2>
          <p className="text-body text-lg leading-relaxed">
            The Artificial Intelligence Research Institute (AIRi) is a nexus for collaborative research at the
            Technical University of Cluj-Napoca. AIRi@UTCN promotes excellence in AI theory and practice, bringing
            together researchers across UTCN around a vision of open collaboration. Our work spans interdisciplinary
            research, AI literacy across disciplines, and impact through business and public co-creation partnerships.
          </p>
        </div>
      </section>

      {/* Quick Links Cards */}
      <section className="page-container pb-16">
        <div className="grid-cards">
          <Link
            href="/research/departments"
            className="card card-hover p-8 text-center group"
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="heading-3 heading-accent mb-2">Research</h3>
            <p className="text-muted">
              Explore our research units and projects.
            </p>
          </Link>

          <Link
            href="/people/"
            className="card card-hover p-8 text-center group"
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="heading-3 heading-accent mb-2">People</h3>
            <p className="text-muted">
              Meet our researchers and staff.
            </p>
          </Link>

          <Link
            href="/resources"
            className="card card-hover p-8 text-center group"
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="heading-3 heading-accent mb-2">Resources</h3>
            <p className="text-muted">
              Tools, datasets, and learning materials.
            </p>
          </Link>
        </div>
      </section>

      {/* Latest News Section - Prominent placement */}
      <section className="page-container pb-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="heading-2 heading-accent">Latest News</h2>
          <Link
            href="/news&events/news"
            className="btn-secondary text-sm"
          >
            View All News →
          </Link>
        </div>
        
        {latestNews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {latestNews.map((article) => (
              <Link
                key={article.id || article.slug}
                href={`/news&events/news/${article.slug}`}
                className="card card-hover overflow-hidden group"
              >
                {article.image && (
                  <div className="relative h-40 overflow-hidden">
                    <Image
                      src={article.image}
                      alt={article.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      unoptimized
                    />
                  </div>
                )}
                <div className="p-5">
                  <time className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">
                    {article.date ? new Date(article.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : ''}
                  </time>
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2 mb-2">
                    {article.title}
                  </h3>
                  {article.summary && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {article.summary}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center">
            <p className="text-muted">News articles will appear here once published.</p>
            <Link href="/news&events/news" className="link-accent mt-2 inline-block">
              Visit News & Events →
            </Link>
          </div>
        )}
      </section>

      {/* Two-column layout: Featured Content + Social */}
      <section className="page-container pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Construction Camera Card */}
            <div className="card overflow-hidden">
              <div className="flex flex-col md:flex-row">
                <div className="md:w-48 flex-shrink-0">
                  <Image
                    src="/homepage/hero4.jpg"
                    alt="Construction site"
                    width={192}
                    height={192}
                    className="w-full h-48 md:h-full object-cover"
                    unoptimized
                  />
                </div>
                <div className="p-6 flex-1 flex flex-col justify-center border-l-0 md:border-l-4 border-t-4 md:border-t-0 border-accent-400 dark:border-accent-500">
                  <h3 className="heading-3 heading-accent mb-2">
                    Live Construction Camera
                  </h3>
                  <p className="text-body mb-4">
                    See the progress of our new research facility in real time.
                  </p>
                  <a
                    href="http://webcam.obs.utcluj.ro/"
                    className="link-accent font-semibold inline-flex items-center gap-2"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Live Camera
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Access Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/news&events/events"
                className="card card-hover p-5 flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    Upcoming Events
                  </h4>
                  <p className="text-sm text-muted">Conferences, workshops & talks</p>
                </div>
              </Link>

              <Link
                href="/media"
                className="card card-hover p-5 flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    Media Gallery
                  </h4>
                  <p className="text-sm text-muted">Photos & videos from AIRI</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Sidebar: Social Feed */}
          <div className="lg:col-span-1">
            <div className="card p-5 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="heading-3 heading-accent">Follow Us</h3>
                <a 
                  href="https://www.linkedin.com/company/airi-utcn/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
              <LinkedInWidget />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}


