/**
 * Mermaid syntax highlighter, adapted from pele (https://github.com/obsidianmd/pele,
 * website/src/lib/highlight.ts). MIT License, Copyright (c) 2026 kepano.
 *
 * `highlightMermaidLine` turns one source line into HTML spans (class `syn-*`) and carries
 * multi-line state (frontmatter, open quote, `@{ }` metadata) in `HighlightState`.
 * Our Monaco adapter lives in mermaid-tokens.ts; keep this file close to upstream.
 */

export interface HighlightState {
  started: boolean;
  frontmatter: boolean;
  quote: boolean;
  meta: boolean;
}

export const createHighlightState = (): HighlightState => ({
  started: false,
  frontmatter: false,
  quote: false,
  meta: false,
});

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const span = (className: string | undefined, value: string) => !value ? '' : className
  ? `<span class="${className}">${escapeHtml(value)}</span>`
  : escapeHtml(value);

const quoted = (value: string) => value.length > 1 && value.at(-1) === value[0]
  ? span('syn-punctuation', value[0]) + span('syn-string', value.slice(1, -1)) + span('syn-punctuation', value[0])
  : span('syn-punctuation', value[0]) + span('syn-string', value.slice(1));

function highlightStyleValue(value: string) {
  return [...value.matchAll(/#[0-9a-fA-F]{3,8}\b|-?\d*\.?\d+[a-z%]*|"[^"]*"|'[^']*'|--[\w-]+|[(),]|\s+|[^\s(),"'#]+|./g)].map((match) => {
    const part = match[0];
    if (/^#[0-9a-fA-F]{3,8}$/.test(part)) return span('syn-constant', part);
    if (/^-?\d*\.?\d+[a-z%]*$/.test(part)) return span('syn-number', part);
    if (/^["']/.test(part)) return quoted(part);
    if (part.startsWith('--')) return span('syn-variable', part);
    if (/^[(),]$/.test(part)) return span('syn-punctuation', part);
    if (value[match.index + part.length] === '(') return span('syn-function', part);
    return escapeHtml(part);
  }).join('');
}

const highlightDeclarations = (value: string) => value.split(/([,;])/).map((part) => {
  if (part === ',' || part === ';') return span('syn-punctuation', part);
  const declaration = part.match(/^(\s*)([\w-]+)(\s*:\s*)(.*)$/);
  if (!declaration) return escapeHtml(part);
  return escapeHtml(declaration[1]) + span('syn-variable', declaration[2]) + span('syn-punctuation', declaration[3]) + highlightStyleValue(declaration[4]);
}).join('');

function highlightYamlLine(line: string) {
  const entry = line.match(/^(\s*(?:-\s+)?)([\w-]+)(:)(\s*)(.*)$/);
  if (!entry) return span('syn-string', line);
  const value = entry[5];
  let highlighted = span('syn-string', value);
  if (/^(["']).*\1$/.test(value)) highlighted = quoted(value);
  else if (/^(?:true|false|null|~)$/.test(value)) highlighted = span('syn-constant', value);
  else if (/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(value)) highlighted = span('syn-number', value);
  return escapeHtml(entry[1]) + span('syn-yaml-key', entry[2]) + span('syn-punctuation', entry[3]) + escapeHtml(entry[4]) + highlighted;
}

const mermaidDeclaration = /^(?:xychart(?:-beta)?|gitGraph|pie|mindmap|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|journey|timeline|quadrantChart|requirement(?:Diagram)?|C4(?:Context|Container|Component|Dynamic|Deployment)|(?:architecture|sankey|block|packet|kanban|radar|treemap|info|agentflow|usecase|treeView|venn|cynefin|wardley|swimlane|ishikawa|eventmodeling)(?:-beta)?|railroad-(?:ebnf-|abnf-|peg-)?beta)\b/;
const mermaidKeyword = /^(?:flowchart-elk|flowchart|graph|subgraph|end|direction|click|style|classDef|class|linkStyle|interpolate|call|href|callback)\b/;
const mermaidLink = /^(?:[xo<](?=--|==|-\.))?(?:--+|==+|-\.+-?|~~~+)(?:>|[xo](?!\w))?/;
const mermaidLinkEnd = /(?:--+|==+|\.+-+)(?:>|[xo](?!\w))?/;
const mermaidShapes: [string, string[]][] = [
  ['(((', [')))']], ['([', ['])']], ['[(', [')]']], ['[[', [']]']], ['((', ['))']], ['{{', ['}}']],
  ['[/', ['/]', '\\]']], ['[\\', ['\\]', '/]']], ['[', [']']], ['(', [')']], ['{', ['}']],
];

export function highlightMermaidLine(line: string, state: HighlightState) {
  if (!state.started && line.trim()) {
    state.started = true;
    if (/^\s*---\s*$/.test(line)) {
      state.frontmatter = true;
      return span('syn-punctuation', line);
    }
  }
  if (state.frontmatter) {
    if (/^\s*---\s*$/.test(line)) {
      state.frontmatter = false;
      return span('syn-punctuation', line);
    }
    return highlightYamlLine(line);
  }

  let output = '';
  let index = 0;
  let afterNode = false;
  let expectsDirection = false;
  let styleTarget = 0;

  const string = (closers: string[] = []) => {
    const rest = line.slice(index);
    let end = -1;
    for (const closer of closers) {
      const position = rest.indexOf(closer);
      if (position >= 0 && (end < 0 || position < end)) end = position;
    }
    if (rest.startsWith('"')) {
      const close = rest.indexOf('"', 1);
      if (close < 0) {
        state.quote = true;
        output += quoted(rest);
        index = line.length;
        return;
      }
      output += quoted(rest.slice(0, close + 1));
      index += close + 1;
      return;
    }
    const text = end < 0 ? rest : rest.slice(0, end);
    output += span('syn-string', text);
    index += text.length;
  };

  if (state.quote) {
    const close = line.indexOf('"');
    if (close < 0) return span('syn-string', line);
    state.quote = false;
    output += span('syn-string', line.slice(0, close)) + span('syn-punctuation', '"');
    index = close + 1;
  }

  while (index < line.length) {
    const rest = line.slice(index);
    const wasAfterNode = afterNode;
    afterNode = false;
    let match: RegExpMatchArray | null;

    if (state.meta) {
      if ((match = rest.match(/^\s+|^,/))) output += match[0] === ',' ? span('syn-punctuation', ',') : match[0];
      else if (rest[0] === '}') { state.meta = false; match = ['}']; output += span('syn-punctuation', '}'); }
      else if (rest[0] === '"') { string(); continue; }
      else if ((match = rest.match(/^([\w-]+)(\s*:)/))) output += span('syn-variable', match[1]) + span('syn-punctuation', match[2]);
      else if ((match = rest.match(/^[^\s,}"]+/))) output += span(/^(?:true|false)$/.test(match[0]) ? 'syn-constant' : /^-?\d/.test(match[0]) ? 'syn-number' : 'syn-string', match[0]);
      index += match![0].length;
      continue;
    }

    if ((match = rest.match(/^\s+/))) {
      output += match[0];
      afterNode = false;
    } else if ((match = rest.match(/^%%\{.*?(?:\}%%|$)/))) {
      output += span('syn-language', match[0]);
    } else if (rest.startsWith('%%')) {
      output += span('syn-comment', rest);
      break;
    } else if (rest[0] === '"') {
      string();
      continue;
    } else if (rest.startsWith('@{')) {
      state.meta = true;
      match = ['@{'];
      output += span('syn-punctuation', '@{');
    } else if ((match = rest.match(/^(:::)([\w-]*)/))) {
      output += span('syn-punctuation', match[1]) + span('syn-language', match[2]);
    } else if (rest[0] === '|') {
      const close = rest.indexOf('|', 1);
      output += span('syn-punctuation', '|');
      index += 1;
      if (close > 0) {
        string(['|']);
        output += span('syn-punctuation', '|');
        index += 1;
      }
      continue;
    } else if ((match = rest.match(mermaidLink))) {
      output += span('syn-punctuation', match[0]);
      // "A -- text --> B": the words between an open link and its arrow are the label.
      const label = /^(?:--|==|-\.)$/.test(match[0]) ? rest.slice(match[0].length).match(mermaidLinkEnd) : null;
      if (label?.index) {
        const text = rest.slice(match[0].length, match[0].length + label.index);
        if (/\S/.test(text) && !/[[\](){}|]/.test(text)) {
          output += span('syn-string', text) + span('syn-punctuation', label[0]);
          index += match[0].length + text.length + label[0].length;
          continue;
        }
      }
    } else if (styleTarget > 1 && /^[\w-]+\s*:/.test(rest)) {
      output += highlightDeclarations(rest);
      break;
    } else if (/^\s*$/.test(line.slice(0, index)) && (match = rest.match(mermaidDeclaration))) {
      output += span('syn-keyword', match[0]);
    } else if ((match = rest.match(mermaidKeyword))) {
      output += span('syn-keyword', match[0]);
      expectsDirection = /^(?:flowchart|graph|direction)/.test(match[0]);
      if (/^(?:style|classDef|linkStyle)$/.test(match[0])) styleTarget = 1;
      index += match[0].length;
      continue;
    } else if (expectsDirection && (match = rest.match(/^(?:TB|TD|BT|RL|LR)\b/))) {
      output += span('syn-constant', match[0]);
    } else if ((match = rest.match(/^\d+(?:\.\d+)?\b/))) {
      output += span('syn-number', match[0]);
      if (styleTarget) styleTarget = 2;
    } else if ((match = rest.match(/^[\p{L}_][\p{L}\p{N}_]*(?:[-.](?![-.])[\p{L}\p{N}_]+)*/u))) {
      const call = rest[match[0].length] === '(' && /\bcall\s+$/.test(line.slice(0, index));
      output += span(call ? 'syn-function' : 'syn-variable', match[0]);
      afterNode = !call;
      if (styleTarget) styleTarget = 2;
    } else if (wasAfterNode && rest[0] === '>') {
      output += span('syn-punctuation', '>');
      index += 1;
      string([']']);
      continue;
    } else {
      const shape = mermaidShapes.find(([open]) => rest.startsWith(open));
      if (shape) {
        output += span('syn-punctuation', shape[0]);
        index += shape[0].length;
        string(shape[1]);
        const closer = shape[1].find((close) => line.startsWith(close, index));
        if (closer) {
          output += span('syn-punctuation', closer);
          index += closer.length;
        }
        continue;
      }
      match = [rest[0]];
      output += span(/[\])}&;,:~/\\<>=.-]/.test(rest[0]) ? 'syn-punctuation' : undefined, rest[0]);
    }
    index += match[0].length;
  }
  return output;
}
