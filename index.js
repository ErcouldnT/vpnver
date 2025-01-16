#!/usr/bin/env node
import { exec } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-extra'
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

puppeteer.use(StealthPlugin()) // Bot olarak algılamayı önle
puppeteer.use(AdblockerPlugin({ blockTrackers: true })) // Reklamları engelle

const serverArg = chooseServerFromTerminal() // Default olarak "gr1"
const __dirname = path.dirname(fileURLToPath(import.meta.url)) // ES Modules için __dirname değişkeni

// Sabitler
const VPN_URL = `https://www.vpnjantit.com/create-free-account?type=OpenVPN&server=${serverArg}`
const COOKIES_PATH = path.resolve(__dirname, 'cookies.json') // Çerez dosyası
const DOWNLOAD_PATH = path.resolve(__dirname, 'Downloads'); // İndirme klasörü

(async () => {
  // Tarayıcıyı aç
  const browser = await puppeteer.launch({
    headless: false, // Tarayıcı görünür olsun
    args: ['--disable-blink-features=AutomationControlled'],
  })

  // Yeni sekme aç
  const page = await browser.newPage()

  // Çerezleri yükle
  if (fs.existsSync(COOKIES_PATH)) {
    const cookies = JSON.parse(fs.readFileSync(COOKIES_PATH, 'utf8'))
    await page.setCookie(...cookies)
    print('Çerezler yüklendi, reCAPTCHA kolay geçilebilir.')
  }

  // İndirme klasörünü ayarla
  const downloadPath = path.resolve(DOWNLOAD_PATH)
  if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath)
  }

  // İndirme izinlerini ayarla
  const client = await page.createCDPSession()
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath,
  })

  // Yeni kullanıcı ajanını ayarla
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:135.0) Gecko/20100101 Firefox/135.0')

  // Siteye git
  await page.goto(VPN_URL, {
    waitUntil: 'networkidle2', // Sayfa tamamen yüklenene kadar bekle
  })

  // Bugünün tarihini "DDMMYYYY" formatında oluştur
  const today = new Date()
  const randomUsername = `${today.getDate().toString().padStart(2, '0')}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getFullYear()}`
  // Rastgele 7 haneli bir karakter dizisi oluştur
  const randomPassword = Math.random().toString(36).substring(2, 9)

  // Username inputunu bekle ve güncel tarihi yaz
  await page.waitForSelector('input[name="user"]', { timeout: 0 })
  await page.type('input[name="user"]', randomUsername)
  print(`OpenVPN Username: ${randomUsername}`)

  // Password inputunu bekle ve rastgele metni yaz
  await page.waitForSelector('input[name="pass"]', { timeout: 0 })
  await page.type('input[name="pass"]', randomPassword)
  print(`OpenVPN Password: ${randomPassword}`)

  // Manuel reCAPTCHA çözme sürecine devam et
  print('Lütfen reCAPTCHA\'yı manuel olarak çözün ve butona tıklayın.')
  await page.waitForFunction(
    `window.location.href === "${VPN_URL}#create"`,
    { timeout: 0 },
  )

  // Çerezleri kaydet
  print('reCAPTCHA çözüldü, çerezler kaydediliyor...')
  const cookies = await page.cookies()
  fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2))

  // "Download Config V2 udp-2500.ovpn" butonuna tıkla
  await page.waitForSelector('a.btn.btn-primary.d-block.px-7.mb-4[href^="download-openvpn-v2.php"][href*="udp-2500"]')
  await page.click('a.btn.btn-primary.d-block.px-7.mb-4[href^="download-openvpn-v2.php"][href*="udp-2500"]')
  print(`${randomUsername}-${serverArg}.vpnjantit-udp-2500.ovpn indiriliyor...`)
  await sleep(1)

  // "Download Config V2 tcp-2501.ovpn" butonuna tıkla
  await page.waitForSelector('a.btn.btn-primary.d-block.px-7.mb-4[href^="download-openvpn-v2.php"][href*="tcp-2501"]', { timeout: 0 })
  await page.click('a.btn.btn-primary.d-block.px-7.mb-4[href^="download-openvpn-v2.php"][href*="tcp-2501"]')
  print(`${randomUsername}-${serverArg}.vpnjantit-tcp-2501.ovpn indiriliyor...`)
  await sleep(1)

  // İndirilen dosyaları göster
  openDownloadsFolder(downloadPath)

  // Tarayıcıyı kapat
  await browser.close()
  print('Tarayıcı kapatıldı, işlem tamam.')
})()

// Belirtilen saniye kadar beklet
function sleep(second) {
  return new Promise(resolve => setTimeout(resolve, second * 1000))
}

// Terminale mesaj yazdır
function print(message) {
  console.warn(`[vpnver] ${message}`)
}

// Terminalden sunucu seçme işlemi
function chooseServerFromTerminal() {
  const args = process.argv.slice(2)
  const serverArg = args[0] || 'gr1' // Varsayılan olarak "Germany 1"
  print(`Sunucu tespit edildi: ${serverArg}`)
  return serverArg
}

// Platforma göre indirilen klasörü aç
function openDownloadsFolder(downloadPath) {
  print(`Dosyalar "${downloadPath}" dizinine indirildi.`)

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
}
