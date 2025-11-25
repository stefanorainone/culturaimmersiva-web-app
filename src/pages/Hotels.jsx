import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaHotel, FaStar, FaGlobe } from 'react-icons/fa';

const Hotels = () => {
  const benefits = [
    {
      icon: <FaHotel className="text-5xl text-secondary" />,
      title: 'Esperienza Unica',
      description: 'Offri agli ospiti un servizio esclusivo che differenzia la tua struttura dalla concorrenza.',
    },
    {
      icon: <FaStar className="text-5xl text-secondary" />,
      title: 'Recensioni Positive',
      description: 'Un servizio innovativo che genera passaparola e recensioni entusiaste.',
    },
    {
      icon: <FaGlobe className="text-5xl text-secondary" />,
      title: 'Promozione Territorio',
      description: 'Aiuta gli ospiti a scoprire le bellezze locali, anche in caso di maltempo.',
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
              VR per Hotel / B&B
            </h1>
            <p className="text-xl md:text-2xl">
              Arricchisci l'esperienza dei tuoi ospiti con tour virtuali delle città italiane
            </p>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-gray-50">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">
              Perché Scegliere la VR
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Vantaggi concreti per la tua attività ricettiva
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="mb-4">{benefit.icon}</div>
                <h3 className="text-xl font-bold text-primary mb-3">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 bg-white">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-primary mb-4">
              Come Utilizzare la VR
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-white font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-bold text-primary mb-2">Nelle Camere</h3>
                  <p className="text-gray-600">
                    Offri agli ospiti la possibilità di esplorare la città dalla comodità della propria camera,
                    perfetto per pianificare visite o rilassarsi dopo una giornata di turismo.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-white font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-bold text-primary mb-2">Nella Hall</h3>
                  <p className="text-gray-600">
                    Crea un angolo esperienze VR nella reception o lounge, un'attrazione che intrattiene
                    gli ospiti durante il check-in o nei momenti di attesa.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-white font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-bold text-primary mb-2">Servizio Concierge</h3>
                  <p className="text-gray-600">
                    Aiuta gli ospiti a scegliere le destinazioni da visitare mostrando anteprime
                    immersive dei luoghi di interesse.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-primary to-secondary rounded-lg h-full min-h-[500px]"
            >
              {/* Placeholder per immagine */}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="py-20 bg-gray-50">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-primary mb-4">
              Soluzioni su Misura
            </h2>
            <p className="text-xl text-gray-600">
              Pacchetti flessibili per ogni tipo di struttura
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {['Piccoli B&B', 'Hotel Medi', 'Grandi Catene'].map((type, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-white p-8 rounded-lg shadow-lg"
              >
                <h3 className="text-2xl font-bold text-primary mb-4">{type}</h3>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="text-secondary">✓</span>
                    <span className="text-gray-600">Visori VR inclusi</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-secondary">✓</span>
                    <span className="text-gray-600">Contenuti sempre aggiornati</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-secondary">✓</span>
                    <span className="text-gray-600">Assistenza tecnica</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-secondary">✓</span>
                    <span className="text-gray-600">Materiale promozionale</span>
                  </li>
                </ul>
                <Link to="/contatti" className="btn-primary w-full text-center block">
                  Richiedi Preventivo
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-primary to-primary-dark text-white">
        <div className="container-custom text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Distingui la Tua Struttura
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Contattaci per una demo gratuita e scopri come la VR può migliorare l'esperienza dei tuoi ospiti
            </p>
            <Link to="/contatti" className="btn-secondary">
              Prenota una Demo
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Hotels;
