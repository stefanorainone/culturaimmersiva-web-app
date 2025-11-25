import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaLandmark, FaMobileAlt, FaChartLine, FaVrCardboard } from 'react-icons/fa';

const Museums = () => {
  const solutions = [
    {
      icon: <FaVrCardboard className="text-5xl text-secondary" />,
      title: 'Ricostruzione 3D Interattiva',
      description: 'Ricostruzione 3D interattiva e riprese a 360° di siti culturali e opere d\'arte.',
    },
    {
      icon: <FaMobileAlt className="text-5xl text-secondary" />,
      title: 'Co-investimento',
      description: 'Co-investimento fino all\'80% per progetti promettenti.',
    },
    {
      icon: <FaChartLine className="text-5xl text-secondary" />,
      title: 'Organizzazione Eventi',
      description: 'Organizzazione eventi museali con garanzia di 100-200 partecipanti.',
    },
    {
      icon: <FaLandmark className="text-5xl text-secondary" />,
      title: 'Marketing e Social',
      description: 'Servizi di marketing e creazione contenuti per i social media.',
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
              Musei e Siti Culturali
            </h1>
            <p className="text-xl md:text-2xl">
              Valorizzare il patrimonio culturale e turistico italiano, rendendolo più attrattivo, coinvolgente e accessibile
            </p>
          </motion.div>
        </div>
      </section>

      {/* Solutions */}
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
              Le Nostre Soluzioni
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Tecnologie all'avanguardia per musei moderni e coinvolgenti
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {solutions.map((solution, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="mb-4">{solution.icon}</div>
                <h3 className="text-xl font-bold text-primary mb-3">{solution.title}</h3>
                <p className="text-gray-600">{solution.description}</p>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link to="/contatti" className="btn-primary inline-block">
              Richiedi Consulenza
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-white">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="rounded-lg h-96 overflow-hidden"
            >
              <img
                src="/images/musei-pompei-vr.webp"
                alt="Esperienza VR Pompei"
                className="w-full h-full object-cover"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold text-primary mb-6">
                Vantaggi della VR per i Musei
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <span className="text-secondary text-2xl">✓</span>
                  <div>
                    <h4 className="font-semibold text-lg text-primary mb-1">Coinvolgimento Profondo</h4>
                    <p className="text-gray-600">Esperienze immersive che catturano l'attenzione e l'interesse dei visitatori.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <span className="text-secondary text-2xl">✓</span>
                  <div>
                    <h4 className="font-semibold text-lg text-primary mb-1">Accessibilità Inclusiva</h4>
                    <p className="text-gray-600">Accessibilità per visitatori con disabilità e mobilità ridotta.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <span className="text-secondary text-2xl">✓</span>
                  <div>
                    <h4 className="font-semibold text-lg text-primary mb-1">Educazione Interattiva</h4>
                    <p className="text-gray-600">Educazione interattiva per studenti e famiglie.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <span className="text-secondary text-2xl">✓</span>
                  <div>
                    <h4 className="font-semibold text-lg text-primary mb-1">Maggiore Permanenza</h4>
                    <p className="text-gray-600">Aumento del tempo di permanenza dei visitatori nel museo.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <span className="text-secondary text-2xl">✓</span>
                  <div>
                    <h4 className="font-semibold text-lg text-primary mb-1">Nuove Fonti di Reddito</h4>
                    <p className="text-gray-600">Nuove fonti di reddito mediante esperienze VR a pagamento.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Case Studies */}
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
              Progetti Realizzati
            </h2>
            <p className="text-xl text-gray-600">
              Collaboriamo con musei e siti culturali in tutta Italia
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {['Musei Archeologici', 'Pinacoteche', 'Siti Unesco'].map((type, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="h-48 bg-gradient-to-br from-primary to-secondary"></div>
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-primary mb-3">{type}</h3>
                  <p className="text-gray-600 mb-4">
                    Esperienze immersive che valorizzano il patrimonio e coinvolgono i visitatori in modo innovativo.
                  </p>
                  <Link to="/contatti" className="text-secondary font-medium hover:underline">
                    Scopri di più →
                  </Link>
                </div>
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
              Innova il Tuo Museo
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Scopri come la realtà virtuale può trasformare l'esperienza dei tuoi visitatori
            </p>
            <Link to="/contatti" className="btn-secondary">
              Richiedi Consulenza
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Museums;
