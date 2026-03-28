const { createVoice } = require('./agentic-voice.js')

const voice = createVoice({
  tts: {
    provider: 'elevenlabs',
    apiKey: 'sk_b0f355a25dea64a975f9aef7ad791a19c4f5e266143caecc',
    voice: 'jsCqWAovK2LkecY7zXl4',  // Lucy
    model: 'eleven_turbo_v2_5',
  },
  stt: {
    provider: 'elevenlabs',
    apiKey: 'sk_b0f355a25dea64a975f9aef7ad791a19c4f5e266143caecc',
    model: 'scribe_v2',
  }
})

async function test() {
  console.log('Testing TTS...')
  await voice.speak('Hello, this is Lucy speaking from ElevenLabs.')
  console.log('TTS done')
  
  console.log('\nTesting STT...')
  const text = await voice.transcribe('/tmp/elevenlabs-test.mp3')
  console.log('STT result:', text)
}

test().catch(console.error)
