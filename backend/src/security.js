import crypto from 'crypto';
import net from 'net';
import { z } from 'zod';

const PRIVATE_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /\.local$/i,
  /\.internal$/i,
  /^metadata\.google\.internal$/i,
];

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const norm = ip.toLowerCase();
    if (norm === '::1' || norm === '::' || norm.startsWith('fc') || norm.startsWith('fd') || norm.startsWith('fe80')) {
      return true;
    }
  }
  return false;
}

export function validateTargetUrl(rawInput) {
  const trimmed = String(rawInput || '').trim();
  const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error('Invalid website URL format.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only HTTP and HTTPS protocols are permitted.');
  }

  if (parsed.username || parsed.password) {
    throw new Error('URLs containing embedded credentials are not permitted.');
  }

  const host = parsed.hostname.toLowerCase();
  if (!host || PRIVATE_HOSTNAME_PATTERNS.some((pattern) => pattern.test(host))) {
    throw new Error('Private, loopback, or internal hostnames cannot be audited.');
  }

  if (net.isIP(host) && isPrivateIp(host)) {
    throw new Error('Private or link-local IP addresses cannot be audited.');
  }

  return parsed;
}

export function verifyCronSecret(providedSecret, expectedSecret) {
  if (!expectedSecret || !providedSecret) {
    return false;
  }
  const a = Buffer.from(providedSecret, 'utf8');
  const b = Buffer.from(expectedSecret, 'utf8');
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

export const CreateClientSchema = z.object({
  name: z.string().trim().min(2).max(120),
  domain: z.string().trim().min(3).max(255),
  contactEmail: z.string().trim().email().max(160),
  whatsappNumber: z.string().trim().min(7).max(32),
  auditSchedule: z.enum(['daily', 'weekly', 'manual']).default('weekly'),
  targetKeywords: z.array(z.string().trim().min(1).max(80)).max(20).optional().default([]),
});

export const UpdateClientSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  domain: z.string().trim().min(3).max(255).optional(),
  contactEmail: z.string().trim().email().max(160).optional(),
  whatsappNumber: z.string().trim().min(7).max(32).optional(),
  auditSchedule: z.enum(['daily', 'weekly', 'manual']).optional(),
  targetKeywords: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  active: z.boolean().optional(),
});

export const TriggerAuditSchema = z.object({
  clientId: z.string().trim().min(1).max(100).optional(),
  url: z.string().trim().min(3).max(500).optional(),
  trigger: z.enum(['manual', 'cron']).optional().default('manual'),
});

export const MasterAuditJsonSchema = z.object({
  overall_score: z.number().min(0).max(100),
  score_breakdown: z.object({
    technical: z.number().min(0).max(100),
    on_page: z.number().min(0).max(100),
    content: z.number().min(0).max(100),
    core_web_vitals: z.number().min(0).max(100),
    schema: z.number().min(0).max(100),
  }),
  executive_summary: z.string().min(20),
  critical_issues: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      category: z.enum(['technical', 'on_page', 'content', 'core_web_vitals', 'schema']),
      severity: z.literal('critical'),
      evidence: z.string(),
      affected_urls: z.array(z.string()),
      impact_summary: z.string(),
    })
  ),
  important_issues: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      category: z.enum(['technical', 'on_page', 'content', 'core_web_vitals', 'schema']),
      severity: z.literal('important'),
      evidence: z.string(),
      affected_urls: z.array(z.string()),
      impact_summary: z.string(),
    })
  ),
  quick_wins: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      category: z.enum(['technical', 'on_page', 'content', 'core_web_vitals', 'schema']),
      severity: z.literal('quick_win'),
      evidence: z.string(),
      affected_urls: z.array(z.string()),
      impact_summary: z.string(),
    })
  ),
  recommendations: z.array(
    z.object({
      id: z.string(),
      priority: z.number().int().min(1),
      title: z.string(),
      category: z.enum(['technical', 'on_page', 'content', 'core_web_vitals', 'schema']),
      finding: z.string(),
      fix: z.string(),
      estimated_impact: z.string(),
      effort: z.string(),
      falsifiability_check: z.string(),
    })
  ),
});
