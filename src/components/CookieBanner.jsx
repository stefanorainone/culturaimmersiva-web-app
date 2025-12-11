import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const CONSENT_KEY = 'cookie_consent';
const META_PIXEL_ID = '4367475453538073';

const CookieBanner = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem(CONSENT_KEY);

    if (consent === null) {
      // No choice made yet, show banner after a small delay
      setTimeout(() => setShowBanner(true), 1000);
    } else {
      // User already made a choice, initialize pixel if accepted
      initMetaPixel();
    }
  }, []);

  // Handle scroll - accept on scroll
  useEffect(() => {
    if (!showBanner) return;

    const handleScroll = () => {
      if (window.scrollY > 100) {
        handleAccept();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showBanner]);

  const initMetaPixel = () => {
    // Check if already initialized
    if (window.fbq) return;

    // Initialize Meta Pixel
    (function(f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

    window.fbq('init', META_PIXEL_ID);
    window.fbq('track', 'PageView');
  };

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setShowBanner(false);
    initMetaPixel();
  };

  const handleClose = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setShowBanner(false);
    initMetaPixel();
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-fade-in">
      <div className="bg-gray-900 text-white rounded-lg shadow-xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm leading-relaxed">
              Questo sito usa cookie per migliorare l'esperienza.{' '}
              <Link to="/privacy-policy" className="underline hover:text-secondary">
                Info
              </Link>
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white text-xl leading-none"
            aria-label="Chiudi"
          >
            &times;
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleAccept}
            className="flex-1 px-3 py-1.5 text-sm bg-primary text-white rounded hover:bg-primary-dark transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
