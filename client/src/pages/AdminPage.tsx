import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { UploadDropzone } from '../components/Admin/UploadDropzone';
import { DocumentTable } from '../components/Admin/DocumentTable';
import { api } from '../services/api';
import type { DocumentRecord } from '../types';
import { Shield, LogOut, FileText, BookOpen, Layers, Cpu, RefreshCw } from 'lucide-react';

export const AdminPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/admin/documents');
      if (res.data.success) {
        setDocuments(res.data.documents);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDeleteDocument = async (id: string) => {
    try {
      await api.delete(`/admin/documents/${id}`);
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const handleUploadSuccess = () => {
    fetchDocuments();
  };

  const totalPages = documents.reduce((sum, doc) => sum + (doc.total_pages || 0), 0);
  const totalChunks = documents.reduce((sum, doc) => sum + (doc.total_chunks || 0), 0);

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
            <p className="text-xs text-purple-300 mt-1">Page-Aware Document Ingestion & Chunking Management</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={fetchDocuments}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
            title="Refresh documents list"
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
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        {/* Header Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Total Documents</p>
              <p className="text-2xl font-black text-white">{documents.length}</p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex items-center space-x-4">
            <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Total Pages Parsed</p>
              <p className="text-2xl font-black text-white">{totalPages}</p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex items-center space-x-4">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Text Chunks Stored</p>
              <p className="text-2xl font-black text-white">{totalChunks}</p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex items-center space-x-4">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Chunk Strategy</p>
              <p className="text-sm font-bold text-amber-300">1000ch / 200ov</p>
              <p className="text-[10px] text-slate-500">Page-Aware Preserved</p>
            </div>
          </div>
        </div>

        {/* PDF Ingestion Dropzone Component */}
        <UploadDropzone onUploadSuccess={handleUploadSuccess} />

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
