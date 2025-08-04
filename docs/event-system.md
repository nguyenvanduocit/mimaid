# Event-Driven UI with Mitt

This document explains the event-driven architecture implemented using [mitt](https://github.com/developit/mitt) in MinimalMermaid.

## Overview

The application now uses a centralized event system that decouples components and enables better communication between different parts of the application.

## Architecture

### Event Bus (`src/events.ts`)

The central event bus is created using mitt and provides type-safe event handling:

```typescript
import mitt from 'mitt';

export type AppEvents = {
  'editor:change': { code: string };
  'ai:start': { prompt: string };
  'diagram:rendered': { svg: string };
  // ... more events
}

export const eventBus = mitt<AppEvents>();
```

### Event Categories

1. **Editor Events** - Monaco editor state changes
2. **AI Events** - AI handler operations and responses  
3. **Diagram Events** - Mermaid diagram rendering
4. **UI Events** - User interface interactions
5. **Collaboration Events** - Real-time collaboration
6. **App State Events** - Global application state

## Key Benefits

### 1. Decoupled Architecture
Components no longer need direct references to each other. They communicate through events:

```typescript
// Before: Direct method calls
aiHandler.handleSubmit();

// After: Event-driven
EventHelpers.safeEmit('ui:input:submit', { prompt });
```

### 2. Type Safety
All events are typed, preventing runtime errors:

```typescript
// TypeScript will catch incorrect event data
EventHelpers.safeEmit('editor:change', { code: 'mermaid code' }); // ✓
EventHelpers.safeEmit('editor:change', { wrongProp: 'value' }); // ✗
```

### 3. Error Handling
Built-in error handling prevents crashes:

```typescript
EventHelpers.safeListen('ai:complete', async ({ code }) => {
  // Errors are automatically caught and logged
  await someAsyncOperation(code);
});
```

### 4. Testability
Events can be easily mocked and tested in isolation.

## Usage Examples

### Emitting Events

```typescript
import { EventHelpers } from './events';

// Emit an editor change
EventHelpers.safeEmit('editor:change', { code: 'graph TD\nA-->B' });

// Emit AI completion
EventHelpers.safeEmit('ai:complete', { code: 'generated code' });
```

### Listening to Events

```typescript
import { EventHelpers } from './events';

// Listen to events with automatic error handling
const unsubscribe = EventHelpers.safeListen('diagram:rendered', ({ svg }) => {
  console.log('Diagram rendered:', svg.length, 'characters');
});

// Listen once
EventHelpers.once('app:ready', () => {
  console.log('App is ready!');
});

// Cleanup
unsubscribe();
```

## Event Flow Examples

### AI Generation Flow
1. User types prompt → `ui:input:submit` event
2. AIHandler receives event → `ai:start` event  
3. AI processes → `ai:progress` events
4. AI completes → `ai:complete` event
5. Editor updates → `editor:change` event
6. Diagram renders → `diagram:rendered` event

### Preset Selection Flow
1. User clicks preset → `ui:preset:select` event
2. AIHandler receives event and processes preset
3. Same flow as AI generation continues

## Implementation Details

### Component Integration

Each major component now listens for relevant events:

- **MermaidEditor**: Listens for `editor:change`, `ai:complete`, `app:error`
- **AIHandler**: Listens for `ui:input:submit`, `ui:preset:select`  
- **CollaborationHandler**: Listens for `collab:connect`, `collab:disconnect`

### Event Helpers

The `EventHelpers` object provides wrapped methods for safe event handling:

- `safeEmit()` - Emit events with error handling
- `safeListen()` - Listen with automatic error handling  
- `once()` - Listen to an event only once

### Error Recovery

All event handlers are wrapped in try-catch blocks. Errors are:
1. Logged to console with context
2. Emitted as `app:error` events for global handling
3. Don't crash the application

## Migration Benefits

The event-driven refactor provides:

1. **Better Separation of Concerns** - Each component focuses on its responsibility
2. **Improved Maintainability** - Changes to one component don't affect others
3. **Enhanced Debugging** - Event logs show clear application flow
4. **Future Extensibility** - New features can easily hook into existing events
5. **Better Testing** - Components can be tested in isolation

## Future Enhancements

The event system enables future features like:

- Event logging/debugging panel
- Undo/redo functionality via event replay
- Plugin system via event hooks
- Analytics tracking
- Real-time status indicators