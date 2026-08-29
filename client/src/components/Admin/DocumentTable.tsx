import React, { useState } from 'react';
import { FileText, Trash2, CheckCircle2, RefreshCw, AlertCircle, Clock } from 'lucide-react';
import type { DocumentRecord } from '../../types';

interface DocumentTableProps {
  documents: DocumentRecord[];
  onDeleteDocument: (id: string) => Promise<void>;
  isLoading: boolean;
}

export const DocumentTable: React.FC<DocumentTableProps> = ({
  documents,
  onDeleteDocument,
  isLoading,
}) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      setIsDeleting(true);
      await onDeleteDocument(deleteId);
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const getStatusBadge = (status: DocumentRecord['status'], errorMsg?: string | null) => {
    switch (status) {
      case 'indexed':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Indexed</span>
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Processing</span>
          </span>
        );
      case 'failed':
        return (
          <span
            title={errorMsg || 'Ingestion failed'}
            className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 border border-rose-500/30 text-rose-400 cursor-help"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending</span>
          </span>
        );
    }
  };

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-xl mt-6">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-base font-bold text-white leading-none">Ingested Knowledge Base Documents</h3>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg">
          Total: {documents.length}
        </span>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-2" />
          <p className="text-xs font-medium">Loading documents...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="p-12 text-center text-slate-500">
          <FileText className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-400">No official documents ingested yet.</p>
          <p className="text-xs text-slate-600 mt-1">Upload a PDF above to process and generate page-aware text chunks.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-6">Document Title</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Pages</th>
                <th className="py-3.5 px-4 text-center">Chunks</th>
                <th className="py-3.5 px-4">File Size</th>
                <th className="py-3.5 px-4">Upload Date</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm leading-tight">{doc.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{doc.filename}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-4 whitespace-nowrap">
                    {getStatusBadge(doc.status, doc.error_message)}
                  </td>

                  <td className="py-4 px-4 text-center font-mono text-xs text-slate-300">
                    {doc.total_pages || 0}
                  </td>

                  <td className="py-4 px-4 text-center font-mono text-xs text-purple-300 font-semibold">
                    {doc.total_chunks || 0}
                  </td>

                  <td className="py-4 px-4 text-xs text-slate-400 whitespace-nowrap">
                    {(doc.file_size / (1024 * 1024)).toFixed(2)} MB
                  </td>

                  <td className="py-4 px-4 text-xs text-slate-400 whitespace-nowrap">
                    {new Date(doc.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>

                  <td className="py-4 px-6 text-right whitespace-nowrap">
                    <button
                      onClick={() => setDeleteId(doc.id)}
                      className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Delete document and chunks"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h4 className="text-lg font-bold text-white mb-2">Delete Document?</h4>
            <p className="text-xs text-slate-400 mb-6">
              This action will permanently delete the document record and all associated page-aware text chunks. This cannot be undone.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setDeleteId(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-600/20 flex items-center space-x-1.5 transition-all"
              >
                {isDeleting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
