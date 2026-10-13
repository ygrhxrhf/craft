/**
 * The input-intent gate (G1080 / G1081 / G1099 / G1130 / G1131).
 *
 * Official Craft ships `what-input` v5.2.12, which writes four attributes on
 * `document.documentElement`:
 *
 * - `data-whatinput`  — the last *real* input type
 * - `data-whatintent` — the current intent
 * - `data-whatelement` / `data-whatclasses` — diagnostics
 *
 * The two main attributes are deliberately not the same quantity. A key press inside a form
 * control updates `data-whatinput` but leaves `data-whatintent` alone (the freeze), while a
 * pointer move updates only the intent. So `keyboard` + `mouse` can both hold at once, which is
 * what lets a hover style stay quiet while the keyboard ring is up.
 *
 * This is a self-written equivalent rather than the dependency: the whole mechanism is the
 * mapping below, and it is exercised by `input-intent.test.ts`.
 */

export const INPUT_TYPES = ['initial', 'mouse', 'keyboard', 'touch', 'pointer'] as const;
export type InputType = (typeof INPUT_TYPES)[number];

export const WHATINPUT_ATTRIBUTE = 'data-whatinput';
export const WHATINTENT_ATTRIBUTE = 'data-whatintent';

/** The form controls whose keyboard path freezes the intent (the ledger's `pa` list). */
export const FREEZE_TAGS = ['button', 'input', 'select', 'textarea'] as const;

/** `mousemove` / `touchstart` / `pointerdown` / … → one of the five values. */
export function intentFromEvent(event: string, pointerType?: number | string): InputType {
  switch (event) {
    case 'mousemove':
      return 'mouse';
    case 'touchstart':
    case 'touchend':
      return 'touch';
    case 'pointerdown':
    case 'pointermove':
    case 'MSPointerDown':
    case 'MSPointerMove':
      // The official `pointerType` table maps 2 and 3 to touch, 4 to mouse — a pen is a touch.
      if (pointerType === 2 || pointerType === 3) return 'touch';
      if (pointerType === 4) return 'mouse';
      return typeof pointerType === 'string' && pointerType ? (pointerType as InputType) : 'pointer';
    default:
      return 'initial';
  }
}

/**
 * Whether a real input event inside `tagName` may update the intent. Inside the freeze list only
 * the input type moves; everywhere else both do (G1131: pressing Tab on the body moves both).
 */
export function intentFrozenFor(tagName: string | null | undefined): boolean {
  if (!tagName) return false;
  return (FREEZE_TAGS as readonly string[]).includes(tagName.toLowerCase());
}

/**
 * The next state after one real input event. `kind` is the mapped value; `tagName` is the event
 * target's tag when the event is a keyboard one (the freeze only applies to the keyboard path).
 */
export function nextState(
  current: { input: InputType; intent: InputType },
  kind: InputType,
  tagName?: string | null,
): { input: InputType; intent: InputType } {
  const freezes = kind === 'keyboard' && intentFrozenFor(tagName);
  return { input: kind, intent: freezes ? current.intent : kind };
}

/** The attributes to write for a state, diagnostics included (G1102). */
export function attributesFor(
  state: { input: InputType; intent: InputType },
  element?: { nodeName?: string; classList?: { toString(): string } } | null,
): Record<string, string> {
  const attributes: Record<string, string> = {
    [WHATINPUT_ATTRIBUTE]: state.input,
    [WHATINTENT_ATTRIBUTE]: state.intent,
  };
  if (element?.nodeName) {
    attributes['data-whatelement'] = element.nodeName.toLowerCase();
    // The official replacement has no `g` flag, so only the first space becomes a comma. Kept
    // verbatim: the defect is part of the collected behaviour.
    attributes['data-whatclasses'] = element.classList?.toString().replace(' ', ',') ?? '';
  }
  return attributes;
}
