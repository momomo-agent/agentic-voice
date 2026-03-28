const { createSTT } = require('./agentic-voice.js')

const stt = createSTT({
  provider: 'elevenlabs',
  apiKey: 'sk_b0f355a25dea64a975f9aef7ad791a19c4f5e266143caecc',
  model: 'scribe_v2',
})

async function test() {
  console.log('Testing ElevenLabs STT...')
  const text = await stt.transcribe('/tmp/elevenlabs-test.mp3')
  console.log('Result:', text)
}

test().catch(console.error)
