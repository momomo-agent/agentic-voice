const { chromium } = require('playwright')

async function test() {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()
  
  // 监听控制台
  page.on('console', msg => console.log('[Browser]', msg.text()))
  
  await page.goto('http://localhost:8765/test-browser.html')
  
  console.log('Clicking TTS button...')
  await page.click('#testTTS')
  
  // 等待状态更新
  await page.waitForTimeout(5000)
  
  const status = await page.textContent('#status')
  console.log('Status:', status)
  
  await browser.close()
}

test().catch(console.error)
