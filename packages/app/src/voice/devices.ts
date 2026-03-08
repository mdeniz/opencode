import { createResource } from "solid-js"

export type VoiceDevice = {
  id: string
  label: string
  kind: "audioinput" | "audiooutput"
}

const sort = (items: MediaDeviceInfo[]) =>
  [...items].sort((a, b) => {
    const left = a.label || a.deviceId
    const right = b.label || b.deviceId
    return left.localeCompare(right)
  })

export function createVoiceDevices() {
  const supported = () => typeof navigator !== "undefined" && !!navigator.mediaDevices?.enumerateDevices

  const [list, actions] = createResource(async () => {
    if (!supported()) return [] as VoiceDevice[]
    const items = await navigator.mediaDevices.enumerateDevices()
    return sort(items)
      .filter((item) => item.kind === "audioinput" || item.kind === "audiooutput")
      .map((item) => ({
        id: item.deviceId,
        label: item.label || item.deviceId || "Default device",
        kind: item.kind,
      }))
  })

  return {
    supported,
    list,
    refresh: actions.refetch,
    inputs: () => (list.latest ?? []).filter((item) => item.kind === "audioinput"),
    outputs: () => (list.latest ?? []).filter((item) => item.kind === "audiooutput"),
  }
}

export async function testVoiceInput(opts?: { onDone?: (text: string) => void; onError?: (error: string) => void }) {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    opts?.onError?.("unsupported")
    return false
  }

  const stream = await navigator.mediaDevices
    .getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })
    .catch((err) => {
      opts?.onError?.(err instanceof Error ? err.message : String(err))
      return
    })

  if (!stream) return false

  const AudioCtx = typeof window === "undefined" ? undefined : window.AudioContext
  if (!AudioCtx) {
    stream.getTracks().forEach((track) => track.stop())
    opts?.onError?.("unsupported")
    return false
  }

  const ctx = new AudioCtx()
  const src = ctx.createMediaStreamSource(stream)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 2048
  src.connect(analyser)

  const data = new Uint8Array(analyser.frequencyBinCount)
  let peak = 0
  const start = performance.now()

  while (performance.now() - start < 2000) {
    analyser.getByteTimeDomainData(data)
    for (const value of data) {
      const sample = Math.abs((value - 128) / 128)
      if (sample > peak) peak = sample
    }
    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  stream.getTracks().forEach((track) => track.stop())
  await ctx.close()

  opts?.onDone?.(peak.toFixed(3))
  return peak > 0.02
}
