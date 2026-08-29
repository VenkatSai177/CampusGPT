import React, { useState } from 'react';
import type { Message } from '../../services/chat.service';
import { chatService } from '../../services/chat.service';
import { SourceBadge } from './SourceBadge';

interface MessageBubbleProps {
  message: Message;
  isLast?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.sender === 'user';
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(message.feedback);
  const [isUpdatingFeedback, setIsUpdatingFeedback] = useState(false);

  const handleFeedback = async (newFeedback: 'like' | 'dislike') => {
    if (isUpdatingFeedback) return;
    const targetFeedback = feedback === newFeedback ? null : newFeedback;
    setIsUpdatingFeedback(true);
    try {
      await chatService.updateFeedback(message.id, targetFeedback);
      setFeedback(targetFeedback);
    } catch (err) {
      console.error('Failed to update feedback:', err);
    } finally {
      setIsUpdatingFeedback(false);
    }
  };

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} my-3 px-2 sm:px-4`}>
      <div
        className={`flex gap-3 max-w-[90%] md:max-w-[80%] lg:max-w-[75%] ${
          isUser ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {/* Avatar Icon */}
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold shadow-md ${
            isUser
              ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white'
              : 'bg-gradient-to-tr from-emerald-600 to-teal-700 text-white'
          }`}
        >
          {isUser ? 'You' : 'AI'}
        </div>

        {/* Bubble Content */}
        <div
          className={`flex flex-col gap-2 rounded-2xl p-4 shadow-lg text-sm sm:text-base leading-relaxed ${
            isUser
              ? 'bg-blue-600 text-white rounded-tr-none'
              : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-none'
          }`}
        >
          {/* Formatted Text Content */}
          <div className="whitespace-pre-wrap font-sans">{message.text}</div>

          {/* Sources Section for Assistant Messages */}
          {!isUser && message.sources && message.sources.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Official Cited Sources:
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                {message.sources.map((src, idx) => (
                  <SourceBadge key={`${src.document_title}-${src.page_number}-${idx}`} source={src} />
                ))}
              </div>
            </div>
          )}

          {/* Feedback Buttons for Assistant Messages */}
          {!isUser && (
            <div className="mt-2 pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/40">
              <span className="text-slate-500 text-xs">CampusGPT RAG Assistant</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleFeedback('like')}
                  disabled={isUpdatingFeedback}
                  aria-label="Thumbs up - Accurate answer"
                  className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                    feedback === 'like'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <svg className="w-4 h-4" fill={feedback === 'like' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleFeedback('dislike')}
                  disabled={isUpdatingFeedback}
                  aria-label="Thumbs down - Inaccurate answer"
                  className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                    feedback === 'dislike'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <svg className="w-4 h-4" fill={feedback === 'dislike' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
