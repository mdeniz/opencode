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
