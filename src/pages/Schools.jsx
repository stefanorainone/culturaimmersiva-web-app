import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaGraduationCap, FaChalkboardTeacher, FaBook, FaUsers } from 'react-icons/fa';

const Schools = () => {
  const benefits = [
    {
      icon: <FaGraduationCap className="text-5xl text-secondary" />,
      title: 'Apprendimento Innovativo',
      description: 'Metodi didattici all\'avanguardia che coinvolgono gli studenti in modo attivo e partecipativo.',
    },
    {
      icon: <FaChalkboardTeacher className="text-5xl text-secondary" />,
      title: 'Supporto per Docenti',
      description: 'Materiali didattici completi e formazione per gli insegnanti sull\'utilizzo della VR.',
    },
    {
      icon: <FaBook className="text-5xl text-secondary" />,
      title: 'Programma Curricolare',
      description: 'Esperienze allineate con i programmi scolastici di storia, arte e geografia.',
    },
    {
      icon: <FaUsers className="text-5xl text-secondary" />,
      title: 'Gite Virtuali',
      description: 'Alternative innovative alle gite tradizionali, sicure e accessibili a tutti.',
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
              Cultura Immersiva per le Scuole
            </h1>
            <p className="text-xl md:text-2xl">
              Porta l'arte, la storia e la cultura italiana nelle tue aule e fai vivere ai tuoi alunni un'esperienza indimenticabile.
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
              Perché Sceglierci
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Un'esperienza educativa che trasforma il modo di imparare
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
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

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold text-primary mb-6">
                Esperienze Personalizzate per Ogni Livello
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <span className="text-secondary text-2xl">✓</span>
                  <div>
                    <h4 className="font-semibold text-lg text-primary mb-1">Scuola Primaria</h4>
                    <p className="text-gray-600">Viaggi virtuali interattivi per scoprire storia e geografia in modo divertente.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <span className="text-secondary text-2xl">✓</span>
                  <div>
                    <h4 className="font-semibold text-lg text-primary mb-1">Scuola Secondaria</h4>
                    <p className="text-gray-600">Approfondimenti storici e artistici allineati con i programmi ministeriali.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <span className="text-secondary text-2xl">✓</span>
                  <div>
                    <h4 className="font-semibold text-lg text-primary mb-1">Università</h4>
                    <p className="text-gray-600">Strumenti avanzati per ricerca e studio dei beni culturali.</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-primary to-secondary rounded-lg h-96"
            >
              {/* Placeholder per immagine */}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
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
              Cosa Dicono le Scuole
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-white p-6 rounded-lg shadow-lg"
              >
                <div className="text-secondary text-4xl mb-4">"</div>
                <p className="text-gray-700 mb-4">
                  Un'esperienza straordinaria che ha coinvolto tutti gli studenti. La VR ha reso la storia viva e tangibile.
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary rounded-full"></div>
                  <div>
                    <p className="font-semibold text-primary">Prof. Mario Rossi</p>
                    <p className="text-sm text-gray-600">Liceo Classico, Roma</p>
                  </div>
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
              Porta la VR nella Tua Scuola
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Richiedi una demo gratuita o maggiori informazioni sui nostri programmi educativi
            </p>
            <Link to="/contatti" className="btn-secondary">
              Contattaci Ora
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Schools;
