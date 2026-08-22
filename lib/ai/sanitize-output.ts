export function sanitizeModelOutput(content: string): string {
  return content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}
