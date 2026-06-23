import { chromium } from 'playwright';
import fs from 'fs';

const routes = [
  '/', '/dev', '/testing', '/release', '/registry', '/repository', 
  '/documents', '/ai-engine', '/cloud', '/triggers', '/agent-config'
];

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  let globalCss = '';
  const pagesData = {};

  for (const route of routes) {
    const url = `http://127.0.0.1:4000${route}`;
    console.log(`Visiting ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // allow dynamic content to load

    // Extract CSS only once
    if (!globalCss) {
      globalCss = await page.evaluate(() => {
        let css = '';
        for (const sheet of Array.from(document.styleSheets)) {
          try {
            for (const rule of Array.from(sheet.cssRules)) {
              css += rule.cssText + '\n';
            }
          } catch(e) {}
        }
        return css;
      });
    }

    // Clean up DOM before extracting
    await page.evaluate(() => {
      document.querySelectorAll('script').forEach(el => el.remove());
      // remove next.js dev overlay if present
      document.querySelectorAll('nextjs-portal').forEach(el => el.remove());
    });

    const bodyHtml = await page.evaluate(() => document.body.innerHTML);
    pagesData[route] = bodyHtml;
  }

  console.log('Generating single HTML file...');

  const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tsumiki HQ Prototype</title>
    <style>
      ${globalCss}
      
      /* Add a small banner to show it's a static prototype */
      .prototype-banner {
        position: fixed;
        bottom: 10px;
        right: 10px;
        background: #fcd34d;
        color: #000;
        padding: 5px 10px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
        z-index: 999999;
        pointer-events: none;
      }
    </style>
</head>
<body>
    <div id="app-root">${pagesData['/']}</div>
    <div class="prototype-banner">Interactive Static Prototype</div>

    <script>
      const pages = ${JSON.stringify(pagesData)};
      
      function renderPage(route) {
        if (pages[route]) {
          document.getElementById('app-root').innerHTML = pages[route];
          attachLinkHandlers();
          window.history.pushState({ route }, '', '#' + route);
          window.scrollTo(0, 0);
        } else {
          console.warn('Route not found:', route);
        }
      }

      function attachLinkHandlers() {
        document.querySelectorAll('a').forEach(a => {
          a.addEventListener('click', (e) => {
            const href = a.getAttribute('href');
            if (href && href.startsWith('/')) {
              e.preventDefault();
              renderPage(href);
            }
          });
        });
      }

      window.addEventListener('popstate', (e) => {
        if (e.state && e.state.route) {
          renderPage(e.state.route);
        } else {
          renderPage('/');
        }
      });

      // Initial attachment
      attachLinkHandlers();
    </script>
</body>
</html>`;

  fs.writeFileSync('/Users/will/Downloads/tsumiki-hq-interactive-prototype.html', htmlTemplate);
  console.log('Saved to /Users/will/Downloads/tsumiki-hq-interactive-prototype.html');
  
  await browser.close();
})();
