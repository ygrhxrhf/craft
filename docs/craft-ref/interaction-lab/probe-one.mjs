/**
 * 交互实验台 · 单 spec 调试跑（Wave 0）
 *
 * 用途：写 spec 时逐段看两侧实际观测值，不落矩阵。
 * 与 run.mjs 共用 observe.mjs / 同一 TaskSpace / 同一视口。
 *
 * 参数写死在顶部（ego-browser 不传 process.env）。
 */
import { appendFileSync, writeFileSync } from 'node:fs';
import {
  captureFingerprint,
  captureTextNodes,
  captureStateAttrs,
  captureComputed,
  captureSelection,
  captureBlocks,
  measureTrailingPoint,
} from './observe.mjs';

// ───────────────────────── 可改参数 ─────────────────────────
const TARGET = 'official';                     // 'official' | 'local'
const SPEC_FILE = 'editor.key.enter-mid-block.mjs';
const LOG = 'C:/Users/zhanh/ego/craft-ilab-20261023/log.txt';
const STOP_AFTER = 99;
const DO_SETUP = true;                      // false = 沿用当前页，只跑 steps
// ────────────────────────────────────────────

const TASK_SPACE = 'craft assets 20261023 r3';
const PAGE_LABEL = { official: 'p1', local: 'p2' };
const BASE = { official: 'https://docs.craft.do', local: 'http://localhost:3000' };

writeFileSync(LOG, '');
const log = (...a) =>
  appendFileSync(LOG, a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ') + '\n');

const spec = (await import('file:///C:/code/craft/docs/craft-ref/interaction-lab/specs/' + SPEC_FILE)).default;
const task = await taskSpace(TASK_SPACE);
const page = task.page(PAGE_LABEL[TARGET]);
await page.cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

const sel = (key) => {
  const s = spec.selectors[key];
  return typeof s === 'string' ? s : s[TARGET];
};

async function observe(label) {
  const fp = await page.evaluate(captureFingerprint, { texts: spec.observeTexts || [] });
  const st = await page.evaluate(captureStateAttrs, { selectors: (spec.stateSelectors || []).map(sel).filter(Boolean) });
  const seld = await page.evaluate(captureSelection);
  const blk = await page.evaluate(captureBlocks, { root: sel('blockRoot') });
  const comp = await page.evaluate(captureComputed, { probes: [{ key: 'editorBody', selector: sel('editorBody') }] });
  log('--- ' + label);
  log('fp ' + JSON.stringify(fp));
  log('selection ' + JSON.stringify(seld));
  log('blocks ' + JSON.stringify(blk));
  log('computed ' + JSON.stringify(comp.editorBody));
}

try {
  if (DO_SETUP) {
    for (const s of spec.setup || []) {
      if (s.op === 'navigate') {
        await page.goto(BASE[TARGET] + s.url, { waitUntil: 'load' });
        await page.waitForTimeout(s.settleMs ?? 1200);
        log('setup navigate -> ' + (await page.url()));
      } else if (s.op === 'seedTempDoc') {
        await page.goto(BASE[TARGET] + (s.listPath || '/documents'), { waitUntil: 'load' });
        await page.waitForTimeout(s.settleMs ?? 1500);
        await page.click(sel(s.selectorKey));
        await page.waitForTimeout(s.afterCreateMs ?? 3000);
        log('setup seedTempDoc -> ' + (await page.url()));
      } else if (s.op === 'placeCaretTrailing') {
        const pt = await page.evaluate(measureTrailingPoint, {
          title: sel(s.title || 'titleBlock'),
          blockRoot: sel(s.blockRoot || 'blockRoot'),
        });
        log('trailingPoint ' + JSON.stringify(pt));
        await page.mouse.click(pt.x, pt.y, { label: 'focus editor body' });
        await page.waitForTimeout(s.settleMs ?? 700);
        log('setup placeCaretTrailing mode=' + pt.mode + ' ' + pt.x + ',' + pt.y + ' blocks=' + pt.blockCount);
      } else if (s.op === 'placeCaret') {
        await page.click(sel(s.selector));
        await page.waitForTimeout(s.settleMs ?? 500);
        log('setup placeCaret ' + sel(s.selector));
      }
    }
  }

  await observe('baseline');

  let i = 0;
  for (const st of spec.steps || []) {
    if (i >= STOP_AFTER) break;
    i += 1;
    if (st.op === 'type') await page.keyboard.insertText(st.text);
    else if (st.op === 'chord' || st.op === 'key') await page.keyboard.press(st.chord);
    else if (st.op === 'paste') await page.keyboard.paste(st.text);
    else if (st.op === 'click') await page.click(sel(st.selector));
    else if (st.op === 'wait') await page.waitForTimeout(st.ms);
    if (st.settleMs) await page.waitForTimeout(st.settleMs);
    await observe('step' + i + ' ' + (st.label || st.op));
  }
} catch (e) {
  log('ERROR ' + String((e && e.message) || e).slice(0, 600));
}