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

// Speech-to-Text (push-to-talk)
voice.startListening()
voice.stopListening()

// Events
voice.on('transcript', text => console.log(text))
voice.on('speaking', playing => ...)
voice.on('listening', active => ...)
voice.on('error', err => ...)
```

## API

### `createVoice(options)`

| Option | Type | Description |
|--------|------|-------------|
| `tts` | `object\|false` | TTS config (or `false` to disable) |
| `stt` | `object\|false` | STT config (or `false` to disable) |

### TTS Config

| Option | Default | Description |
|--------|---------|-------------|
| `baseUrl` | `https://api.openai.com` | OpenAI-compatible API base |
| `apiKey` | — | API key |
| `model` | `tts-1` | TTS model |
| `voice` | `alloy` | Voice name |
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
| `stop()` | Stop speaking |
| `startListening()` | Start recording (push-to-talk) |
| `stopListening()` | Stop recording, trigger transcription |
| `transcribe(blob)` | Transcribe audio blob directly |
| `unlock()` | Unlock AudioContext (call on user gesture) |
| `on(event, fn)` | Listen to events |
| `off(event, fn)` | Remove listener |
| `isSpeaking` | `boolean` — currently speaking? |
| `isListening` | `boolean` — currently listening? |
| `destroy()` | Cleanup |

### Events

| Event | Data | When |
|-------|------|------|
| `transcript` | `string` | Speech recognized |
| `speaking` | `boolean` | TTS started/stopped |
| `listening` | `boolean` | Recording started/stopped |
| `error` | `Error` | Any error |

### Standalone Components

```js
// TTS only
const tts = AgenticVoice.createTTS({ apiKey: '...', voice: 'nova' })
await tts.speak('Hello')
tts.stop()

// STT only
const stt = AgenticVoice.createSTT({ mode: 'whisper', apiKey: '...' })
stt.startListening(text => console.log(text), err => console.error(err))
stt.stopListening()
```

## Features

- **Mutual exclusion** — stops TTS when user starts recording
- **Generation tracking** — prevents stale audio from playing
- **Retry with backoff** — handles intermittent CORS issues
- **webm→wav conversion** — for Whisper API compatibility
- **AudioContext + Audio fallback** — works across browsers
- **Push-to-talk** — minimum hold time prevents accidental triggers

## Part of the agentic family

- [agentic-core](https://github.com/momomo-agent/agentic-core) — LLM engine
- [agentic-claw](https://github.com/momomo-agent/agentic-claw) — Agent runtime
- [agentic-memory](https://github.com/momomo-agent/agentic-memory) — Conversation + knowledge
- [agentic-store](https://github.com/momomo-agent/agentic-store) — Persistence
- [agentic-render](https://github.com/momomo-agent/agentic-render) — Streaming UI
- **agentic-voice** — Speech (this)
