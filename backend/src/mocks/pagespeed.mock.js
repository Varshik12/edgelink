function hashDomain(url) {
  let h = 0;
  for (let i = 0; i < url.length; i += 1) {
    h = (h * 31 + url.charCodeAt(i)) % 1000;
  }
  return h;
}

export function getMockPageSpeedData(targetUrl, strategy = 'mobile') {
  const seed = hashDomain(targetUrl);
  const perfBase = strategy === 'mobile' ? 64 + (seed % 26) : 78 + (seed % 18);
  const seoBase = 74 + (seed % 20);
  const a11yBase = 79 + (seed % 16);
  const bpBase = 82 + (seed % 15);

  const lcpMs = strategy === 'mobile' ? 2100 + (seed % 2200) : 1300 + (seed % 1100);
  const inpMs = 140 + (seed % 180);
  const clsVal = Number((0.03 + ((seed % 18) / 100)).toFixed(2));
  const fcpMs = Math.round(lcpMs * 0.58);
  const ttfbMs = 280 + (seed % 420);

  return {
    source: 'mock',
    strategy,
    requestedUrl: targetUrl,
    fetchedAt: new Date().toISOString(),
    scores: {
      performance: perfBase,
      seo: seoBase,
      accessibility: a11yBase,
      bestPractices: bpBase,
    },
    coreWebVitals: {
      lcp: {
        valueMs: lcpMs,
        displayValue: `${(lcpMs / 1000).toFixed(2)} s`,
        rating: lcpMs <= 2500 ? 'GOOD' : lcpMs <= 4000 ? 'NEEDS_IMPROVEMENT' : 'POOR',
      },
      inp: {
        valueMs: inpMs,
        displayValue: `${inpMs} ms`,
        rating: inpMs <= 200 ? 'GOOD' : inpMs <= 500 ? 'NEEDS_IMPROVEMENT' : 'POOR',
      },
      cls: {
        value: clsVal,
        displayValue: clsVal.toFixed(2),
        rating: clsVal <= 0.1 ? 'GOOD' : clsVal <= 0.25 ? 'NEEDS_IMPROVEMENT' : 'POOR',
      },
      fcp: {
        valueMs: fcpMs,
        displayValue: `${(fcpMs / 1000).toFixed(2)} s`,
        rating: fcpMs <= 1800 ? 'GOOD' : 'NEEDS_IMPROVEMENT',
      },
      ttfb: {
        valueMs: ttfbMs,
        displayValue: `${ttfbMs} ms`,
        rating: ttfbMs <= 800 ? 'GOOD' : 'NEEDS_IMPROVEMENT',
      },
    },
    opportunities: [
      {
        id: 'render-blocking-resources',
        title: 'Eliminate render-blocking resources',
        estimatedSavingsMs: 420 + (seed % 340),
        severity: lcpMs > 2500 ? 'high' : 'medium',
      },
      {
        id: 'uses-webp-images',
        title: 'Serve images in next-gen formats (WebP/AVIF)',
        estimatedSavingsKb: 180 + (seed % 410),
        severity: 'medium',
      },
      {
        id: 'unused-javascript',
        title: 'Reduce unused JavaScript bundles',
        estimatedSavingsKb: 95 + (seed % 210),
        severity: inpMs > 200 ? 'high' : 'low',
      },
      {
        id: 'unsized-images',
        title: 'Image elements do not have explicit width and height',
        estimatedSavingsCls: clsVal > 0.1 ? 0.08 : 0.02,
        severity: clsVal > 0.1 ? 'high' : 'low',
      },
    ],
  };
}
