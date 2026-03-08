import { describe, expect, test } from "bun:test"

describe("settings voice defaults", () => {
  test("persists voice defaults in source", async () => {
    const mod = await import("./settings")
    const text = Bun.file(new URL("./settings.tsx", import.meta.url)).text()
    await expect(text).resolves.toContain('enabled: false')
    expect(typeof mod.useSettings).toBe("function")
  })
})
