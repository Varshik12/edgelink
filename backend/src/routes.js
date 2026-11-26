import express from 'express';
import fs from 'fs';
import { isMocksEnabled } from './mocks/index.js';
import { db } from './db.js';
import { generateAuditPdfBuffer } from './pdfReport.js';
import { auditQueue } from './queue.js';
import {
  CreateClientSchema,
  TriggerAuditSchema,
  UpdateClientSchema,
  validateTargetUrl,
  verifyCronSecret,
} from './security.js';

export const apiRouter = express.Router();

apiRouter.get('/health', (_req, res) => {
  res.json({
    ok: true,
    dbMode: db.getMode(),
    queueMode: auditQueue.getMode(),
    useMocks: isMocksEnabled(),
    timestamp: new Date().toISOString(),
  });
});

apiRouter.get('/config/status', (_req, res) => {
  res.json({
    dbMode: db.getMode(),
    mongoConfigured: Boolean(process.env.MONGODB_URI),
    useMocks: isMocksEnabled(),
    claudeConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
    redisConfigured: Boolean(process.env.REDIS_URL),
    queueMode: auditQueue.getMode(),
    cronProtected: Boolean(process.env.CRON_SECRET),
  });
});

// Clients CRUD
apiRouter.get('/clients', async (_req, res) => {
  const clients = await db.listClients();
  res.json({ clients });
});

apiRouter.post('/clients', async (req, res) => {
  const parsed = CreateClientSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid client payload', details: parsed.error.flatten() });
    return;
  }

  try {
    const normalizedUrl = validateTargetUrl(parsed.data.domain).origin;
    const client = await db.createClient({
      name: parsed.data.name,
      domain: normalizedUrl,
      contactEmail: parsed.data.contactEmail,
      whatsappNumber: parsed.data.whatsappNumber,
      auditSchedule: parsed.data.auditSchedule,
      targetKeywords: parsed.data.targetKeywords,
      active: true,
    });
    res.status(201).json({ client });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid domain URL' });
  }
});

apiRouter.patch('/clients/:id', async (req, res) => {
  const parsed = UpdateClientSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid client update payload', details: parsed.error.flatten() });
    return;
  }

  const patch = { ...parsed.data };
  if (parsed.data.domain) {
    try {
      patch.domain = validateTargetUrl(parsed.data.domain).origin;
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid domain URL' });
      return;
    }
  }

  const updated = await db.updateClient(req.params.id, patch);
  if (!updated) {
    res.status(404).json({ error: 'Client not found' });
    return;
  }
  res.json({ client: updated });
});

apiRouter.delete('/clients/:id', async (req, res) => {
  const deleted = await db.deleteClient(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Client not found' });
    return;
  }
  res.json({ deleted: true });
});

// Audits list, trigger & polling
apiRouter.get('/audits', async (req, res) => {
  const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : undefined;
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const audits = await db.listAudits({ clientId, status });
  res.json({ audits });
});

apiRouter.post('/audit', async (req, res) => {
  const parsed = TriggerAuditSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid audit request', details: parsed.error.flatten() });
    return;
  }

  try {
    let client = parsed.data.clientId ? await db.getClient(parsed.data.clientId) : undefined;
    const targetUrl = parsed.data.url || client?.domain;

    if (!targetUrl) {
      res.status(400).json({ error: 'Either clientId or url must be provided.' });
      return;
    }

    const validated = validateTargetUrl(targetUrl);

    if (!client) {
      const allClients = await db.listClients();
      const existingByOrigin = allClients.find((c) => {
        try {
          return new URL(c.domain).origin === validated.origin;
        } catch {
          return false;
        }
      });

      if (existingByOrigin) {
        client = existingByOrigin;
      } else {
        client = await db.createClient({
          name: validated.hostname.replace(/^www\./, ''),
          domain: validated.origin,
          contactEmail: `seo@${validated.hostname.replace(/^www\./, '')}`,
          whatsappNumber: '+1-555-0199',
          auditSchedule: 'manual',
          targetKeywords: [],
          active: true,
        });
      }
    }

    const audit = await auditQueue.enqueueAudit({
      clientId: client.id,
      clientName: client.name,
      url: validated.toString(),
      trigger: parsed.data.trigger || 'manual',
    });

    res.status(202).json({
      auditId: audit.id,
      status: audit.status,
      queueMode: audit.queueMode,
      clientId: client.id,
    });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Unable to enqueue audit' });
  }
});

apiRouter.get('/audit/:id', async (req, res) => {
  const audit = await db.getAudit(req.params.id);
  if (!audit) {
    res.status(404).json({ error: 'Audit job not found' });
    return;
  }

  res.json({
    id: audit.id,
    clientId: audit.clientId,
    clientName: audit.clientName,
    url: audit.url,
    trigger: audit.trigger,
    queueMode: audit.queueMode,
    status: audit.status,
    progress: audit.progress,
    currentStep: audit.currentStep,
    steps: audit.steps,
    overallScore: audit.overallScore,
    result: audit.result,
    technicalSignals: audit.technicalSignals,
    reportUrl: audit.reportUrl,
    error: audit.error,
    createdAt: audit.createdAt,
    updatedAt: audit.updatedAt,
    completedAt: audit.completedAt,
  });
});

apiRouter.get('/audit/:id/report.pdf', async (req, res) => {
  const audit = await db.getAudit(req.params.id);
  if (!audit) {
    res.status(404).json({ error: 'Audit not found' });
    return;
  }

  try {
    if (audit.reportPath && fs.existsSync(audit.reportPath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="seo-audit-${audit.id}.pdf"`);
      fs.createReadStream(audit.reportPath).pipe(res);
      return;
    }

    const buffer = await generateAuditPdfBuffer(audit);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="seo-audit-${audit.id}.pdf"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to generate PDF report' });
  }
});

apiRouter.get('/notifications', async (_req, res) => {
  const notifications = await db.listNotifications();
  res.json({ notifications });
});

async function executeScheduledCronSweep(scheduleFilter) {
  const allClients = await db.listClients();
  const clients = allClients.filter((c) => {
    if (!c.active) return false;
    if (c.auditSchedule === 'manual') return false;
    if (scheduleFilter && c.auditSchedule !== scheduleFilter) return false;
    return true;
  });

  const enqueued = [];
  for (const client of clients) {
    const job = await auditQueue.enqueueAudit({
      clientId: client.id,
      clientName: client.name,
      url: client.domain,
      trigger: 'cron',
    });
    enqueued.push({ auditId: job.id, clientId: client.id, clientName: client.name, url: job.url });
  }

  return enqueued;
}

apiRouter.get('/cron/audits', async (req, res) => {
  const expectedSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
  const headerToken = typeof req.headers['x-cron-secret'] === 'string' ? req.headers['x-cron-secret'].trim() : undefined;
  const provided = bearerToken || headerToken;

  if (!expectedSecret) {
    res.status(503).json({
      error: 'CRON_SECRET is not configured on the server. Set CRON_SECRET in environment variables.',
    });
    return;
  }

  if (!verifyCronSecret(provided, expectedSecret)) {
    res.status(401).json({ error: 'Unauthorized cron invocation.' });
    return;
  }

  const scheduleParam = req.query.schedule === 'daily' || req.query.schedule === 'weekly' ? req.query.schedule : undefined;
  const enqueued = await executeScheduledCronSweep(scheduleParam);
  res.json({
    ok: true,
    triggeredCount: enqueued.length,
    jobs: enqueued,
    executedAt: new Date().toISOString(),
  });
});

apiRouter.post('/admin/trigger-cron', async (req, res) => {
  const scheduleParam =
    req.body?.schedule === 'daily' || req.body?.schedule === 'weekly' ? req.body.schedule : undefined;
  const enqueued = await executeScheduledCronSweep(scheduleParam);
  res.status(202).json({
    ok: true,
    triggeredCount: enqueued.length,
    jobs: enqueued,
    executedAt: new Date().toISOString(),
  });
});
