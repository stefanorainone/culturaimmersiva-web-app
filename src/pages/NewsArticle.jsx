import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { FaCalendar, FaArrowLeft, FaLinkedin, FaFacebook, FaTwitter, FaWhatsapp } from 'react-icons/fa';
import DOMPurify from 'dompurify';

const NewsArticle = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [relatedNews, setRelatedNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArticle();
  }, [slug]);

  useEffect(() => {
    // Add structured data for Google News
    if (article) {
      const structuredData = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": article.title,
        "description": article.metaDescription || article.excerpt,
        "image": article.coverImage ? [article.coverImage] : [],
        "datePublished": article.publishedAt,
        "dateModified": article.updatedAt || article.publishedAt,
        "author": {
          "@type": "Organization",
          "name": "Cultura Immersiva",
          "url": "https://culturaimmersiva.it"
        },
        "publisher": {
          "@type": "Organization",
          "name": "Cultura Immersiva",
          "logo": {
            "@type": "ImageObject",
            "url": "https://culturaimmersiva.it/logo.png"
          }
        },
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": `https://culturaimmersiva.it/news/${article.slug}`
        }
      };

      // Remove existing script if any
      const existingScript = document.querySelector('script[type="application/ld+json"][data-news-article]');
      if (existingScript) {
        existingScript.remove();
      }

      // Add new script
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-news-article', 'true');
      script.text = JSON.stringify(structuredData);
      document.head.appendChild(script);

      // Cleanup on unmount
      return () => {
        const scriptToRemove = document.querySelector('script[type="application/ld+json"][data-news-article]');
        if (scriptToRemove) {
          scriptToRemove.remove();
        }
      };
    }
  }, [article]);

  const loadArticle = async () => {
    try {
      const q = query(
        collection(db, 'articles'),
        where('slug', '==', slug),
        where('published', '==', true),
        where('type', '==', 'news'),
        limit(1)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        navigate('/news');
        return;
      }

      const articleData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      setArticle(articleData);

      // Update page title and meta
      document.title = `${articleData.title} | Cultura Immersiva News`;

      // Update meta description
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.name = 'description';
        document.head.appendChild(metaDescription);
      }
      metaDescription.content = articleData.metaDescription || articleData.excerpt || '';

      // Update Open Graph tags
      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (!ogTitle) {
        ogTitle = document.createElement('meta');
        ogTitle.setAttribute('property', 'og:title');
        document.head.appendChild(ogTitle);
      }
      ogTitle.content = articleData.title;

      let ogDescription = document.querySelector('meta[property="og:description"]');
      if (!ogDescription) {
        ogDescription = document.createElement('meta');
        ogDescription.setAttribute('property', 'og:description');
        document.head.appendChild(ogDescription);
      }
      ogDescription.content = articleData.metaDescription || articleData.excerpt || '';

      let ogType = document.querySelector('meta[property="og:type"]');
      if (!ogType) {
        ogType = document.createElement('meta');
        ogType.setAttribute('property', 'og:type');
        document.head.appendChild(ogType);
      }
      ogType.content = 'article';

      if (articleData.coverImage) {
        let ogImage = document.querySelector('meta[property="og:image"]');
        if (!ogImage) {
          ogImage = document.createElement('meta');
          ogImage.setAttribute('property', 'og:image');
          document.head.appendChild(ogImage);
        }
        ogImage.content = articleData.coverImage;
      }

      // Load related news
      const relatedQ = query(
        collection(db, 'articles'),
        where('published', '==', true),
        where('type', '==', 'news'),
        limit(4)
      );
      const relatedSnapshot = await getDocs(relatedQ);
      const related = relatedSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(a => a.slug !== slug)
        .slice(0, 3);
      setRelatedNews(related);

    } catch (error) {
      console.error('Error loading news:', error);
      navigate('/news');
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

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!article) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Back Button */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link to="/news" className="inline-flex items-center gap-2 text-gray-600 hover:text-primary transition-colors font-medium">
            <FaArrowLeft className="text-sm" />
            Torna alle News
          </Link>
        </div>
      </div>

      {/* Article Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <article className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Cover Image */}
          {article.coverImage && (
            <div className="w-full h-64 sm:h-80 lg:h-96 overflow-hidden">
              <img
                src={article.coverImage}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Article Content */}
          <div className="px-6 sm:px-10 lg:px-14 py-8 sm:py-12">
            <header className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                {article.category && (
                  <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${
                    article.category === 'Eventi' ? 'bg-blue-100 text-blue-700' :
                    article.category === 'Bandi' ? 'bg-green-100 text-green-700' :
                    article.category === 'Tecnologia' ? 'bg-purple-100 text-purple-700' :
                    article.category === 'Partnership' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {article.category}
                  </span>
                )}
                <span className="flex items-center gap-2 text-sm text-gray-500">
                  <FaCalendar className="text-primary" />
                  {formatDate(article.publishedAt)}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4 leading-tight">
                {article.title}
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed">
                {article.excerpt}
              </p>
            </header>

            {/* Article Body */}
            <div
              className="news-content mb-8"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content) }}
            />

            <style>{`
              .news-content {
                font-size: 1.125rem;
                line-height: 1.8;
                color: #374151;
              }
              .news-content p {
                margin-bottom: 1.5rem;
              }
              .news-content h2 {
                font-size: 1.5rem;
                font-weight: 700;
                color: #1f2937;
                margin-top: 2.5rem;
                margin-bottom: 1rem;
              }
              .news-content h3 {
                font-size: 1.25rem;
                font-weight: 600;
                color: #022553;
                margin-top: 2rem;
                margin-bottom: 0.75rem;
              }
              .news-content ul, .news-content ol {
                padding-left: 1.5rem;
                margin-bottom: 1.5rem;
              }
              .news-content li {
                margin-bottom: 0.5rem;
              }
              .news-content strong {
                font-weight: 600;
                color: #1f2937;
              }
              .news-content a {
                color: #022553;
                text-decoration: underline;
              }
              .news-content blockquote {
                margin: 1.5rem 0;
                padding: 1rem 1.5rem;
                background: #f8fafc;
                border-left: 4px solid #022553;
                font-style: italic;
              }
              .news-content img {
                border-radius: 0.5rem;
                margin: 1.5rem 0;
              }
              @media (max-width: 768px) {
                .news-content {
                  font-size: 1rem;
                }
              }
            `}</style>

            {/* Share Buttons */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <p className="text-gray-600 mb-4 font-semibold">Condividi:</p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-[#0077b5] text-white rounded-lg hover:bg-[#006396] transition-colors text-sm font-medium"
                >
                  <FaLinkedin />
                  LinkedIn
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-[#1877f2] text-white rounded-lg hover:bg-[#166fe5] transition-colors text-sm font-medium"
                >
                  <FaFacebook />
                  Facebook
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(article.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-[#1da1f2] text-white rounded-lg hover:bg-[#1a91da] transition-colors text-sm font-medium"
                >
                  <FaTwitter />
                  Twitter
                </a>
              </div>
            </div>
          </div>
        </article>

        {/* CTA Box */}
        <div className="bg-primary text-white rounded-2xl p-8 sm:p-10 mt-8">
          <h3 className="text-2xl sm:text-3xl font-bold mb-4">Vuoi saperne di più?</h3>
          <p className="text-white/90 mb-6 text-lg leading-relaxed">
            Contattaci per informazioni su eventi, partnership o collaborazioni.
          </p>
          <a
            href="https://wa.me/393292890532?text=Ciao! Ho letto una news e vorrei maggiori informazioni."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#25D366] text-white font-bold rounded-lg hover:bg-[#20BA5C] transition-colors"
          >
            <FaWhatsapp className="text-xl" />
            Scrivici su WhatsApp
          </a>
        </div>

        {/* Related News */}
        {relatedNews.length > 0 && (
          <div className="mt-12">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Altre news</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedNews.map((related) => (
                <Link
                  key={related.id}
                  to={`/news/${related.slug}`}
                  className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
                >
                  {related.coverImage && (
                    <div className="h-36 overflow-hidden">
                      <img
                        src={related.coverImage}
                        alt={related.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <span className="text-xs text-gray-500">{formatDate(related.publishedAt)}</span>
                    <h4 className="font-bold text-gray-800 group-hover:text-primary transition-colors line-clamp-2 mt-1">
                      {related.title}
                    </h4>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* WhatsApp FAB - Mobile Only */}
      <a
        href="https://wa.me/393292890532?text=Ciao! Ho letto una news e vorrei maggiori informazioni."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 md:hidden bg-[#25D366] text-white p-4 rounded-full shadow-lg hover:bg-[#20BA5C] transition-all hover:scale-110 flex items-center justify-center"
        aria-label="Contattaci su WhatsApp"
      >
        <FaWhatsapp className="text-2xl" />
      </a>
    </div>
  );
};

export default NewsArticle;
