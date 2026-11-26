import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  AlertCircle,
} from 'lucide-react';

export function AdminPortal({
  clients,
  audits,
  activeAudit,
  configStatus,
  onTriggerAudit,
  onCreateClient,
  onUpdateClient,
  onDeleteClient,
  onTriggerCron,
  onSelectAuditForClientView,
  onSelectActiveAudit,
}) {
  const [showAddClient, setShowAddClient] = useState(false);
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [auditSchedule, setAuditSchedule] = useState('weekly');
  const [keywordsInput, setKeywordsInput] = useState('');
  const [formError, setFormError] = useState(null);
  const [savingClient, setSavingClient] = useState(false);
  const [cronBusy, setCronBusy] = useState(false);
  const [cronNotice, setCronNotice] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClients = clients.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.domain.toLowerCase().includes(q);
  });

  const handleAddClient = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSavingClient(true);
    try {
      const targetKeywords = keywordsInput
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);
      await onCreateClient({
        name,
        domain,
        contactEmail,
        whatsappNumber,
        auditSchedule,
        targetKeywords,
      });
      setName('');
      setDomain('');
      setContactEmail('');
      setWhatsappNumber('');
      setKeywordsInput('');
      setShowAddClient(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to add client');
    } finally {
      setSavingClient(false);
    }
  };

  const handleCronTrigger = async (schedule) => {
    setCronBusy(true);
    setCronNotice(null);
    try {
      await onTriggerCron(schedule);
      setCronNotice(`Scheduled sweep enqueued (${schedule || 'all active scheduled'} clients).`);
    } catch (err) {
      setCronNotice(err instanceof Error ? err.message : 'Cron trigger failed');
    } finally {
      setCronBusy(false);
    }
  };

  const completedAudits = audits.filter((a) => a.status === 'COMPLETED');
  const avgScore =
    completedAudits.length > 0
      ? Math.round(
          completedAudits.reduce((sum, a) => sum + (a.overallScore || 0), 0) / completedAudits.length
        )
      : null;
  const runningCount = audits.filter((a) => a.status === 'RUNNING' || a.status === 'QUEUED').length;

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Managed Websites</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {clients.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {clients.filter((c) => c.active).length} active · {clients.filter((c) => c.auditSchedule !== 'manual').length} scheduled
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Active Queue Jobs</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {runningCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Queue: {configStatus?.queueMode || 'in-process-queue'}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Completed Audits</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {completedAudits.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Average health: <span className="font-mono tabular-nums">{avgScore !== null ? `${avgScore}/100` : '—'}</span>
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">MERN Stack Integrations</p>
          <p className="mt-2 font-mono text-sm font-semibold text-slate-900">
            DB: {configStatus?.dbMode === 'mongodb' ? 'MongoDB (Mongoose)' : 'JSON Fallback'}
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            {configStatus?.useMocks ? 'Mock Providers' : 'Live APIs'} · Claude: {configStatus?.claudeConfigured ? 'Key Set' : 'Fallback'}
          </p>
        </div>
      </section>

      {activeAudit && (
        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Live Audit Pipeline</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{activeAudit.id}</span>
                <span aria-hidden="true">·</span>
                <span>{activeAudit.queueMode}</span>
              </div>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                {activeAudit.clientName} — {activeAudit.url}
              </h2>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs font-medium text-slate-500">Status</p>
                <p
                  className={`mt-0.5 font-mono text-sm font-semibold ${
                    activeAudit.status === 'COMPLETED'
                      ? 'text-emerald-700'
                      : activeAudit.status === 'FAILED'
                        ? 'text-red-700'
                        : 'text-amber-700'
                  }`}
                >
                  {activeAudit.status} ({activeAudit.progress}%)
                </p>
              </div>
              {activeAudit.status === 'COMPLETED' && (
                <button
                  type="button"
                  onClick={() => onSelectAuditForClientView(activeAudit.id)}
                  className="rounded-md bg-blue-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
                >
                  Open Client Dashboard
                </button>
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full transition-all duration-300 ${
                  activeAudit.status === 'FAILED'
                    ? 'bg-red-600'
                    : activeAudit.status === 'COMPLETED'
                      ? 'bg-emerald-600'
                      : 'bg-blue-700'
                }`}
                style={{ width: `${activeAudit.progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-600">{activeAudit.currentStep}</p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {activeAudit.steps.map((step) => (
              <div
                key={step.key}
                className={`rounded-md border p-3 ${
                  step.status === 'completed'
                    ? 'border-emerald-200 bg-emerald-50/40'
                    : step.status === 'running'
                      ? 'border-blue-300 bg-blue-50/50'
                      : step.status === 'failed'
                        ? 'border-red-200 bg-red-50/40'
                        : 'border-slate-200 bg-slate-50/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-medium text-slate-500 tabular-nums">
                    Step {step.step}
                  </span>
                  <span
                    className={`text-[11px] font-medium ${
                      step.status === 'completed'
                        ? 'text-emerald-700'
                        : step.status === 'running'
                          ? 'text-blue-700'
                          : step.status === 'failed'
                            ? 'text-red-700'
                            : 'text-slate-400'
                    }`}
                  >
                    {step.status === 'completed' ? 'Done' : step.status === 'running' ? 'Running' : step.status === 'failed' ? 'Failed' : 'Pending'}
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium text-slate-900">{step.label}</p>
                {step.detail && (
                  <p className="mt-1 line-clamp-2 text-[11px] text-slate-600">{step.detail}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Client Properties & Websites</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Manage domains, audit cadence, target keywords, and launch manual audits.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter clients or domains..."
              className="w-56 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowAddClient((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              {showAddClient ? 'Close Form' : 'Add Client'}
            </button>
          </div>
        </div>

        {showAddClient && (
          <form onSubmit={handleAddClient} className="border-b border-slate-200 bg-slate-50/60 p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">Client Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Acme Enterprise"
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Website URL</label>
                <input
                  type="text"
                  required
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="https://example.com"
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Audit Schedule</label>
                <select
                  value={auditSchedule}
                  onChange={(e) => setAuditSchedule(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                >
                  <option value="daily">Daily Cron</option>
                  <option value="weekly">Weekly Cron</option>
                  <option value="manual">Manual Only</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Contact Email</label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="seo@example.com"
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">WhatsApp Number</label>
                <input
                  type="text"
                  required
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="+1-555-0199"
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Target Keywords (comma-separated)</label>
                <input
                  type="text"
                  value={keywordsInput}
                  onChange={(e) => setKeywordsInput(e.target.value)}
                  placeholder="b2b saas analytics, cloud workflow"
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                />
              </div>
            </div>

            {formError && <p className="mt-3 text-xs font-medium text-red-700">{formError}</p>}

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddClient(false)}
                className="rounded-md border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingClient}
                className="rounded-md bg-blue-700 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {savingClient ? 'Saving Client...' : 'Save Client'}
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                <th className="px-6 py-3">Client / Website</th>
                <th className="px-4 py-3">Cadence</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Last Score</th>
                <th className="px-4 py-3">Last Audit</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">
                    No matching clients found. Add a client property above to start auditing.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const latestClientAudit = audits.find(
                    (a) => a.clientId === client.id && a.status === 'COMPLETED'
                  );
                  const activeClientJob = audits.find(
                    (a) => a.clientId === client.id && (a.status === 'QUEUED' || a.status === 'RUNNING')
                  );

                  return (
                    <tr key={client.id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-3">
                        <div className="font-medium text-slate-900">{client.name}</div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                          <span className="font-mono">{client.domain}</span>
                          <span aria-hidden="true">·</span>
                          <span>{client.contactEmail}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          aria-label={`Schedule for ${client.name}`}
                          value={client.auditSchedule}
                          onChange={(e) =>
                            void onUpdateClient(client.id, { auditSchedule: e.target.value })
                          }
                          className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 focus:border-blue-700 focus:outline-none"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="manual">Manual</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => void onUpdateClient(client.id, { active: !client.active })}
                          className={`text-xs font-medium ${
                            client.active ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        >
                          {client.active ? 'Active' : 'Paused'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">
                        {client.lastScore !== null ? (
                          <span
                            className={
                              client.lastScore >= 80
                                ? 'text-emerald-700'
                                : client.lastScore >= 60
                                  ? 'text-amber-700'
                                  : 'text-red-700'
                            }
                          >
                            {client.lastScore}/100
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 tabular-nums">
                        {client.lastAuditAt ? new Date(client.lastAuditAt).toLocaleString() : 'Never'}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          {activeClientJob ? (
                            <button
                              type="button"
                              onClick={() => onSelectActiveAudit(activeClientJob.id)}
                              className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 whitespace-nowrap"
                            >
                              <Clock className="h-3 w-3" />
                              {activeClientJob.progress}%
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void onTriggerAudit({ clientId: client.id })}
                              className="inline-flex items-center gap-1 rounded bg-blue-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap"
                            >
                              <Play className="h-3 w-3" />
                              Run Audit
                            </button>
                          )}

                          {latestClientAudit && (
                            <button
                              type="button"
                              onClick={() => onSelectAuditForClientView(latestClientAudit.id)}
                              className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                            >
                              Report
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => void onDeleteClient(client.id)}
                            aria-label={`Delete ${client.name}`}
                            className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Scheduled Cron Automation</h2>
            <p className="mt-1 text-xs text-slate-600">
              External schedulers invoke <span className="font-mono text-slate-800">GET /api/cron/audits</span> with <span className="font-mono text-slate-800">Authorization: Bearer $CRON_SECRET</span>. Trigger a manual cron sweep below for verification.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={cronBusy}
              onClick={() => void handleCronTrigger('daily')}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Trigger Daily Cron
            </button>
            <button
              type="button"
              disabled={cronBusy}
              onClick={() => void handleCronTrigger('weekly')}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Trigger Weekly Cron
            </button>
            <button
              type="button"
              disabled={cronBusy}
              onClick={() => void handleCronTrigger(undefined)}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
            >
              Run All Scheduled
            </button>
          </div>

          {cronNotice && <p className="mt-3 text-xs font-medium text-blue-700">{cronNotice}</p>}

          <div className="mt-5 space-y-1.5 border-t border-slate-200 pt-4 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span>CRON_SECRET configured</span>
              <span className="font-mono font-medium text-slate-900">
                {configStatus?.cronProtected ? 'Yes' : 'Not Set (503 on external cron)'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>USE_MOCKS flag</span>
              <span className="font-mono font-medium text-slate-900">
                {configStatus?.useMocks ? 'true' : 'false'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Queue backend</span>
              <span className="font-mono font-medium text-slate-900">
                {configStatus?.queueMode || 'in-process-queue'}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900">Recent Pipeline Jobs</h2>
          <p className="mt-1 text-xs text-slate-500">
            Click any job to inspect its 10-step execution trace or open the client report.
          </p>

          <div className="mt-4 divide-y divide-slate-200">
            {audits.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                No audit jobs yet. Click <span className="font-medium text-slate-700">Run SEO Audit</span> or add a client to get started.
              </div>
            ) : (
              audits.slice(0, 5).map((job) => (
                <div key={job.id} className="flex items-center justify-between gap-4 py-2.5">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => onSelectActiveAudit(job.id)}
                      className="truncate text-left text-sm font-medium text-slate-900 hover:text-blue-700"
                    >
                      {job.clientName}
                    </button>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono">{job.trigger}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate font-mono">{job.url}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {job.status === 'COMPLETED' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span className="font-mono tabular-nums">{job.overallScore}/100</span>
                      </span>
                    ) : job.status === 'FAILED' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Failed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-medium text-amber-700 tabular-nums">
                        <Clock className="h-3.5 w-3.5" />
                        {job.status} {job.progress}%
                      </span>
                    )}

                    {job.status === 'COMPLETED' && (
                      <button
                        type="button"
                        onClick={() => onSelectAuditForClientView(job.id)}
                        className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
                      >
                        View
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
