/**
 * agentic-voice — Speech for AI apps
 * TTS (text-to-speech) + STT (speech-to-text) in one library.
 * Zero dependencies. Browser + Node.js.
 *
 * Usage:
 *   const voice = AgenticVoice.createVoice({
 *     tts: { baseUrl: 'https://api.openai.com', apiKey: 'sk-...', voice: 'alloy' },
 *     stt: { mode: 'browser' },  // or 'whisper'
 *   })
 *
 *   // Text-to-Speech
 *   await voice.speak('Hello world')
 *   voice.stop()
 *
 *   // Speech-to-Text (push-to-talk)
 *   voice.startListening()
 *   voice.stopListening()  // → emits 'transcript' event
 *
 *   // Events
 *   voice.on('transcript', text => console.log(text))
 *   voice.on('speaking', playing => ...)
 *   voice.on('error', err => ...)
 *
 * Browser:
 *   <script src="agentic-voice/voice.js"></script>
 *   const voice = AgenticVoice.createVoice({ ... })
 */
;(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory()
  else if (typeof define === 'function' && define.amd) define(factory)
  else root.AgenticVoice = factory()
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict'

  // ── Event emitter ────────────────────────────────────────────────

  function createEmitter() {
    const listeners = {}
    return {
      on(event, fn) {
        if (!listeners[event]) listeners[event] = []
        listeners[event].push(fn)
        return this
      },
      off(event, fn) {
        if (!listeners[event]) return this
        listeners[event] = listeners[event].filter(f => f !== fn)
        return this
      },
      emit(event, ...args) {
        if (listeners[event]) {
          for (const fn of listeners[event]) {
            try { fn(...args) } catch (e) { console.error('[voice]', e) }
          }
        }
      }
    }
  }

  // ── TTS Engine ───────────────────────────────────────────────────

  function createTTS(config = {}) {
    const {
      baseUrl = 'https://api.openai.com',
      apiKey = '',
      model = 'tts-1',
      voice = 'alloy',
      format = 'mp3',
      proxyUrl = null,
    } = config

    let audioCtx = null
    let currentSource = null
    let generation = 0

    function getAudioCtx() {
      if (!audioCtx) audioCtx = new (globalThis.AudioContext || globalThis.webkitAudioContext)()
      return audioCtx
    }

    function cleanUrl(url) {
      return (url || '').trim().replace(/\/+$/, '').replace(/\/v1$/, '')
    }

    async function speak(text, opts = {}) {
      if (!text?.trim()) return false
      if (!apiKey) throw new Error('TTS apiKey required')

      const gen = ++generation

      // Stop previous
      stop()

      const base = cleanUrl(opts.baseUrl || baseUrl)
      const url = `${base}/v1/audio/speech`
      const targetUrl = proxyUrl ? proxyUrl : url
      const headers = {
        'Authorization': `Bearer ${opts.apiKey || apiKey}`,
        'Content-Type': 'application/json',
      }
      if (proxyUrl) headers['X-Target-URL'] = url

      const body = JSON.stringify({
        model: opts.model || model,
        voice: opts.voice || voice,
        input: text,
        response_format: opts.format || format,
      })

      // Fetch with retry
      let res, lastErr
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          res = await fetch(targetUrl, { method: 'POST', headers, body })
          break
        } catch (err) {
          lastErr = err
          if (attempt < 2) await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
        }
      }
      if (!res) throw lastErr
      if (gen !== generation) return false
      if (!res.ok) throw new Error(`TTS failed: ${res.status} ${res.statusText}`)

      const arrayBuffer = await res.arrayBuffer()
      if (gen !== generation) return false
      if (arrayBuffer.byteLength === 0) return false

      // Play via AudioContext
      const ctx = getAudioCtx()
      if (ctx.state === 'suspended') await ctx.resume()

      try {
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0))
        if (gen !== generation) return false

        const source = ctx.createBufferSource()
        source.buffer = audioBuffer
        source.connect(ctx.destination)

        return new Promise(resolve => {
          source.onended = () => {
            currentSource = null
            resolve(true)
          }
          currentSource = source
          source.start(0)
        })
      } catch {
        // Fallback: Audio element
        if (gen !== generation) return false
        const blob = new Blob([arrayBuffer], { type: `audio/${format}` })
        const blobUrl = URL.createObjectURL(blob)
        const audio = new Audio(blobUrl)

        return new Promise((resolve, reject) => {
          audio.onended = () => {
            URL.revokeObjectURL(blobUrl)
            currentSource = null
            resolve(true)
          }
          audio.onerror = (e) => {
            URL.revokeObjectURL(blobUrl)
            currentSource = null
            reject(new Error('Audio playback failed'))
          }
          currentSource = audio
          audio.play().catch(reject)
        })
      }
    }

    function stop() {
      generation++
      if (currentSource) {
        try {
          if (currentSource.stop) currentSource.stop()
          else if (currentSource.pause) currentSource.pause()
        } catch {}
        currentSource = null
      }
    }

    function unlock() {
      const ctx = getAudioCtx()
      if (ctx.state === 'suspended') ctx.resume()
    }

    function destroy() {
      stop()
      if (audioCtx) { try { audioCtx.close() } catch {} }
      audioCtx = null
    }

    return { speak, stop, unlock, destroy, get isSpeaking() { return !!currentSource } }
  }

  // ── STT Engine ───────────────────────────────────────────────────

  function createSTT(config = {}) {
    const {
      mode = 'browser',  // 'browser' (Web Speech API) or 'whisper'
      baseUrl = 'https://api.openai.com',
      apiKey = '',
      language = 'zh-CN',
      model = 'whisper-1',
      proxyUrl = null,
      minHoldMs = 300,
    } = config

    let mediaRecorder = null
    let webSpeechRecognition = null
    let micDownTime = 0
    let micReleased = false

    function cleanUrl(url) {
      return (url || '').trim().replace(/\/+$/, '').replace(/\/v1$/, '')
    }

    // ── Web Speech API ──

    function startWebSpeech(onResult, onError) {
      if (webSpeechRecognition) return
      const SR = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition
      if (!SR) { onError?.(new Error('Web Speech API not supported')); return false }

      micDownTime = Date.now()
      const recognition = new SR()
      recognition.lang = language.replace('_', '-')
      recognition.interimResults = false

      recognition.onresult = e => {
        const text = e.results[0]?.[0]?.transcript?.trim()
        webSpeechRecognition = null
        if (text) onResult?.(text)
        else onError?.(new Error('No speech detected'))
      }
      recognition.onerror = e => {
        webSpeechRecognition = null
        onError?.(new Error('Recognition error: ' + e.error))
      }
      recognition.onend = () => {
        webSpeechRecognition = null
      }

      webSpeechRecognition = recognition
      recognition.start()
      return true
    }

    function stopWebSpeech() {
      if (!webSpeechRecognition) return
      const held = Date.now() - micDownTime
      if (held < minHoldMs) {
        webSpeechRecognition.abort()
        webSpeechRecognition = null
        return
      }
      webSpeechRecognition.stop()
    }

    // ── Whisper API ──

    async function webmToWav(blob) {
      const ctx = new (globalThis.AudioContext || globalThis.webkitAudioContext)()
      const arrayBuffer = await blob.arrayBuffer()
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
      const samples = audioBuffer.getChannelData(0)
      const sampleRate = audioBuffer.sampleRate
      const buffer = new ArrayBuffer(44 + samples.length * 2)
      const view = new DataView(buffer)
      const writeStr = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)) }
      writeStr(0, 'RIFF')
      view.setUint32(4, 36 + samples.length * 2, true)
      writeStr(8, 'WAVE')
      writeStr(12, 'fmt ')
      view.setUint32(16, 16, true)
      view.setUint16(20, 1, true)
      view.setUint16(22, 1, true)
      view.setUint32(24, sampleRate, true)
      view.setUint32(28, sampleRate * 2, true)
      view.setUint16(32, 2, true)
      view.setUint16(34, 16, true)
      writeStr(36, 'data')
      view.setUint32(40, samples.length * 2, true)
      for (let i = 0; i < samples.length; i++) {
        const s = Math.max(-1, Math.min(1, samples[i]))
        view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
      }
      ctx.close()
      return new Blob([buffer], { type: 'audio/wav' })
    }

    function startWhisper(onResult, onError) {
      if (mediaRecorder) return false
      micDownTime = Date.now()
      micReleased = false

      if (!navigator.mediaDevices?.getUserMedia) {
        onError?.(new Error('getUserMedia not available (HTTPS required)'))
        return false
      }

      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        if (micReleased) {
          stream.getTracks().forEach(t => t.stop())
          return
        }

        const chunks = []
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
        mediaRecorder.ondataavailable = e => chunks.push(e.data)
        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach(t => t.stop())
          const held = Date.now() - micDownTime
          mediaRecorder = null

          if (held < minHoldMs) return

          const blob = new Blob(chunks, { type: 'audio/webm' })
          try {
            const text = await transcribe(blob)
            if (text) onResult?.(text)
            else onError?.(new Error('No speech detected'))
          } catch (e) {
            onError?.(e)
          }
        }

        mediaRecorder.start()
      }).catch(e => {
        onError?.(new Error('Microphone unavailable: ' + e.message))
      })

      return true
    }

    function stopWhisper() {
      micReleased = true
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop()
      }
    }

    async function transcribe(input) {
      const base = cleanUrl(baseUrl)
      if (!base || !apiKey) throw new Error('STT baseUrl and apiKey required')

      const url = `${base}/v1/audio/transcriptions`
      const headers = { 'Authorization': `Bearer ${apiKey}` }

      // Node.js: input is file path (string) or Buffer
      const isNode = typeof globalThis.window === 'undefined'
      if (isNode && (typeof input === 'string' || Buffer.isBuffer(input))) {
        const fs = require('fs')
        const FormDataNode = require('form-data')
        const form = new FormDataNode()
        if (typeof input === 'string') {
          // File path
          form.append('file', fs.createReadStream(input), { filename: 'audio.wav' })
        } else {
          // Buffer
          form.append('file', input, { filename: 'audio.wav', contentType: 'audio/wav' })
        }
        form.append('model', model)
        form.append('language', language.split('-')[0])

        const http = url.startsWith('https') ? require('https') : require('http')
        const parsed = new (require('url').URL)(url)
        return new Promise((resolve, reject) => {
          const req = http.request({
            hostname: parsed.hostname,
            port: parsed.port || (url.startsWith('https') ? 443 : 80),
            path: parsed.pathname,
            method: 'POST',
            headers: { ...form.getHeaders(), ...headers },
            timeout: 30000,
          }, (res) => {
            let data = ''
            res.on('data', c => data += c)
            res.on('end', () => {
              try {
                const result = JSON.parse(data)
                resolve(result.text?.trim() || '')
              } catch { reject(new Error('Failed to parse transcription response')) }
            })
          })
          req.on('error', reject)
          req.on('timeout', () => { req.destroy(); reject(new Error('Transcription timeout')) })
          form.pipe(req)
        })
      }

      // Browser: input is Blob
      const wavBlob = await webmToWav(input)
      const form = new FormData()
      form.append('file', wavBlob, 'audio.wav')
      form.append('model', model)
      form.append('language', language.split('-')[0])

      const res = await fetch(url, { method: 'POST', headers, body: form })
      if (!res.ok) throw new Error(`Transcription failed: ${res.status}`)

      const ct = res.headers.get('content-type') || ''
      if (!ct.includes('json')) throw new Error('Transcription service unavailable')

      const { text } = await res.json()
      return text?.trim() || ''
    }

    // ── Public API ──

    function startListening(onResult, onError) {
      if (mode === 'browser') return startWebSpeech(onResult, onError)
      return startWhisper(onResult, onError)
    }

    function stopListening() {
      if (mode === 'browser') stopWebSpeech()
      else stopWhisper()
    }

    function destroy() {
      stopListening()
    }

    return {
      startListening,
      stopListening,
      transcribe,
      destroy,
      get isListening() { return !!(mediaRecorder || webSpeechRecognition) },
    }
  }

  // ── createVoice ──────────────────────────────────────────────────

  function createVoice(options = {}) {
    const events = createEmitter()
    const tts = options.tts !== false ? createTTS(options.tts || {}) : null
    const stt = options.stt !== false ? createSTT(options.stt || {}) : null

    // Mutual exclusion: stop TTS when user starts speaking
    let _speaking = false

    const voice = {
      /** Speak text aloud */
      async speak(text, opts) {
        if (!tts) throw new Error('TTS not configured')
        if (stt?.isListening) return false  // user is recording

        _speaking = true
        events.emit('speaking', true)
        try {
          await tts.speak(text, opts)
        } finally {
          _speaking = false
          events.emit('speaking', false)
        }
      },

      /** Stop speaking */
      stop() {
        if (tts) tts.stop()
        _speaking = false
        events.emit('speaking', false)
      },

      /** Start listening (push-to-talk) */
      startListening() {
        if (!stt) throw new Error('STT not configured')
        // Stop TTS when user starts talking
        if (tts) tts.stop()
        _speaking = false

        events.emit('listening', true)
        stt.startListening(
          (text) => {
            events.emit('listening', false)
            events.emit('transcript', text)
          },
          (err) => {
            events.emit('listening', false)
            events.emit('error', err)
          }
        )
      },

      /** Stop listening */
      stopListening() {
        if (stt) stt.stopListening()
        events.emit('listening', false)
      },

      /** Transcribe an audio blob directly */
      async transcribe(blob) {
        if (!stt) throw new Error('STT not configured')
        return stt.transcribe(blob)
      },

      /** Unlock audio context (call on user gesture) */
      unlock() { if (tts) tts.unlock() },

      /** Events */
      on(event, fn) { events.on(event, fn); return this },
      off(event, fn) { events.off(event, fn); return this },

      /** State */
      get isSpeaking() { return _speaking },
      get isListening() { return stt?.isListening || false },

      /** Cleanup */
      destroy() {
        if (tts) tts.destroy()
        if (stt) stt.destroy()
      },
    }

    return voice
  }

  return { createVoice, createTTS, createSTT }
})
