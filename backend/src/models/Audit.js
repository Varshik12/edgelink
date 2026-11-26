import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    clientId: { type: String, required: true, index: true },
    clientName: { type: String, required: true },
    url: { type: String, required: true },
    trigger: { type: String, enum: ['manual', 'cron'], default: 'manual' },
    queueMode: { type: String, default: 'in-process-queue' },
    status: {
      type: String,
      enum: ['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED'],
      default: 'QUEUED',
      index: true,
    },
    progress: { type: Number, default: 0 },
    currentStep: { type: String, default: '' },
    steps: { type: [mongoose.Schema.Types.Mixed], default: [] },
    overallScore: { type: Number, default: null },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
    technicalSignals: { type: mongoose.Schema.Types.Mixed, default: null },
    reportPath: { type: String, default: null },
    reportUrl: { type: String, default: null },
    error: { type: String, default: null },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
    completedAt: { type: String, default: null },
  },
  { versionKey: false }
);

export const AuditModel = mongoose.models.Audit || mongoose.model('Audit', auditSchema);
