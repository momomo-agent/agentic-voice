const { chromium } = require('playwright')

async function test() {
  // 连接到已运行的 Chrome
  const browser = await chromium.connectOverCDP('http://localhost:9222')
  const contexts = browser.contexts()
  const context = contexts[0] || await browser.newContext()
  const page = await context.newPage()
  
  // 监听控制台
  page.on('console', msg => console.log(`[Browser]`, msg.text()))
  
  await page.goto('https://localhost:8766/test-browser.html', {
    waitUntil: 'networkidle'
  })
  
  console.log('\n=== Clicking TTS button ===')
  await page.click('#testTTS')
  
  // 等待播放
  await page.waitForTimeout(8000)
  
  const status = await page.textContent('#status')
  console.log('\nFinal status:', status)
  
  // 不关闭浏览器
  console.log('\nBrowser tab left open for manual inspection')
}

test().catch(console.error)
