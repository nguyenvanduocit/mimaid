import { createClient } from "@liveblocks/client";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import { Awareness } from "y-protocols/awareness";
import { getUserNameFromURL, getRandomColor, getRoomIdFromURL } from "./utils";
import { EventHelpers } from "./events";

export class CollaborationHandler {
  private editor: any; // Use any since we're dynamically importing Monaco
  private room: any;
  private awareness: Awareness | null = null;

  constructor(editor: any) { // Use any since we're dynamically importing Monaco
    this.editor = editor;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for collaboration events
    EventHelpers.safeListen('collab:connect', async ({ room, name }) => {
      await this.connectToRoom(room, name);
    });

    EventHelpers.safeListen('collab:disconnect', () => {
      this.disconnect();
    });
  }

  setup(): void {
    const roomId = getRoomIdFromURL();
    const name = getUserNameFromURL();
    
    if (!roomId) return;

    // Emit connection event
    EventHelpers.safeEmit('collab:connect', { room: roomId, name: name || 'Anonymous' });
  }

  private async connectToRoom(roomId: string, userName: string): Promise<void> {
    try {
      const client = createClient({
        publicApiKey: import.meta.env.VITE_LIVEBLOCKS_PUBLIC_API_KEY,
      });

      const { room } = client.enterRoom(roomId);
      this.room = room;
      
      const yDoc = new Y.Doc();
      const yText = yDoc.getText("monaco");
      const yProvider = new LiveblocksYjsProvider(room, yDoc);
      this.awareness = yProvider.awareness as unknown as Awareness;

      const userColor = getRandomColor();

      this.awareness.setLocalState({ color: userColor, name: userName });

      // Set up awareness events
      this.awareness.on('change', () => {
        const users = Array.from(this.awareness!.getStates().entries());
        EventHelpers.safeEmit('collab:user:join', { user: { users } });
      });

      new MonacoBinding(
        yText,
        this.editor.getModel() as any, // Use any instead of monaco.editor.ITextModel
        new Set([this.editor]),
        this.awareness
      );

      console.log(`Connected to collaboration room: ${roomId} as ${userName}`);
    } catch (error) {
      console.error('Failed to connect to collaboration room:', error);
      EventHelpers.safeEmit('app:error', { 
        error: `Failed to connect to collaboration room: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  }

  private disconnect(): void {
    if (this.room) {
      this.room.leave();
      this.room = null;
    }
    this.awareness = null;
    console.log('Disconnected from collaboration room');
  }
} 