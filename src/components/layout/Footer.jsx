import { Link } from 'react-router-dom';
import { FaFacebook, FaInstagram, FaLinkedin, FaEnvelope, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary text-white">
      <div className="container-custom py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-xl font-bold mb-4">
              <span className="text-white">Cultura</span>
              <span className="text-secondary"> Immersiva</span>
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              Esperienze culturali immersive in realtà virtuale nelle più belle città d'Italia.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Link Rapidi</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/citta" className="text-gray-300 hover:text-secondary transition-colors text-sm">
                  Le Città
                </Link>
              </li>
              <li>
                <Link to="/scuole" className="text-gray-300 hover:text-secondary transition-colors text-sm">
                  Per le Scuole
                </Link>
              </li>
              <li>
                <Link to="/musei" className="text-gray-300 hover:text-secondary transition-colors text-sm">
                  Musei e Siti Culturali
                </Link>
              </li>
              <li>
                <Link to="/hotel" className="text-gray-300 hover:text-secondary transition-colors text-sm">
                  Hotel / B&B
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Contatti</h4>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3">
                <FaMapMarkerAlt className="text-secondary mt-1 flex-shrink-0" />
                <span className="text-gray-300 text-sm">
                  Via Mauro 9<br />
                  80036 Palma Campania (NA)
                </span>
              </li>
              <li className="flex items-start space-x-3">
                <FaEnvelope className="text-secondary mt-1 flex-shrink-0" />
                <a href="mailto:info@culturaimmersiva.it" className="text-gray-300 hover:text-secondary transition-colors text-sm">
                  info@culturaimmersiva.it
                </a>
              </li>
              <li className="flex items-start space-x-3">
                <FaPhone className="text-secondary mt-1 flex-shrink-0" />
                <a href="tel:+393292890532" className="text-gray-300 hover:text-secondary transition-colors text-sm">
                  +39 329 289 0532
                </a>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Seguici</h4>
            <div className="flex space-x-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-2xl text-gray-300 hover:text-secondary transition-colors"
                aria-label="Facebook"
              >
                <FaFacebook />
              </a>
              <a
                href="https://instagram.com/cultura_immersiva"
                target="_blank"
                rel="noopener noreferrer"
                className="text-2xl text-gray-300 hover:text-secondary transition-colors"
                aria-label="Instagram"
              >
                <FaInstagram />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-2xl text-gray-300 hover:text-secondary transition-colors"
                aria-label="LinkedIn"
              >
                <FaLinkedin />
              </a>
            </div>
            <div className="mt-6">
              <div className="flex items-center space-x-2 text-sm text-gray-300">
                <span>⭐ 4.9/5</span>
                <span className="text-xs">(1,1k recensioni Google)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Co-financed Project Logos */}
        <div className="mt-8 pt-8 border-t border-gray-700">
          <div className="flex justify-center mb-6">
            <img
              src="/images/loghi-progetto-co-finanziato.png"
              alt="Progetto Co-finanziato"
              className="h-16 md:h-20 object-contain"
            />
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-300 text-center md:text-left">
              <p>© {currentYear} Cultura Immersiva. Tutti i diritti riservati.</p>
              <p className="text-xs mt-1">P.IVA: 09880501219</p>
            </div>
            <div className="mt-4 md:mt-0 flex gap-4">
              <Link
                to="/privacy-policy"
                className="text-sm text-gray-300 hover:text-secondary transition-colors"
              >
                Privacy Policy
              </Link>
              <span className="text-gray-500">|</span>
              <Link
                to="/termini-condizioni"
                className="text-sm text-gray-300 hover:text-secondary transition-colors"
              >
                Termini e Condizioni
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
