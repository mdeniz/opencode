import { formatServerError } from "@/utils/server-errors"
import type { ServerConnection } from "@/context/server"

function headers(server?: ServerConnection.HttpBase) {
  const out: Record<string, string> = { "content-type": "application/json" }
  if (!server?.password) return out
  out.Authorization = `Basic ${btoa(`${server.username ?? "opencode"}:${server.password}`)}`
  return out
}

export async function transcribeVoice(input: {
  server: ServerConnection.HttpBase
  audio: Blob
  language?: string
}) {
  const bytes = new Uint8Array(await input.audio.arrayBuffer())
  const audio = btoa(String.fromCharCode(...bytes))
  const res = await fetch(`${input.server.url.replace(/\/$/, "")}/voice/transcribe`, {
    method: "POST",
    headers: headers(input.server),
    body: JSON.stringify({
      audio,
      mime: input.audio.type || "audio/webm",
      language: input.language,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => undefined)
    throw new Error(formatServerError(err ?? new Error(res.statusText)))
  }

  return (await res.json()) as {
    text: string
    providerID: string
    modelID: string
  }
}
