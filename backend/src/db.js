import fs from 'fs';
import path from 'path';
import { connectMongo, isMongoConnected } from './config/mongo.js';
import { AuditModel } from './models/Audit.js';
import { ClientModel } from './models/Client.js';
import { NotificationModel } from './models/Notification.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'edgelink-seo.db.json');
const REPORTS_DIR = path.join(DATA_DIR, 'reports');

function ensureStorageDirs() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
}

function createInitialSeed() {
  return {
    clients: [],
    audits: [],
    notifications: [],
  };
}

class MernDatabase {
  constructor() {
    ensureStorageDirs();
    if (fs.existsSync(DB_FILE)) {
      try {
        this.state = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      } catch {
        this.state = createInitialSeed();
        this.saveJson();
      }
    } else {
      this.state = createInitialSeed();
      this.saveJson();
    }
  }

  async init() {
    ensureStorageDirs();
    await connectMongo();
  }

  getMode() {
    return isMongoConnected() ? 'mongodb' : 'json-fallback';
  }

  saveJson() {
    ensureStorageDirs();
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(this.state, null, 2), 'utf8');
    fs.renameSync(tempFile, DB_FILE);
  }

  getReportsDir() {
    ensureStorageDirs();
    return REPORTS_DIR;
  }

  async listClients() {
    if (isMongoConnected()) {
      return ClientModel.find({}, { _id: 0 }).sort({ createdAt: -1 }).lean();
    }
    return [...this.state.clients].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getClient(id) {
    const safeId = String(id || '');
    if (isMongoConnected()) {
      return ClientModel.findOne({ id: safeId }, { _id: 0 }).lean();
    }
    return this.state.clients.find((c) => c.id === safeId) || null;
  }

  async createClient(input) {
    const client = {
      ...input,
      id: `cli_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      lastAuditAt: null,
      lastScore: null,
    };
    if (isMongoConnected()) {
      await ClientModel.create(client);
      return client;
    }
    this.state.clients.unshift(client);
    this.saveJson();
    return client;
  }

  async updateClient(id, patch) {
    const safeId = String(id || '');
    if (isMongoConnected()) {
      return ClientModel.findOneAndUpdate(
        { id: safeId },
        { $set: patch },
        { new: true, projection: { _id: 0 } }
      ).lean();
    }
    const idx = this.state.clients.findIndex((c) => c.id === safeId);
    if (idx === -1) return null;
    this.state.clients[idx] = { ...this.state.clients[idx], ...patch };
    this.saveJson();
    return this.state.clients[idx];
  }

  async deleteClient(id) {
    const safeId = String(id || '');
    if (isMongoConnected()) {
      const res = await ClientModel.deleteOne({ id: safeId });
      return res.deletedCount > 0;
    }
    const prevLen = this.state.clients.length;
    this.state.clients = this.state.clients.filter((c) => c.id !== safeId);
    if (this.state.clients.length !== prevLen) {
      this.saveJson();
      return true;
    }
    return false;
  }

  async listAudits(filters = {}) {
    if (isMongoConnected()) {
      const query = {};
      if (filters.clientId) query.clientId = String(filters.clientId);
      if (filters.status) query.status = String(filters.status);
      return AuditModel.find(query, { _id: 0 }).sort({ createdAt: -1 }).lean();
    }
    return this.state.audits
      .filter((a) => {
        if (filters.clientId && a.clientId !== filters.clientId) return false;
        if (filters.status && a.status !== filters.status) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getAudit(id) {
    const safeId = String(id || '');
    if (isMongoConnected()) {
      return AuditModel.findOne({ id: safeId }, { _id: 0 }).lean();
    }
    return this.state.audits.find((a) => a.id === safeId) || null;
  }

  async createAudit(record) {
    if (isMongoConnected()) {
      await AuditModel.create(record);
      return record;
    }
    this.state.audits.unshift(record);
    this.saveJson();
    return record;
  }

  async updateAudit(id, patch) {
    const safeId = String(id || '');
    const nextPatch = { ...patch, updatedAt: new Date().toISOString() };
    if (isMongoConnected()) {
      return AuditModel.findOneAndUpdate(
        { id: safeId },
        { $set: nextPatch },
        { new: true, projection: { _id: 0 } }
      ).lean();
    }
    const idx = this.state.audits.findIndex((a) => a.id === safeId);
    if (idx === -1) return null;
    this.state.audits[idx] = { ...this.state.audits[idx], ...nextPatch };
    this.saveJson();
    return this.state.audits[idx];
  }

  async listNotifications(limit = 50) {
    if (isMongoConnected()) {
      return NotificationModel.find({}, { _id: 0 }).sort({ sentAt: -1 }).limit(limit).lean();
    }
    return [...this.state.notifications]
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
      .slice(0, limit);
  }

  async createNotification(notification) {
    const entry = {
      ...notification,
      id: `notif_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    };
    if (isMongoConnected()) {
      await NotificationModel.create(entry);
      return entry;
    }
    this.state.notifications.unshift(entry);
    this.saveJson();
    return entry;
  }
}

export const db = new MernDatabase();
