import { beforeEach, describe, expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { createVoicePlayer } from "./tts"

describe("voice player", () => {
  beforeEach(() => {
    const events: string[] = []
    ;(globalThis as any).SpeechSynthesisUtterance = class {
      text: string
      lang = ""
      onstart?: () => void
      onend?: () => void
      onerror?: () => void
      constructor(text: string) {
        this.text = text
      }
    }
    ;(globalThis as any).window = Object.assign(globalThis.window ?? {}, {
      speechSynthesis: {
        speak(utter: any) {
          events.push(utter.text)
          utter.onstart?.()
          utter.onend?.()
        },
        cancel() {
          events.push("cancel")
        },
      },
    })
    ;(globalThis as any).__voice_events = events
  })

  test("speaks cleaned text when synthesis is available", () => {
    createRoot((dispose) => {
      const player = createVoicePlayer({ lang: () => "en-US" })
      expect(player.speak("Hello `world`")).toBe(true)
      expect((globalThis as any).__voice_events).toEqual(["cancel", "Hello world"])
      dispose()
    })
  })
})
