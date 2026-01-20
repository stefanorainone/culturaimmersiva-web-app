import { useState } from 'react';
import { motion } from 'framer-motion';
import { FaMapMarkerAlt, FaHandshake, FaPaperPlane, FaUsers, FaRocket } from 'react-icons/fa';

const LavoraConNoi = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    role: '',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const subject = `Candidatura - ${formData.role || 'Lavora con noi'}`;
    const body = `Nome: ${formData.name}
Email: ${formData.email}
Telefono: ${formData.phone || 'Non specificato'}
Città: ${formData.city || 'Non specificata'}
Ruolo di interesse: ${formData.role || 'Non specificato'}

Presentazione:
${formData.message}`;

    const mailtoLink = `mailto:lavoro@culturaimmersiva.it?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitMessage('Si aprirà il tuo client email per inviare la candidatura.');
    }, 500);
  };

  const positions = [
    {
      icon: <FaMapMarkerAlt className="text-4xl text-secondary" />,
      title: 'Gestione Eventi',
      description: 'Cerchiamo persone dinamiche per gestire i nostri eventi sul territorio. Ti occuperai dell\'accoglienza dei visitatori e della gestione delle esperienze VR.',
    },
    {
      icon: <FaHandshake className="text-4xl text-secondary" />,
      title: 'Sviluppo Commerciale',
      description: 'Cerchiamo figure commerciali per proporre le nostre esperienze a musei, istituzioni culturali, scuole e aziende nella tua zona.',
    },
  ];

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-r from-primary to-primary-dark text-white py-20">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Lavora con Noi
            </h1>
            <p className="text-xl md:text-2xl">
              Entra nel team di Cultura Immersiva e porta l'arte nelle città italiane
            </p>
          </motion.div>
        </div>
      </section>

      {/* Intro */}
      <section className="py-16 bg-gray-50">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <div className="flex justify-center mb-6">
              <FaRocket className="text-5xl text-secondary" />
            </div>
            <h2 className="text-3xl font-bold text-primary mb-6">Stiamo crescendo</h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-4">
              <strong>Cultura Immersiva</strong> porta esperienze di realtà virtuale in oltre 50 città italiane.
              Stiamo cercando persone appassionate per ampliare il nostro team sul territorio.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              Se ami la cultura, hai spirito di iniziativa e vuoi far parte di un progetto innovativo,
              questa è l'opportunità che fa per te.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Posizioni */}
      <section className="py-16">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-primary mb-4">Chi cerchiamo</h2>
            <p className="text-lg text-gray-600">
              Due opportunità per entrare nel nostro team
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {positions.map((position, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white p-8 rounded-lg shadow-lg border border-gray-100 hover:shadow-xl transition-shadow"
              >
                <div className="text-center">
                  <div className="flex justify-center mb-4">{position.icon}</div>
                  <h3 className="text-xl font-bold text-primary mb-3">{position.title}</h3>
                  <p className="text-gray-600">{position.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Cosa offriamo */}
      <section className="py-16 bg-gray-50">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-3xl font-bold text-primary mb-8 text-center">Cosa offriamo</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow text-center">
                <FaUsers className="text-3xl text-secondary mx-auto mb-3" />
                <h3 className="font-bold text-primary mb-2">Formazione</h3>
                <p className="text-gray-600 text-sm">Ti formiamo su tecnologie VR e gestione eventi</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow text-center">
                <FaMapMarkerAlt className="text-3xl text-secondary mx-auto mb-3" />
                <h3 className="font-bold text-primary mb-2">Flessibilità</h3>
                <p className="text-gray-600 text-sm">Lavori nella tua città con orari flessibili</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow text-center">
                <FaRocket className="text-3xl text-secondary mx-auto mb-3" />
                <h3 className="font-bold text-primary mb-2">Crescita</h3>
                <p className="text-gray-600 text-sm">Opportunità di crescere con noi</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Form Candidatura */}
      <section className="py-16">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-white rounded-lg shadow-xl p-8">
              <h2 className="text-3xl font-bold text-primary mb-2 text-center">Candidati ora</h2>
              <p className="text-gray-600 text-center mb-8">Compila il form e ti contatteremo</p>

              {submitMessage && (
                <div className="mb-6 p-4 bg-blue-100 text-blue-700 rounded-lg">
                  {submitMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Nome e Cognome *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Il tuo nome"
                    />
                  </div>

                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                      Città *
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="La tua città"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="tua@email.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Telefono *
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="+39 123 456 7890"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                    Ruolo di interesse *
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Seleziona...</option>
                    <option value="Gestione Eventi">Gestione Eventi</option>
                    <option value="Sviluppo Commerciale">Sviluppo Commerciale</option>
                    <option value="Entrambi">Entrambi</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Presentati brevemente *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows="4"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Raccontaci chi sei e perché vorresti lavorare con noi..."
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Apertura email...
                    </>
                  ) : (
                    <>
                      <FaPaperPlane />
                      Invia Candidatura
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default LavoraConNoi;
