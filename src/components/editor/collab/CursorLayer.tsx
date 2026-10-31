'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor, MappablePosition } from '@tiptap/core';
import { CollaborationMappablePosition } from '@tiptap/extension-collaboration';
import type { Awareness } from 'y-protocols/awareness';
import type { Transaction } from '@tiptap/pm/state';
import {
  selectPeers,
  setLocalCursor,
  setLocalPresenceField,
  type PeerPresence,
  type PresenceState,
  type PresenceUser,
} from '@/lib/collaboration/presence';

interface CursorLayerProps {
  editor: Editor | null;
  awareness: Awareness | null;
  /** Used for the RTC "open page" dimension; peers in the same room share it. */
  documentId?: string;
}

interface TrackedPeer {
  user: PresenceUser;
  anchor: MappablePosition;
  head: MappablePosition;
}

/** The top-level block holding the caret, by its stable `blockId` (RTC editing-block axis). */
function resolveEditingBlockId(editor: Editor): string | null {
  const { $from } = editor.state.selection;
  if ($from.depth === 0) return null;
  const node = $from.node(1);
  const id = node.attrs?.blockId;
  return typeof id === 'string' && id ? id : null;
}

/** 1-based ordinal of a top-level block, for a human-readable "第 N 块". */
function blockOrdinal(editor: Editor, blockId: string): number | null {
  let ordinal = 0;
  let found: number | null = null;
  editor.state.doc.forEach((node) => {
    ordinal += 1;
    if (node.attrs?.blockId === blockId) found = ordinal;
  });
  return found;
}

/**
 * Remote carets drawn from y-protocols awareness. Positions are stored as
 * Yjs-relative mappable positions, remapped on every document transaction and
 * painted in one animation frame, so typing in a 200-block document costs one
 * layout read per peer instead of one per keystroke.
 */
export function CursorLayer({ editor, awareness, documentId }: CursorLayerProps) {
  const tracked = useRef(new Map<number, TrackedPeer>());
  const nodes = useRef(new Map<number, HTMLDivElement | null>());
  const frame = useRef<number | null>(null);
  const rosterRef = useRef('');
  const [peers, setPeers] = useState<PeerPresence[]>([]);

  const paint = useCallback(() => {
    if (!editor) return;
    const host = editor.view.dom.getBoundingClientRect();

    tracked.current.forEach((peer, clientId) => {
      const node = nodes.current.get(clientId);
      if (!node) return;

      const size = editor.state.doc.content.size;
      const position = Math.max(1, Math.min(peer.anchor.position, size - 1));
      let coords: { left: number; top: number };
      try {
        coords = editor.view.coordsAtPos(position);
      } catch {
        node.style.opacity = '0';
        return;
      }

      node.style.opacity = '1';
      node.style.transform = `translate3d(${coords.left - host.left}px, ${coords.top - host.top}px, 0)`;
    });
  }, [editor]);

  const schedulePaint = useCallback(() => {
    if (frame.current !== null) return;
    frame.current = window.requestAnimationFrame(() => {
      frame.current = null;
      paint();
    });
  }, [paint]);

  // Announce our own selection, frame-batched.
  useEffect(() => {
    if (!editor || !awareness) return;

    let queued = false;
    const publish = () => {
      const { anchor, head } = editor.state.selection;
      if (!editor.isFocused) {
        setLocalCursor(awareness, null);
        setLocalPresenceField(awareness, 'editingBlockId', null);
        return;
      }
      setLocalCursor(awareness, {
        anchor: editor.utils.createMappablePosition(anchor),
        head: editor.utils.createMappablePosition(head),
      });
      setLocalPresenceField(awareness, 'editingBlockId', resolveEditingBlockId(editor));
    };

    const onTransaction = () => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(() => {
        queued = false;
        publish();
      });
    };
    const onFocus = () => publish();
    const onBlur = () => {
      setLocalCursor(awareness, null);
      setLocalPresenceField(awareness, 'editingBlockId', null);
    };

    editor.on('transaction', onTransaction);
    editor.on('focus', onFocus);
    editor.on('blur', onBlur);

    return () => {
      editor.off('transaction', onTransaction);
      editor.off('focus', onFocus);
      editor.off('blur', onBlur);
      setLocalCursor(awareness, null);
      setLocalPresenceField(awareness, 'editingBlockId', null);
    };
  }, [editor, awareness]);

  // RTC "open page": publish which document this client is showing, once per mount.
  useEffect(() => {
    if (!awareness || !documentId) return;
    setLocalPresenceField(awareness, 'openPageId', documentId);
    return () => setLocalPresenceField(awareness, 'openPageId', null);
  }, [awareness, documentId]);

  // Mirror remote presence into tracked positions.
  useEffect(() => {
    if (!editor || !awareness) return;

    const sync = () => {
      const list = selectPeers(
        awareness.getStates() as Map<number, PresenceState>,
        awareness.clientID,
      );
      const next = new Map<number, TrackedPeer>();

      for (const peer of list) {
        if (!peer.cursor) continue;
        const anchor = CollaborationMappablePosition.fromJSON(peer.cursor.anchor);
        const head = CollaborationMappablePosition.fromJSON(peer.cursor.head);
        if (!anchor) continue;
        next.set(peer.clientId, { user: peer.user, anchor, head: head ?? anchor });
      }

      tracked.current = next;
      // Only the roster is React state; caret movement paints imperatively, so a
      // presence ping that changes nobody must not re-render the editor.
      const roster = list.filter((peer) => peer.cursor || peer.editingBlockId || peer.openPageId);
      const signature = roster
        .map((peer) => `${peer.clientId}:${peer.user.id}:${peer.editingBlockId ?? ''}:${peer.openPageId ?? ''}`)
        .join('|');
      if (signature !== rosterRef.current) {
        rosterRef.current = signature;
        setPeers(roster);
      }
      schedulePaint();
    };

    awareness.on('change', sync);
    sync();

    return () => {
      awareness.off('change', sync);
    };
  }, [editor, awareness, schedulePaint]);

  // Keep remote carets pinned while the document changes under them.
  useEffect(() => {
    if (!editor) return;

    const onTransaction = ({ transaction }: { transaction: Transaction }) => {
      if (!transaction.docChanged || tracked.current.size === 0) return;

      tracked.current.forEach((peer, clientId) => {
        const anchor = editor.utils.getUpdatedPosition(peer.anchor, transaction);
        const head = editor.utils.getUpdatedPosition(peer.head, transaction);
        tracked.current.set(clientId, { ...peer, anchor: anchor.position, head: head.position });
      });
      schedulePaint();
    };

    editor.on('transaction', onTransaction);
    return () => {
      editor.off('transaction', onTransaction);
    };
  }, [editor, schedulePaint]);

  // Repaint on scroll and resize: cached offsets go stale immediately.
  useEffect(() => {
    if (!editor) return;
    const scroller = editor.view.dom.closest('[class*="overflow-y-auto"]') ?? window;
    const host = scroller === window ? window : scroller;

    host.addEventListener('scroll', schedulePaint, { passive: true } as AddEventListenerOptions);
    window.addEventListener('resize', schedulePaint);

    return () => {
      host.removeEventListener('scroll', schedulePaint);
      window.removeEventListener('resize', schedulePaint);
    };
  }, [editor, schedulePaint]);

  useEffect(() => () => {
    if (frame.current !== null) window.cancelAnimationFrame(frame.current);
  }, []);

  if (!editor || peers.length === 0) return null;

  const caretPeers = peers.filter((peer) => peer.cursor);

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden>
        {caretPeers.map((peer) => (
          <div
            key={peer.clientId}
            ref={(node) => {
              if (node) nodes.current.set(peer.clientId, node);
              else nodes.current.delete(peer.clientId);
            }}
            className="crafty-remote-cursor"
            style={{ ['--cursor-color' as string]: peer.user.color, opacity: 0 }}
          >
            <span className="crafty-remote-cursor__caret" />
            <span className="crafty-remote-cursor__label">{peer.user.name}</span>
          </div>
        ))}
      </div>
      <ul className="crafty-collab-roster" aria-label="协作者状态">
        {peers.map((peer) => {
          const ordinal = peer.editingBlockId ? blockOrdinal(editor, peer.editingBlockId) : null;
          return (
            <li key={peer.clientId} className="crafty-collab-roster__row">
              <span
                className="crafty-collab-roster__dot"
                style={{ ['--cursor-color' as string]: peer.user.color }}
              />
              <span className="crafty-collab-roster__name">{peer.user.name}</span>
              <span className="crafty-collab-roster__where">
                {ordinal ? `编辑第 ${ordinal} 块` : peer.openPageId ? '查看中' : '在线'}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
