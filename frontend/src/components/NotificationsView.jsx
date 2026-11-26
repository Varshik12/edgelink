import React from 'react';
import { Mail, MessageSquare } from 'lucide-react';

export function NotificationsView({ notifications }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-base font-semibold text-slate-900">Notification Dispatch Log</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Automated WhatsApp (Twilio mock) and Email notifications triggered at Step 10 of the audit pipeline.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
              <th className="px-6 py-3">Channel</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Recipient</th>
              <th className="px-4 py-3">SID / Subject</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-6 py-3">Sent At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {notifications.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">
                  No notifications dispatched yet.
                </td>
              </tr>
            ) : (
              notifications.map((n) => (
                <tr key={n.id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-800">
                      {n.channel === 'whatsapp' ? (
                        <MessageSquare className="h-3.5 w-3.5 text-emerald-700" />
                      ) : (
                        <Mail className="h-3.5 w-3.5 text-blue-700" />
                      )}
                      {n.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{n.clientName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{n.recipient}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs font-medium text-slate-800">{n.subjectOrSid}</div>
                    <div className="mt-0.5 max-w-md truncate text-xs text-slate-500">{n.preview}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-emerald-700">{n.status}</td>
                  <td className="px-6 py-3 font-mono text-xs text-slate-500 tabular-nums">
                    {new Date(n.sentAt).toLocaleString()}
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
