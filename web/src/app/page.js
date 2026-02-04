import Image from "next/image";
import Link from "next/link";
import LinkedInWidget from "@/components/LinkedInWidget";

export const metadata = {
  title: "AIRI - Home",
  description:
    "Advancing research, innovation, and exploration in artificial intelligence at the Technical University of Cluj-Napoca - AIRi@UTCN",
};

export default function Home() {
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
            href="/news&events/news"
            className="card card-hover p-8 text-center group"
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <h3 className="heading-3 heading-accent mb-2">News</h3>
            <p className="text-muted">
              Stay updated with the latest news and events.
            </p>
          </Link>

          <Link
            href="/media"
            className="card card-hover p-8 text-center group"
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="heading-3 heading-accent mb-2">Media</h3>
            <p className="text-muted">
              Browse our media gallery and publications.
            </p>
          </Link>
        </div>
      </section>

      {/* Featured Content */}
      <section className="page-container pb-16 space-y-6">
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
                View Live Construction Site Camera
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* LinkedIn Widget Card */}
        <div className="card p-6">
          <h3 className="heading-3 heading-accent mb-4">Latest on LinkedIn</h3>
          <LinkedInWidget />
        </div>
      </section>
    </main>
  );
}


