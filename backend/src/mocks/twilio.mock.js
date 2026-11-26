export function sendMockWhatsApp({ to, clientName, domain, overallScore, auditId, reportUrl }) {
  const sid = `SM_MOCK_${Date.now().toString(36).toUpperCase()}`;
  const body = [
    '[Edgelink SEO Audit Complete]',
    `Client: ${clientName} (${domain})`,
    `Overall SEO Score: ${overallScore}/100`,
    `Audit ID: ${auditId}`,
    `Report: ${reportUrl}`,
  ].join('\n');

  console.log(`\n[MOCK WHATSAPP DISPATCH -> ${to || '+1-555-0199'}]\nSID: ${sid}\n${body}\n`);

  return {
    source: 'mock',
    channel: 'whatsapp',
    sid,
    to: to || '+1-555-0199',
    status: 'delivered_mock',
    body,
    sentAt: new Date().toISOString(),
  };
}

export function sendMockEmail({ to, clientName, domain, overallScore, auditId, executiveSummary }) {
  const messageId = `msg_mock_${Date.now().toString(36)}`;
  const subject = `SEO Audit Report Ready: ${domain} (Score ${overallScore}/100)`;

  console.log(`\n[MOCK EMAIL DISPATCH -> ${to || 'seo-team@example.com'}]\nSubject: ${subject}\nAudit ID: ${auditId}\nSummary: ${executiveSummary?.slice(0, 140)}...\n`);

  return {
    source: 'mock',
    channel: 'email',
    messageId,
    to: to || 'seo-team@example.com',
    subject,
    status: 'sent_mock',
    body: `Hello ${clientName} team,\n\nYour automated SEO audit for ${domain} scored ${overallScore}/100.\n\nExecutive Summary:\n${executiveSummary}`,
    sentAt: new Date().toISOString(),
  };
}
