import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

export async function generateAuditPdfBuffer(audit) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .fillColor('#0F172A')
      .text('Edgelink SEO Automation — Executive Audit Report');

    doc.moveDown(0.3);
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#475569')
      .text(`Client: ${audit.clientName}   |   Target: ${audit.url}   |   Audit ID: ${audit.id}`);
    doc.text(`Generated: ${new Date(audit.completedAt || audit.updatedAt).toUTCString()}`);

    doc.moveDown(0.8);
    doc.moveTo(48, doc.y).lineTo(547, doc.y).strokeColor('#CBD5E1').stroke();
    doc.moveDown(0.8);

    const result = audit.result;
    if (!result) {
      doc.fontSize(12).fillColor('#0F172A').text('Audit results are not yet available.');
      doc.end();
      return;
    }

    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor('#1D4ED8')
      .text(`Overall SEO Score: ${result.overall_score} / 100`);

    doc.moveDown(0.4);
    const b = result.score_breakdown;
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#1E293B')
      .text(
        `Technical: ${b.technical}/100   |   On-Page: ${b.on_page}/100   |   Content: ${b.content}/100   |   Core Web Vitals: ${b.core_web_vitals}/100   |   Schema: ${b.schema}/100`
      );

    doc.moveDown(0.8);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#0F172A').text('Executive Summary');
    doc.moveDown(0.25);
    doc.font('Helvetica').fontSize(10).fillColor('#334155').text(result.executive_summary, { lineGap: 3 });

    const renderIssues = (heading, items) => {
      doc.moveDown(0.8);
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#0F172A').text(`${heading} (${items.length})`);
      doc.moveDown(0.25);
      if (items.length === 0) {
        doc.font('Helvetica').fontSize(9.5).fillColor('#64748B').text('No issues flagged in this severity tier.');
        return;
      }
      for (const issue of items) {
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#0F172A').text(`• ${issue.title} [${issue.category}]`);
        doc.font('Helvetica').fontSize(9.5).fillColor('#334155').text(`  Evidence: ${issue.evidence}`);
        doc.font('Helvetica').fontSize(9.5).fillColor('#475569').text(`  Impact: ${issue.impact_summary}`);
        doc.moveDown(0.3);
      }
    };

    renderIssues('Critical Issues', result.critical_issues);
    renderIssues('Important Issues', result.important_issues);
    renderIssues('Quick Wins', result.quick_wins);

    doc.moveDown(0.8);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#0F172A').text('Prioritized Recommendations');
    doc.moveDown(0.3);

    for (const rec of result.recommendations) {
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#1D4ED8')
        .text(`#${rec.priority} ${rec.title} (Impact: ${rec.estimated_impact} · Effort: ${rec.effort})`);
      doc.font('Helvetica').fontSize(9.5).fillColor('#334155').text(`Finding: ${rec.finding}`);
      doc.font('Helvetica').fontSize(9.5).fillColor('#0F172A').text(`Fix: ${rec.fix}`);
      doc.font('Helvetica-Oblique').fontSize(9).fillColor('#475569').text(`Falsifiability Check: ${rec.falsifiability_check}`);
      doc.moveDown(0.45);
    }

    doc.end();
  });
}

export async function saveAuditPdfToDisk(audit, reportsDir) {
  const safeId = audit.id.replace(/[^a-zA-Z0-9_-]/g, '');
  const outputPath = path.resolve(reportsDir, `${safeId}.pdf`);
  if (!outputPath.startsWith(path.resolve(reportsDir) + path.sep)) {
    throw new Error('Invalid report path.');
  }
  const buffer = await generateAuditPdfBuffer(audit);
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}
