/**
 * Export ICS flowchart HTML to single-page A4 portrait PDF.
 *
 * Usage (from docs/):
 *   node export-flowchart-pdf.cjs
 *
 * Browser: uses Puppeteer Chrome if installed, otherwise Microsoft Edge on Windows.
 * To install Puppeteer Chrome:
 *   npx puppeteer browsers install chrome
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const docsDir = __dirname;
const htmlPath = path.join(docsDir, 'ICS-End-To-End-Flowchart.html');
const pdfPath = path.join(docsDir, 'ICS-End-To-End-Flowchart.pdf');
const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

function resolveLaunchOptions() {
  const args = ['--no-sandbox', '--disable-setuid-sandbox'];

  try {
    const chrome = puppeteer.executablePath();
    if (chrome && fs.existsSync(chrome)) {
      return { headless: true, executablePath: chrome, args };
    }
  } catch {
    // Puppeteer Chrome not configured — fall through to Edge.
  }

  const edgeCandidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);

  for (const edge of edgeCandidates) {
    if (fs.existsSync(edge)) {
      console.log('Using Microsoft Edge:', edge);
      return { headless: true, executablePath: edge, args };
    }
  }

  throw new Error(
    [
      'No Chrome or Edge browser found for PDF export.',
      '',
      'Option A — install Puppeteer Chrome:',
      '  npx puppeteer browsers install chrome',
      '',
      'Option B — point to your browser:',
      '  set PUPPETEER_EXECUTABLE_PATH=C:\\Path\\To\\msedge.exe',
      '  node export-flowchart-pdf.cjs',
    ].join('\n'),
  );
}

(async () => {
  const browser = await puppeteer.launch(resolveLaunchOptions());

  try {
    const page = await browser.newPage();
    await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForSelector('.mermaid svg', { timeout: 60000 });
    await page.waitForFunction(() => document.body.dataset.pdfReady === 'true', { timeout: 30000 });

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' },
      pageRanges: '1',
    });

    console.log('PDF saved:', pdfPath);
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
