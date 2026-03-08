import type { Part, TextPart } from "@opencode-ai/sdk/v2"

function text(parts: Part[]) {
  return parts
    .filter((part): part is TextPart => part.type === "text")
    .filter((part) => !part.synthetic && !part.ignored)
    .map((part) => part.text)
    .join("\n")
}

export function cleanVoiceText(input: string) {
  return input
    .replace(/```[\s\S]*?```/g, " code block omitted ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!?\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\|/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function assistantVoiceText(parts: Part[]) {
  return cleanVoiceText(text(parts))
}
