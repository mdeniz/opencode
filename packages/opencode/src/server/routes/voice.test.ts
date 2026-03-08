import { describe, expect, test } from "bun:test"
import { VoiceRoutes } from "./voice"

describe("voice routes", () => {
  test("exports a route factory", () => {
    expect(typeof VoiceRoutes).toBe("function")
  })
})
