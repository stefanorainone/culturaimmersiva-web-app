import { useLocation, useNavigate } from 'react-router-dom';
import { useRef, useEffect } from 'react';
import { FaCheckCircle, FaDownload, FaHome, FaCalendar, FaClock, FaUsers, FaUser, FaEnvelope, FaWhatsapp } from 'react-icons/fa';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const Ticket = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const ticketRef = useRef(null);
  const booking = location.state?.booking;

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Redirect if no booking data
  if (!booking) {
    navigate('/');
    return null;
  }

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
    try {
      const element = ticketRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff'
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
    try {
      const element = ticketRef.current;
      const canvas = await html2canvas(element, {
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

      // Calculate dimensions to fit properly without cutting
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20; // 10mm margin on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const x = 10;
      let y = 10;

      // Check if image fits on one page
      if (imgHeight > pdfHeight - 20) {
        // Scale down to fit
        const scaledHeight = pdfHeight - 20;
        const scaledWidth = (canvas.width * scaledHeight) / canvas.height;
        pdf.addImage(imgData, 'PNG', (pdfWidth - scaledWidth) / 2, y, scaledWidth, scaledHeight);
      } else {
        pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      }

      pdf.save(`ticket-${booking.cityName.replace(/\s+/g, '-')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Errore durante la generazione del PDF');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-secondary to-primary py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Success Header */}
        <div className="text-center mb-6 text-white">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-3">
            <FaCheckCircle className="text-4xl text-green-500" />
          </div>
          <h1 className="text-3xl font-bold mb-1">Prenotazione Confermata!</h1>
          <p className="text-base opacity-90">
            Grazie per aver scelto Cultura Immersiva
          </p>
        </div>

        {/* Ticket Card */}
        <div ref={ticketRef} className="bg-white rounded-2xl shadow-2xl overflow-hidden mb-4">
          {/* Header with Logo */}
          <div className="bg-gradient-to-r from-primary to-secondary p-6 text-white text-center">
            <div className="flex flex-col items-center gap-2 mb-1">
              <img
                src="/images/logo-cultura-immersiva.png"
                alt="Cultura Immersiva Logo"
                className="h-16 w-auto object-contain bg-white rounded-lg p-2"
                onError={(e) => {
                  console.error('Logo failed to load');
                  e.target.style.display = 'none';
                }}
              />
              <h2 className="text-xl font-bold">Cultura Immersiva</h2>
            </div>
            <p className="text-xs opacity-90">Il tuo ticket</p>
          </div>

          {/* Ticket Details */}
          <div className="p-6 space-y-3">
            {/* City Name */}
            <div className="text-center pb-3 border-b-2 border-dashed border-gray-200">
              <h3 className="text-2xl font-bold text-primary mb-0.5">
                {booking.cityName}
              </h3>
              <p className="text-sm text-gray-600">Esperienza VR</p>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                  <FaCalendar className="text-primary text-sm" />
                  <span>Data</span>
                </div>
                <p className="font-semibold text-gray-800 text-sm">
                  {booking.day}
                </p>
                <p className="text-xs text-gray-600">
                  {formatDate(booking.date)}
                </p>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                  <FaClock className="text-primary text-sm" />
                  <span>Orario</span>
                </div>
                <p className="font-semibold text-gray-800 text-lg">
                  {booking.time}
                </p>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                  <FaUsers className="text-primary text-sm" />
                  <span>Posti</span>
                </div>
                <p className="font-semibold text-gray-800 text-sm">
                  {booking.spots} {booking.spots === 1 ? 'posto' : 'posti'}
                </p>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                  <FaUser className="text-primary text-sm" />
                  <span>Nome</span>
                </div>
                <p className="font-semibold text-gray-800 text-xs">
                  {booking.name}
                </p>
              </div>
            </div>

            {/* Contact Info */}
            <div className="pt-3 border-t border-gray-200 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <FaEnvelope className="text-primary text-sm" />
                <span>{booking.email}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <FaWhatsapp className="text-primary text-sm" />
                <span>{booking.whatsapp}</span>
              </div>
            </div>

            {/* Important Note */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-3">
              <p className="text-xs text-blue-800">
                <strong>Importante:</strong> Presentati 10 minuti prima dell'orario prenotato.
                Riceverai una conferma via email e WhatsApp.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-3 text-center text-xs text-gray-600 border-t border-gray-200">
            www.culturaimmersiva.it
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <button
            onClick={downloadAsImage}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-white text-primary font-semibold rounded-lg hover:shadow-lg transition-all text-sm"
          >
            <FaDownload />
            Scarica Immagine
          </button>
          <button
            onClick={downloadAsPDF}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-white text-secondary font-semibold rounded-lg hover:shadow-lg transition-all text-sm"
          >
            <FaDownload />
            Scarica PDF
          </button>
        </div>

        {/* Home Button */}
        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-white bg-opacity-20 text-white font-semibold rounded-lg hover:bg-opacity-30 transition-all border-2 border-white border-opacity-50 text-sm"
        >
          <FaHome />
          Torna alla Home
        </button>
      </div>
    </div>
  );
};

export default Ticket;
