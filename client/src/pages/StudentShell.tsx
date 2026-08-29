import React from 'react';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, LogOut, MessageSquare, BookOpen, Clock, AlertCircle } from 'lucide-react';

export const StudentShell: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="bg-slate-900/80 border-b border-slate-800 px-6 py-4 flex items-center justify-between backdrop-blur-xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-none">CampusGPT</h1>
            <p className="text-xs text-slate-400 mt-1">Student Knowledge Assistant</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-white">{user?.name}</p>
            <p className="text-xs text-indigo-400 capitalize">{user?.role} Portal</p>
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

      {/* Main Student Shell Placeholder Body */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-indigo-600/10 border border-indigo-500/20 rounded-3xl flex items-center justify-center text-indigo-400 mb-6 shadow-xl shadow-indigo-500/5">
          <MessageSquare className="w-10 h-10" />
        </div>

        <h2 className="text-3xl font-extrabold text-white tracking-tight mb-3">
          Welcome to CampusGPT
        </h2>

        <p className="text-slate-400 max-w-xl text-base mb-8 leading-relaxed">
          Hello, <span className="text-indigo-300 font-semibold">{user?.name}</span>! Your Phase 1 authenticated student shell foundation is established. Chat RAG features will be activated in upcoming phases.
        </p>

        {/* Phase 1 Shell Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full text-left">
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
            <div className="flex items-center space-x-2 text-indigo-400 font-semibold mb-2 text-sm">
              <BookOpen className="w-4 h-4" />
              <span>Grounded Knowledge</span>
            </div>
            <p className="text-xs text-slate-400">
              Answers derived strictly from official college handbooks and policies.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
            <div className="flex items-center space-x-2 text-purple-400 font-semibold mb-2 text-sm">
              <Clock className="w-4 h-4" />
              <span>Phase 1 Shell Active</span>
            </div>
            <p className="text-xs text-slate-400">
              JWT authentication, session persistence, and role guards are verified.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
            <div className="flex items-center space-x-2 text-emerald-400 font-semibold mb-2 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>RAG Engine Ahead</span>
            </div>
            <p className="text-xs text-slate-400">
              Document ingestion, embeddings, and similarity search are queued for Phase 2–4.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
