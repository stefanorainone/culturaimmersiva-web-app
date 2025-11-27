import { FaWhatsapp } from 'react-icons/fa';
import { useLocation } from 'react-router-dom';

function WhatsAppButton() {
  const whatsappNumber = '393792121188'; // +39 379 212 1188 without spaces and +
  const whatsappUrl = `https://wa.me/${whatsappNumber}`;
  const location = useLocation();

  // Se siamo nella pagina città, posizione più in alto (bottom-24) per non sovrapporsi al FAB
  const isCityPage = location.pathname.startsWith('/citta/');
  const bottomClass = isCityPage ? 'bottom-24 md:bottom-6' : 'bottom-6';

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed ${bottomClass} right-6 bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 z-50 flex items-center justify-center group`}
      aria-label="Contattaci su WhatsApp"
    >
      <FaWhatsapp className="w-7 h-7" />
      <span className="absolute right-full mr-3 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        Assistenza WhatsApp
      </span>
    </a>
  );
}

export default WhatsAppButton;
