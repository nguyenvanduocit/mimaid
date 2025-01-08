import LZString from 'lz-string';

export function debounce<T extends (...args: any[]) => any>(
  this: any,
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

export function loadDiagramFromURL(): string | null {
  const hash = window.location.hash;
  if (!hash) return null;
  const compressedCode = hash.slice(1);
  return LZString.decompressFromEncodedURIComponent(compressedCode);
}

export function generateDiagramHash(code: string): void {
  if (code.trim().length > 0) {
    const compressedCode = LZString.compressToEncodedURIComponent(code);
    window.history.replaceState(null, "", `#${compressedCode}`);
  } else {
    window.history.replaceState(null, "", "");
  }
}

export function getStoredEditorWidth(): string | null {
  return localStorage.getItem("editorWidth");
}

export function setStoredEditorWidth(width: string): void {
  localStorage.setItem("editorWidth", width);
}

export function getRoomIdFromURL(): string | undefined {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("room") ?? undefined;
}

export function getUserNameFromURL(): string {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("name") ?? `User ${Math.floor(Math.random() * 1000)}`;
}

export function getRandomColor(): string {
  return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
} 