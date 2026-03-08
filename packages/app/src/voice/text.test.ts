import { describe, expect, test } from "bun:test"
import { assistantVoiceText, cleanVoiceText } from "./text"

describe("voice text", () => {
  test("removes markdown and code noise for speech", () => {
    const result = cleanVoiceText("# Title\n- item\n`code`\n```ts\nconst x = 1\n```\n[docs](https://example.com)")
    expect(result).toBe("Title item code code block omitted docs")
  })

  test("extracts only real assistant text parts", () => {
    const result = assistantVoiceText([
      { type: "text", id: "a", text: "Hello **world**", synthetic: false, ignored: false },
      { type: "text", id: "b", text: "ignored", synthetic: true, ignored: false },
    ] as any)
    expect(result).toBe("Hello **world**")
  })
})
