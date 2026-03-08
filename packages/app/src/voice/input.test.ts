import { describe, expect, test } from "bun:test"
import { preferredMime, voiceConstraints } from "./input"

describe("voice input constraints", () => {
  test("uses generic audio constraints for default device", () => {
    expect(voiceConstraints()).toEqual({
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    })
  })

  test("pins a selected microphone with exact device id", () => {
    expect(voiceConstraints("mic-1")).toEqual({
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      deviceId: { exact: "mic-1" },
    })
  })

  test("returns undefined when media recorder is unavailable", () => {
    const prev = (globalThis as any).MediaRecorder
    ;(globalThis as any).MediaRecorder = undefined
    expect(preferredMime()).toBeUndefined()
    ;(globalThis as any).MediaRecorder = prev
  })
})
