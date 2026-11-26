export function getMockGscData(targetUrl) {
  let hostname = targetUrl;
  try {
    hostname = new URL(targetUrl).hostname.replace(/^www\./, '');
  } catch {
    // keep raw targetUrl
  }

  const brand = hostname.split('.')[0] || 'brand';

  return {
    source: 'mock',
    siteUrl: targetUrl,
    period: 'last_28_days',
    fetchedAt: new Date().toISOString(),
    totals: {
      clicks: 14820,
      impressions: 392400,
      ctr: 0.0378,
      averagePosition: 14.6,
    },
    topQueries: [
      { query: `${brand} platform`, clicks: 3120, impressions: 18400, ctr: 0.1696, position: 2.1 },
      { query: 'enterprise seo automation software', clicks: 1890, impressions: 64200, ctr: 0.0294, position: 8.4 },
      { query: 'technical seo audit checklist', clicks: 1420, impressions: 51800, ctr: 0.0274, position: 9.7 },
      { query: `${brand} pricing`, clicks: 940, impressions: 7200, ctr: 0.1306, position: 3.4 },
      { query: 'core web vitals monitoring tool', clicks: 680, impressions: 39100, ctr: 0.0174, position: 13.8 },
      { query: 'automated schema markup validator', clicks: 410, impressions: 28900, ctr: 0.0142, position: 16.2 },
    ],
    topPages: [
      { page: `${targetUrl.replace(/\/$/, '')}/`, clicks: 6420, impressions: 112000, ctr: 0.0573, position: 7.2 },
      { page: `${targetUrl.replace(/\/$/, '')}/pricing`, clicks: 2140, impressions: 34200, ctr: 0.0626, position: 6.5 },
      { page: `${targetUrl.replace(/\/$/, '')}/guides/technical-seo`, clicks: 1890, impressions: 78500, ctr: 0.0241, position: 11.4 },
      { page: `${targetUrl.replace(/\/$/, '')}/integrations`, clicks: 1120, impressions: 41200, ctr: 0.0272, position: 12.9 },
    ],
    indexCoverage: {
      indexedPages: 148,
      excludedPages: 34,
      crawlErrors: 3,
      warnings: [
        'Duplicate without user-selected canonical on 6 parameterized URLs',
        'Crawled - currently not indexed on 11 thin tag archive pages',
      ],
    },
  };
}
