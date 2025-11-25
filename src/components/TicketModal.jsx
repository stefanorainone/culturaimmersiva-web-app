import { useRef } from 'react';
import { FaDownload, FaTimes, FaCalendar, FaClock, FaMapMarkerAlt, FaUsers, FaTicketAlt } from 'react-icons/fa';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const TicketModal = ({ booking, onClose }) => {
  const ticketRef = useRef(null);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const downloadAsImage = async () => {
    if (!ticketRef.current) return;

    try {
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      });

      const link = document.createElement('a');
      link.download = `ticket-${booking.cityName.replace(/\s+/g, '-')}-${booking.date}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Errore durante la generazione dell\'immagine');
    }
  };

  const downloadAsPDF = async () => {
    if (!ticketRef.current) return;

    try {
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const x = (pdf.internal.pageSize.getWidth() - imgWidth) / 2;
      const y = 10;

      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      pdf.save(`ticket-${booking.cityName.replace(/\s+/g, '-')}-${booking.date}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Errore durante la generazione del PDF');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center rounded-t-2xl z-10">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaTicketAlt className="text-primary" />
            Il Tuo Ticket
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="text-2xl" />
          </button>
        </div>

        {/* Ticket */}
        <div className="p-6">
          <div ref={ticketRef} className="bg-white">
            {/* Ticket Design */}
            <div className="relative bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 rounded-3xl overflow-hidden shadow-2xl">
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-y-32 translate-x-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full translate-y-24 -translate-x-24"></div>

              {/* Header Section */}
              <div className="relative p-8 pb-6 text-white">
                {/* Logo */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-white rounded-2xl p-3 shadow-lg">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="40" height="40" rx="8" fill="url(#gradient)"/>
                      <path d="M20 8L28 14V26L20 32L12 26V14L20 8Z" fill="white" opacity="0.9"/>
                      <circle cx="20" cy="20" r="6" fill="url(#gradient2)"/>
                      <defs>
                        <linearGradient id="gradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#667eea"/>
                          <stop offset="1" stopColor="#764ba2"/>
                        </linearGradient>
                        <linearGradient id="gradient2" x1="14" y1="14" x2="26" y2="26" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#667eea"/>
                          <stop offset="1" stopColor="#764ba2"/>
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">Cultura Immersiva</h1>
                    <p className="text-purple-200 text-sm">Esperienze VR Culturali</p>
                  </div>
                </div>

                {/* Event Title */}
                <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl p-4 mb-4">
                  <div className="text-purple-200 text-sm mb-1">ESPERIENZA VR</div>
                  <h2 className="text-3xl font-bold">{booking.cityName}</h2>
                </div>

                {/* Status Badge */}
                <div className="inline-flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-bold">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  CONFERMATO
                </div>
              </div>

              {/* Divider with perforation effect */}
              <div className="relative h-8 bg-white">
                <div className="absolute inset-0 flex justify-between items-center">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 rounded-full -translate-x-4"></div>
                  <div className="flex-1 border-t-2 border-dashed border-gray-300 mx-2"></div>
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 rounded-full translate-x-4"></div>
                </div>
              </div>

              {/* Details Section */}
              <div className="bg-white p-8 pt-6">
                <div className="grid grid-cols-2 gap-6 mb-6">
                  {/* Date */}
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                      <FaCalendar className="text-primary" />
                      <span>Data</span>
                    </div>
                    <div className="text-gray-900 font-bold text-lg">
                      {booking.day}
                    </div>
                    <div className="text-gray-600 text-sm mt-1">
                      {booking.date && formatDate(booking.date)}
                    </div>
                  </div>

                  {/* Time */}
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                      <FaClock className="text-primary" />
                      <span>Orario</span>
                    </div>
                    <div className="text-gray-900 font-bold text-2xl">
                      {booking.time}
                    </div>
                  </div>

                  {/* Attendee */}
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                      <FaUsers className="text-primary" />
                      <span>Partecipante</span>
                    </div>
                    <div className="text-gray-900 font-bold">
                      {booking.name}
                    </div>
                  </div>

                  {/* Spots */}
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                      <FaTicketAlt className="text-primary" />
                      <span>Posti</span>
                    </div>
                    <div className="text-gray-900 font-bold text-2xl">
                      {booking.spots}
                    </div>
                  </div>
                </div>

                {/* QR Code Placeholder / Booking ID */}
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 text-center">
                  <div className="bg-white rounded-xl p-4 inline-block mb-3">
                    <div className="w-32 h-32 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
                      <svg width="80" height="80" viewBox="0 0 80 80" fill="white">
                        <rect x="0" y="0" width="15" height="15" rx="2"/>
                        <rect x="20" y="0" width="15" height="15" rx="2"/>
                        <rect x="40" y="0" width="15" height="15" rx="2"/>
                        <rect x="60" y="0" width="15" height="15" rx="2"/>
                        <rect x="0" y="20" width="15" height="15" rx="2"/>
                        <rect x="40" y="20" width="15" height="15" rx="2"/>
                        <rect x="60" y="20" width="15" height="15" rx="2"/>
                        <rect x="0" y="40" width="15" height="15" rx="2"/>
                        <rect x="20" y="40" width="15" height="15" rx="2"/>
                        <rect x="60" y="40" width="15" height="15" rx="2"/>
                        <rect x="0" y="60" width="15" height="15" rx="2"/>
                        <rect x="20" y="60" width="15" height="15" rx="2"/>
                        <rect x="40" y="60" width="15" height="15" rx="2"/>
                        <rect x="60" y="60" width="15" height="15" rx="2"/>
                      </svg>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 font-mono">
                    ID: {booking.token?.substring(0, 12).toUpperCase()}
                  </div>
                </div>

                {/* Footer Info */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-gray-600">
                      <strong>Ricorda:</strong> Presentati 10 minuti prima dell'orario prenotato
                    </p>
                    <p className="text-xs text-gray-500">
                      Riceverai un promemoria via WhatsApp il giorno prima dell'evento
                    </p>
                    <div className="pt-3 text-xs text-gray-400">
                      www.culturaimmersiva.it
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Download Buttons */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={downloadAsImage}
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 px-6 rounded-xl font-bold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <FaDownload />
              Salva come Immagine
            </button>
            <button
              onClick={downloadAsPDF}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-4 px-6 rounded-xl font-bold hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <FaDownload />
              Salva come PDF
            </button>
          </div>

          {/* Info Text */}
          <p className="text-center text-sm text-gray-500 mt-4">
            Conserva questo ticket sul tuo dispositivo. Potrai modificare o annullare la prenotazione tramite i link ricevuti via email.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TicketModal;
