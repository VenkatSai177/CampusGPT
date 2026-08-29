import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, LogOut, FileText, Database, CheckCircle2 } from 'lucide-react';

export const AdminShell: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Admin Top Header */}
      <header className="bg-purple-950/40 border-b border-purple-900/30 px-6 py-4 flex items-center justify-between backdrop-blur-xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-purple-500/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-none">CampusGPT Admin</h1>
            <p className="text-xs text-purple-300 mt-1">Management Portal Shell</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
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

      {/* Main Admin Body Placeholder */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-purple-600/10 border border-purple-500/20 rounded-3xl flex items-center justify-center text-purple-400 mb-6 shadow-xl shadow-purple-500/5">
          <Shield className="w-10 h-10" />
        </div>

        <h2 className="text-3xl font-extrabold text-white tracking-tight mb-3">
          CampusGPT Admin Portal Shell
        </h2>

        <p className="text-slate-400 max-w-xl text-base mb-8 leading-relaxed">
          Welcome Administrator <span className="text-purple-300 font-semibold">{user?.name}</span>. Your elevated role authorization middleware (`requireAdmin`) has been verified for Phase 1.
        </p>

        {/* Phase 1 Admin Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full text-left">
          <div className="bg-slate-900/60 border border-purple-900/20 p-5 rounded-2xl">
            <div className="flex items-center space-x-2 text-purple-400 font-semibold mb-2 text-sm">
              <FileText className="w-4 h-4" />
              <span>Document Management</span>
            </div>
            <p className="text-xs text-slate-400">
              PDF ingestion pipeline, text cleaning, and chunking queued for Phase 2.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-purple-900/20 p-5 rounded-2xl">
            <div className="flex items-center space-x-2 text-indigo-400 font-semibold mb-2 text-sm">
              <Database className="w-4 h-4" />
              <span>Vector Database</span>
            </div>
            <p className="text-xs text-slate-400">
              Supabase pgvector HNSW index structure configured for Phase 3.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-purple-900/20 p-5 rounded-2xl">
            <div className="flex items-center space-x-2 text-emerald-400 font-semibold mb-2 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Auth Guards Active</span>
            </div>
            <p className="text-xs text-slate-400">
              Role claims verified. Non-admin users are strictly blocked from accessing `/admin`.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
