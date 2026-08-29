import React, { useState } from 'react';
import { api } from '../../services/api';

export interface TestCaseResult {
  id: string;
  category: 'in_scope' | 'out_of_scope' | 'prompt_injection';
  query: string;
  expected_document?: string;
  actual_document?: string;
  expected_page?: number;
  actual_page?: number;
  retrieval_success: boolean;
  grounded: boolean;
  fallback: boolean;
  passed: boolean;
  latency_ms: number;
}

export interface EvaluationSummary {
  timestamp: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  overall_score_percentage: number;
  recall_at_4_percentage: number;
  grounded_accuracy_percentage: number;
  citation_accuracy_percentage: number;
  fallback_accuracy_percentage: number;
  prompt_injection_defense_passed: boolean;
  avg_latency_ms: number;
  test_results: TestCaseResult[];
}

export const RagEvaluation: React.FC = () => {
  const [summary, setSummary] = useState<EvaluationSummary | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunEvaluation = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const response = await api.post<{ success: boolean; summary: EvaluationSummary }>(
        '/admin/evaluation/run'
      );
      setSummary(response.data.summary);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to run RAG evaluation benchmark.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span>🧪</span> RAG Benchmark & Hallucination Evaluation Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Evaluates accuracy, Recall@4, source provenance, hard threshold boundaries, and prompt injection defense.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunEvaluation}
          disabled={isRunning}
          className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
        >
          {isRunning ? (
            <>
              <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Running Benchmark...
            </>
          ) : (
            'Run RAG Benchmark'
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs sm:text-sm">
          ⚠️ {error}
        </div>
      )}

      {summary ? (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl text-center">
              <span className="text-xs font-semibold text-slate-400 uppercase">Overall Benchmark Score</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-1">
                {summary.overall_score_percentage}%
              </div>
              <span className="text-[10px] text-slate-400">{summary.passed_tests}/{summary.total_tests} Passed</span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl text-center">
              <span className="text-xs font-semibold text-slate-400 uppercase">Retrieval Recall@4</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-blue-400 mt-1">
                {summary.recall_at_4_percentage}%
              </div>
              <span className="text-[10px] text-slate-400">Target: ≥95%</span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl text-center">
              <span className="text-xs font-semibold text-slate-400 uppercase">Citation Accuracy</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-indigo-400 mt-1">
                {summary.citation_accuracy_percentage}%
              </div>
              <span className="text-[10px] text-slate-400">Target: 100%</span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl text-center">
              <span className="text-xs font-semibold text-slate-400 uppercase">Fallback Accuracy</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-teal-400 mt-1">
                {summary.fallback_accuracy_percentage}%
              </div>
              <span className="text-[10px] text-slate-400">Hard Cutoff 0.65</span>
            </div>
          </div>

          {/* Test Case Table */}
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs sm:text-sm text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Category</th>
                  <th className="p-3">Query</th>
                  <th className="p-3">Expected vs Actual Doc</th>
                  <th className="p-3 text-center">Page</th>
                  <th className="p-3 text-center">Latency</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {summary.test_results.map((res) => (
                  <tr key={res.id} className="hover:bg-slate-800/40">
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          res.category === 'in_scope'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                        }`}
                      >
                        {res.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-200 max-w-[220px] truncate" title={res.query}>
                      {res.query}
                    </td>
                    <td className="p-3 text-slate-400">
                      {res.category === 'in_scope' ? (
                        <span>
                          <strong className="text-slate-300">{res.actual_document}</strong>
                        </span>
                      ) : (
                        <span className="italic text-slate-400">No doc required (Fallback)</span>
                      )}
                    </td>
                    <td className="p-3 text-center font-mono text-emerald-400">
                      {res.actual_page ? `P.${res.actual_page}` : '—'}
                    </td>
                    <td className="p-3 text-center font-mono text-slate-400">{res.latency_ms}ms</td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          res.passed
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {res.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-slate-400 text-xs sm:text-sm">
          Click <strong className="text-slate-200">"Run RAG Benchmark"</strong> to execute the full evaluation suite against your college knowledge base.
        </div>
      )}
    </div>
  );
};
