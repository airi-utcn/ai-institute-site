/**
 * Reusable page header component for consistent styling across pages.
 * 
 * @param {string} title - The main page title
 * @param {string} subtitle - Optional subtitle/description
 * @param {boolean} animate - Whether to animate the header (default: true)
 * @param {string} className - Additional CSS classes
 */
export default function PageHeader({ 
  title, 
  subtitle, 
  animate = true,
  className = "" 
}) {
  if (!animate) {
    return (
      <header className={`page-header ${className}`}>
        <h1 className="page-header-title">{title}</h1>
        {subtitle && (
          <p className="page-header-subtitle">{subtitle}</p>
        )}
      </header>
    );
  }

  return (
    <header className={`page-header animate-slide-down ${className}`}>
      <h1 className="page-header-title animate-slide-down">
        {title}
      </h1>
      {subtitle && (
        <p className="page-header-subtitle animate-fade-in animate-delay-2">
          {subtitle}
        </p>
      )}
    </header>
  );
}
