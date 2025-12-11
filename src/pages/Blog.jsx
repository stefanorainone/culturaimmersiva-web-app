import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { FaCalendar, FaClock, FaArrowRight } from 'react-icons/fa';

const Blog = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      // Query semplice senza indice composito
      const snapshot = await getDocs(collection(db, 'articles'));
      const articlesData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(article => article.published === true)
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
      setArticles(articlesData);
    } catch (error) {
      console.error('Error loading articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-primary text-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Blog</h1>
          <p className="text-xl text-white/90 max-w-2xl">
            Approfondimenti su realtà virtuale, sviluppo software, digitalizzazione culturale e innovazione tecnologica.
          </p>
        </div>
      </div>

      {/* Articles Grid */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {articles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Nessun articolo pubblicato ancora.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article) => (
              <Link
                key={article.id}
                to={`/blog/${article.slug}`}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow group"
              >
                {article.coverImage && (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={article.coverImage}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-6">
                  {article.category && (
                    <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full mb-3">
                      {article.category}
                    </span>
                  )}
                  <h2 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-primary transition-colors">
                    {article.title}
                  </h2>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {article.excerpt}
                  </p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <FaCalendar className="text-xs" />
                        {formatDate(article.publishedAt)}
                      </span>
                      {article.readTime && (
                        <span className="flex items-center gap-1">
                          <FaClock className="text-xs" />
                          {article.readTime} min
                        </span>
                      )}
                    </div>
                    <FaArrowRight className="text-primary group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="bg-gray-100 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Hai un progetto in mente?
          </h2>
          <p className="text-gray-600 mb-8">
            Sviluppiamo esperienze immersive, app mobile e software per musei, comuni e aziende.
          </p>
          <a
            href="mailto:info@culturaimmersiva.it"
            className="inline-block px-8 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-colors"
          >
            Contattaci
          </a>
        </div>
      </div>
    </div>
  );
};

export default Blog;
