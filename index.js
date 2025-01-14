import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.goto('https://example.com')
  console.warn('Sayfa başlığı:', await page.title())
  await browser.close()
})()
