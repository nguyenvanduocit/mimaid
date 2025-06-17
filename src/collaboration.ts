import { createClient } from "@liveblocks/client";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import { Awareness } from "y-protocols/awareness";
import { getUserNameFromURL, getRandomColor, getRoomIdFromURL } from "./utils";

export class CollaborationHandler {
  private editor: any; // Use any since we're dynamically importing Monaco

  constructor(editor: any) { // Use any since we're dynamically importing Monaco
    this.editor = editor;
  }

  setup(): void {
    const roomId = getRoomIdFromURL();
    if (!roomId) return;

    const client = createClient({
      publicApiKey: import.meta.env.VITE_LIVEBLOCKS_PUBLIC_API_KEY,
    });

    const { room } = client.enterRoom(roomId);
    const yDoc = new Y.Doc();
    const yText = yDoc.getText("monaco");
    const yProvider = new LiveblocksYjsProvider(room, yDoc);
    const awareness = yProvider.awareness as unknown as Awareness;

    const userColor = getRandomColor();
    const name = getUserNameFromURL();

    awareness.setLocalState({ color: userColor, name });

    new MonacoBinding(
      yText,
      this.editor.getModel() as any, // Use any instead of monaco.editor.ITextModel
      new Set([this.editor]),
      awareness
    );
  }
} 