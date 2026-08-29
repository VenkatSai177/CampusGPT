import React, { useState } from 'react';
import type { KeyboardEvent } from 'react';

interface ChatComposerProps {
  onSendMessage: (query: string) => void;
  isLoading: boolean;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({ onSendMessage, isLoading }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || isLoading) return;
    onSendMessage(trimmed);
    setQuery('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800">
      <div className="max-w-4xl mx-auto flex items-end gap-2 bg-slate-950 border border-slate-800 rounded-2xl p-2 focus-within:border-blue-500/80 transition-all shadow-inner">
        <textarea
          rows={1}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask CampusGPT about college rules, exams, fees, or admissions..."
          disabled={isLoading}
          maxLength={1000}
          className="flex-1 bg-transparent text-slate-100 placeholder-slate-400 px-3 py-2 text-sm sm:text-base focus:outline-none resize-none max-h-32 min-h-[40px]"
        />

        <button
          type="submit"
          disabled={!query.trim() || isLoading}
          className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-400 text-white rounded-xl transition-all shadow-md shrink-0 flex items-center justify-center"
          aria-label="Send query"
        >
          {isLoading ? (
            <svg className="animate-spin w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>

      <div className="max-w-4xl mx-auto flex items-center justify-between text-[11px] text-slate-400 mt-1.5 px-2">
        <span>Press <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">Enter ↵</kbd> to send, <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">Shift + Enter</kbd> for new line</span>
        <span>{query.length}/1000</span>
      </div>
    </form>
  );
};
