const { chromium } = require('playwright')

async function test() {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--autoplay-policy=no-user-gesture-required', '--ignore-certificate-errors']
  })
  const context = await browser.newContext({
    permissions: ['microphone'],
    ignoreHTTPSErrors: true
  })
  const page = await context.newPage()
  
  // 监听控制台
  page.on('console', msg => {
    const type = msg.type()
    const text = msg.text()
    console.log(`[${type}]`, text)
  })
  
  // 监听错误
  page.on('pageerror', err => {
    console.error('[Page Error]', err.message)
  })
  
  await page.goto('https://localhost:8766/test-browser.html', {
    waitUntil: 'networkidle'
  })
  
  console.log('\n=== Clicking TTS button ===')
  await page.click('#testTTS')
  
  // 等待播放
  await page.waitForTimeout(8000)
  
  const status = await page.textContent('#status')
  console.log('\nFinal status:', status)
  
  await browser.close()
}

test().catch(console.error)
