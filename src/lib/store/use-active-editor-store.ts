import { create } from 'zustand';
import type { Editor } from '@tiptap/react';

interface ActiveEditorState {
  editor: Editor | null;
  setEditor: (editor: Editor | null) => void;
}

/**
 * The palette is mounted once in the app shell while the editor lives inside a document
 * route, so a command that runs against the open document needs one shared handle.
 * `Editor.tsx` already reports readiness through `onEditorReady` and clears it on unmount,
 * which is the only writer.
 */
export const useActiveEditorStore = create<ActiveEditorState>((set) => ({
  editor: null,
  setEditor: (editor) => set({ editor }),
}));
