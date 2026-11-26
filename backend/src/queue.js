import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { createInitialSteps, runAuditPipeline } from './auditPipeline.js';
import { db } from './db.js';
import { validateTargetUrl } from './security.js';

export const SEO_AUDIT_QUEUE_NAME = 'seo-audit-jobs';

class AuditQueueManager {
  constructor() {
    this.bullQueue = null;
    this.bullWorker = null;
    this.redisConnection = null;
    this.mode = 'in-process-queue';
    this.inProcessQueue = [];
    this.isProcessingInProcess = false;
  }

  async init() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      this.mode = 'in-process-queue';
      console.log('[Queue] REDIS_URL not set; running seo-audit-jobs via in-process async queue.');
      return;
    }

    try {
      const connection = new IORedis(redisUrl, {
        maxRetriesPerRequest: null,
        lazyConnect: true,
        connectTimeout: 3000,
      });
      await connection.connect();
      this.redisConnection = connection;

      this.bullQueue = new Queue(SEO_AUDIT_QUEUE_NAME, {
        connection,
        defaultJobOptions: {
          attempts: 2,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 50,
          removeOnFail: 50,
        },
      });

      this.bullWorker = new Worker(
        SEO_AUDIT_QUEUE_NAME,
        async (job) => {
          await runAuditPipeline(job.data.auditId);
        },
        {
          connection,
          concurrency: 2,
        }
      );

      this.bullWorker.on('failed', (job, err) => {
        console.error(`[BullMQ Worker] Job ${job?.id} failed:`, err.message);
      });

      this.mode = 'bullmq-redis';
      console.log(`[Queue] Connected to Redis; BullMQ worker listening on "${SEO_AUDIT_QUEUE_NAME}".`);
    } catch (err) {
      console.warn(
        '[Queue] Redis connection failed; falling back to in-process async queue:',
        err instanceof Error ? err.message : err
      );
      if (this.redisConnection) {
        this.redisConnection.disconnect();
        this.redisConnection = null;
      }
      this.bullQueue = null;
      this.bullWorker = null;
      this.mode = 'in-process-queue';
    }
  }

  getMode() {
    return this.mode;
  }

  async enqueueAudit({ clientId, clientName, url, trigger }) {
    const validatedUrl = validateTargetUrl(url).toString();
    const auditId = `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const record = {
      id: auditId,
      clientId,
      clientName,
      url: validatedUrl,
      trigger,
      queueMode: this.mode,
      status: 'QUEUED',
      progress: 0,
      currentStep: 'Queued in seo-audit-jobs',
      steps: createInitialSteps(),
      overallScore: null,
      result: null,
      technicalSignals: null,
      reportPath: null,
      reportUrl: null,
      error: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };

    await db.createAudit(record);

    if (this.mode === 'bullmq-redis' && this.bullQueue) {
      await this.bullQueue.add('run-seo-audit', { auditId }, { jobId: auditId });
    } else {
      this.inProcessQueue.push(auditId);
      setTimeout(() => {
        void this.drainInProcessQueue();
      }, 150);
    }

    return record;
  }

  async drainInProcessQueue() {
    if (this.isProcessingInProcess) return;
    this.isProcessingInProcess = true;

    try {
      while (this.inProcessQueue.length > 0) {
        const nextAuditId = this.inProcessQueue.shift();
        if (!nextAuditId) continue;
        await runAuditPipeline(nextAuditId);
      }
    } finally {
      this.isProcessingInProcess = false;
    }
  }
}

export const auditQueue = new AuditQueueManager();
