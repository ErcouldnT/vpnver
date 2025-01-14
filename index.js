import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

// Stealth modunu Puppeteer'a ekle
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  })

  const page = await browser.newPage()

  // İndirme klasörünü ayarla
  const downloadPath = path.resolve('./downloads')
  if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath)
  }

  const client = await page.createCDPSession()
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath,
  })

  // Yeni kullanıcı ajanını ayarla
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:135.0) Gecko/20100101 Firefox/135.0')

  // Siteye git
  await page.goto('https://www.vpnjantit.com/create-free-account?server=gr1&type=OpenVPN', {
    waitUntil: 'networkidle2', // Tüm ağ istekleri tamamlanana kadar bekler
  })

  // "Consent" butonunu bekle ve tıkla
  await page.waitForSelector('.fc-button.fc-cta-consent.fc-primary-button') // Butonun görünmesini bekler
  await page.click('.fc-button.fc-cta-consent.fc-primary-button') // Butona tıklar

  console.warn('Consent butonuna tıklandı!')

  // Rastgele 7 haneli bir karakter dizisi oluştur
  const randomUsername = Math.random().toString(36).substring(2, 9) // 7 haneli bir string oluştur
  const randomPassword = Math.random().toString(36).substring(2, 9) // 7 haneli bir string oluştur

  // Username inputunu bekle ve rastgele metni yaz
  await page.waitForSelector('input[name="user"]') // Username input alanını bekle
  await page.type('input[name="user"]', randomUsername) // Rastgele Username yaz

  console.warn(`Username input alanına şu değer yazıldı: ${randomUsername}`)

  // Password inputunu bekle ve rastgele metni yaz
  await page.waitForSelector('input[name="pass"]') // Password input alanını bekle
  await page.type('input[name="pass"]', randomPassword) // Rastgele Password yaz

  console.warn(`Password input alanına şu değer yazıldı: ${randomPassword}`)

  // Tarayıcıda reCAPTCHA çözümü için bekleyin
  console.warn('Lütfen reCAPTCHA\'yı manuel olarak çözün ve butona tıklayın')
  await new Promise(resolve => setTimeout(resolve, 60000)) // 60 saniye bekler

  console.warn('Bekleme süresi sona erdi.')

  // URL'nin açılmasını bekle
  console.warn('Yeni URL bekleniyor...')
  await page.waitForFunction(
    'window.location.href === "https://www.vpnjantit.com/create-free-account?type=OpenVPN&server=gr1#create"',
  )
  console.warn('URL açıldı!')

  // "Download Config V2 udp-2500.ovpn" butonuna tıkla
  await page.waitForSelector('a.btn.btn-primary.d-block.px-7.mb-4[href^="download-openvpn-v2.php"][href*="udp-2500"]')
  await page.click('a.btn.btn-primary.d-block.px-7.mb-4[href^="download-openvpn-v2.php"][href*="udp-2500"]')
  console.warn('Download Config V2 udp-2500.ovpn butonuna tıklandı!')

  // "Download Config V2 tcp-2501.ovpn" butonuna tıkla
  await page.waitForSelector('a.btn.btn-primary.d-block.px-7.mb-4[href^="download-openvpn-v2.php"][href*="tcp-2501"]')
  await page.click('a.btn.btn-primary.d-block.px-7.mb-4[href^="download-openvpn-v2.php"][href*="tcp-2501"]')
  console.warn('Download Config V2 tcp-2501.ovpn butonuna tıklandı!')

  console.warn(`Dosyalar "${downloadPath}" dizinine indirildi.`)

  // Tarayıcıyı kapat
  await browser.close()
})()
