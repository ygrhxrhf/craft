'use server';

import { requireUserId } from '@/lib/authz/guard';
import { getDb } from '@/prisma/db';
import { buildLibraryArchive, buildTextBundleArchive, type LibraryRow } from '@/lib/document/library-archive';

/** G22: export the whole library as one Markdown archive. */
export async function exportLibraryZip(): Promise<{ filename: string; base64: string }> {
  const userId = await requireUserId();
  const db = await getDb();
  const rows: LibraryRow[] = (await db.orm.public.Document
    .where({ userId })
    .all()) as LibraryRow[];

  const zip = buildLibraryArchive(rows);
  const base64 = await zip.generateAsync({ type: 'base64' });
  return { filename: 'crafty-library.zip', base64 };
}

/** G223: the same library as a bundle of `.textbundle` folders. */
export async function exportLibraryTextBundleZip(): Promise<{ filename: string; base64: string }> {
  const userId = await requireUserId();
  const db = await getDb();
  const rows: LibraryRow[] = (await db.orm.public.Document
    .where({ userId })
    .all()) as LibraryRow[];

  const zip = buildTextBundleArchive(rows);
  const base64 = await zip.generateAsync({ type: 'base64' });
  return { filename: 'crafty-library-textbundle.zip', base64 };
}
