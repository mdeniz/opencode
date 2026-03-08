import { describe, expect, test } from "bun:test"
import { voiceConstraints } from "./input"

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
})
