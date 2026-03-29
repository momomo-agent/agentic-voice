const { chromium } = require('playwright')

async function test() {
  const browser = await chromium.connectOverCDP('http://localhost:9222')
  const contexts = browser.contexts()
  const context = contexts[0] || await browser.newContext()
  const page = await context.newPage()
  
  const logs = []
  page.on('console', msg => {
    const text = msg.text()
    console.log(`[Console]`, text)
    logs.push(text)
  })
  
  page.on('pageerror', err => {
    console.error('[Error]', err.message)
    logs.push(`ERROR: ${err.message}`)
  })
  
  await page.goto('https://192.168.31.211:8766/test-browser.html', {
    waitUntil: 'networkidle'
  })
  
  console.log('\n=== Starting recording ===')
  await page.click('#testSTT')
  
  await page.waitForTimeout(3000)
  
  console.log('\n=== Stopping recording ===')
  await page.click('#testSTT')
  
  await page.waitForTimeout(20000)
  
  const status = await page.textContent('#status')
  console.log('\n=== Final status ===')
  console.log(status)
  
  console.log('\n=== All logs ===')
  logs.forEach(log => console.log(log))
}

test().catch(console.error)
