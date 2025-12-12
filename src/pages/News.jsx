import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { FaCalendar, FaArrowRight, FaNewspaper } from 'react-icons/fa';

const News = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const categories = [
    { id: 'all', label: 'Tutte' },
    { id: 'eventi', label: 'Eventi' },
    { id: 'bandi', label: 'Bandi' },
    { id: 'tecnologia', label: 'Tecnologia' },
    { id: 'partnership', label: 'Partnership' }
  ];

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'articles'));
      const newsData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(article => article.published === true && article.type === 'news')
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
      setNews(newsData);
    } catch (error) {
      console.error('Error loading news:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredNews = filter === 'all'
    ? news
    : news.filter(n => n.category?.toLowerCase() === filter);

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
          <div className="flex items-center gap-3 mb-4">
            <FaNewspaper className="text-3xl" />
            <h1 className="text-4xl md:text-5xl font-bold">News</h1>
          </div>
          <p className="text-xl text-white/90 max-w-2xl">
            Eventi, bandi, partnership e novità dal mondo della cultura digitale e delle esperienze immersive.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-3">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === cat.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* News List */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {filteredNews.length === 0 ? (
          <div className="text-center py-12">
            <FaNewspaper className="text-6xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Nessuna news pubblicata ancora.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredNews.map((item) => (
              <Link
                key={item.id}
                to={`/news/${item.slug}`}
                className="block bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
              >
                <div className="flex flex-col md:flex-row">
                  {item.coverImage && (
                    <div className="md:w-72 h-48 md:h-auto overflow-hidden flex-shrink-0">
                      <img
                        src={item.coverImage}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-6 flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      {item.category && (
                        <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
                          item.category === 'Eventi' ? 'bg-blue-100 text-blue-700' :
                          item.category === 'Bandi' ? 'bg-green-100 text-green-700' :
                          item.category === 'Tecnologia' ? 'bg-purple-100 text-purple-700' :
                          item.category === 'Partnership' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {item.category}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-sm text-gray-500">
                        <FaCalendar className="text-xs" />
                        {formatDate(item.publishedAt)}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-primary transition-colors">
                      {item.title}
                    </h2>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {item.excerpt}
                    </p>
                    <span className="inline-flex items-center gap-2 text-primary font-medium text-sm">
                      Leggi tutto
                      <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                    </span>
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
            Vuoi rimanere aggiornato?
          </h2>
          <p className="text-gray-600 mb-8">
            Seguici sui social per non perderti eventi, bandi e novità dal mondo della cultura digitale.
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="https://www.facebook.com/culturaimmersiva"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-[#1877f2] text-white font-bold rounded-lg hover:bg-[#166fe5] transition-colors"
            >
              Facebook
            </a>
            <a
              href="https://www.instagram.com/culturaimmersiva"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white font-bold rounded-lg hover:opacity-90 transition-opacity"
            >
              Instagram
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default News;
