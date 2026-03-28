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
  
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404)
      res.end('Not found')
      return
    }
    
    const ext = path.extname(fullPath)
    const contentType = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.mp3': 'audio/mpeg'
    }[ext] || 'text/plain'
    
    res.writeHead(200, { 'Content-Type': contentType })
    res.end(data)
  })
}).listen(8766, () => {
  console.log('HTTPS server running at https://192.168.31.211:8766/')
})
