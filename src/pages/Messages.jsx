import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { 
  MessageSquare, 
  Send, 
  Search, 
  Building2, 
  Clock
} from 'lucide-react';
import { 
  getCompaniesByCommercial, 
  subscribeToMessages, 
  sendMessage, 
  markAsRead, 
  getUnreadCount 
} from '../services/firestore';

const Messages = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [conversations, setConversations] = useState([]); // Holds company + lastMsg + unread
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef(null);

  // Get current user and their companies with conversations
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUser(user);
        await loadConversations(user.uid);
      }
    });

    return unsubscribe;
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load conversations (companies + last message + unread count)
  const loadConversations = async (userId) => {
    try {
      const companies = await getCompaniesByCommercial(userId);
      // Simplified: Just update the list. In a real app you'd subscribe here too.
      setConversations(companies);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  };

  // Real time active conversation
  useEffect(() => {
    if (selectedCompany && currentUser) {
      const unsub = subscribeToMessages(currentUser.uid, selectedCompany.id, (msgs) => {
        setMessages(msgs);
        
        let hasUnread = false;
        msgs.forEach(msg => {
          if (!msg.read && msg.receiverId === currentUser.uid) {
            markAsRead(msg.id);
            hasUnread = true;
          }
        });
        
        if (hasUnread) {
          loadConversations(currentUser.uid); // Refresh left menu if we read something
        }
        
        setTimeout(() => scrollToBottom(), 100);
      });
      return () => unsub();
    }
  }, [selectedCompany, currentUser]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedCompany || !currentUser) return;
    setSending(true);
    try {
      await sendMessage({
        senderId: currentUser.uid,
        receiverId: selectedCompany.id,
        text: messageText.trim(),
        senderType: 'commercial',
        receiverType: 'company',
      });
      setMessageText('');
      await loadConversation(selectedCompany.id);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(c => 
    c?.name?.toLowerCase().includes(search.toLowerCase()) || false
  );

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 rounded-[2rem] overflow-hidden shadow-2xl">
      {/* Conversations Sidebar */}
      <div className="w-full md:w-1/3 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-primary-50 to-white dark:from-primary-900/20 dark:to-slate-900">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Messages</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Discutez avec vos entreprises</p>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher une entreprise..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 ring-primary-500/10 focus:border-primary-500 outline-none font-medium transition-all"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-10 px-6 text-center">
              <Building2 size={48} className="text-slate-300 mb-4" />
              <p className="text-lg font-bold text-slate-500">Aucune entreprise</p>
              <p className="text-sm text-slate-400 mt-1">Vos entreprises apparaitront ici</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedCompany(conv)}
                className={`w-full flex items-center gap-4 p-4 border-b border-slate-100 dark:border-slate-800 transition-all hover:bg-slate-50 dark:hover:bg-slate-800 ${
                  selectedCompany?.id === conv.id ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-l-primary-600' : ''
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-100 to-primary-50 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center overflow-hidden">
                    {conv.logo ? (
                      <img src={conv.logo} alt={conv.name} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 size={24} className="text-primary-600" />
                    )}
                  </div>
                  {conv.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg">
                      {conv.unreadCount}
                    </div>
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white truncate">{conv.name}</h3>
                    {conv.lastMessage && (
                      <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                        <Clock size={12} />
                        {formatTime(conv.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-1">
                    {conv.lastMessage ? conv.lastMessage.text : 'Aucun message'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
        {!selectedCompany ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
              <MessageSquare size={48} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Sélectionnez une conversation</h3>
            <p className="text-slate-400">Choisissez une entreprise pour commencer à discuter</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 bg-white dark:bg-slate-900 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-100 to-primary-50 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center overflow-hidden">
                {selectedCompany.logo ? (
                  <img src={selectedCompany.logo} alt={selectedCompany.name} className="w-full h-full object-cover" />
                ) : (
                  <Building2 size={20} className="text-primary-600" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">{selectedCompany.name}</h3>
                <p className="text-sm text-emerald-500 font-medium flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  Connecté
                </p>
              </div>
            </div>

            {/* Messages Container */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderId === currentUser?.uid ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-5 py-3 ${
                      msg.senderId === currentUser?.uid
                        ? 'bg-primary-600 text-white rounded-br-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-bl-sm shadow-sm'
                    }`}
                  >
                    <p className="font-medium">{msg.text}</p>
                    <p className={`text-xs mt-1 ${
                      msg.senderId === currentUser?.uid ? 'text-primary-100' : 'text-slate-400'
                    } flex items-center justify-end gap-1`}
                    >
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <input
                  type="text"
                  placeholder="Écrivez votre message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  disabled={sending}
                  className="flex-1 px-5 py-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 ring-primary-500/10 focus:border-primary-500 outline-none font-medium transition-all"
                />
                <button
                  type="submit"
                  disabled={sending || !messageText.trim()}
                  className="bg-primary-600 hover:bg-primary-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-6 rounded-2xl font-black transition-all flex items-center gap-2"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Messages;
