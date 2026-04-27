export type AIMessage = { role: "user" | "assistant"; content: string };

export function buildAIMessages(prompt: string, currentCode: string): AIMessage[] {
  const messages: AIMessage[] = [];

  if (currentCode) {
    messages.push({
      role: "user",
      content: `Current diagram code:\n\`\`\`mermaid\n${currentCode}\n\`\`\``,
    });
    messages.push({
      role: "assistant",
      content: "I can see the current diagram. How would you like me to modify it?",
    });
  }

  messages.push({ role: "user", content: prompt });
  return messages;
}
