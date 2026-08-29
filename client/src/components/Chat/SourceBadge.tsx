import React from 'react';
import type { SourceCitation } from '../../services/chat.service';

interface SourceBadgeProps {
  source: SourceCitation;
}

export const SourceBadge: React.FC<SourceBadgeProps> = ({ source }) => {
  const displayTitle =
    source.filename.length > 28 ? `${source.filename.substring(0, 25)}...` : source.filename;

  return (
    <div
      title={`${source.document_title} (${source.filename}) - Page ${source.page_number}`}
      className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-xs font-medium text-blue-300 transition-colors shadow-sm cursor-help"
    >
      <svg
        className="w-3.5 h-3.5 text-blue-400 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <span className="truncate max-w-[180px]">{displayTitle}</span>
      <span className="text-slate-400 font-semibold">•</span>
      <span className="text-emerald-400 font-semibold">Page {source.page_number}</span>
    </div>
  );
};
