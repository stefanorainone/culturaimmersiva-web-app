/**
 * Conditional Logger - Fix for Information Disclosure vulnerability
 *
 * Prevents console logs from exposing sensitive information in production.
 * In development: logs to console normally
 * In production: silences all logs (or sends to external monitoring service)
 */

const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;

/**
 * Conditional logger that only logs in development
 */
export const logger = {
  /**
   * Log informational messages (dev only)
   */
  log: (...args) => {
    if (isDev) {
      console.log(...args);
    }
    // In production, optionally send to monitoring service
    // if (isProd) { sendToMonitoring('log', args); }
  },

  /**
   * Log errors (dev: console, prod: monitoring service only)
   */
  error: (...args) => {
    if (isDev) {
      console.error(...args);
    } else if (isProd) {
      // In production, send to external monitoring (Sentry, LogRocket, etc.)
      // sendToMonitoring('error', args);

      // Log generic message without sensitive details
      console.error('An error occurred. Contact support if the problem persists.');
    }
  },

  /**
   * Log warnings (dev only)
   */
  warn: (...args) => {
    if (isDev) {
      console.warn(...args);
    }
    // In production, optionally send to monitoring service
    // if (isProd) { sendToMonitoring('warn', args); }
  },

  /**
   * Log debug info (dev only)
   */
  debug: (...args) => {
    if (isDev) {
      console.debug(...args);
    }
  },

  /**
   * Log info (dev only)
   */
  info: (...args) => {
    if (isDev) {
      console.info(...args);
    }
  }
};

/**
 * Helper function to send logs to external monitoring service
 * Uncomment and configure when ready to use Sentry, LogRocket, etc.
 */
/*
function sendToMonitoring(level, args) {
  try {
    // Example: Sentry
    // if (window.Sentry) {
    //   Sentry.captureMessage(args.join(' '), level);
    // }

    // Example: LogRocket
    // if (window.LogRocket) {
    //   LogRocket.log(level, ...args);
    // }

    // Example: Custom API
    // fetch('/api/logs', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ level, message: args, timestamp: new Date().toISOString() })
    // });
  } catch (error) {
    // Silently fail - don't break app if monitoring fails
  }
}
*/

export default logger;
