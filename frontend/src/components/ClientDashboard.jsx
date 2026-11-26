import React, { useState } from 'react';
import { Download, ExternalLink, Search } from 'lucide-react';
import { apiUrl } from '../api.js';

const SCORE_AXIS_LABELS = [
  { key: 'technical', label: 'Technical Architecture' },
  { key: 'on_page', label: 'On-Page Optimization' },
  { key: 'content', label: 'Content & Intent' },
  { key: 'core_web_vitals', label: 'Core Web Vitals' },
  { key: 'schema', label: 'Schema.org Markup' },
];

export function ClientDashboard({
  clients,
  audits,
  selectedAuditId,
  onSelectAudit,
  onTriggerNewAudit,
  onOpenRunAuditModal,
}) {
  const [issueFilter, setIssueFilter] = useState('all');
  const [issueSearch, setIssueSearch] = useState('');
  const [signalTab, setSignalTab] = useState('cwv');

  const completedAudits = audits.filter((a) => a.status === 'COMPLETED' && a.result);
  const currentAudit =
    completedAudits.find((a) => a.id === selectedAuditId) || completedAudits[0] || null;

  if (!currentAudit || !currentAudit.result) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-10 text-center">
        <h2 className="text-lg font-semibold text-slate-900">No Completed SEO Audits Available</h2>
        <p className="mt-2 text-sm text-slate-600">
          Run an audit from the Admin Portal or click Run First SEO Audit below to inspect a live website report.
        </p>
        <div className="mt-5 flex items-center justify-center gap-3">
          {clients[0] ? (
            <button
              type="button"
              onClick={() => void onTriggerNewAudit(clients[0].id)}
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 whitespace-nowrap"
            >
              Run Audit for {clients[0].name}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenRunAuditModal?.()}
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 whitespace-nowrap"
            >
              Run First SEO Audit
            </button>
          )}
        </div>
      </div>
    );
  }

  const { result, technicalSignals } = currentAudit;

  const allIssues = [
    ...result.critical_issues,
    ...result.important_issues,
    ...result.quick_wins,
  ];

  const visibleIssues = allIssues.filter((issue) => {
    if (issueFilter !== 'all' && issue.severity !== issueFilter) return false;
    const q = issueSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      issue.title.toLowerCase().includes(q) ||
      issue.evidence.toLowerCase().includes(q) ||
      issue.category.toLowerCase().includes(q)
    );
  });

  const overallTier =
    result.overall_score >= 80
      ? { label: 'Healthy', color: 'text-emerald-700' }
      : result.overall_score >= 60
        ? { label: 'Needs Optimization', color: 'text-amber-700' }
        : { label: 'Critical Attention', color: 'text-red-700' };

  const pdfHref = apiUrl(currentAudit.reportUrl || `/api/audit/${currentAudit.id}/report.pdf`);

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-6 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label htmlFor="client-audit-select" className="block text-xs font-medium text-slate-500">
              Viewing Audit Report
            </label>
            <select
              id="client-audit-select"
              value={currentAudit.id}
              onChange={(e) => onSelectAudit(e.target.value)}
              className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 focus:border-blue-700 focus:outline-none"
            >
              {completedAudits.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.clientName} — {new Date(a.completedAt || a.createdAt).toLocaleDateString()} ({a.overallScore}/100)
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="font-mono text-slate-700">{currentAudit.url}</span>
              <span aria-hidden="true">·</span>
              <span>Trigger: {currentAudit.trigger}</span>
              <span aria-hidden="true">·</span>
              <span>Analyzer: {result.analysis_source}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={pdfHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            Download PDF Report
          </a>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-lg border border-slate-200 bg-white p-6 lg:col-span-5">
          <div className="flex items-baseline justify-between border-b border-slate-200 pb-4">
            <div>
              <p className="text-xs font-medium text-slate-500">Overall SEO Score</p>
              <div className="mt-1 flex items-baseline gap-2.5">
                <span className="font-mono text-4xl font-semibold text-slate-900 tabular-nums">
                  {result.overall_score}
                </span>
                <span className="font-mono text-sm text-slate-400">/ 100</span>
              </div>
            </div>
            <span className={`text-sm font-semibold ${overallTier.color}`}>{overallTier.label}</span>
          </div>

          <div className="mt-5 space-y-3.5">
            {SCORE_AXIS_LABELS.map(({ key, label }) => {
              const val = result.score_breakdown[key];
              const barColor =
                val >= 80 ? 'bg-emerald-600' : val >= 60 ? 'bg-amber-600' : 'bg-red-600';
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{label}</span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {val}/100
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full ${barColor}`} style={{ width: `${val}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-6 lg:col-span-7">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Executive Summary</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              {result.executive_summary}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-slate-200 pt-5">
            <div>
              <p className="text-xs font-medium text-slate-500">Critical Issues</p>
              <p className="mt-1 font-mono text-xl font-semibold text-red-700 tabular-nums">
                {result.critical_issues.length}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Important Issues</p>
              <p className="mt-1 font-mono text-xl font-semibold text-amber-700 tabular-nums">
                {result.important_issues.length}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Quick Wins</p>
              <p className="mt-1 font-mono text-xl font-semibold text-emerald-700 tabular-nums">
                {result.quick_wins.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-base font-semibold text-slate-900">Diagnostic Findings</h2>
            <div className="flex items-center gap-1 rounded-md bg-slate-100 p-1">
              {[
                { id: 'all', label: `All (${allIssues.length})` },
                { id: 'critical', label: `Critical (${result.critical_issues.length})` },
                { id: 'important', label: `Important (${result.important_issues.length})` },
                { id: 'quick_win', label: `Quick Wins (${result.quick_wins.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setIssueFilter(tab.id)}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    issueFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="search"
              value={issueSearch}
              onChange={(e) => setIssueSearch(e.target.value)}
              placeholder="Filter issues..."
              className="w-52 rounded-md border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {visibleIssues.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-slate-500">
              No diagnostic findings match the current filter.
            </div>
          ) : (
            visibleIssues.map((issue) => (
              <div key={issue.id} className="px-6 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-xs font-semibold ${
                        issue.severity === 'critical'
                          ? 'text-red-700'
                          : issue.severity === 'important'
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                      }`}
                    >
                      {issue.severity === 'critical'
                        ? 'Critical'
                        : issue.severity === 'important'
                          ? 'Important'
                          : 'Quick Win'}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="text-xs font-medium text-slate-500">{issue.category.replace(/_/g, ' ')}</span>
                  </div>
                  <span className="font-mono text-xs text-slate-400">
                    {issue.affected_urls.length} URL(s)
                  </span>
                </div>

                <h3 className="mt-1.5 text-sm font-semibold text-slate-900">{issue.title}</h3>
                <p className="mt-1 text-xs text-slate-600">
                  <span className="font-medium text-slate-800">Evidence:</span> {issue.evidence}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  <span className="font-medium text-slate-800">Impact:</span> {issue.impact_summary}
                </p>
                {issue.affected_urls.length > 0 && (
                  <p className="mt-1 font-mono text-[11px] text-slate-500">
                    {issue.affected_urls.join(' · ')}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Prioritized Action Roadmap</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Ranked engineering and content remediations with explicit falsifiability verification checks.
          </p>
        </div>

        <div className="divide-y divide-slate-200">
          {result.recommendations.map((rec) => (
            <div key={rec.id} className="px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono font-semibold text-blue-700">P{rec.priority}</span>
                  <span aria-hidden="true">·</span>
                  <span>{rec.category.replace(/_/g, ' ')}</span>
                  <span aria-hidden="true">·</span>
                  <span>Effort: <strong className="font-medium text-slate-800">{rec.effort}</strong></span>
                </div>
                <span className="text-xs font-medium text-slate-700">
                  Estimated Impact: {rec.estimated_impact}
                </span>
              </div>

              <h3 className="mt-1.5 text-sm font-semibold text-slate-900">{rec.title}</h3>

              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs font-medium text-slate-500">Finding</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-700">{rec.finding}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Recommended Fix</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-900">{rec.fix}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Falsifiability Check</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-700">{rec.falsifiability_check}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {technicalSignals && (
        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Collected Technical & Search Signals</h2>
            <div className="flex items-center gap-1 rounded-md bg-slate-100 p-1">
              {[
                { id: 'cwv', label: 'Core Web Vitals' },
                { id: 'gsc', label: 'Search Console' },
                { id: 'keywords', label: 'Keyword Rankings' },
                { id: 'crawl', label: 'Crawl & Schema' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSignalTab(t.id)}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    signalTab === t.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {signalTab === 'cwv' && technicalSignals.pagespeed && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                  {Object.entries(technicalSignals.pagespeed.coreWebVitals || {}).map(([metric, info]) => (
                    <div key={metric} className="rounded-md border border-slate-200 p-3.5">
                      <p className="font-mono text-xs font-medium text-slate-500 uppercase">{metric}</p>
                      <p className="mt-1 font-mono text-lg font-semibold text-slate-900 tabular-nums">
                        {info.displayValue}
                      </p>
                      <p
                        className={`mt-1 text-xs font-medium ${
                          info.rating === 'GOOD'
                            ? 'text-emerald-700'
                            : info.rating === 'NEEDS_IMPROVEMENT'
                              ? 'text-amber-700'
                              : 'text-red-700'
                        }`}
                      >
                        {info.rating}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2 pr-4 font-medium">Lighthouse Opportunity</th>
                        <th className="py-2 px-4 font-medium">Severity</th>
                        <th className="py-2 pl-4 text-right font-medium">Estimated Savings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(technicalSignals.pagespeed.opportunities || []).map((opp) => (
                        <tr key={opp.id}>
                          <td className="py-2.5 pr-4 font-medium text-slate-900">{opp.title}</td>
                          <td className="py-2.5 px-4 text-slate-600">{opp.severity}</td>
                          <td className="py-2.5 pl-4 text-right font-mono tabular-nums text-slate-800">
                            {opp.estimatedSavingsMs
                              ? `${opp.estimatedSavingsMs} ms`
                              : opp.estimatedSavingsKb
                                ? `${opp.estimatedSavingsKb} KB`
                                : `${opp.estimatedSavingsCls} CLS`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {signalTab === 'gsc' && technicalSignals.gsc && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-md border border-slate-200 p-3.5">
                    <p className="text-xs text-slate-500">28d Clicks</p>
                    <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
                      {technicalSignals.gsc.totals.clicks.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 p-3.5">
                    <p className="text-xs text-slate-500">28d Impressions</p>
                    <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
                      {technicalSignals.gsc.totals.impressions.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 p-3.5">
                    <p className="text-xs text-slate-500">Average CTR</p>
                    <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
                      {(technicalSignals.gsc.totals.ctr * 100).toFixed(2)}%
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 p-3.5">
                    <p className="text-xs text-slate-500">Average Position</p>
                    <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
                      {technicalSignals.gsc.totals.averagePosition}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2 pr-4 font-medium">Top Search Query</th>
                        <th className="py-2 px-4 text-right font-medium">Clicks</th>
                        <th className="py-2 px-4 text-right font-medium">Impressions</th>
                        <th className="py-2 px-4 text-right font-medium">CTR</th>
                        <th className="py-2 pl-4 text-right font-medium">Avg Pos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(technicalSignals.gsc.topQueries || []).map((q) => (
                        <tr key={q.query}>
                          <td className="py-2.5 pr-4 font-medium text-slate-900">{q.query}</td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums">{q.clicks.toLocaleString()}</td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums">{q.impressions.toLocaleString()}</td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums">{(q.ctr * 100).toFixed(2)}%</td>
                          <td className="py-2.5 pl-4 text-right font-mono tabular-nums">{q.position}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {signalTab === 'keywords' && technicalSignals.dataforseo && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 pr-4 font-medium">Keyword</th>
                      <th className="py-2 px-4 text-right font-medium">Volume</th>
                      <th className="py-2 px-4 text-right font-medium">CPC</th>
                      <th className="py-2 px-4 text-right font-medium">KD</th>
                      <th className="py-2 px-4 text-right font-medium">Rank</th>
                      <th className="py-2 px-4 text-right font-medium">Delta</th>
                      <th className="py-2 pl-4 font-medium">Ranking URL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(technicalSignals.dataforseo.rankedKeywords || []).map((kw) => (
                      <tr key={kw.keyword}>
                        <td className="py-2.5 pr-4 font-medium text-slate-900">{kw.keyword}</td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums">{kw.searchVolume.toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums">${kw.cpc.toFixed(2)}</td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums">{kw.keywordDifficulty}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold tabular-nums">#{kw.position}</td>
                        <td
                          className={`py-2.5 px-4 text-right font-mono tabular-nums ${
                            kw.delta > 0 ? 'text-emerald-700' : kw.delta < 0 ? 'text-red-700' : 'text-slate-500'
                          }`}
                        >
                          {kw.delta > 0 ? `+${kw.delta}` : kw.delta}
                        </td>
                        <td className="py-2.5 pl-4 font-mono text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            {kw.rankingUrl}
                            <ExternalLink className="h-3 w-3" />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {signalTab === 'crawl' && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-3 text-xs">
                  <h3 className="text-sm font-semibold text-slate-900">On-Page & Crawl Snapshot</h3>
                  <div className="divide-y divide-slate-200 border-t border-slate-200">
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">HTTP Status / Mode</span>
                      <span className="font-mono text-slate-900">{technicalSignals.crawl.httpStatus} ({technicalSignals.crawl.fetchMode})</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">Title Length</span>
                      <span className="font-mono text-slate-900">{technicalSignals.crawl.titleLength} chars ({technicalSignals.onPage.titleStatus})</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">Meta Description</span>
                      <span className="font-mono text-slate-900">{technicalSignals.crawl.metaDescriptionLength} chars ({technicalSignals.onPage.metaDescriptionStatus})</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">Word Count</span>
                      <span className="font-mono text-slate-900">{technicalSignals.crawl.wordCount.toLocaleString()} words</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">Image Alt Coverage</span>
                      <span className="font-mono text-slate-900">{technicalSignals.onPage.imageAltCoveragePct}%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <h3 className="text-sm font-semibold text-slate-900">Robots.txt, Sitemap & Schema.org</h3>
                  <div className="divide-y divide-slate-200 border-t border-slate-200">
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">robots.txt</span>
                      <span className="font-mono text-slate-900">
                        {technicalSignals.robotsAndSitemap.robotsTxtFound ? `Found (${technicalSignals.robotsAndSitemap.disallowedPaths.length} disallow rules)` : 'Not Found'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">sitemap.xml</span>
                      <span className="font-mono text-slate-900">
                        {technicalSignals.robotsAndSitemap.sitemapFound ? `Found (${technicalSignals.robotsAndSitemap.sitemapUrlCount} URLs)` : 'Not Found'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">JSON-LD Blocks</span>
                      <span className="font-mono text-slate-900">
                        {technicalSignals.schemaValidation.jsonLdCount} ({technicalSignals.schemaValidation.detectedTypes.join(', ') || 'None'})
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">Canonical Tag</span>
                      <span className="font-mono text-slate-900 truncate max-w-[260px]">
                        {technicalSignals.crawl.canonicalUrl || 'Missing'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
