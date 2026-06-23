import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:4000', { waitUntil: 'networkidle' });
  
  // Wait a moment for dynamic data to settle (if any)
  await page.waitForTimeout(3000);

  // Extract all computed styles and replace style tags with inlined CSS
  const singleHtml = await page.evaluate(() => {
    // Collect all CSS rules from stylesheets
    let css = '';
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules)) {
          css += rule.cssText + '\n';
        }
      } catch(e) {
        // CORS or empty sheet
      }
    }
    
    // Create a new style tag with all CSS
    const style = document.createElement('style');
    style.innerHTML = css;
    document.head.appendChild(style);

    // Remove old link tags that import CSS
    document.querySelectorAll('link[rel="stylesheet"]').forEach(el => el.remove());
    
    // Remove all script tags
    document.querySelectorAll('script').forEach(el => el.remove());

    return `<!DOCTYPE html>\n<html lang="en">\n<head>\n${document.head.innerHTML}\n</head>\n<body>\n${document.body.innerHTML}\n</body>\n</html>`;
  });

  fs.writeFileSync('/Users/will/Downloads/agentic-hq-static-replica.html', singleHtml);
  console.log('Saved to /Users/will/Downloads/agentic-hq-static-replica.html');
  await browser.close();
})();
