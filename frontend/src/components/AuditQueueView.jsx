import React, { useState } from 'react';
import { CheckCircle2, Clock, AlertCircle, FileText } from 'lucide-react';
import { apiUrl } from '../api.js';

export function AuditQueueView({ audits, onInspectAudit, onOpenReport }) {
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filtered = audits.filter((a) => (statusFilter === 'ALL' ? true : a.status === statusFilter));

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Audit Job Queue (`seo-audit-jobs`)</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Real-time worker state transitions across QUEUED, RUNNING, COMPLETED, and FAILED jobs.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-md bg-slate-100 p-1">
          {['ALL', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === status ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
              <th className="px-6 py-3">Job ID / Client</th>
              <th className="px-4 py-3">Trigger / Queue</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Progress</th>
              <th className="px-4 py-3 text-right">Score</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-500">
                  No jobs match the selected queue filter.
                </td>
              </tr>
            ) : (
              filtered.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-3">
                    <div className="font-medium text-slate-900">{job.clientName}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono">{job.id}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{job.url}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    <div>{job.trigger}</div>
                    <div className="font-mono text-[11px] text-slate-400">{job.queueMode}</div>
                  </td>
                  <td className="px-4 py-3">
                    {job.status === 'COMPLETED' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        COMPLETED
                      </span>
                    ) : job.status === 'FAILED' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                        <AlertCircle className="h-3.5 w-3.5" />
                        FAILED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                        <Clock className="h-3.5 w-3.5" />
                        {job.status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-32">
                      <div className="flex justify-between font-mono text-[11px] text-slate-600 tabular-nums">
                        <span>{job.progress}%</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full ${job.status === 'FAILED' ? 'bg-red-600' : job.status === 'COMPLETED' ? 'bg-emerald-600' : 'bg-blue-700'}`}
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-slate-900">
                    {job.overallScore !== null ? `${job.overallScore}/100` : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500 tabular-nums">
                    {new Date(job.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onInspectAudit(job.id)}
                        className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                      >
                        Trace
                      </button>
                      {job.status === 'COMPLETED' && (
                        <>
                          <button
                            type="button"
                            onClick={() => onOpenReport(job.id)}
                            className="rounded bg-blue-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap"
                          >
                            Dashboard
                          </button>
                          <a
                            href={apiUrl(job.reportUrl || `/api/audit/${job.id}/report.pdf`)}
                            target="_blank"
                            rel="noreferrer"
                            title="Download PDF"
                            className="rounded border border-slate-300 p-1 text-slate-600 hover:bg-slate-50"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </a>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
