import { Hono } from "hono"
import { describeRoute, resolver } from "hono-openapi"
import z from "zod"
import { Config } from "../../config/config"
import { Provider } from "../../provider/provider"
import { Auth } from "../../auth"
import { errors } from "../error"
import { lazy } from "../../util/lazy"

const Body = z
  .object({
    audio: z.string().min(1),
    mime: z.string().min(1),
    language: z.string().optional(),
    model: z.string().optional(),
  })
  .meta({ ref: "VoiceTranscribeBody" })

const Resp = z
  .object({
    text: z.string(),
    providerID: z.string(),
    modelID: z.string(),
  })
  .meta({ ref: "VoiceTranscribeResponse" })

async function resolve() {
  const cfg = await Config.get()
  const providers = await Provider.list()
  const ids = [cfg.provider?.openai ? "openai" : undefined, cfg.provider?.opencode ? "opencode" : undefined, ...Object.keys(providers)].filter(
    (x): x is string => !!x,
  )

  for (const pid of ids) {
    const info = providers[pid]
    if (!info) continue
    const auth = info.key ?? (await Auth.get(pid).then((x) => (x?.type === "api" ? x.key : undefined)))
    if (!auth) continue
    const model = Object.values(info.models).find((item) => item.capabilities.input.audio)
    if (!model) continue
    return { pid, info, auth, model }
  }
}

export const VoiceRoutes = lazy(() =>
  new Hono().post(
    "/transcribe",
    describeRoute({
      summary: "Transcribe voice audio",
      description: "Transcribe recorded microphone audio using an audio-capable provider.",
      operationId: "voice.transcribe",
      responses: {
        200: {
          description: "Transcribed text",
          content: {
            "application/json": {
              schema: resolver(Resp),
            },
          },
        },
        ...errors(400),
      },
    }),
    async (c) => {
      const body = await c.req.json().then((x) => Body.parse(x))
      const found = await resolve()
      if (!found) {
        const auth = await Auth.all()
        return c.json(
          {
            data: null,
            errors: [
              {
                message: `No audio transcription provider configured. Connected auth providers: ${Object.keys(auth).join(", ") || "none"}`,
              },
            ],
            success: false,
          },
          400,
        )
      }

      const url = String(found.info.options.baseURL ?? found.model.api.url ?? "https://api.openai.com/v1").replace(/\/$/, "")
      const ext = body.mime.includes("ogg") ? "ogg" : body.mime.includes("mp4") ? "m4a" : "webm"
      const form = new FormData()
      form.append("file", new File([Buffer.from(body.audio, "base64")], `voice.${ext}`, { type: body.mime }))
      form.append("model", body.model || found.model.api.id)
      if (body.language && body.language !== "auto") form.append("language", body.language)

      const res = await fetch(`${url}/audio/transcriptions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${found.auth}`,
        },
        body: form,
      })

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText)
        return c.json({ data: null, errors: [{ message: text || "Transcription failed" }], success: false }, 400)
      }

      const json = (await res.json()) as { text?: string }
      return c.json({
        text: json.text ?? "",
        providerID: found.pid,
        modelID: found.model.id,
      })
    },
  ),
)
