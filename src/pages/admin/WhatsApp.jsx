import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db, requestNotificationPermission, onForegroundMessage } from '../../config/firebase';
import {
  collection,
  query,
  orderBy,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { FaWhatsapp, FaPaperPlane, FaArrowLeft, FaSync, FaUser, FaSearch, FaUserCog, FaBell, FaBellSlash, FaFileAlt, FaPlay, FaDownload, FaTimes, FaExpand, FaCheck, FaCity } from 'react-icons/fa';

// Compact WhatsApp-style checkmarks
const CheckIcon = ({ className }) => (
  <svg viewBox="0 0 16 11" className={className} style={{ width: '14px', height: '10px' }}>
    <path fill="currentColor" d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.405-2.272a.463.463 0 0 0-.336-.146.47.47 0 0 0-.343.146l-.311.31a.445.445 0 0 0-.14.337c0 .136.047.25.14.343l2.996 2.996a.724.724 0 0 0 .512.203.675.675 0 0 0 .523-.229l6.871-8.467a.453.453 0 0 0 .102-.305.469.469 0 0 0-.14-.336l-.294-.292z"/>
  </svg>
);

const DoubleCheckIcon = ({ className }) => (
  <svg viewBox="0 0 16 11" className={className} style={{ width: '14px', height: '10px' }}>
    <path fill="currentColor" d="M15.01.653a.457.457 0 0 0-.305-.102.493.493 0 0 0-.38.178l-6.19 7.636-1.4-1.322a.457.457 0 0 0-.053.076l-.311.31a.445.445 0 0 0-.14.337c0 .136.047.25.14.343l1.72 1.72a.724.724 0 0 0 .512.203.675.675 0 0 0 .523-.229l6.871-8.467a.453.453 0 0 0 .102-.305.469.469 0 0 0-.14-.336l-.294-.292zM7.61.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178L.735 8.365l-.31.31a.445.445 0 0 0-.14.337c0 .136.047.25.14.343l.295.294a.445.445 0 0 0 .336.14.445.445 0 0 0 .337-.14l6.871-8.467a.453.453 0 0 0 .102-.305.469.469 0 0 0-.14-.336L7.903.248a.457.457 0 0 0-.293-.095z"/>
  </svg>
);

// Media display component
const MediaDisplay = ({ mediaType, mediaUrl, mediaMimeType, caption, onExpand }) => {
  // Show placeholder if media type exists but URL is missing
  if (!mediaUrl && mediaType) {
    return (
      <div className="bg-gray-200 rounded-lg p-3 text-center text-gray-500 text-sm">
        <p>📎 Media non disponibile</p>
      </div>
    );
  }

  if (!mediaUrl) return null;

  if (mediaType === 'image' || (mediaMimeType && mediaMimeType.startsWith('image/'))) {
    return (
      <div className="relative cursor-pointer group" onClick={() => onExpand(mediaUrl, 'image')}>
        <img
          src={mediaUrl}
          alt={caption || 'Immagine'}
          className="max-w-full rounded-lg max-h-64 object-cover"
          crossOrigin="anonymous"
          loading="lazy"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
          <FaExpand className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={20} />
        </div>
      </div>
    );
  }

  if (mediaType === 'video' || (mediaMimeType && mediaMimeType.startsWith('video/'))) {
    return (
      <div className="relative">
        <video
          src={mediaUrl}
          controls
          crossOrigin="anonymous"
          className="max-w-full rounded-lg max-h-64"
          preload="metadata"
        />
      </div>
    );
  }

  if (mediaType === 'audio' || (mediaMimeType && mediaMimeType.startsWith('audio/'))) {
    return (
      <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2">
        <FaPlay className="text-green-600 flex-shrink-0" size={16} />
        <audio
          src={mediaUrl}
          controls
          crossOrigin="anonymous"
          className="w-full h-10"
          style={{ minWidth: '200px' }}
        />
      </div>
    );
  }

  if (mediaType === 'document' || mediaType === 'sticker') {
    return (
      <a
        href={mediaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 bg-gray-100 rounded-lg p-3 hover:bg-gray-200 transition-colors"
      >
        <FaFileAlt className="text-gray-500" size={24} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-700 truncate">{caption || 'Documento'}</p>
          <p className="text-xs text-gray-500">Clicca per aprire</p>
        </div>
        <FaDownload className="text-gray-400" size={14} />
      </a>
    );
  }

  return null;
};

// Image lightbox component
const ImageLightbox = ({ url, onClose }) => {
  if (!url) return null;

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full"
        onClick={onClose}
      >
        <FaTimes size={24} />
      </button>
      <img
        src={url}
        alt="Immagine ingrandita"
        className="max-w-full max-h-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

const WhatsApp = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pendingMessages, setPendingMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [operatorName, setOperatorName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const messagesEndRef = useRef(null);
  const notifiedExpiring = useRef(new Set()); // Track already notified expiring conversations
  const inputRef = useRef(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Check notification status on load
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  // Set body/html background for chat view only (gray for input bar area)
  useEffect(() => {
    if (selectedConversation) {
      document.body.style.backgroundColor = '#f0f2f5';
      document.documentElement.style.backgroundColor = '#f0f2f5';
    } else {
      document.body.style.backgroundColor = '';
      document.documentElement.style.backgroundColor = '';
    }
  }, [selectedConversation]);

  // Listen for foreground messages
  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      if (Notification.permission === 'granted') {
        new Notification(payload.notification?.title || 'Nuovo messaggio', {
          body: payload.notification?.body,
          icon: '/images/icon-192.png'
        });
      }
    });
    return () => unsubscribe && unsubscribe();
  }, []);

  // Enable notifications
  const handleEnableNotifications = async () => {
    setNotificationLoading(true);
    try {
      console.log('🔔 Requesting notification permission...');
      const token = await requestNotificationPermission();
      console.log('🔔 Token received:', token ? (token.substring(0, 50) + '...') : 'null');
      console.log('🔔 Token type:', token?.startsWith('{') ? 'Web Push (iOS)' : 'FCM');

      if (token && currentUser) {
        const operatorId = currentUser.email.replace(/[^a-zA-Z0-9]/g, '_');
        console.log('🔔 Saving to fcm_tokens/' + operatorId);

        await setDoc(doc(db, 'fcm_tokens', operatorId), {
          token,
          email: currentUser.email,
          updatedAt: serverTimestamp(),
          platform: navigator.userAgent.includes('iPhone') ? 'ios' : 'web'
        }, { merge: true });

        console.log('🔔 Token saved successfully!');
        setNotificationsEnabled(true);
        alert('Notifiche attivate! Token: ' + (token.startsWith('{') ? 'iOS Web Push' : 'FCM'));
      } else {
        console.log('🔔 No token or no user');
        alert('Errore: token non ricevuto');
      }
    } catch (error) {
      console.error('🔔 Notification error:', error);
      alert(error.message || 'Errore attivazione notifiche');
    } finally {
      setNotificationLoading(false);
    }
  };

  useEffect(() => {
    const loadOperatorInfo = async () => {
      if (!currentUser) return;
      try {
        const operatorDoc = await getDoc(doc(db, 'operators', currentUser.uid));
        if (operatorDoc.exists()) {
          const data = operatorDoc.data();
          setOperatorName(data.name || currentUser.email);
          setUserRole(data.role || 'admin');
        } else {
          setOperatorName(currentUser.email?.split('@')[0] || 'Operatore');
          setUserRole('admin');
        }
      } catch {
        setOperatorName(currentUser.email?.split('@')[0] || 'Operatore');
      }
    };
    loadOperatorInfo();
  }, [currentUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, pendingMessages]);

  useEffect(() => {
    const conversationsRef = collection(db, 'whatsapp_conversations');
    const q = query(conversationsRef, orderBy('lastMessageAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const conversationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setConversations(conversationsData);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsubscribe();
  }, []);

  // Check for expiring conversations and send notifications
  useEffect(() => {
    if (!notificationsEnabled || conversations.length === 0) return;

    const checkExpiring = () => {
      conversations.forEach(conv => {
        if (!conv.needsReply || !conv.lastIncomingAt) return;

        const lastIncoming = conv.lastIncomingAt.toDate ? conv.lastIncomingAt.toDate() : new Date(conv.lastIncomingAt.seconds ? conv.lastIncomingAt.seconds * 1000 : conv.lastIncomingAt);
        const now = new Date();
        const hoursSinceLastMessage = (now - lastIncoming) / (1000 * 60 * 60);

        // If 22+ hours and not already notified
        if (hoursSinceLastMessage >= 22 && !notifiedExpiring.current.has(conv.id)) {
          notifiedExpiring.current.add(conv.id);

          // Send browser notification
          if (Notification.permission === 'granted') {
            new Notification('Risposta urgente richiesta!', {
              body: `${conv.name || conv.phone} - Meno di 2 ore per rispondere`,
              icon: '/images/icon-192.png',
              tag: `expiring-${conv.id}`,
              requireInteraction: true
            });
          }
        }

        // If conversation no longer needs reply, remove from notified set
        if (!conv.needsReply && notifiedExpiring.current.has(conv.id)) {
          notifiedExpiring.current.delete(conv.id);
        }
      });
    };

    // Check immediately and then every minute
    checkExpiring();
    const interval = setInterval(checkExpiring, 60000);
    return () => clearInterval(interval);
  }, [conversations, notificationsEnabled]);

  useEffect(() => {
    if (!selectedConversation) return;
    const messagesRef = collection(db, 'whatsapp_messages');
    const q = query(messagesRef, where('conversationId', '==', selectedConversation.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      messagesData.sort((a, b) => {
        const timeA = a.timestamp?.seconds || a.timestamp?._seconds || 0;
        const timeB = b.timestamp?.seconds || b.timestamp?._seconds || 0;
        return timeA - timeB;
      });
      setMessages(messagesData);
      setPendingMessages(prev => prev.filter(pm =>
        !messagesData.some(m => m.content === pm.content && m.direction === 'outgoing')
      ));
      if (selectedConversation.unreadCount > 0) {
        updateDoc(doc(db, 'whatsapp_conversations', selectedConversation.id), { unreadCount: 0 });
      }
    });
    return () => unsubscribe();
  }, [selectedConversation]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;
    const messageText = newMessage.trim();
    setNewMessage('');
    const pendingMsg = {
      id: 'pending-' + Date.now(),
      conversationId: selectedConversation.id,
      content: messageText,
      direction: 'outgoing',
      status: 'sending',
      operatorName: operatorName,
      timestamp: { seconds: Date.now() / 1000 }
    };
    setPendingMessages(prev => [...prev, pendingMsg]);
    setSending(true);
    try {
      const response = await fetch('https://us-central1-culturaimmersiva-it.cloudfunctions.net/sendWhatsAppMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            phone: selectedConversation.phone,
            message: messageText,
            conversationId: selectedConversation.id,
            operatorId: currentUser?.uid,
            operatorName: operatorName
          }
        })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Errore invio');
    } catch (error) {
      setPendingMessages(prev => prev.map(pm =>
        pm.id === pendingMsg.id ? { ...pm, status: 'failed' } : pm
      ));
      alert('Errore: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  // Mark conversation as handled (no reply needed)
  const handleMarkAsDone = async () => {
    if (!selectedConversation) return;
    try {
      await updateDoc(doc(db, 'whatsapp_conversations', selectedConversation.id), {
        needsReply: false
      });
      // Go back to conversation list
      setSelectedConversation(null);
    } catch (error) {
      console.error('Error marking as done:', error);
    }
  };

  const getMessageStatus = (status) => {
    switch (status) {
      case 'sending': return <FaSync className="animate-spin text-gray-400" style={{ width: '10px', height: '10px' }} />;
      case 'sent': return <CheckIcon className="text-gray-400" />;
      case 'delivered': return <DoubleCheckIcon className="text-gray-400" />;
      case 'read': return <DoubleCheckIcon className="text-blue-500" />;
      case 'failed': return <span className="text-red-500 text-[10px]">!</span>;
      default: return <CheckIcon className="text-gray-400" />;
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds ? timestamp.seconds * 1000 : timestamp);
    const now = new Date();
    const diff = now - date;
    if (diff < 86400000) return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    if (diff < 172800000) return 'Ieri';
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
  };

  // Check if conversation is expiring (22+ hours since last incoming message = less than 2 hours left)
  const isExpiringSoon = (conv) => {
    if (!conv.needsReply || !conv.lastIncomingAt) return false;
    const lastIncoming = conv.lastIncomingAt.toDate ? conv.lastIncomingAt.toDate() : new Date(conv.lastIncomingAt.seconds ? conv.lastIncomingAt.seconds * 1000 : conv.lastIncomingAt);
    const now = new Date();
    const hoursSinceLastMessage = (now - lastIncoming) / (1000 * 60 * 60);
    return hoursSinceLastMessage >= 22; // 22+ hours = less than 2 hours left
  };

  const filteredConversations = conversations.filter(conv => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (!conv.name?.toLowerCase().includes(search) && !conv.phone?.includes(search)) return false;
    }
    if (filter === 'unread' && !conv.unreadCount) return false;
    if (filter === 'today') {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const msgDate = conv.lastMessageAt?.toDate ? conv.lastMessageAt.toDate() : new Date(conv.lastMessageAt);
      if (msgDate < today) return false;
    }
    return true;
  }).sort((a, b) => {
    const aNeeds = a.needsReply ?? false;
    const bNeeds = b.needsReply ?? false;
    if (aNeeds && !bNeeds) return -1;
    if (!aNeeds && bNeeds) return 1;
    if (aNeeds && bNeeds) {
      const aTime = a.lastIncomingAt?.seconds || a.lastIncomingAt?._seconds || 0;
      const bTime = b.lastIncomingAt?.seconds || b.lastIncomingAt?._seconds || 0;
      return aTime - bTime;
    }
    const aTime = a.lastMessageAt?.seconds || a.lastMessageAt?._seconds || 0;
    const bTime = b.lastMessageAt?.seconds || b.lastMessageAt?._seconds || 0;
    return bTime - aTime;
  });

  const allMessages = [...messages, ...pendingMessages.filter(pm => pm.conversationId === selectedConversation?.id)];

  // Mobile: show list or chat
  // Tablet/Desktop: show both side by side
  const showList = !selectedConversation;
  const showChat = !!selectedConversation;

  return (
    <div className="fixed inset-0 flex flex-col">
      {/* Header - Always visible, extends into status bar */}
      <header className="bg-[#075e54] text-white flex items-center justify-between px-2 flex-shrink-0" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)', paddingBottom: '8px' }}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Back button */}
          <button
            onClick={() => selectedConversation ? setSelectedConversation(null) : navigate('/admin/dashboard')}
            className="p-2.5 -ml-1 hover:bg-white/10 rounded-full active:bg-white/20"
          >
            <FaArrowLeft size={18} />
          </button>

          {/* Desktop: Logo and title */}
          <div className="hidden sm:flex items-center gap-2">
            <FaWhatsapp size={24} />
            <span className="font-semibold text-lg">WhatsApp</span>
          </div>

          {/* Mobile: Show contact info when in chat */}
          {selectedConversation && (
            <div className="sm:hidden flex items-center gap-2 flex-1 min-w-0">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                selectedConversation.needsReply ? 'bg-orange-400' : 'bg-white/20'
              }`}>
                <FaUser className="text-white" size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {selectedConversation.name || selectedConversation.phone}
                </p>
                {selectedConversation.needsReply && (
                  <p className="text-[10px] text-orange-200">In attesa di risposta</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Mark as done button in header */}
          {selectedConversation?.needsReply && (
            <button
              onClick={handleMarkAsDone}
              className="p-2.5 hover:bg-white/10 rounded-full active:bg-white/20 text-green-300"
              title="Segna come gestito"
            >
              <FaCheck size={18} />
            </button>
          )}

          {/* Notification button - hide when enabled */}
          {!notificationsEnabled && (
            <button
              onClick={handleEnableNotifications}
              disabled={notificationLoading}
              className="p-2.5 rounded-full hover:bg-white/10"
              title="Attiva notifiche"
            >
              {notificationLoading ? <FaSync className="animate-spin" size={18} /> : <FaBellSlash size={18} />}
            </button>
          )}

          {/* City dashboards button - for supervisor and admin */}
          {(userRole === 'supervisor' || userRole === 'admin') && (
            <button
              onClick={() => navigate('/admin/city-selector')}
              className="p-2.5 rounded-full hover:bg-white/10"
              title="Dashboard prenotazioni"
            >
              <FaCity size={18} />
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1.5 text-xs bg-white/10 px-2.5 py-1.5 rounded-full ml-1">
            <FaUserCog size={12} />
            <span>{operatorName}</span>
          </div>
        </div>
      </header>

      {/* Main Content - Full height */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List */}
        <div className={`
          ${showList ? 'flex' : 'hidden'}
          md:flex
          w-full md:w-80 lg:w-96
          bg-white border-r border-gray-200
          flex-col flex-shrink-0
        `}>
          {/* Search & Filters */}
          <div className="p-2 border-b border-gray-100 flex-shrink-0">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cerca conversazione..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-green-500 focus:bg-white"
              />
            </div>
            <div className="flex gap-1.5 mt-2">
              {['all', 'unread', 'today'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    filter === f ? 'bg-[#075e54] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f === 'all' ? 'Tutte' : f === 'unread' ? 'Non lette' : 'Oggi'}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations List - Scrollable - full screen */}
          <div className="flex-1 overflow-y-auto overscroll-contain bg-white">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <FaSync className="animate-spin text-gray-400 text-xl" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                <FaWhatsapp className="text-3xl mb-2" />
                <p className="text-sm">Nessuna conversazione</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`flex items-center gap-3 px-3 py-3 border-b border-gray-50 cursor-pointer active:bg-gray-100 transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-green-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isExpiringSoon(conv) ? 'bg-red-100' : conv.needsReply ? 'bg-orange-100' : 'bg-gray-100'
                  }`}>
                    <FaUser className={isExpiringSoon(conv) ? 'text-red-500' : conv.needsReply ? 'text-orange-500' : 'text-gray-400'} size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-medium text-[15px] text-gray-900 truncate">{conv.name || conv.phone}</span>
                      <span className={`text-xs flex-shrink-0 ml-2 ${isExpiringSoon(conv) ? 'text-red-500 font-semibold' : conv.needsReply ? 'text-orange-500 font-semibold' : 'text-gray-400'}`}>
                        {formatTime(conv.needsReply ? conv.lastIncomingAt : conv.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500 truncate pr-2">{conv.lastMessage || 'Nessun messaggio'}</p>
                      {conv.unreadCount > 0 ? (
                        <span className="w-5 h-5 bg-green-500 text-white text-xs font-medium rounded-full flex items-center justify-center flex-shrink-0">
                          {conv.unreadCount}
                        </span>
                      ) : conv.needsReply && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${isExpiringSoon(conv) ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                          {isExpiringSoon(conv) ? 'urgente' : 'attesa'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat View */}
        <div className={`
          ${showChat ? 'flex' : 'hidden'}
          md:flex
          flex-1 flex-col
          bg-[#efeae2]
          min-w-0
        `}
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d4cfc4\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }}>
          {selectedConversation ? (
            <>
              {/* Chat Header - Desktop/Tablet only (mobile shows in main header) */}
              <div className="hidden md:flex bg-[#f0f2f5] border-b border-gray-200 h-14 items-center gap-3 px-4 flex-shrink-0">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <FaUser className="text-gray-500" size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-base text-gray-900 truncate">{selectedConversation.name || selectedConversation.phone}</p>
                  <p className="text-xs text-gray-500 truncate">{selectedConversation.phone}</p>
                </div>
              </div>

              {/* Messages - Scrollable */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-2 md:px-4 md:py-3">
                <div className="max-w-3xl mx-auto space-y-1">
                  {allMessages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] md:max-w-[70%] rounded-lg px-3 py-1.5 shadow-sm ${
                        msg.direction === 'outgoing' ? 'bg-[#d9fdd3]' : 'bg-white'
                      }`}>
                        {msg.direction === 'outgoing' && msg.operatorName && (
                          <p className="text-xs text-green-700 font-medium mb-0.5">{msg.operatorName}</p>
                        )}
                        {/* Media content */}
                        {msg.mediaUrl && (
                          <div className="mb-1.5">
                            <MediaDisplay
                              mediaType={msg.mediaType}
                              mediaUrl={msg.mediaUrl}
                              mediaMimeType={msg.mediaMimeType}
                              caption={msg.mediaCaption}
                              onExpand={(url) => setLightboxUrl(url)}
                            />
                          </div>
                        )}
                        {/* Text content - hide if it's just a media placeholder */}
                        {msg.content && !['[Immagine]', '[Video]', '[Audio]', '[Documento]', '[Sticker]', '[Media]'].includes(msg.content) && (
                          <p className="text-[15px] text-gray-900 whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                        )}
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          <span className="text-[11px] text-gray-500">{formatTime(msg.timestamp)}</span>
                          {msg.direction === 'outgoing' && getMessageStatus(msg.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Message Input */}
              <div className="flex-shrink-0 bg-[#f0f2f5] px-3 py-2">
                <div className="max-w-3xl mx-auto flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                    placeholder="Scrivi un messaggio..."
                    className="flex-1 min-w-0 px-4 py-2.5 text-[16px] bg-white border-0 rounded-full focus:ring-2 focus:ring-green-500 focus:outline-none"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="w-11 h-11 bg-[#00a884] text-white rounded-full flex items-center justify-center hover:bg-[#008f72] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    <FaPaperPlane size={16} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            // Empty state - Desktop/Tablet only
            <div className="hidden md:flex flex-1 items-center justify-center bg-[#f8f9fa]">
              <div className="text-center text-gray-500">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center">
                  <FaWhatsapp className="text-4xl text-gray-400" />
                </div>
                <h3 className="text-xl font-light mb-2">WhatsApp Dashboard</h3>
                <p className="text-sm">Seleziona una conversazione per iniziare</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Lightbox */}
      <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    </div>
  );
};

export default WhatsApp;
