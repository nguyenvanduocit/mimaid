# Test Error Examples for MinimalMermaid

## Example 1: Invalid Syntax Error
```mermaid
graph TD
    A --> B
    B --> C
    C ---> D invalid syntax here
    D --> E
```

## Example 2: Missing Arrow
```mermaid
flowchart LR
    Start --> Process1
    Process1 Process2
    Process2 --> End
```

## Example 3: Invalid Diagram Type
```mermaid
invalidDiagram
    A --> B
```

## Example 4: Unclosed Subgraph
```mermaid
graph TD
    subgraph One
        A --> B
    B --> C
```

## How to Test:
1. Open MinimalMermaid in your browser
2. Copy any of the above examples into the editor
3. Check the browser console for debug messages
4. Look for:
   - `[DEBUG] setErrorMarkers called with error:`
   - `[DEBUG] Parsed error:`
   - `[DEBUG] Creating marker:`
   - `[DEBUG] Setting markers on model`
5. The error line should be highlighted in red in the editor