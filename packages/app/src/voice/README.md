# Native Voice Mode

This folder documents the first native voice implementation for OpenCode's app surface.

## Goals

- Add a built-in `/voice` command to the app composer.
- Let users dictate prompts with browser speech recognition.
- Let OpenCode read assistant replies back with browser speech synthesis.
- Keep the first rollout app-only so web and desktop can share the same implementation.

## Rollout plan

1. Add persisted voice settings and browser speech/TTS utilities.
2. Wire `/voice` into the composer command system and expose a mic control.
3. Auto-send dictated prompts when enabled.
4. Auto-speak completed assistant replies when enabled.
5. Add tests for the new browser voice helpers.

## Scope

This rollout intentionally excludes:

- TUI microphone capture
- wake-word support
- streaming TTS
- Whisper/local STT providers
- server-side voice routes

Those can build on top of the app experience later.

## Device selection notes

- The settings UI now stores a preferred microphone and speaker selection.
- Settings also expose `Test mic` and `Test speakers` actions for a quick browser-level check.
- `Test mic` now validates raw audio capture level instead of relying on browser speech recognition, which is a more reliable signal that the microphone is actually live.
- Raw audio capture now honors the selected microphone with `getUserMedia({ audio: { deviceId } })` when the browser supports it.
- Dictation no longer depends on the browser Web Speech API. The app now records microphone audio with `MediaRecorder`, sends it to OpenCode server-side transcription, and inserts the returned text.
- This matches the article's main architectural idea: own the audio pipeline, batch recorded chunks, transcribe server-side, and keep browser APIs only for capture/playback.
- On the web, `enumerateDevices()` can list `audioinput` and `audiooutput` devices after permission is granted.
- Browser speech recognition APIs do not expose a standard way to bind recognition to a specific microphone, so the microphone picker is currently advisory only.
- Browser speech synthesis also does not provide reliable speaker routing. True output routing would require an `HTMLAudioElement.setSinkId()` pipeline or desktop-native support.
- The saved device preferences are groundwork for a later desktop/TUI implementation where OpenCode controls the capture and playback stack directly.
