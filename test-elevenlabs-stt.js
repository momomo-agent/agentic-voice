const { createSTT } = require('./agentic-voice.js')

const stt = createSTT({
  provider: 'elevenlabs',
  apiKey: 'sk_b0f355a25dea64a975f9aef7ad791a19c4f5e266143caecc',
})

stt.transcribe('/tmp/elevenlabs-test.mp3')
  .then(text => console.log('Transcription:', text))
  .catch(err => console.error('Error:', err.message))
