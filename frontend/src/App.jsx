import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from './api.js';
import { AdminPortal } from './components/AdminPortal.jsx';
import { AuditQueueView } from './components/AuditQueueView.jsx';
import { ClientDashboard } from './components/ClientDashboard.jsx';
import { NotificationsView } from './components/NotificationsView.jsx';
import { RunAuditModal } from './components/RunAuditModal.jsx';

export default function App() {
  const [view, setView] = useState('admin');
  const [clients, setClients] = useState([]);
  const [audits, setAudits] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [configStatus, setConfigStatus] = useState(null);
  const [activeAuditId, setActiveAuditId] = useState(null);
  const [selectedClientAuditId, setSelectedClientAuditId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState(null);
  const [auditModalOpen, setAuditModalOpen] = useState(false);

  const loadWorkspaceData = useCallback(async () => {
    try {
      const [clientsRes, auditsRes, notifRes, configRes] = await Promise.all([
        apiFetch('/api/clients'),
        apiFetch('/api/audits'),
        apiFetch('/api/notifications'),
        apiFetch('/api/config/status'),
      ]);

      if (!clientsRes.ok || !auditsRes.ok) {
        throw new Error('Failed to load workspace data from API');
      }

      const [clientsJson, auditsJson, notifJson, configJson] = await Promise.all([
        clientsRes.json(),
        auditsRes.json(),
        notifRes.json(),
        configRes.json(),
      ]);

      const loadedAudits = auditsJson.audits || [];
      setClients(clientsJson.clients || []);
      setAudits(loadedAudits);
      setNotifications(notifJson.notifications || []);
      setConfigStatus(configJson);

      setSelectedClientAuditId((prev) => {
        if (prev && loadedAudits.some((a) => a.id === prev && a.status === 'COMPLETED')) {
          return prev;
        }
        return loadedAudits.find((a) => a.status === 'COMPLETED')?.id || null;
      });
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Unable to connect to backend API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspaceData();
  }, [loadWorkspaceData]);

  useEffect(() => {
    const runningJobs = audits.filter((a) => a.status === 'QUEUED' || a.status === 'RUNNING');
    const targetPollId =
      activeAuditId &&
      audits.some((a) => a.id === activeAuditId && (a.status === 'QUEUED' || a.status === 'RUNNING'))
        ? activeAuditId
        : runningJobs[0]?.id;

    if (!targetPollId) return;

    const timer = setInterval(async () => {
      try {
        const res = await apiFetch(`/api/audit/${targetPollId}`);
        if (!res.ok) return;
        const updated = await res.json();

        setAudits((prev) => {
          const exists = prev.some((a) => a.id === updated.id);
          if (!exists) return [updated, ...prev];
          return prev.map((a) => (a.id === updated.id ? updated : a));
        });

        if (updated.status === 'COMPLETED' || updated.status === 'FAILED') {
          await loadWorkspaceData();
          if (updated.status === 'COMPLETED') {
            setSelectedClientAuditId(updated.id);
          }
        }
      } catch {
        // transient poll error ignored
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [audits, activeAuditId, loadWorkspaceData]);

  const handleTriggerAudit = async (payload) => {
    setErrorBanner(null);
    const res = await apiFetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to enqueue audit');
    }
    setActiveAuditId(data.auditId);
    setView('admin');
    await loadWorkspaceData();
  };

  const handleCreateClient = async (payload) => {
    const res = await apiFetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create client');
    }
    await loadWorkspaceData();
  };

  const handleUpdateClient = async (id, patch) => {
    const res = await apiFetch(`/api/clients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const data = await res.json();
      setErrorBanner(data.error || 'Failed to update client');
      return;
    }
    await loadWorkspaceData();
  };

  const handleDeleteClient = async (id) => {
    const res = await apiFetch(`/api/clients/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      setErrorBanner('Failed to delete client');
      return;
    }
    await loadWorkspaceData();
  };

  const handleTriggerCron = async (schedule) => {
    const res = await apiFetch('/api/admin/trigger-cron', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedule }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Cron trigger failed');
    }
    if (data.jobs?.[0]?.auditId) {
      setActiveAuditId(data.jobs[0].auditId);
    }
    await loadWorkspaceData();
  };

  const activeAudit =
    (activeAuditId ? audits.find((a) => a.id === activeAuditId) : null) ||
    audits.find((a) => a.status === 'RUNNING' || a.status === 'QUEUED') ||
    audits[0] ||
    null;

  const navItems = [
    { id: 'admin', label: 'Admin Portal' },
    { id: 'client', label: 'Client Dashboard' },
    { id: 'queue', label: 'Audit Queue' },
    { id: 'notifications', label: 'Notifications' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-6 py-3.5">
          <a
            href="#admin"
            onClick={(e) => {
              e.preventDefault();
              setView('admin');
            }}
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Edgelink SEO
          </a>

          <nav className="flex items-center gap-6 overflow-x-auto" aria-label="Primary navigation">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={`border-b-2 py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  view === item.id
                    ? 'border-blue-700 text-slate-900'
                    : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setAuditModalOpen(true)}
              className="rounded-md bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
            >
              Run SEO Audit
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-6 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 text-balance">
              {view === 'admin'
                ? 'Admin Operations & Pipeline Console'
                : view === 'client'
                  ? 'Client SEO Intelligence Dashboard'
                  : view === 'queue'
                    ? 'BullMQ Audit Job Queue'
                    : 'Automated Dispatch Notifications'}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {view === 'admin'
                ? 'Manage client domains, monitor live 10-step SEO audits, and oversee scheduled cron runs.'
                : view === 'client'
                  ? 'Inspect category scores, prioritized recommendations, falsifiability checks, and PDF audit exports.'
                  : view === 'queue'
                    ? 'Track queued, active, completed, and failed audit jobs in seo-audit-jobs.'
                    : 'Review WhatsApp and Email reports dispatched upon audit completion.'}
            </p>
          </div>
        </div>

        {errorBanner && (
          <div className="mb-6 flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <span>{errorBanner}</span>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="text-xs font-medium underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            <div className="h-24 rounded-lg border border-slate-200 bg-white" />
            <div className="h-64 rounded-lg border border-slate-200 bg-white" />
          </div>
        ) : view === 'admin' ? (
          <AdminPortal
            clients={clients}
            audits={audits}
            activeAudit={activeAudit}
            configStatus={configStatus}
            onTriggerAudit={handleTriggerAudit}
            onCreateClient={handleCreateClient}
            onUpdateClient={handleUpdateClient}
            onDeleteClient={handleDeleteClient}
            onTriggerCron={handleTriggerCron}
            onSelectAuditForClientView={(id) => {
              setSelectedClientAuditId(id);
              setView('client');
            }}
            onSelectActiveAudit={(id) => setActiveAuditId(id)}
          />
        ) : view === 'client' ? (
          <ClientDashboard
            clients={clients}
            audits={audits}
            selectedAuditId={selectedClientAuditId}
            onSelectAudit={(id) => setSelectedClientAuditId(id)}
            onTriggerNewAudit={async (clientId) => handleTriggerAudit({ clientId })}
            onOpenRunAuditModal={() => setAuditModalOpen(true)}
          />
        ) : view === 'queue' ? (
          <AuditQueueView
            audits={audits}
            onInspectAudit={(id) => {
              setActiveAuditId(id);
              setView('admin');
            }}
            onOpenReport={(id) => {
              setSelectedClientAuditId(id);
              setView('client');
            }}
          />
        ) : (
          <NotificationsView notifications={notifications} />
        )}
      </main>

      <RunAuditModal
        open={auditModalOpen}
        clients={clients}
        onClose={() => setAuditModalOpen(false)}
        onSubmit={handleTriggerAudit}
      />
    </div>
  );
}
