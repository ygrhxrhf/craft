'use server';

import { getCollections } from '@/actions/collection/collection';
import { getDocuments } from '@/actions/document/get';
import { getFolders } from '@/actions/folder/get';
import { getWhiteboards } from '@/actions/whiteboard/whiteboard';

/**
 * Everything the sidebar renders, in one round trip. The four trees used to each
 * fetch their own rows on every tree reload, so one change signal cost five server
 * actions -- and Next serialises a client's actions, so a user's own write (a
 * document title) queued behind all five and was dropped if they navigated first.
 */
export async function getSidebarSnapshot() {
  const [documents, collections, folders, whiteboards] = await Promise.all([
    getDocuments(),
    getCollections(),
    getFolders(),
    getWhiteboards(),
  ]);
  return { documents, collections, folders, whiteboards };
}
