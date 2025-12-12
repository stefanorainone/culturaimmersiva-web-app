import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../config/firebase';
import { collection, getDocs, doc, deleteDoc, updateDoc, addDoc, query, orderBy } from 'firebase/firestore';
import { FaPlus, FaEdit, FaTrash, FaEye, FaEyeSlash, FaArrowLeft, FaSave, FaTimes } from 'react-icons/fa';

const AdminArticles = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingArticle, setEditingArticle] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const emptyArticle = {
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    category: '',
    coverImage: '',
    readTime: 5,
    published: false,
    publishedAt: null,
    type: 'blog' // 'blog' or 'news'
  };

  const [filterType, setFilterType] = useState('all');

  const blogCategories = [
    'VR e Musei',
    'Sviluppo Software',
    'App Mobile',
    'Digitalizzazione',
    'Guide Pratiche',
    'Consigli Pratici',
    'Prezzi e Budget',
    'Finanziamenti',
    'Innovazione',
    'Accessibilità',
    'Eventi'
  ];

  const newsCategories = [
    'Eventi',
    'Bandi',
    'Tecnologia',
    'Partnership'
  ];

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      const q = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const articlesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setArticles(articlesData);
    } catch (error) {
      console.error('Error loading articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleSave = async () => {
    if (!editingArticle.title || !editingArticle.content) {
      alert('Titolo e contenuto sono obbligatori');
      return;
    }

    try {
      const articleData = {
        ...editingArticle,
        slug: editingArticle.slug || generateSlug(editingArticle.title),
        updatedAt: new Date().toISOString()
      };

      if (isCreating) {
        articleData.createdAt = new Date().toISOString();
        if (articleData.published && !articleData.publishedAt) {
          articleData.publishedAt = new Date().toISOString();
        }
        await addDoc(collection(db, 'articles'), articleData);
      } else {
        if (articleData.published && !articleData.publishedAt) {
          articleData.publishedAt = new Date().toISOString();
        }
        await updateDoc(doc(db, 'articles', editingArticle.id), articleData);
      }

      setEditingArticle(null);
      setIsCreating(false);
      loadArticles();
    } catch (error) {
      console.error('Error saving article:', error);
      alert('Errore nel salvataggio');
    }
  };

  const handleDelete = async (articleId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo articolo?')) return;

    try {
      await deleteDoc(doc(db, 'articles', articleId));
      loadArticles();
    } catch (error) {
      console.error('Error deleting article:', error);
      alert('Errore nell\'eliminazione');
    }
  };

  const togglePublish = async (article) => {
    try {
      const newPublished = !article.published;
      await updateDoc(doc(db, 'articles', article.id), {
        published: newPublished,
        publishedAt: newPublished ? new Date().toISOString() : article.publishedAt
      });
      loadArticles();
    } catch (error) {
      console.error('Error toggling publish:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Editor View
  if (editingArticle) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-white shadow">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <button
              onClick={() => { setEditingArticle(null); setIsCreating(false); }}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
            >
              <FaTimes /> Annulla
            </button>
            <h1 className="text-xl font-bold">{isCreating ? 'Nuovo Articolo' : 'Modifica Articolo'}</h1>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
            >
              <FaSave /> Salva
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="md:col-span-2 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titolo *</label>
                <input
                  type="text"
                  value={editingArticle.title}
                  onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  placeholder="Titolo dell'articolo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Estratto</label>
                <textarea
                  value={editingArticle.excerpt}
                  onChange={(e) => setEditingArticle({ ...editingArticle, excerpt: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  rows={3}
                  placeholder="Breve descrizione dell'articolo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contenuto * (HTML)</label>
                <textarea
                  value={editingArticle.content}
                  onChange={(e) => setEditingArticle({ ...editingArticle, content: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary font-mono text-sm"
                  rows={20}
                  placeholder="<h2>Titolo sezione</h2><p>Contenuto...</p>"
                />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="font-bold text-gray-800 mb-4">Impostazioni</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Slug URL</label>
                    <input
                      type="text"
                      value={editingArticle.slug}
                      onChange={(e) => setEditingArticle({ ...editingArticle, slug: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                      placeholder="url-articolo"
                    />
                    <p className="text-xs text-gray-500 mt-1">Lascia vuoto per generare automaticamente</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                    <select
                      value={editingArticle.type || 'blog'}
                      onChange={(e) => setEditingArticle({ ...editingArticle, type: e.target.value, category: '' })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                    >
                      <option value="blog">Articolo Blog</option>
                      <option value="news">News</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                    <select
                      value={editingArticle.category}
                      onChange={(e) => setEditingArticle({ ...editingArticle, category: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Seleziona categoria</option>
                      {(editingArticle.type === 'news' ? newsCategories : blogCategories).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Immagine copertina URL</label>
                    <input
                      type="text"
                      value={editingArticle.coverImage}
                      onChange={(e) => setEditingArticle({ ...editingArticle, coverImage: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tempo lettura (min)</label>
                    <input
                      type="number"
                      value={editingArticle.readTime}
                      onChange={(e) => setEditingArticle({ ...editingArticle, readTime: parseInt(e.target.value) || 5 })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="published"
                      checked={editingArticle.published}
                      onChange={(e) => setEditingArticle({ ...editingArticle, published: e.target.checked })}
                      className="w-4 h-4 text-primary"
                    />
                    <label htmlFor="published" className="text-sm text-gray-700">Pubblicato</label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin/dashboard" className="text-gray-600 hover:text-gray-800">
              <FaArrowLeft />
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">Gestione Articoli</h1>
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 text-sm rounded-full ${filterType === 'all' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'}`}
              >
                Tutti
              </button>
              <button
                onClick={() => setFilterType('blog')}
                className={`px-3 py-1 text-sm rounded-full ${filterType === 'blog' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'}`}
              >
                Blog
              </button>
              <button
                onClick={() => setFilterType('news')}
                className={`px-3 py-1 text-sm rounded-full ${filterType === 'news' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'}`}
              >
                News
              </button>
            </div>
          </div>
          <button
            onClick={() => { setEditingArticle({ ...emptyArticle }); setIsCreating(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
          >
            <FaPlus /> Nuovo Articolo
          </button>
        </div>
      </div>

      {/* Articles List */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {articles.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 mb-4">Nessun articolo creato</p>
            <button
              onClick={() => { setEditingArticle({ ...emptyArticle }); setIsCreating(true); }}
              className="text-primary hover:underline"
            >
              Crea il primo articolo
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Titolo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stato</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {articles
                  .filter(a => filterType === 'all' || (a.type || 'blog') === filterType)
                  .map((article) => (
                  <tr key={article.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                          article.type === 'news' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {article.type === 'news' ? 'NEWS' : 'BLOG'}
                        </span>
                        <span className="font-medium text-gray-800">{article.title}</span>
                      </div>
                      <div className="text-sm text-gray-500">/{article.type === 'news' ? 'news' : 'blog'}/{article.slug}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded">
                        {article.category || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => togglePublish(article)}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
                          article.published
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {article.published ? <FaEye /> : <FaEyeSlash />}
                        {article.published ? 'Pubblicato' : 'Bozza'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(article.publishedAt || article.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {article.published && (
                          <a
                            href={`/${article.type === 'news' ? 'news' : 'blog'}/${article.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-600 hover:text-primary"
                            title="Visualizza"
                          >
                            <FaEye />
                          </a>
                        )}
                        <button
                          onClick={() => setEditingArticle(article)}
                          className="p-2 text-gray-600 hover:text-primary"
                          title="Modifica"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(article.id)}
                          className="p-2 text-gray-600 hover:text-red-600"
                          title="Elimina"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminArticles;
