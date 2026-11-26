import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    auditId: { type: String, required: true, index: true },
    clientId: { type: String, required: true },
    clientName: { type: String, required: true },
    channel: { type: String, enum: ['whatsapp', 'email'], required: true },
    recipient: { type: String, required: true },
    status: { type: String, required: true },
    subjectOrSid: { type: String, required: true },
    preview: { type: String, default: '' },
    sentAt: { type: String, required: true },
  },
  { versionKey: false }
);

export const NotificationModel =
  mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
