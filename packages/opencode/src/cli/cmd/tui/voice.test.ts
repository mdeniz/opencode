import { describe, expect, test } from "bun:test"
import { detectLang, splitLang, splitText, voiceText } from "./voice"

describe("tui voice helpers", () => {
  test("splits long text into bounded chunks", () => {
    const text = "hello ".repeat(100)
    const out = splitText(text)
    expect(out.length).toBeGreaterThan(1)
    expect(out.every((x) => x.length <= 240)).toBe(true)
  })

  test("detects spanish and english segments", () => {
    expect(detectLang("hola, gracias por venir")).toBe("es")
    expect(detectLang("hello and thanks for coming")).toBe("en")
  })

  test("keeps mixed-language chunks segmented", () => {
    const out = splitLang("Hola equipo. We should ship this today. Gracias.")
    expect(out.length).toBeGreaterThanOrEqual(2)
  })

  test("keeps voice response note available for guidance", () => {
    expect(voiceText("strong", "es")).toContain("text to speech")
  })
})
