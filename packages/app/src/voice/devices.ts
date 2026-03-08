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
  const ctor = typeof window === "undefined" ? undefined : ((window as any).webkitSpeechRecognition ?? (window as any).SpeechRecognition)
  if (!ctor) {
    opts?.onError?.("unsupported")
    return false
  }

  const rec = new ctor()
  rec.continuous = false
  rec.interimResults = false
  rec.maxAlternatives = 1
  rec.lang = typeof navigator === "undefined" ? "en-US" : navigator.language || "en-US"

  return await new Promise<boolean>((resolve) => {
    rec.onresult = (event: any) => {
      const text = event.results?.[0]?.[0]?.transcript?.trim() || ""
      opts?.onDone?.(text)
      resolve(true)
    }
    rec.onerror = (event: any) => {
      opts?.onError?.(event.error || "unknown")
      resolve(false)
    }
    rec.onend = () => resolve(true)
    rec.start()
  })
}
