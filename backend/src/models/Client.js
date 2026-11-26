import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    domain: { type: String, required: true, trim: true },
    contactEmail: { type: String, required: true, trim: true },
    whatsappNumber: { type: String, required: true, trim: true },
    auditSchedule: {
      type: String,
      enum: ['daily', 'weekly', 'manual'],
      default: 'weekly',
    },
    targetKeywords: { type: [String], default: [] },
    active: { type: Boolean, default: true },
    createdAt: { type: String, required: true },
    lastAuditAt: { type: String, default: null },
    lastScore: { type: Number, default: null },
  },
  { versionKey: false }
);

export const ClientModel = mongoose.models.Client || mongoose.model('Client', clientSchema);
