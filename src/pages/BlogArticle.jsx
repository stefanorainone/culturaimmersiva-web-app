import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { FaCalendar, FaClock, FaArrowLeft, FaLinkedin, FaFacebook, FaTwitter, FaList, FaWhatsapp } from 'react-icons/fa';
import DOMPurify from 'dompurify';

const BlogArticle = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArticle();
  }, [slug]);

  const loadArticle = async () => {
    try {
      const q = query(
        collection(db, 'articles'),
        where('slug', '==', slug),
        where('published', '==', true),
        limit(1)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        navigate('/blog');
        return;
      }

      const articleData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };

      // Redirect to news page if this is a news article
      if (articleData.type === 'news') {
        navigate(`/news/${slug}`);
        return;
      }

      setArticle(articleData);

      // Update page title and meta
      document.title = `${articleData.title} | Cultura Immersiva Blog`;

      // Update meta description
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.name = 'description';
        document.head.appendChild(metaDescription);
      }
      metaDescription.content = articleData.metaDescription || articleData.excerpt || '';

      // Update meta keywords
      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.name = 'keywords';
        document.head.appendChild(metaKeywords);
      }
      metaKeywords.content = articleData.metaKeywords || '';

      // Update Open Graph tags for social sharing
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

      if (articleData.coverImage) {
        let ogImage = document.querySelector('meta[property="og:image"]');
        if (!ogImage) {
          ogImage = document.createElement('meta');
          ogImage.setAttribute('property', 'og:image');
          document.head.appendChild(ogImage);
        }
        ogImage.content = articleData.coverImage;
      }

      // Load related articles
      if (articleData.category) {
        const relatedQ = query(
          collection(db, 'articles'),
          where('published', '==', true),
          where('category', '==', articleData.category),
          limit(4)
        );
        const relatedSnapshot = await getDocs(relatedQ);
        const related = relatedSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(a => a.slug !== slug)
          .slice(0, 3);
        setRelatedArticles(related);
      }
    } catch (error) {
      console.error('Error loading article:', error);
      navigate('/blog');
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

  // Extract headings from content for table of contents
  const tableOfContents = useMemo(() => {
    if (!article?.content) return [];
    const headingRegex = /<h([23])[^>]*>([^<]+)<\/h[23]>/gi;
    const headings = [];
    let match;
    while ((match = headingRegex.exec(article.content)) !== null) {
      const level = parseInt(match[1]);
      const text = match[2].trim();
      const id = text.toLowerCase()
        .replace(/[àáâãäå]/g, 'a')
        .replace(/[èéêë]/g, 'e')
        .replace(/[ìíîï]/g, 'i')
        .replace(/[òóôõö]/g, 'o')
        .replace(/[ùúûü]/g, 'u')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      headings.push({ level, text, id });
    }
    return headings;
  }, [article?.content]);

  // Add IDs to headings in content
  const processedContent = useMemo(() => {
    if (!article?.content) return '';
    let content = article.content;
    tableOfContents.forEach(({ text, id }) => {
      const regex = new RegExp(`(<h[23][^>]*)>\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</h`, 'gi');
      content = content.replace(regex, `$1 id="${id}">${text}</h`);
    });
    return content;
  }, [article?.content, tableOfContents]);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
          <Link to="/blog" className="inline-flex items-center gap-2 text-gray-600 hover:text-primary transition-colors font-medium">
            <FaArrowLeft className="text-sm" />
            Torna al Blog
          </Link>
        </div>
      </div>

      {/* Article Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <article className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Cover Image - Full width at top */}
          {article.coverImage && (
            <div className="w-full h-64 sm:h-80 lg:h-96 overflow-hidden">
              <img
                src={article.coverImage}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Article Content Container */}
          <div className="px-6 sm:px-10 lg:px-14 py-8 sm:py-12">
            <header className="mb-10">
              {article.category && (
                <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary text-sm font-semibold rounded-full mb-5">
                  {article.category}
                </span>
              )}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-800 mb-6 leading-tight">
                {article.title}
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 mb-6 leading-relaxed">
                {article.excerpt}
              </p>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-gray-500 pt-6 border-t border-gray-100">
                <span className="flex items-center gap-2">
                  <FaCalendar className="text-primary" />
                  {formatDate(article.publishedAt)}
                </span>
                {article.readTime && (
                  <span className="flex items-center gap-2">
                    <FaClock className="text-primary" />
                    {article.readTime} min di lettura
                  </span>
                )}
              </div>
            </header>

            {/* Table of Contents */}
            {tableOfContents.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 sm:p-8 mb-10">
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-200">
                  <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                    <FaList className="text-primary text-sm" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-800">Indice dei contenuti</h2>
                </div>
                <nav>
                  <ul className="space-y-2.5">
                    {tableOfContents.map((item, index) => (
                      <li
                        key={index}
                        className={item.level === 3 ? 'ml-5' : ''}
                      >
                        <button
                          onClick={() => scrollToSection(item.id)}
                          className={`text-left hover:text-primary transition-all duration-200 flex items-start gap-2 group ${
                            item.level === 2
                              ? 'text-gray-700 font-medium'
                              : 'text-gray-500 text-sm'
                          }`}
                        >
                          {item.level === 2 && (
                            <span className="text-primary font-bold group-hover:translate-x-1 transition-transform inline-block mt-0.5">›</span>
                          )}
                          {item.level === 3 && (
                            <span className="text-gray-400 inline-block mt-0.5">–</span>
                          )}
                          <span className="group-hover:underline">{item.text}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            )}

            {/* Article Content */}
            <div
              className="article-content mb-10"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(processedContent) }}
            />

            <style>{`
              .article-content {
                font-size: 1.125rem;
                line-height: 1.8;
                color: #374151;
              }

              .article-content p {
                margin-bottom: 1.5rem;
              }

              .article-content h2 {
                font-size: 1.75rem;
                font-weight: 700;
                color: #1f2937;
                margin-top: 3rem;
                margin-bottom: 1.25rem;
                padding-bottom: 0.75rem;
                border-bottom: 2px solid #e5e7eb;
                scroll-margin-top: 1rem;
              }

              .article-content h3 {
                font-size: 1.375rem;
                font-weight: 600;
                color: #022553;
                margin-top: 2.5rem;
                margin-bottom: 1rem;
                scroll-margin-top: 1rem;
              }

              .article-content ul {
                list-style-type: disc;
                padding-left: 1.75rem;
                margin-top: 1.25rem;
                margin-bottom: 1.75rem;
              }

              .article-content ol {
                list-style-type: decimal;
                padding-left: 1.75rem;
                margin-top: 1.25rem;
                margin-bottom: 1.75rem;
              }

              .article-content li {
                margin-bottom: 0.75rem;
                padding-left: 0.5rem;
                line-height: 1.7;
              }

              .article-content li::marker {
                color: #022553;
              }

              .article-content strong {
                font-weight: 600;
                color: #1f2937;
              }

              .article-content a {
                color: #022553;
                text-decoration: none;
                border-bottom: 1px solid #022553;
                transition: all 0.2s;
              }

              .article-content a:hover {
                color: #033d7a;
                border-bottom-color: #033d7a;
              }

              .article-content blockquote {
                margin: 2rem 0;
                padding: 1.5rem 1.5rem 1.5rem 2rem;
                background: linear-gradient(to right, #f8fafc, #ffffff);
                border-left: 4px solid #022553;
                border-radius: 0 0.75rem 0.75rem 0;
                font-style: italic;
                color: #4b5563;
                font-size: 1.1rem;
                line-height: 1.8;
              }

              .article-content blockquote p {
                margin-bottom: 0;
              }

              .article-content img {
                border-radius: 0.75rem;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                margin: 2rem 0;
              }

              .article-content p + h2 {
                margin-top: 3.5rem;
              }

              .article-content p + h3 {
                margin-top: 2.5rem;
              }

              .article-content ul + h2,
              .article-content ol + h2 {
                margin-top: 3rem;
              }

              .article-content ul + h3,
              .article-content ol + h3 {
                margin-top: 2.5rem;
              }

              /* All paragraphs same style */
              .article-content p {
                font-size: 1.125rem;
                line-height: 1.85;
                color: #374151;
                font-weight: 400;
              }

              /* Nested lists */
              .article-content li ul,
              .article-content li ol {
                margin-top: 0.75rem;
                margin-bottom: 0.5rem;
              }

              /* Better spacing for lists after paragraphs */
              .article-content p + ul,
              .article-content p + ol {
                margin-top: 1rem;
              }

              /* Responsive adjustments */
              @media (max-width: 768px) {
                .article-content {
                  font-size: 1rem;
                }
                .article-content h2 {
                  font-size: 1.5rem;
                  margin-top: 2.5rem;
                }
                .article-content h3 {
                  font-size: 1.25rem;
                  margin-top: 2rem;
                }
                .article-content p {
                  font-size: 1rem;
                }
                .article-content blockquote {
                  padding: 1rem 1rem 1rem 1.25rem;
                  font-size: 1rem;
                }
              }
            `}</style>

            {/* Share Buttons */}
            <div className="border-t border-gray-200 pt-8 mt-8">
              <p className="text-gray-600 mb-4 font-semibold">Condividi questo articolo:</p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#0077b5] text-white rounded-lg hover:bg-[#006396] transition-colors text-sm font-medium"
                >
                  <FaLinkedin />
                  LinkedIn
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#1877f2] text-white rounded-lg hover:bg-[#166fe5] transition-colors text-sm font-medium"
                >
                  <FaFacebook />
                  Facebook
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(article.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#1da1f2] text-white rounded-lg hover:bg-[#1a91da] transition-colors text-sm font-medium"
                >
                  <FaTwitter />
                  Twitter
                </a>
              </div>
            </div>
          </div>
        </article>

        {/* CTA Box - Outside article card */}
        <div className="bg-primary text-white rounded-2xl p-8 sm:p-10 mt-8">
          <h3 className="text-2xl sm:text-3xl font-bold mb-4">Proponici una collaborazione</h3>
          <p className="text-white/90 mb-6 text-lg leading-relaxed">
            Sviluppiamo esperienze immersive, app mobile e software per musei, comuni e aziende.
            Raccontaci la tua idea, troviamo insieme la soluzione migliore.
          </p>
          <a
            href="https://wa.me/393292890532?text=Ciao! Ho letto un articolo sul blog e vorrei maggiori informazioni."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#25D366] text-white font-bold rounded-lg hover:bg-[#20BA5C] transition-colors"
          >
            <FaWhatsapp className="text-xl" />
            Scrivici su WhatsApp
          </a>
        </div>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <div className="mt-12">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Articoli correlati</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedArticles.map((related) => (
                <Link
                  key={related.id}
                  to={`/blog/${related.slug}`}
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
                    <h4 className="font-bold text-gray-800 group-hover:text-primary transition-colors line-clamp-2">
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
        href="https://wa.me/393292890532?text=Ciao! Ho letto un articolo sul blog e vorrei maggiori informazioni."
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

export default BlogArticle;
