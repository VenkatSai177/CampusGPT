import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { HistorySidebar } from '../components/Chat/HistorySidebar';
import { MessageBubble } from '../components/Chat/MessageBubble';
import { ChatComposer } from '../components/Chat/ChatComposer';
import type { Conversation, Message } from '../services/chat.service';
import { chatService } from '../services/chat.service';

const SUGGESTED_QUESTIONS = [
  'What is the minimum attendance percentage required for semester exams?',
  'What is the examination re-evaluation fee per course paper?',
  'When is the final deadline for paying semester tuition fees?',
  'What are the minimum eligibility criteria for B.Tech admission?',
];

export const ChatPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load conversation list on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const list = await chatService.getConversations();
      setConversations(list);
    } catch (err: any) {
      console.error('Failed to load conversations:', err);
    }
  };

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    const loadHistory = async () => {
      setIsFetchingHistory(true);
      setErrorMsg(null);
      try {
        const { messages: history } = await chatService.getConversationById(activeConversationId);
        setMessages(history);
      } catch (err: any) {
        setErrorMsg('Failed to load conversation history.');
      } finally {
        setIsFetchingHistory(false);
      }
    };

    loadHistory();
  }, [activeConversationId]);

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setErrorMsg(null);
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await chatService.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        handleNewChat();
      }
    } catch (err: any) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleSendMessage = async (queryText: string) => {
    setIsLoading(true);
    setErrorMsg(null);

    // Optimistically append user message to UI
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: activeConversationId || '',
      sender: 'user',
      text: queryText,
      sources: [],
      feedback: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await chatService.sendQuery(queryText, activeConversationId || undefined);

      // If new conversation was created on backend
      if (!activeConversationId && response.conversation_id) {
        setActiveConversationId(response.conversation_id);
        await loadConversations();
      }

      // Append assistant RAG response
      const assistantMsg: Message = {
        id: response.assistant_message_id || `temp-ast-${Date.now()}`,
        conversation_id: response.conversation_id,
        sender: 'assistant',
        text: response.answer,
        sources: response.sources || [],
        feedback: null,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to generate answer. Please try again.';
      setErrorMsg(msg);
      // Remove temp user message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* History Sidebar */}
      <HistorySidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-slate-950">
        {/* Header */}
        <header className="h-16 bg-slate-900 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              aria-label="Open chat history sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Brand Title */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
                C
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-100 text-sm sm:text-base leading-tight">
                  CampusGPT
                </span>
                <span className="text-[11px] text-emerald-400 font-medium">
                  Official RAG College Assistant
                </span>
              </div>
            </div>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3">
            {user?.role === 'admin' && (
              <a
                href="/admin"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 rounded-lg text-xs font-semibold text-indigo-300 transition-colors"
              >
                Admin Panel
              </a>
            )}

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-xs text-slate-400 font-medium">
                {user?.name}
              </span>
              <button
                type="button"
                onClick={logout}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Message Container / History */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Error Banner */}
          {errorMsg && (
            <div className="max-w-4xl mx-auto p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs sm:text-sm flex items-center justify-between">
              <span>⚠️ {errorMsg}</span>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="text-rose-400 hover:text-rose-200"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* History Fetching Loading State */}
          {isFetchingHistory ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm gap-2">
              <svg className="animate-spin w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Loading conversation history...
            </div>
          ) : messages.length === 0 ? (
            /* Empty Welcome State */
            <div className="max-w-3xl mx-auto h-full flex flex-col items-center justify-center text-center p-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-2xl text-white shadow-xl mb-4">
                🎓
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-100 mb-2">
                Welcome to CampusGPT
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm max-w-md mb-8">
                Your AI-powered college assistant. Ask questions about academic rules, exam guidelines, fee schedules, or admissions, grounded strictly in official documents.
              </p>

              {/* Suggested Questions Grid */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {SUGGESTED_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(q)}
                    className="p-4 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 rounded-2xl text-slate-300 hover:text-white text-xs sm:text-sm transition-all shadow-sm flex flex-col justify-between group"
                  >
                    <span>{q}</span>
                    <span className="text-[11px] font-medium text-blue-400 group-hover:text-blue-300 mt-2 flex items-center gap-1">
                      Ask this query →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Active Message List */
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.map((msg, index) => (
                <MessageBubble key={msg.id || index} message={msg} />
              ))}

              {/* Assistant Generation Loading State */}
              {isLoading && (
                <div className="flex justify-start my-3 px-2 sm:px-4">
                  <div className="flex gap-3 max-w-[80%]">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0">
                      AI
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-4 text-slate-300 text-sm flex items-center gap-3 shadow-lg">
                      <svg className="animate-spin w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      CampusGPT is retrieving documents & generating grounded response...
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Composer */}
        <ChatComposer onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
};
