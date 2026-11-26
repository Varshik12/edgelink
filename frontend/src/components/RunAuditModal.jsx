import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export function RunAuditModal({ open, clients, onClose, onSubmit }) {
  const [mode, setMode] = useState(clients.length > 0 ? 'client' : 'custom');
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');
  const [customUrl, setCustomUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (clients.length > 0) {
      setMode('client');
      setSelectedClientId((prev) =>
        clients.some((c) => c.id === prev) ? prev : clients[0].id
      );
    } else {
      setMode('custom');
      setSelectedClientId('');
    }
  }, [open, clients]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'client') {
        if (!selectedClientId) {
          throw new Error('Select a client from the list.');
        }
        await onSubmit({ clientId: selectedClientId });
      } else {
        if (!customUrl.trim()) {
          throw new Error('Enter a valid public website URL.');
        }
        await onSubmit({ url: customUrl.trim() });
      }
      setCustomUrl('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enqueue audit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="run-audit-title"
    >
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <h2 id="run-audit-title" className="text-lg font-semibold text-slate-900">
            Enqueue SEO Audit Job
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div className="flex items-center gap-1 rounded-md bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setMode('client')}
              className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                mode === 'client' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Existing Client
            </button>
            <button
              type="button"
              onClick={() => setMode('custom')}
              className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                mode === 'custom' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Custom Website URL
            </button>
          </div>

          {mode === 'client' ? (
            <div>
              <label htmlFor="modal-client-select" className="block text-sm font-medium text-slate-700">
                Client Property
              </label>
              <select
                id="modal-client-select"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.domain})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label htmlFor="modal-url-input" className="block text-sm font-medium text-slate-700">
                Target Website URL
              </label>
              <input
                id="modal-url-input"
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://example.com"
                className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none"
              />
              <p className="mt-1.5 text-xs text-slate-500">
                Runs the 10-step pipeline: Cheerio crawl, PageSpeed, GSC, Schema, On-Page, Robots/Sitemap, DataForSEO, Claude synthesis, PDF, and alerts.
              </p>
            </div>
          )}

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {submitting ? 'Queueing Job...' : 'Start Audit Pipeline'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
