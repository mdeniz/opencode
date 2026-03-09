import { onCleanup, type Accessor } from "solid-js"
import { createStore } from "solid-js/store"

type Opts = {
  device?: Accessor<string | undefined>
  onSilence?: (peak: number) => void
  silence?: Accessor<number | undefined>
}

export function preferredMime() {
  if (typeof MediaRecorder === "undefined") return
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]
  return types.find((item) => MediaRecorder.isTypeSupported?.(item))
}

export function voiceConstraints(id?: string) {
  const base = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  }
  if (!id || id === "default") return base
  return {
    ...base,
    deviceId: { exact: id },
  }
}

export function createVoiceInput(opts?: Opts) {
  const [store, setStore] = createStore({
    running: false,
    level: 0,
    peak: 0,
    error: "",
  })

  let stream: MediaStream | undefined
  let ctx: AudioContext | undefined
  let raf: number | undefined
  let analyser: AnalyserNode | undefined
  let data: Uint8Array<ArrayBuffer> | undefined
  let rec: MediaRecorder | undefined
  let chunks: Blob[] = []
  let silence: number | undefined

  const supported = () => typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia

  const stop = async () => {
    if (raf !== undefined) cancelAnimationFrame(raf)
    raf = undefined
    stream?.getTracks().forEach((track) => track.stop())
    stream = undefined
    analyser = undefined
    data = undefined
    rec = undefined
    chunks = []
    silence = undefined
    const audio = ctx
    ctx = undefined
    await audio?.close().catch(() => undefined)
    setStore("running", false)
    setStore("level", 0)
  }

  const sample = () => {
    if (!analyser || !data) return
    analyser.getByteTimeDomainData(data)
    let sum = 0
    let peak = store.peak
    for (const value of data) {
      const item = Math.abs((value - 128) / 128)
      sum += item * item
      if (item > peak) peak = item
    }
    setStore("level", Math.sqrt(sum / data.length))
    setStore("peak", peak)
    const quiet = Math.sqrt(sum / data.length) < 0.015
    if (quiet && opts?.onSilence && opts?.silence?.()) {
      if (!silence) silence = window.setTimeout(() => opts.onSilence?.(store.peak), opts.silence?.())
    }
    if (!quiet && silence) {
      clearTimeout(silence)
      silence = undefined
    }
    raf = requestAnimationFrame(sample)
  }

  const start = async () => {
    if (!supported()) {
      setStore("error", "unsupported")
      return false
    }

    await stop()
    setStore("error", "")
    setStore("peak", 0)

    const next = await navigator.mediaDevices
      .getUserMedia({
        audio: voiceConstraints(opts?.device?.()),
      })
      .catch((err): undefined => {
        setStore("error", err instanceof Error ? err.message : String(err))
        return undefined
      })

    if (!next) return false
    stream = next
    if (typeof window === "undefined" || !window.AudioContext) {
      setStore("error", "unsupported")
      await stop()
      return false
    }

    ctx = new window.AudioContext()
    analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    data = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount))
    ctx.createMediaStreamSource(stream).connect(analyser)
    setStore("running", true)
    sample()
    return true
  }

  const test = async (ms = 2000) => {
    const ok = await start()
    if (!ok) return undefined
    await new Promise((resolve) => setTimeout(resolve, ms))
    const peak = store.peak
    await stop()
    return peak
  }

  const record = async (ms = 5000) => {
    const ok = stream ? true : await start()
    if (!ok || !stream) return
    if (typeof MediaRecorder === "undefined") {
      setStore("error", "unsupported")
      await stop()
      return
    }
    chunks = []
    const mime = preferredMime()
    rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
    rec.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunks.push(event.data)
    }
    rec.start()
    await new Promise((resolve) => setTimeout(resolve, ms))
    if (rec.state !== "inactive") {
      const done = new Promise<void>((resolve) => {
        if (!rec) return resolve()
        rec.onstop = () => resolve()
      })
      rec.stop()
      await done
    }
    const blob = chunks.length ? new Blob(chunks, { type: mime ?? chunks[0]?.type ?? "audio/webm" }) : undefined
    const peak = store.peak
    await stop()
    return blob ? { blob, peak } : undefined
  }

  onCleanup(() => {
    void stop()
  })

  return {
    supported,
    running: () => store.running,
    level: () => store.level,
    peak: () => store.peak,
    error: () => store.error,
    start,
    stop,
    test,
    record,
  }
}
