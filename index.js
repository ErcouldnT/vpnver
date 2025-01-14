#!/usr/bin/env node
import { exec } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-extra'
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

// Stealth modunu Puppeteer'a ekle
puppeteer.use(StealthPlugin())

// AdBlocker eklentisini Puppeteer'a ekle
puppeteer.use(AdblockerPlugin({ blockTrackers: true }))

let cookiesLoaded = false
const __dirname = path.dirname(fileURLToPath(import.meta.url)) // ES Modules için __dirname

const COOKIES_PATH = path.resolve(__dirname, 'cookies.json') // Çerezlerin kaydedileceği dosya
const DOWNLOAD_PATH = path.resolve(__dirname, 'Downloads'); // İndirme klasörü

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  })

  const page = await browser.newPage()

  // Sayfadaki tüm dialog elementlerini kaldır
  async function removeAdsAndElements() {
    await page.evaluate(() => {
      // Dialog ve overlay seçicilerini belirle
      const elementsToRemove = [
        'dialog',
        '[role="dialog"]',
        '.dialog',
        '.modal',
        '.popup',
        '.fc-monetization-dialog-container',
        '.fc-dialog-overlay',
        'iframe[src*="doubleclick.net"]', // DoubleClick reklam iframe'leri
        'iframe[src*="googleads.g.doubleclick.net"]', // Google Ads iframe'leri
        '.adsbygoogle', // Google reklam öğeleri
      ]
      // Tüm seçicilere göre elemanları bul ve kaldır
      elementsToRemove.forEach((selector) => {
        const elements = document.querySelectorAll(selector)
        elements.forEach(element => element.remove())
      })
    })

    print('Tüm dialog ve overlay elementleri DOM\'dan kaldırıldı.')
    await sleep(1)
  }

  // Çerezleri yükle
  if (fs.existsSync(COOKIES_PATH)) {
    const cookies = JSON.parse(fs.readFileSync(COOKIES_PATH, 'utf8'))
    await page.setCookie(...cookies)
    print('Çerezler yüklendi, reCAPTCHA atlanabilir.')
    cookiesLoaded = true // Çerezlerin yüklendiğini işaretle
  }

  // İndirme klasörünü ayarla
  const downloadPath = path.resolve(DOWNLOAD_PATH)
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

  // // "Consent" butonunu sadece çerezler yoksa bekle ve tıkla
  // if (!cookiesLoaded) {
  //   await page.waitForSelector('.fc-button.fc-cta-consent.fc-primary-button', { timeout: 0 }) // Butonun görünmesini bekler
  //   await page.click('.fc-button.fc-cta-consent.fc-primary-button') // Butona tıklar

  //   print('Consent butonuna tıklandı!')
  //   // await removeElements()
  // }

  // Rastgele 7 haneli bir karakter dizisi oluştur
  const randomUsername = Math.random().toString(36).substring(2, 9) // 7 haneli bir string oluştur
  const randomPassword = Math.random().toString(36).substring(2, 9) // 7 haneli bir string oluştur

  // Username inputunu bekle ve rastgele metni yaz
  await page.waitForSelector('input[name="user"]', { timeout: 0 }) // Username input alanını bekle
  await page.type('input[name="user"]', randomUsername) // Rastgele Username yaz

  print(`Username input alanına şu değer yazıldı: ${randomUsername}`)
  await removeAdsAndElements()

  // Password inputunu bekle ve rastgele metni yaz
  await page.waitForSelector('input[name="pass"]', { timeout: 0 }) // Password input alanını bekle
  await page.type('input[name="pass"]', randomPassword) // Rastgele Password yaz

  print(`Password input alanına şu değer yazıldı: ${randomPassword}`)
  await removeAdsAndElements()

  if (cookiesLoaded) {
    print('Çerezler yüklü, reCAPTCHA butonuna tıklamayı deniyorum...')

    try {
      await page.waitForSelector('#recaptcha-anchor', { timeout: 5 * 1000 }) // reCAPTCHA butonunun görünmesini bekle
      await page.click('#recaptcha-anchor') // Butona tıkla
      print('reCAPTCHA butonuna tıklandı!')
      await sleep(2) // Tıklamanın işlenmesi için kısa bir bekleme
    }
    catch (error) {
      print('reCAPTCHA butonuna tıklanamadı.', error.message)
      // Manuel reCAPTCHA çözme sürecine devam et
      print('Lütfen reCAPTCHA\'yı manuel olarak çözün ve butona tıklayın')
      await sleep(30) // 30 saniye bekler
    }
  }

  // URL'nin açılmasını bekle
  print('Yeni URL bekleniyor... reCAPTCHA olabilir.')
  await page.waitForFunction(
    'window.location.href === "https://www.vpnjantit.com/create-free-account?type=OpenVPN&server=gr1#create"',
    { timeout: 0 },
  )

  print('reCAPTCHA çözüldü, çerezler kaydediliyor...')
  // await removeAdsAndElements()

  // Çerezleri kaydet
  const cookies = await page.cookies()
  fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2))

  // "Download Config V2 udp-2500.ovpn" butonuna tıkla
  await page.waitForSelector('a.btn.btn-primary.d-block.px-7.mb-4[href^="download-openvpn-v2.php"][href*="udp-2500"]')
  await page.click('a.btn.btn-primary.d-block.px-7.mb-4[href^="download-openvpn-v2.php"][href*="udp-2500"]')
  print('Download Config V2 udp-2500.ovpn butonuna tıklandı!')

  await sleep(3)
  await removeAdsAndElements()

  // "Download Config V2 tcp-2501.ovpn" butonuna tıkla
  await page.waitForSelector('a.btn.btn-primary.d-block.px-7.mb-4[href^="download-openvpn-v2.php"][href*="tcp-2501"]', { timeout: 0 })
  await page.click('a.btn.btn-primary.d-block.px-7.mb-4[href^="download-openvpn-v2.php"][href*="tcp-2501"]')
  print('Download Config V2 tcp-2501.ovpn butonuna tıklandı!')

  await sleep(3)
  await removeAdsAndElements()

  print(`Dosyalar "${downloadPath}" dizinine indirildi.`)

  // Platforma göre indirilen klasörü aç
  switch (os.platform()) {
    case 'darwin': // macOS
      exec(`open ${downloadPath}`, (err) => {
        if (err) {
          print('MacOS için klasör açılamadı:', err)
        }
        else {
          print('MacOS: İndirilen klasör açıldı.')
        }
      })
      break

    case 'win32': // Windows
      exec(`explorer ${downloadPath}`, (err) => {
        if (err) {
          print('Windows için klasör açılamadı:', err)
        }
        else {
          print('Windows: İndirilen klasör açıldı.')
        }
      })
      break

    case 'linux': // Linux
      exec(`xdg-open ${downloadPath}`, (err) => {
        if (err) {
          print('Linux için klasör açılamadı:', err)
        }
        else {
          print('Linux: İndirilen klasör açıldı.')
        }
      })
      break

    default: // Desteklenmeyen platform
      print('Desteklenmeyen platform. Klasör açma işlemi yapılmadı.')
      break
  }

  print('5 saniye sonra tarayıcı kapanacak...')
  await sleep(5)

  // Tarayıcıyı kapat
  await browser.close()
  print('Tarayıcı kapatıldı, işlem tamam.')
})()

function sleep(second) {
  return new Promise(resolve => setTimeout(resolve, second * 1000))
}

function print(message) {
  console.warn(`[vpnver] ${message}`)
}
