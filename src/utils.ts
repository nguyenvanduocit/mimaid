import LZString from 'lz-string';
import { MermaidError } from './types';

/**
 * Debounce function to limit how often a function can be called
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @returns Debounced function
 */
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

/**
 * Load and decompress diagram code from URL hash
 * @returns Decompressed diagram code or null if no hash
 */
export function loadDiagramFromURL(): string | null {
  const hash = window.location.hash;
  if (!hash) return null;
  const compressedCode = hash.slice(1);
  return LZString.decompressFromEncodedURIComponent(compressedCode);
}

/**
 * Generate and update URL hash with compressed diagram code
 * @param code - The diagram code to compress and store
 */
export function generateDiagramHash(code: string): void {
  if (code.trim().length > 0) {
    const compressedCode = LZString.compressToEncodedURIComponent(code);
    window.history.replaceState(null, "", `#${compressedCode}`);
  } else {
    window.history.replaceState(null, "", "");
  }
}

/**
 * Get stored editor width from localStorage
 * @returns Stored width value or null
 */
export function getStoredEditorWidth(): string | null {
  return localStorage.getItem("editorWidth");
}

/**
 * Store editor width in localStorage
 * @param width - The width value to store
 */
export function setStoredEditorWidth(width: string): void {
  localStorage.setItem("editorWidth", width);
}

/**
 * Extract room ID from URL search parameters
 * @returns Room ID or undefined if not present
 */
export function getRoomIdFromURL(): string | undefined {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("room") ?? undefined;
}

/**
 * Extract user name from URL search parameters or generate random one
 * @returns User name from URL or randomly generated name
 */
export function getUserNameFromURL(): string {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("name") ?? `User ${Math.floor(Math.random() * 1000)}`;
}

/**
 * Generate a random hex color
 * @returns Random hex color string
 */
export function getRandomColor(): string {
  return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
}

/**
 * Parse Mermaid error messages and extract line/column information
 * @param error - The error object or string to parse
 * @param code - The diagram code that caused the error
 * @returns Parsed error object with line/column info
 */
export function parseMermaidError(error: Error | string, code: string): MermaidError {
  const errorMessage = typeof error === 'string' ? error : error.message;
  console.log('[DEBUG] parseMermaidError input:', errorMessage);
  
  const errorObj: MermaidError = {
    message: errorMessage,
    severity: 'error' as const,
    source: 'mermaid'
  };

  // Common error patterns in Mermaid
  const patterns = [
    // Pattern: "Parse error on line X:" (specific Mermaid format)
    /parse error on line (\d+):/i,
    // Pattern: "Parse error on line X:Y"
    /parse error on line (\d+):(\d+)/i,
    // Pattern: "Error at line X column Y"
    /error at line (\d+) column (\d+)/i,
    // Pattern: "Line X:Y - Error message"
    /line (\d+):(\d+)/i,
    // Pattern: "Syntax error at line X"
    /syntax error at line (\d+)/i,
    // Pattern: "Error on line X"
    /error on line (\d+)/i,
    // Pattern: "Line X"
    /line (\d+)/i,
  ];

  // Try to extract line and column information
  for (const pattern of patterns) {
    const match = errorMessage.match(pattern);
    if (match) {
      console.log('[DEBUG] Pattern matched:', pattern, 'Result:', match);
      errorObj.line = parseInt(match[1], 10);
      if (match[2]) {
        errorObj.column = parseInt(match[2], 10);
      }
      break;
    }
  }

  // If no line number found, try to infer from error type
  if (!errorObj.line) {
    console.log('[DEBUG] No line number found in error, attempting to infer...');
    errorObj.line = inferErrorLine(errorMessage, code);
    console.log('[DEBUG] Inferred line:', errorObj.line);
  }

  // Clean up error message
  errorObj.message = cleanErrorMessage(errorMessage);
  
  console.log('[DEBUG] Final parsed error:', errorObj);
  return errorObj;
}

/**
 * Infer error line from common Mermaid error patterns
 * @param errorMessage - The error message to analyze
 * @param code - The diagram code to search
 * @returns Inferred line number or undefined
 */
function inferErrorLine(errorMessage: string, code: string): number | undefined {
  const lines = code.split('\n');
  const lowerError = errorMessage.toLowerCase();

  // Check for diagram type errors (usually on first line)
  if (lowerError.includes('diagram') || lowerError.includes('expected')) {
    return 1;
  }

  // Check for syntax errors - look for problematic syntax
  if (lowerError.includes('syntax') || lowerError.includes('unexpected')) {
    // Try to find lines with common syntax issues
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && !line.startsWith('%%') && !line.startsWith('#')) {
        // Check for common issues
        if (hasCommonSyntaxIssues(line)) {
          return i + 1;
        }
      }
    }
  }

  return undefined;
}

/**
 * Check if a line has common syntax issues
 * @param line - The code line to check
 * @returns True if common syntax issues are found
 */
function hasCommonSyntaxIssues(line: string): boolean {
  // Unmatched brackets/parentheses
  const brackets = ['()', '[]', '{}'];
  for (const bracket of brackets) {
    const open = (line.match(new RegExp(`\\${bracket[0]}`, 'g')) || []).length;
    const close = (line.match(new RegExp(`\\${bracket[1]}`, 'g')) || []).length;
    if (open !== close) return true;
  }

  // Invalid arrows or connections
  if (line.includes('-->') || line.includes('---') || line.includes('-.->')) {
    // Check for malformed connections
    if (line.match(/--[^>-]|[^-]--[^>-]/)) return true;
  }

  return false;
}

/**
 * Clean up error message for better readability
 * @param message - The raw error message
 * @returns Cleaned and formatted error message
 */
function cleanErrorMessage(message: string): string {
  // Remove redundant prefixes
  let cleaned = message
    .replace(/^(Error:|Parse error:|Syntax error:)\s*/i, '')
    .replace(/\s*at line \d+.*$/i, '')
    .replace(/\s*on line \d+.*$/i, '');

  // Capitalize first letter
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

  // Add period if missing
  if (!cleaned.endsWith('.') && !cleaned.endsWith('!') && !cleaned.endsWith('?')) {
    cleaned += '.';
  }

  return cleaned;
} 