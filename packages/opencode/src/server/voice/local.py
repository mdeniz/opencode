#!/usr/bin/env python3
import argparse
import base64
import json
import os
import sys
import tempfile


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default=os.environ.get("OPENCODE_VOICE_LOCAL_MODEL", "base"))
    parser.add_argument("--language", default=None)
    args = parser.parse_args()

    payload = json.loads(sys.stdin.read() or "{}")
    audio = payload.get("audio")
    if not audio:
      print(json.dumps({"error": "missing audio"}))
      return 1

    try:
      from faster_whisper import WhisperModel
    except Exception as err:
      print(json.dumps({"error": f"faster-whisper unavailable: {err}"}))
      return 1

    raw = base64.b64decode(audio)
    suffix = ".ogg" if "ogg" in payload.get("mime", "") else ".m4a" if "mp4" in payload.get("mime", "") else ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
      tmp.write(raw)
      name = tmp.name

    try:
      model = WhisperModel(args.model, device="cpu", compute_type="int8")
      segs, _ = model.transcribe(name, language=args.language if args.language and args.language != "auto" else None)
      text = " ".join(seg.text.strip() for seg in segs).strip()
      print(json.dumps({"text": text}))
      return 0
    finally:
      try:
        os.unlink(name)
      except OSError:
        pass


if __name__ == "__main__":
    raise SystemExit(main())
