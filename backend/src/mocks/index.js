import { getMockPageSpeedData } from './pagespeed.mock.js';
import { getMockGscData } from './gsc.mock.js';
import { getMockDataForSeoData } from './dataforseo.mock.js';
import { sendMockWhatsApp, sendMockEmail } from './twilio.mock.js';

export function isMocksEnabled() {
  return process.env.USE_MOCKS === 'true';
}

export async function fetchPageSpeedInsights(targetUrl, strategy = 'mobile') {
  if (isMocksEnabled() || !process.env.PAGESPEED_API_KEY) {
    return getMockPageSpeedData(targetUrl, strategy);
  }

  const endpoint = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  endpoint.searchParams.set('url', targetUrl);
  endpoint.searchParams.set('strategy', strategy);
  endpoint.searchParams.set('category', 'performance');
  endpoint.searchParams.append('category', 'seo');
  endpoint.searchParams.append('category', 'accessibility');
  endpoint.searchParams.append('category', 'best-practices');
  endpoint.searchParams.set('key', process.env.PAGESPEED_API_KEY);

  const response = await fetch(endpoint.toString(), { signal: AbortSignal.timeout(15000) });
  if (!response.ok) {
    throw new Error(`PageSpeed API error (${response.status})`);
  }
  const json = await response.json();
  const cats = json.lighthouseResult?.categories || {};
  const audits = json.lighthouseResult?.audits || {};

  const lcpMs = Math.round(audits['largest-contentful-paint']?.numericValue || 2400);
  const inpMs = Math.round(audits['interaction-to-next-paint']?.numericValue || 180);
  const clsVal = Number((audits['cumulative-layout-shift']?.numericValue || 0.05).toFixed(2));
  const fcpMs = Math.round(audits['first-contentful-paint']?.numericValue || 1400);
  const ttfbMs = Math.round(audits['server-response-time']?.numericValue || 400);

  return {
    source: 'live',
    strategy,
    requestedUrl: targetUrl,
    fetchedAt: new Date().toISOString(),
    scores: {
      performance: Math.round((cats.performance?.score || 0) * 100),
      seo: Math.round((cats.seo?.score || 0) * 100),
      accessibility: Math.round((cats.accessibility?.score || 0) * 100),
      bestPractices: Math.round((cats['best-practices']?.score || 0) * 100),
    },
    coreWebVitals: {
      lcp: { valueMs: lcpMs, displayValue: `${(lcpMs / 1000).toFixed(2)} s`, rating: lcpMs <= 2500 ? 'GOOD' : lcpMs <= 4000 ? 'NEEDS_IMPROVEMENT' : 'POOR' },
      inp: { valueMs: inpMs, displayValue: `${inpMs} ms`, rating: inpMs <= 200 ? 'GOOD' : inpMs <= 500 ? 'NEEDS_IMPROVEMENT' : 'POOR' },
      cls: { value: clsVal, displayValue: clsVal.toFixed(2), rating: clsVal <= 0.1 ? 'GOOD' : clsVal <= 0.25 ? 'NEEDS_IMPROVEMENT' : 'POOR' },
      fcp: { valueMs: fcpMs, displayValue: `${(fcpMs / 1000).toFixed(2)} s`, rating: fcpMs <= 1800 ? 'GOOD' : 'NEEDS_IMPROVEMENT' },
      ttfb: { valueMs: ttfbMs, displayValue: `${ttfbMs} ms`, rating: ttfbMs <= 800 ? 'GOOD' : 'NEEDS_IMPROVEMENT' },
    },
    opportunities: Object.values(audits)
      .filter((a) => a.details?.type === 'opportunity' && (a.score ?? 1) < 0.9)
      .slice(0, 4)
      .map((a) => ({
        id: a.id,
        title: a.title,
        estimatedSavingsMs: Math.round(a.details?.overallSavingsMs || 0),
        severity: (a.score ?? 1) < 0.5 ? 'high' : 'medium',
      })),
  };
}

export async function fetchGscAnalytics(targetUrl) {
  if (isMocksEnabled() || !process.env.GSC_ACCESS_TOKEN) {
    return getMockGscData(targetUrl);
  }

  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 10);
  const siteUrl = encodeURIComponent(targetUrl);

  const response = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${siteUrl}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GSC_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: 10,
      }),
      signal: AbortSignal.timeout(12000),
    }
  );

  if (!response.ok) {
    return getMockGscData(targetUrl);
  }

  const data = await response.json();
  const rows = data.rows || [];
  const totals = rows.reduce(
    (acc, r) => ({
      clicks: acc.clicks + (r.clicks || 0),
      impressions: acc.impressions + (r.impressions || 0),
      ctr: 0,
      averagePosition: acc.averagePosition + (r.position || 0),
    }),
    { clicks: 0, impressions: 0, ctr: 0, averagePosition: 0 }
  );

  return {
    source: 'live',
    siteUrl: targetUrl,
    period: 'last_28_days',
    fetchedAt: new Date().toISOString(),
    totals: {
      clicks: totals.clicks,
      impressions: totals.impressions,
      ctr: totals.impressions > 0 ? Number((totals.clicks / totals.impressions).toFixed(4)) : 0,
      averagePosition: rows.length > 0 ? Number((totals.averagePosition / rows.length).toFixed(1)) : 0,
    },
    topQueries: rows.map((r) => ({
      query: r.keys?.[0] || '',
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: Number((r.ctr || 0).toFixed(4)),
      position: Number((r.position || 0).toFixed(1)),
    })),
    topPages: [],
    indexCoverage: { indexedPages: 0, excludedPages: 0, crawlErrors: 0, warnings: [] },
  };
}

export async function fetchDataForSeoRankings(targetUrl, targetKeywords = []) {
  if (isMocksEnabled() || !process.env.DATAFORSEO_LOGIN || !process.env.DATAFORSEO_PASSWORD) {
    return getMockDataForSeoData(targetUrl, targetKeywords);
  }

  const domain = new URL(targetUrl).hostname.replace(/^www\./, '');
  const auth = Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64');

  const response = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{ target: domain, location_code: 2840, language_code: 'en', limit: 10 }]),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    return getMockDataForSeoData(targetUrl, targetKeywords);
  }

  const payload = await response.json();
  const items = payload.tasks?.[0]?.result?.[0]?.items || [];

  return {
    source: 'live',
    target: domain,
    locationCode: 2840,
    languageCode: 'en',
    fetchedAt: new Date().toISOString(),
    summary: {
      totalRankedKeywords: payload.tasks?.[0]?.result?.[0]?.total_count || items.length,
      top3Count: items.filter((i) => i.ranked_serp_element?.serp_item?.rank_group <= 3).length,
      top10Count: items.filter((i) => i.ranked_serp_element?.serp_item?.rank_group <= 10).length,
      estimatedMonthlyTraffic: Math.round(payload.tasks?.[0]?.result?.[0]?.metrics?.organic?.etv || 0),
      trafficValueUsd: Math.round(payload.tasks?.[0]?.result?.[0]?.metrics?.organic?.estimated_paid_traffic_cost || 0),
    },
    rankedKeywords: items.map((item) => ({
      keyword: item.keyword_data?.keyword || '',
      searchVolume: item.keyword_data?.keyword_info?.search_volume || 0,
      cpc: item.keyword_data?.keyword_info?.cpc || 0,
      keywordDifficulty: item.keyword_data?.keyword_properties?.keyword_difficulty || 0,
      position: item.ranked_serp_element?.serp_item?.rank_group || 0,
      previousPosition: item.ranked_serp_element?.serp_item?.rank_group || 0,
      delta: 0,
      rankingUrl: item.ranked_serp_element?.serp_item?.url || targetUrl,
      serpFeatures: [],
    })),
    competitors: [],
  };
}

export async function dispatchAuditNotifications({
  whatsappTo,
  emailTo,
  clientName,
  domain,
  overallScore,
  auditId,
  reportUrl,
  executiveSummary,
}) {
  const whatsappResult = sendMockWhatsApp({
    to: whatsappTo,
    clientName,
    domain,
    overallScore,
    auditId,
    reportUrl,
  });

  const emailResult = sendMockEmail({
    to: emailTo,
    clientName,
    domain,
    overallScore,
    auditId,
    executiveSummary,
  });

  return { whatsappResult, emailResult };
}
