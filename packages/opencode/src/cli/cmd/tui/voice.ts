import { Global } from "@/global"
import path from "path"
import { Filesystem } from "@/util/filesystem"
import { Process } from "@/util/process"
import { mkdir } from "fs/promises"

export const VOICE_NOTE = {
  light: {
    auto: "System note: the user is listening through text to speech. Write for listening with short sentences, natural punctuation, and direct phrasing. Match the spoken language naturally.",
    es: "Nota del sistema: la persona escuchara la respuesta con text to speech. Escribe para ser oido con frases cortas, puntuacion natural y lenguaje directo.",
    en: "System note: the user is listening through text to speech. Write for listening with short sentences, natural punctuation, and direct phrasing. Answer in natural English for speech.",
  },
  strong: {
    auto: "System note: the user is listening through text to speech. Rewrite for listening, not scanning. Use short sentences, simple structure, natural punctuation, and direct spoken phrasing. Avoid long lists, tables, markdown-heavy formatting, and code blocks unless explicitly requested. Match the spoken language naturally.",
    es: "Nota del sistema: la persona escuchara la respuesta con text to speech. Reescribe para ser oido, no para escanear visualmente. Usa frases cortas, estructura simple, puntuacion natural y lenguaje directo. Evita listas largas, tablas, markdown recargado y bloques de codigo salvo que se pidan. Responde en un espanol natural para voz.",
    en: "System note: the user is listening through text to speech. Rewrite for listening, not scanning. Use short sentences, simple structure, natural punctuation, and direct spoken phrasing. Avoid long lists, tables, markdown-heavy formatting, and code blocks unless explicitly requested. Answer in natural English for speech.",
  },
} as const

export function voiceFile(name: string) {
  const dir = path.join(Global.Path.state, "voice")
  return path.join(dir, name)
}

export async function ensureVoiceDir() {
  const dir = path.join(Global.Path.state, "voice")
  await mkdir(dir, { recursive: true })
  return dir
}

export async function logVoice(name: string, data: unknown) {
  const dir = await ensureVoiceDir()
  const file = path.join(dir, `${name}.json`)
  await Filesystem.writeJson(file, {
    time: new Date().toISOString(),
    data,
  })
  return file
}

export function voiceText(style: "light" | "strong", lang: "auto" | "es" | "en") {
  return VOICE_NOTE[style][lang]
}

export async function recordAudio(file: string) {
  const bin = process.platform === "linux" ? (await Bun.which("pw-record")) || (await Bun.which("arecord")) : undefined
  if (!bin) throw new Error("No terminal audio recorder found. Install pw-record or arecord.")
  const args =
    path.basename(bin) === "pw-record"
      ? [file, "--rate", "16000", "--channels", "1", "--format", "s16"]
      : ["-q", "-f", "S16_LE", "-r", "16000", "-c", "1", file]
  return Process.spawn([bin, ...args], {
    stdout: "ignore",
    stderr: "pipe",
  })
}

export async function compactAudio(input: string, output: string) {
  const ffmpeg = await Bun.which("ffmpeg")
  if (!ffmpeg) throw new Error("ffmpeg is required to compact CLI voice recordings.")
  await Process.run([ffmpeg, "-y", "-i", input, "-ac", "1", "-ar", "16000", "-t", "15", output], { nothrow: true })
  return output
}

export function watch(file: string, ms: number, cb: () => void) {
  const loop = setInterval(async () => {
    const ffmpeg = await Bun.which("ffmpeg")
    if (!ffmpeg) return
    const out = await Process.run(
      [ffmpeg, "-i", file, "-af", "silencedetect=noise=-35dB:d=0.3", "-f", "null", "-"],
      { nothrow: true },
    ).catch(() => undefined)
    const text = out?.stderr.toString() || ""
    const hit = text.match(/silence_end: ([0-9.]+) \| silence_duration: ([0-9.]+)/g)?.at(-1)
    if (!hit) return
    const dur = Number(hit.match(/silence_duration: ([0-9.]+)/)?.[1] || 0) * 1000
    if (dur >= ms) cb()
  }, 600)
  return () => clearInterval(loop)
}

export function detectLang(text: string) {
  const ascii = text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  const es = /(\b(el|la|los|las|de|que|para|con|una|uno|como|esto|esta|estoy|puedo|quiero|gracias)\b|[¿¡ñáéíóú])/i.test(text)
  const en = /(\b(the|and|with|this|that|you|your|can|will|please|thanks|what|how)\b)/i.test(ascii)
  if (es && !en) return "es" as const
  if (en && !es) return "en" as const
  return "en" as const
}

export function splitLang(text: string) {
  const chunks = splitText(text)
  return chunks.map((text) => ({ text, lang: detectLang(text) }))
}

export function splitText(text: string) {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
    ?.flatMap((item) => {
      if (item.length <= 240) return [item.trim()]
      return item.match(/.{1,220}(?:\s|$)/g)?.map((x) => x.trim()).filter(Boolean) ?? []
    }) ?? []
}

export async function speakText(text: string, file: string) {
  const ffmpeg = await Bun.which("ffmpeg")
  const ffplay = await Bun.which("ffplay")
  if (!ffmpeg || !ffplay) throw new Error("ffmpeg and ffplay are required for CLI voice playback.")
  const lang = detectLang(text)
  const py = (await Bun.which("python3")) || (await Bun.which("python"))
  const home = process.env.HOME
  const site = home ? path.join(home, ".local", "lib", "python3.10", "site-packages") : undefined
  if (py && site) {
    const out = await Process.run(
      [py, "-m", "edge_tts", "--text", text, "--write-media", file, "--voice", lang === "es" ? "es-ES-AlvaroNeural" : "en-US-AndrewNeural"],
      {
        env: {
          PYTHONPATH: site,
        },
        nothrow: true,
      },
    )
    if (out.code === 0) {
      return Process.spawn([ffplay, "-nodisp", "-autoexit", "-loglevel", "quiet", file], {
        stdout: "ignore",
        stderr: "ignore",
      })
    }
  }
  const voice = lang === "es" ? "slt" : "kal"
  await Process.run([ffmpeg, "-y", "-f", "lavfi", "-i", `flite=text='${text.replace(/'/g, " ")}':voice=${voice}`, file], { nothrow: true })
  return Process.spawn([ffplay, "-nodisp", "-autoexit", "-loglevel", "quiet", file], {
    stdout: "ignore",
    stderr: "ignore",
  })
}
