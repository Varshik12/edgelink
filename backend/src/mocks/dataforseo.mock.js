export function getMockDataForSeoData(targetUrl, targetKeywords = []) {
  let domain = targetUrl;
  try {
    domain = new URL(targetUrl).hostname.replace(/^www\./, '');
  } catch {
    // keep raw string
  }

  const defaults = [
    'enterprise seo audit platform',
    'automated technical seo tool',
    'schema markup validator',
    'core web vitals optimizer',
    'b2b seo reporting software',
  ];

  const seeds = targetKeywords.length > 0 ? targetKeywords : defaults;

  const rankedKeywords = seeds.slice(0, 8).map((kw, index) => {
    const pos = 4 + ((index * 5) % 19);
    const prevPos = pos + (index % 2 === 0 ? 3 : -1);
    return {
      keyword: kw,
      searchVolume: 1800 + index * 950,
      cpc: Number((2.4 + index * 0.85).toFixed(2)),
      keywordDifficulty: 38 + ((index * 9) % 45),
      position: pos,
      previousPosition: prevPos,
      delta: prevPos - pos,
      rankingUrl: `${targetUrl.replace(/\/$/, '')}/${index === 0 ? '' : kw.toLowerCase().replace(/\s+/g, '-')}`,
      serpFeatures: index % 2 === 0 ? ['featured_snippet', 'sitelinks'] : ['people_also_ask'],
    };
  });

  return {
    source: 'mock',
    target: domain,
    locationCode: 2840,
    languageCode: 'en',
    fetchedAt: new Date().toISOString(),
    summary: {
      totalRankedKeywords: 412,
      top3Count: 18,
      top10Count: 74,
      estimatedMonthlyTraffic: 22450,
      trafficValueUsd: 48920,
    },
    rankedKeywords,
    competitors: [
      { domain: 'semrush.com', intersections: 164, avgPosition: 5.2 },
      { domain: 'ahrefs.com', intersections: 149, avgPosition: 6.1 },
      { domain: 'screamingfrog.co.uk', intersections: 92, avgPosition: 8.7 },
    ],
  };
}
