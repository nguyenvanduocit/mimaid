export async function createShortLink(code: string): Promise<string> {
  const response = await fetch("/api/shorten", { method: "POST", body: code });
  if (!response.ok) {
    const { error } = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error);
  }
  const { id } = await response.json();
  return `${window.location.origin}/s/${id}`;
}
