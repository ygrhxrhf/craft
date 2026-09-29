'use client';
import { useEffect } from 'react';
import { getSyncManager } from '@/lib/sync-core';

export function SyncBoot() {
  useEffect(() => { void getSyncManager().boot(); }, []);
  return null;
}
