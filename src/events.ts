import mitt from "mitt";
import { Preset, AIProviderType } from "./types";

// Define all event types for type safety
export type AppEvents = {
  // Editor events
  "editor:change": { code: string };
  "editor:ready": { editor: any };
  "editor:error": { error: string };
  "editor:resize": { width: string };

  // AI events
  "ai:start": { prompt: string };
  "ai:progress": { status: string };
  "ai:complete": { code: string };
  "ai:error": { error: string };
  "ai:grounding": { metadata: any };

  // Diagram events
  "diagram:render": { code: string };
  "diagram:rendered": { svg: string };
  "diagram:error": { error: string };

  // UI events
  "ui:preset:select": { preset: Preset; isModification: boolean };
  "ui:settings:open": {};
  "ui:settings:save": { provider: AIProviderType; apiKey: string; model: string };
  "ui:zoom": { direction: "in" | "out" };
  "ui:input:submit": { prompt: string };
  "ui:fixWithAI": {};

  // Collaboration events
  "collab:connect": { room: string; name: string };
  "collab:disconnect": {};
  "collab:user:join": { user: any };
  "collab:user:leave": { user: any };

  // App state events
  "app:ready": {};
  "app:error": { error: string };
  "app:loading": { isLoading: boolean };
};

// Create the central event bus
export const eventBus = mitt<AppEvents>();

// Helper functions for common event patterns
export const EventHelpers = {
  // Emit events with error handling
  safeEmit<K extends keyof AppEvents>(event: K, data: AppEvents[K]) {
    try {
      eventBus.emit(event, data);
    } catch (error) {
      console.error(`Error emitting event ${String(event)}:`, error);
    }
  },

  // Listen to events with error handling
  safeListen<K extends keyof AppEvents>(
    event: K,
    handler: (data: AppEvents[K]) => void | Promise<void>,
  ) {
    const wrappedHandler = async (data: AppEvents[K]) => {
      try {
        await handler(data);
      } catch (error) {
        console.error(`Error handling event ${String(event)}:`, error);
        eventBus.emit("app:error", {
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    };

    eventBus.on(event, wrappedHandler);
    return () => eventBus.off(event, wrappedHandler);
  },

  // Listen to an event once
  once<K extends keyof AppEvents>(event: K, handler: (data: AppEvents[K]) => void | Promise<void>) {
    const wrappedHandler = async (data: AppEvents[K]) => {
      try {
        eventBus.off(event, wrappedHandler);
        await handler(data);
      } catch (error) {
        console.error(`Error handling one-time event ${String(event)}:`, error);
        eventBus.emit("app:error", {
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    };

    eventBus.on(event, wrappedHandler);
    return () => eventBus.off(event, wrappedHandler);
  },
};
