import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { UploadDropzone } from '../components/Admin/UploadDropzone';
import { DocumentTable } from '../components/Admin/DocumentTable';
import { RagEvaluation } from '../components/Admin/RagEvaluation';
import { api } from '../services/api';
import type { DocumentRecord } from '../types';
import { Shield, LogOut, FileText, BookOpen, Layers, MessageSquare, ThumbsUp, RefreshCw } from 'lucide-react';

interface AdminStats {
  total_documents: number;
  total_pages: number;
  total_chunks: number;
  total_conversations: number;
  total_messages: number;
  total_feedback: number;
  feedback_likes: number;
  feedback_dislikes: number;
  positive_feedback_percentage: number;
}

export const AdminPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchAdminData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [docRes, statsRes] = await Promise.all([
        api.get<{ success: boolean; documents: DocumentRecord[] }>('/admin/documents'),
        api.get<{ success: boolean; stats: AdminStats }>('/admin/stats'),
      ]);

      if (docRes.data.success) setDocuments(docRes.data.documents);
      if (statsRes.data.success) setStats(statsRes.data.stats);
    } catch (err) {
      console.error('Failed to fetch admin dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const handleDeleteDocument = async (id: string) => {
    try {
      await api.delete(`/admin/documents/${id}`);
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      fetchAdminData();
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const handleUploadSuccess = () => {
    fetchAdminData();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Admin Navigation Header */}
      <header className="bg-purple-950/40 border-b border-purple-900/30 px-6 py-4 flex items-center justify-between backdrop-blur-xl sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-purple-500/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-none">CampusGPT Admin Portal</h1>
            <p className="text-xs text-purple-300 mt-1">Knowledge Ingestion, Vector Search & RAG Evaluation</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <a
            href="/chat"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 rounded-lg text-xs font-semibold text-blue-300 transition-colors"
          >
            Student Chat UI →
          </a>

          <button
            onClick={fetchAdminData}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
            title="Refresh dashboard stats"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-white">{user?.name}</p>
            <p className="text-xs text-purple-400 capitalize">Role: {user?.role}</p>
          </div>

          <button
            onClick={logout}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors border border-slate-700"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Admin Portal Container */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 space-y-8">
        {/* Header Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-purple-400 mb-2">
              <FileText className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Docs</span>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Total Documents</p>
              <p className="text-2xl font-black text-white">{stats?.total_documents || documents.length}</p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-indigo-400 mb-2">
              <BookOpen className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pages</span>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Parsed Pages</p>
              <p className="text-2xl font-black text-white">{stats?.total_pages || 0}</p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-400 mb-2">
              <Layers className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Chunks</span>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Vector Chunks</p>
              <p className="text-2xl font-black text-white">{stats?.total_chunks || 0}</p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-blue-400 mb-2">
              <MessageSquare className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Threads</span>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Conversations</p>
              <p className="text-2xl font-black text-white">{stats?.total_conversations || 0}</p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-teal-400 mb-2">
              <MessageSquare className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Messages</span>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Total Messages</p>
              <p className="text-2xl font-black text-white">{stats?.total_messages || 0}</p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-400 mb-2">
              <ThumbsUp className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Feedback</span>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Positive Feedback</p>
              <p className="text-2xl font-black text-amber-400">{stats?.positive_feedback_percentage || 100}%</p>
            </div>
          </div>
        </div>

        {/* PDF Ingestion Dropzone Component */}
        <UploadDropzone onUploadSuccess={handleUploadSuccess} />

        {/* RAG Benchmark Evaluation Component */}
        <RagEvaluation />

        {/* Documents Management Table Component */}
        <DocumentTable
          documents={documents}
          onDeleteDocument={handleDeleteDocument}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
};
