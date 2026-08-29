import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import type { DocumentRecord } from '../../types';

interface UploadDropzoneProps {
  onUploadSuccess: (doc: DocumentRecord) => void;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({ onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    setErrorMsg('');
    setSuccessMsg('');

    if (selectedFile.type !== 'application/pdf' && !selectedFile.name.endsWith('.pdf')) {
      setErrorMsg('Only PDF documents (.pdf) are supported.');
      setFile(null);
      return;
    }

    if (selectedFile.size > 15 * 1024 * 1024) {
      setErrorMsg('File size exceeds the 15MB limit.');
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setUploadStatus('idle');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || isSubmitting) return;

    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);
    setUploadStatus('uploading');

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadStatus('processing');
      const response = await api.post('/admin/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        setUploadStatus('success');
        setSuccessMsg(`Document "${response.data.document.title}" ingested successfully (${response.data.document.total_pages} pages, ${response.data.total_chunks} chunks).`);
        onUploadSuccess(response.data.document);
        setFile(null);
      } else {
        setUploadStatus('error');
        setErrorMsg(response.data.message || 'Ingestion failed.');
      }
    } catch (err: any) {
      setUploadStatus('error');
      setErrorMsg(err.response?.data?.message || 'Failed to upload and ingest document.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-xl">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-9 h-9 bg-purple-600/20 text-purple-400 rounded-xl flex items-center justify-center">
          <UploadCloud className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white leading-none">Upload College Document</h3>
          <p className="text-xs text-slate-400 mt-1">Accepts PDF files up to 15MB for page-aware extraction & chunking</p>
        </div>
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
          isDragOver
            ? 'border-purple-500 bg-purple-500/10'
            : file
            ? 'border-indigo-500/50 bg-indigo-500/5'
            : 'border-slate-800 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-900/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          className="hidden"
        />

        {file ? (
          <div className="flex flex-col items-center space-y-2">
            <FileText className="w-12 h-12 text-indigo-400 animate-bounce" />
            <p className="text-sm font-semibold text-white">{file.name}</p>
            <p className="text-xs text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <UploadCloud className="w-12 h-12 text-slate-500 mb-1" />
            <p className="text-sm font-medium text-slate-300">
              Drag & drop official PDF here, or <span className="text-purple-400 font-semibold underline">browse</span>
            </p>
            <p className="text-xs text-slate-500">Supports Academic Regulations, Exam Rules, Prospectus, Fee Handbooks</p>
          </div>
        )}
      </div>

      {/* Status Indicators & Upload Button */}
      {errorMsg && (
        <div className="mt-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center space-x-2 text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mt-4 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center space-x-2 text-emerald-400 text-xs">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {file && (
        <div className="mt-5 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={() => setFile(null)}
            disabled={isSubmitting}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleUpload}
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-600/20 flex items-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{uploadStatus === 'processing' ? 'Parsing & Chunking PDF...' : 'Uploading...'}</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                <span>Process & Ingest Document</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
