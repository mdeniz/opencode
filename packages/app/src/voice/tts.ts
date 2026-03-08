import { createSignal, onCleanup, type Accessor } from "solid-js"
import { cleanVoiceText } from "./text"

type Opts = {
  lang?: Accessor<string | undefined>
  device?: Accessor<string | undefined>
}

export function createVoicePlayer(opts?: Opts) {
  const [speaking, setSpeaking] = createSignal(false)
  let utter: SpeechSynthesisUtterance | undefined

  const synth = () => {
    if (typeof window === "undefined") return
    return window.speechSynthesis
  }

  const supported = () => !!synth() && typeof SpeechSynthesisUtterance === "function"

  const stop = () => {
    utter = undefined
    synth()?.cancel()
    setSpeaking(false)
  }

  const speak = (input: string) => {
    const text = cleanVoiceText(input)
    if (!text || !supported()) return false

    stop()
    utter = new SpeechSynthesisUtterance(text)
    utter.lang = opts?.lang?.() || (typeof navigator === "undefined" ? "en-US" : navigator.language || "en-US")
    utter.onstart = () => setSpeaking(true)
    utter.onend = () => {
      if (!utter) return
      setSpeaking(false)
      utter = undefined
    }
    utter.onerror = () => {
      setSpeaking(false)
      utter = undefined
    }
    synth()?.speak(utter)
    return true
  }

  const device = () => opts?.device?.() || "default"

  onCleanup(stop)

  return {
    supported,
    speaking,
    device,
    speak,
    stop,
  }
}
