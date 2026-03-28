# agentic-voice

Speech for AI apps. TTS + STT in one library.

Zero dependencies. Browser + Node.js compatible. OpenAI-compatible API.

## Usage

```js
const voice = AgenticVoice.createVoice({
  tts: { baseUrl: 'https://api.openai.com', apiKey: 'sk-...', voice: 'alloy' },
  stt: { mode: 'browser' },  // or 'whisper'
})

// Text-to-Speech
await voice.speak('Hello world')
voice.stop()

// Playback progress (0-1)
voice.on('progress', ({ progress, duration, elapsed }) => {
  console.log(`${Math.round(progress * 100)}%`)
})

// Fetch audio without playing
const buffer = await voice.fetchAudio('Hello world')
await voice.playBuffer(buffer)

// Word-level timestamps (for "speak-as-you-highlight")
const result = await voice.timestamps('Hello world')
// { words: [{ word: 'Hello', start: 0.0, end: 0.32 }, ...], duration: 0.8, audio: ArrayBuffer }
await voice.playBuffer(result.audio)

// Speech-to-Text (push-to-talk)
voice.startListening()
voice.stopListening()

// Transcribe with word timestamps
const ts = await voice.transcribeWithTimestamps(audioBlob)
// { words: [{ word, start, end }], text, duration }

// Events
voice.on('transcript', text => console.log(text))
voice.on('speaking', playing => ...)
voice.on('progress', ({ progress, duration, elapsed }) => ...)
voice.on('playbackEnd', () => ...)
voice.on('listening', active => ...)
voice.on('error', err => ...)
```

## Providers

### OpenAI (default)

```js
const voice = AgenticVoice.createVoice({
  tts: { 
    provider: 'openai',  // or omit (default)
    apiKey: 'sk-...',
    voice: 'alloy',
    model: 'tts-1'
  }
})
```

### ElevenLabs

```js
const voice = AgenticVoice.createVoice({
  tts: { 
    provider: 'elevenlabs',
    apiKey: 'xi_...',
    voice: 'Rachel',  // voice ID
    model: 'eleven_turbo_v2_5'
  }
})

await voice.speak('Hello world')
```

**Available voices:** Get voice IDs from [ElevenLabs Voice Library](https://elevenlabs.io/voice-library)

## API

### `createVoice(options)`

| Option | Type | Description |
|--------|------|-------------|
| `tts` | `object\|false` | TTS config (or `false` to disable) |
| `stt` | `object\|false` | STT config (or `false` to disable) |

### TTS Config

| Option | Default | Description |
|--------|---------|-------------|
| `provider` | `openai` | `'openai'` or `'elevenlabs'` |
| `baseUrl` | `https://api.openai.com` | OpenAI-compatible API base |
| `apiKey` | — | API key |
| `model` | `tts-1` | TTS model |
| `voice` | `alloy` | Voice name/ID |
| `format` | `mp3` | Response format |
| `proxyUrl` | — | CORS proxy URL |

### STT Config

| Option | Default | Description |
|--------|---------|-------------|
| `mode` | `browser` | `'browser'` (Web Speech API) or `'whisper'` |
| `baseUrl` | `https://api.openai.com` | Whisper API base |
| `apiKey` | — | API key (whisper mode) |
| `language` | `zh-CN` | Language code |
| `model` | `whisper-1` | Whisper model |
| `minHoldMs` | `300` | Minimum hold time for push-to-talk |

### Voice Instance

| Method | Description |
|--------|-------------|
| `speak(text, opts?)` | Speak text (async, resolves when done) |
| `fetchAudio(text, opts?)` | Fetch TTS audio as ArrayBuffer without playing |
| `playBuffer(arrayBuffer)` | Play an already-fetched ArrayBuffer |
| `timestamps(text, opts?)` | Get word-level timestamps + audio buffer |
| `stop()` | Stop speaking |
| `startListening()` | Start recording (push-to-talk) |
| `stopListening()` | Stop recording, trigger transcription |
| `transcribe(input, opts?)` | Transcribe audio (Blob in browser, path/Buffer in Node) |
| `transcribeWithTimestamps(input)` | Transcribe with word-level `{ word, start, end }` |
| `unlock()` | Unlock AudioContext (call on user gesture) |
| `on(event, fn)` | Listen to events |
| `off(event, fn)` | Remove listener |
| `isSpeaking` | `boolean` — currently speaking? |
| `isListening` | `boolean` — currently listening? |
| `progress` | `number` — playback progress 0-1 |
| `duration` | `number` — audio duration in seconds |
| `destroy()` | Cleanup |

### Events

| Event | Data | When |
|-------|------|------|
| `transcript` | `string` | Speech recognized |
| `speaking` | `boolean` | TTS started/stopped |
| `progress` | `{ progress, duration, elapsed }` | Playback progress (0-1) |
| `playbackEnd` | — | Audio finished playing |
| `listening` | `boolean` | Recording started/stopped |
| `error` | `Error` | Any error |

### Standalone Components

```js
// TTS only (with progress)
const tts = AgenticVoice.createTTS({ apiKey: '...', voice: 'nova' })
tts.onProgress(({ progress }) => console.log(`${Math.round(progress * 100)}%`))
tts.onEnd(() => console.log('done'))
await tts.speak('Hello')

// Fetch + play separately (for pre-caching)
const buffer = await tts.fetchAudio('Hello')
await tts.playBuffer(buffer)

// Word timestamps (TTS → Whisper round-trip)
const { words, audio } = await tts.timestamps('Hello')
// words = [{ word: 'Hello', start: 0.0, end: 0.32 }]

// STT only
const stt = AgenticVoice.createSTT({ mode: 'whisper', apiKey: '...' })
stt.startListening(text => console.log(text), err => console.error(err))
stt.stopListening()

// Transcribe with timestamps
const result = await stt.transcribeWithTimestamps(audioBlob)
// { words: [{ word, start, end }], text, duration }
```

## Features

- **Playback progress** — real-time 0-1 progress via AudioContext RAF or Audio element
- **Generation tracking** — prevents stale audio from playing on rapid speak() calls
- **Word-level timestamps** — Whisper `verbose_json` with word granularity
- **Fetch/play split** — pre-cache audio, play when ready
- **Retry with backoff** — handles intermittent CORS/network issues
- **webm→wav conversion** — auto-converts for Whisper API compatibility
- **AudioContext + Audio fallback** — works across browsers
- **Push-to-talk** — minimum hold time prevents accidental triggers
- **Node.js STT** — file path or Buffer input with raw HTTP (no FormData)

## Part of the agentic family

- [agentic-core](https://github.com/momomo-agent/agentic-core) — LLM engine
- [agentic-claw](https://github.com/momomo-agent/agentic-claw) — Agent runtime
- [agentic-memory](https://github.com/momomo-agent/agentic-memory) — Conversation + knowledge
- [agentic-store](https://github.com/momomo-agent/agentic-store) — Persistence
- [agentic-render](https://github.com/momomo-agent/agentic-render) — Streaming UI
- **agentic-voice** — Speech (this)
