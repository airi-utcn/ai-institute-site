/**
 * Derive project phase/status from start and end dates
 * @param {string|Date} startDate - Project start date
 * @param {string|Date|null} endDate - Project end date (null = ongoing)
 * @returns {{status: string, label: string, color: string}}
 */
export function getProjectPhase(startDate, endDate) {
  if (!startDate) {
    return {
      status: 'unknown',
      label: 'Unknown',
      color: 'gray',
    };
  }

  const now = new Date();
  const start = new Date(startDate);

  // Validate start date
  if (Number.isNaN(start.getTime())) {
    return {
      status: 'unknown',
      label: 'Unknown',
      color: 'gray',
    };
  }

  // Before start date = Planned
  if (now < start) {
    return {
      status: 'planned',
      label: `Planned: Starting ${formatDate(start)}`,
      color: 'purple',
    };
  }

  // No end date = Ongoing
  if (!endDate) {
    return {
      status: 'ongoing',
      label: `${formatDate(start)} - Ongoing`,
      color: 'blue',
    };
  }

  const end = new Date(endDate);

  // Validate end date
  if (Number.isNaN(end.getTime())) {
    return {
      status: 'ongoing',
      label: `${formatDate(start)} - Ongoing`,
      color: 'blue',
    };
  }

  // After end date = Completed
  if (now > end) {
    return {
      status: 'completed',
      label: `${formatDate(start)} - ${formatDate(end)}`,
      color: 'green',
    };
  }

  // Between dates = Ongoing
  return {
    status: 'ongoing',
    label: `${formatDate(start)} - ${formatDate(end)}`,
    color: 'blue',
  };
}

/**
 * Format date for display
 * @param {Date} date - Date to format
 * @returns {string} Formatted date (e.g., "Jan 2024")
 */
function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Get CSS classes for phase badge based on status
 * @param {string} status - Phase status (planned, ongoing, completed, unknown)
 * @returns {string} Tailwind CSS classes
 */
export function getPhaseColorClasses(status) {
  const colorMap = {
    planned: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    ongoing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    unknown: 'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300',
  };

  return colorMap[status] || colorMap.unknown;
}
