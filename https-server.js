const https = require('https')
const fs = require('fs')
const path = require('path')

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
}

https.createServer(options, (req, res) => {
  const filePath = req.url === '/' ? '/test-browser.html' : req.url
  const fullPath = path.join(__dirname, filePath)
  
  console.log('[Request]', req.url, '→', fullPath)
  
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      console.error('[404]', fullPath)
      res.writeHead(404)
      res.end('Not found: ' + req.url)
      return
    }
    
    const ext = path.extname(fullPath)
    const contentType = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.mp3': 'audio/mpeg'
    }[ext] || 'text/plain'
    
    console.log('[200]', req.url, contentType)
    res.writeHead(200, { 'Content-Type': contentType })
    res.end(data)
  })
}).listen(8766, () => {
  console.log('HTTPS server running at https://192.168.31.211:8766/')
})
