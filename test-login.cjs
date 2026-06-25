const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`PAGE LOG [${msg.type()}]:`, msg.text());
  });
  
  page.on('pageerror', error => {
    console.log(`PAGE ERROR:`, error.message);
  });
  
  // We need to wait for the dev server, assuming it's running on 7015
  await page.goto('http://localhost:7015/fh.github.io/static-page#/login', { waitUntil: 'networkidle0' });
  
  console.log("Page loaded. Now clicking login...");
  
  try {
    await page.waitForSelector('input[type="email"]', { timeout: 2000 });
    await page.type('input[type="email"]', 'trunghere@gmail.com');
    await page.type('input[type="password"]', 'Trun@2016');
    await page.click('button[type="submit"]');
    
    // wait for a bit
    await new Promise(r => setTimeout(r, 5000));
    
    await page.screenshot({ path: 'login_result.png' });
    const html = await page.content();
    require('fs').writeFileSync('page.html', html);
    console.log("Screenshot saved. HTML length:", html.length);
  } catch (e) {
    console.log("Could not log in:", e.message);
  }
  
  await browser.close();
})();
