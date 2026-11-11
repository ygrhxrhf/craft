import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { craftSchemeRoute } from '@/lib/links/internal-scheme';

import {
  OPEN_IN_APP,
  OPEN_IN_APP_REMEMBERED_KEY,
  OPEN_IN_DESKTOP_APP_QUESTION,
  REMEMBER_MY_CHOICE,
  craftDocLink,
  isChoiceRemembered,
  rememberChoice,
  shouldOfferDesktopApp,
} from './open-in-app';

describe('the open-in-app copy is the official three (G717)', () => {
  it('keeps every sentence verbatim', () => {
    expect(OPEN_IN_DESKTOP_APP_QUESTION).toBe('在桌面应用中打开？');
    expect(OPEN_IN_APP).toBe('在应用中打开');
    expect(REMEMBER_MY_CHOICE).toBe('记住我的选择');
  });
});

describe('when the prompt is offered', () => {
  it('shows on web until the choice is remembered', () => {
    expect(shouldOfferDesktopApp(false, false)).toBe(true);
    expect(shouldOfferDesktopApp(false, true)).toBe(false);
  });

  it('never shows inside the desktop shell', () => {
    expect(shouldOfferDesktopApp(true, false)).toBe(false);
    expect(shouldOfferDesktopApp(true, true)).toBe(false);
  });
});

describe('the remembered-choice flag', () => {
  const store = () => {
    const map = new Map<string, string>();
    return {
      map,
      storage: {
        getItem: (key: string) => map.get(key) ?? null,
        setItem: (key: string, value: string) => void map.set(key, value),
      },
    };
  };

  it('writes under its own key and reads back', () => {
    const { map, storage } = store();
    expect(isChoiceRemembered(storage)).toBe(false);
    rememberChoice(storage);
    expect(map.get(OPEN_IN_APP_REMEMBERED_KEY)).toBe('1');
    expect(isChoiceRemembered(storage)).toBe(true);
  });

  it('treats a missing/broken storage as "not remembered" and never throws', () => {
    expect(isChoiceRemembered(undefined)).toBe(false);
    expect(
      isChoiceRemembered({
        getItem: () => {
          throw new Error('blocked');
        },
      }),
    ).toBe(false);
    expect(() => rememberChoice(undefined)).not.toThrow();
  });
});

describe('the open-in-app deep link', () => {
  it('uses the repo internal scheme, which parses back to the document route', () => {
    expect(craftDocLink('abc123')).toBe('craft://doc/abc123');
    expect(craftSchemeRoute(craftDocLink('abc123'))).toBe('/documents/abc123');
  });
});

describe('the notice stays non-modal', () => {
  const read = (relative: string) =>
    readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');

  it('renders the three official actions through the pure core', () => {
    const source = read('../../components/app/OpenInAppNotice.tsx');
    expect(source).toContain('OPEN_IN_DESKTOP_APP_QUESTION');
    expect(source).toContain('OPEN_IN_APP');
    expect(source).toContain('REMEMBER_MY_CHOICE');
    expect(source).toContain('openExternal');
    expect(source).toContain('shouldOfferDesktopApp');
    expect(source).toContain('rememberChoice');
  });

  it('has neither a key listener nor a backdrop that could block page clicks', () => {
    const source = read('../../components/app/OpenInAppNotice.tsx');
    expect(source).not.toContain('onKeyDown');
    expect(source).not.toContain("addEventListener('keydown'");
    expect(source).not.toContain('inset-0');
    expect(source).toContain('aria-modal="false"');
  });

  it('is pushed away by any in-page interaction (official: it disappears on the next click)', () => {
    const source = read('../../components/app/OpenInAppNotice.tsx');
    expect(source).toContain("addEventListener('pointerdown'");
    expect(source).toContain('contains(event.target');
  });

  it('keeps the checkbox unchecked by default', () => {
    const source = read('../../components/app/OpenInAppNotice.tsx');
    expect(source).not.toContain('defaultChecked');
  });

  it('is mounted at document entry', () => {
    const editor = read('../../components/editor/DocumentEditor.tsx');
    expect(editor).toContain('<OpenInAppNotice documentId={doc.id} />');
  });
});
