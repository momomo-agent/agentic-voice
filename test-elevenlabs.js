const AgenticVoice = require('./agentic-voice.js')
const fs = require('fs')

async function test() {
  console.log('Testing ElevenLabs...')
  
  const voice = AgenticVoice.createVoice({
    tts: {
      provider: 'elevenlabs',
      apiKey: 'sk_b0f355a25dea64a975f9aef7ad791a19c4f5e266143caecc',
      voice: 'pNInz6obpgDQGcFmaJgB',  // Adam voice
      model: 'eleven_turbo_v2_5'
    }
  })

  try {
    console.log('Fetching audio...')
    const buffer = await voice.fetchAudio('Hello from ElevenLabs! This is a test.')
    
    if (buffer) {
      console.log(`✅ Got audio: ${buffer.byteLength} bytes`)
      fs.writeFileSync('/tmp/elevenlabs-test.mp3', Buffer.from(buffer))
      console.log('Saved to /tmp/elevenlabs-test.mp3')
    } else {
      console.log('❌ No audio returned')
    }
  } catch (e) {
    console.error('❌ Error:', e.message)
  }
}

test()
