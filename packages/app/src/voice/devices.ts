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
