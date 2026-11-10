#!/usr/bin/env node
/* ============================================================================
   RTGo_slate A 类断言（design-migration-parity 阶段④）
   原则：
     - 母本值**现查**于母本样式表（不写死期望 → 防自指测试）；
     - 每条断言输出 ID（与 件号表.md 共用同一批 ID）；
     - 资产包(rtgo-slate.css) 对母本逐件核；gallery 对「接线」核（孤儿=0 / 死控件=0）。
   用法：node verify.js [--master dir] [--host dir] [--css path] [--gallery path]
   外部使用（无母本）：
     --master / --host 缺省为空（不再写死作者本机路径）。两者缺失时脚本**不报错退出**，
     只跑本仓库自洽检查（bundle 完整性 / 手册覆盖 / gallery 接线），并打印一行说明。
     要让对账组跑起来：--master <母本根目录>（含 app.wxss）、--host <另一产品根目录>，
     或设环境变量 RTGO_MASTER / RTGO_HOST2。
   反向注入（铁律3）：复制 css 改坏一处再跑，必须变红。见 README。
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
function argOf(name, dflt) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; }
const HERE = __dirname;
const MASTER = argOf('--master', process.env.RTGO_MASTER || '');
const CSS = argOf('--css', path.join(HERE, '..', 'rtgo-slate.css'));
const TOKENS = argOf('--tokens', path.join(path.dirname(CSS), 'rtgo-tokens.css'));
const COMPONENTS = argOf('--components', path.join(path.dirname(CSS), 'rtgo-components.css'));
const GALLERY = argOf('--gallery', path.join(HERE, '..', 'gallery.html'));
const HOST = argOf('--host', process.env.RTGO_HOST2 || '');

const F = {
  app: 'app.wxss', idx: 'pages/index/index.wxss', tt: 'pages/timetable/timetable.wxss',
  tl: 'pages/results-timeline/results-timeline.wxss', det: 'pages/detail/detail.wxss',
  er: 'pages/exit-review/exit-review.wxss',
  sp: 'components/station-picker/station-picker.wxss', dtp: 'components/datetime-picker/datetime-picker.wxss',
  mp: 'components/map-station-picker/map-station-picker.wxss', sd: 'components/station-detail-panel/station-detail-panel.wxss',
  snp: 'components/station-nav-picker/station-nav-picker.wxss',
  exs: 'pages/exit-survey/exit-survey.wxss',   // ex-* 与 exit-review 同值合并，仍入哨兵监视
  ig: 'components/intercity-guide/intercity-guide.wxss',   // T19 票务指南弹层（v1.6 新增页）
  conf: 'components/confirm-dialog/confirm-dialog.wxss',   // T21 确认对话框（v1.14 新增组件）
};
/* ---------- 母本 / 另一产品：作者本地才有的仓库，对他人默认不存在 ----------
   本脚本有两类检查：
     a) 对账类（1)~4b)）——需要 --master（微信母本工程）与 --host（另一产品）；
     b) 自洽类（4c/4d/5）——只读本仓库文件（bundle 完整性 / 手册覆盖 / gallery 接线）。
   他人 clone 下来跑，通常只有 (b) 可跑。缺参数时**不报栈、不冒充通过**：
   先给一行说明，再跳过 (a)，退出码按 (b) 的结果定。 */
const HAVE_MASTER = !!MASTER && fs.existsSync(path.join(MASTER, 'app.wxss'));
const masterText = {};
/* 逐文件容错读：新族登记的文件在旧母本里可能不存在（如 v1.14 的 confirm-dialog）。
   缺文件 → 该族断言自动落到「未做」，而不是让整个脚本抛栈。 */
for (const k in F) {
  if (!HAVE_MASTER) { masterText[k] = ''; continue; }
  try { masterText[k] = fs.readFileSync(path.join(MASTER, F[k]), 'utf8'); }
  catch (e) { masterText[k] = ''; }
}
const rtgoText = fs.readFileSync(CSS, 'utf8');
const tokensText = fs.readFileSync(TOKENS, 'utf8');
const componentsText = fs.readFileSync(COMPONENTS, 'utf8');
const galleryText = fs.readFileSync(GALLERY, 'utf8');
/* T17 回收件的真值源 = 另一产品文件（origin=另一产品，见T17 段声明） */
const HOSTFILES = {
  kitui: 'src/styles/ui-kit.css', kitapp: 'src/styles/app.css',
};
const HAVE_HOST = !!HOST && Object.values(HOSTFILES).every(f => fs.existsSync(path.join(HOST, f)));
const hostText = {};
for (const k in HOSTFILES) hostText[k] = HAVE_HOST ? fs.readFileSync(path.join(HOST, HOSTFILES[k]), 'utf8') : '';
const host = { kitui: parseRules(hostText.kitui), kitapp: parseRules(hostText.kitapp) };

/* ---------- 极简 CSS 解析：剥注释；顶层规则；@media 抓一层 ---------- */
function stripComments(t) { return t.replace(/\/\*[\s\S]*?\*\//g, ''); }
/* 选择器列表要拆开：「.a,.b{}」在 CSS 里是两条规则，不拆的话按单个选择器查找会全部落空
   （2026-11-06 引入 .sheet-* 别名时发现：合并写法用旧解析器一条都取不到）。 */
function splitSel(s) {
  const out = []; let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
function parseRules(text) {
  const t = stripComments(text), out = [], media = [];
  const readBlock = (from) => { let d = 0; for (let j = from; j < t.length; j++) { if (t[j] === '{') d++; else if (t[j] === '}') { d--; if (!d) return j; } } return -1; };
  let i = 0;
  while (i < t.length) {
    const b = t.indexOf('{', i); if (b < 0) break;
    const sel = t.slice(i, b).trim().replace(/\s+/g, ' ');
    if (sel.startsWith('@media')) {
      const end = readBlock(b); if (end < 0) break;
      media.push({ cond: sel, ...parseRules(t.slice(b + 1, end)) }); i = end + 1; continue;
    }
    const end = readBlock(b); if (end < 0) break;
    const decls = parseDecls(t.slice(b + 1, end));
    splitSel(sel).forEach(one => out.push({ sel: one, decls }));
    i = end + 1;
  }
  return { rules: out, media };
}
function parseDecls(t) {
  const map = new Map();
  t.split(';').forEach(p => { const c = p.indexOf(':'); if (c < 0) return; const k = p.slice(0, c).trim(), v = p.slice(c + 1).trim(); if (k && !map.has(k)) map.set(k, v); });
  return map;
}
const norm = s => String(s).replace(/\s+/g, '').toLowerCase();

const master = {}; for (const k in F) master[k] = parseRules(masterText[k]);
const rtgo = { css: parseRules(rtgoText) };

/* T16 迁移（v1.5）：组件值已令牌化——比对前把两侧的 var(--x) 各用**自己的令牌表**解析到
   「现值层」再比对（母本用母本表，rtgo 用 rtgo 表；令牌层一致性由 T01/T02 对账单独看守）。
   未在表中的（--nav-bar-height 等）保留原样。 */
function makeResolver(map) {
  return v => String(v).replace(/var\((--[\w-]+)(?:,\s*([^)]+))?\)/g, (m, name, fb) => {
    const hit = map.get(name);
    if (hit != null) return hit;
    return fb != null ? fb : m;
  });
}
const masterTokenMap = (() => { const map = new Map(); parseRules(masterText.app).rules.forEach(r => { if (r.sel !== 'page') return; r.decls.forEach((v, k) => { if (k.startsWith('--') && !map.has(k)) map.set(k, v); }); }); return map; })();
const rtgoTokenMap = (() => { const map = new Map(); rtgo.css.rules.forEach(r => { if (r.sel !== 'body') return; r.decls.forEach((v, k) => { if (k.startsWith('--') && !map.has(k)) map.set(k, v); }); }); return map; })();
const resolveMaster = makeResolver(masterTokenMap);
const resolveVars = makeResolver(rtgoTokenMap);

function rulesOf(srcObj, file) { return srcObj[file].rules; }
/* 同名规则合并后取一条声明。
   同名规则可能有多条：逗号列表在 parseRules 里被拆成「每选择器一条」，同一个类还可能被
   后面的状态/媒体/按压组再次声明。这里按源码顺序合并声明，再取属性：
     - occ='last'（默认）：最后一个「声明了该属性」的值 —— 即浏览器级联后的现值；
     - occ='first'：第一个「声明了该属性」的值 —— 基态值（对比派生档/基础档时用）。
   关键：只带 transition 的按压组不会声明目标属性，因此不再把它前面的基态值盖成 null。
   2026-11-09 那批 29 条静默「未做」正是 last 命中一条没有该属性的同名规则造成的。
   断言本身是逗号列表时（如 .panel,.route-card,.summary,.segment），逐成员取合并值；
   要求每个成员都存在且值一致，否则视为取不到（不能拿半个组冒充整组）。 */
function mergedDecls(srcObj, file, sel, occ) {
  const nsel = norm(sel);
  const out = new Map();
  rulesOf(srcObj, file).forEach(r => {
    if (norm(r.sel) !== nsel) return;
    r.decls.forEach((v, k) => {
      if (occ !== 'first' || !out.has(k)) out.set(k, v);
    });
  });
  return out;
}
function findDecl(srcObj, file, sel, prop, occ) {
  const parts = splitSel(String(sel));
  if (parts.length > 1) {
    let v = null;
    for (const p of parts) {
      const x = findDecl(srcObj, file, p, prop, occ);
      if (x == null) return null;
      if (v == null) v = x;
      else if (norm(v) !== norm(x)) return null;
    }
    return v;
  }
  const map = mergedDecls(srcObj, file, sel, occ);
  return map.has(prop) ? map.get(prop) : null;
}

/* ---------- 结果容器 ---------- */
const rows = [];
function row(id, item, masterVal, gotVal, verdict, note) {
  rows.push({ id, item, master: masterVal, got: gotVal, verdict, note: note || '' });
}
/* master 取 file+sel+occ；rtgo 取同一选择器（rtgoSel 仅作用域件不同） */
function cmp(id, item, file, sel, prop, occ, rtgoSel) {
  const m = findDecl(master, file, sel, prop, occ || 'last');
  const g = findDecl(rtgo, 'css', rtgoSel || sel, prop, occ || 'last');
  if (m == null || g == null) { row(id, item + ' · ' + sel + '{' + prop + '}', m, g, '未做', m == null ? '母本找不到该选择器/属性' : '资产包找不到该选择器/属性'); return false; }
  const ok = norm(resolveMaster(m)) === norm(resolveVars(g));
  row(id, item + ' · ' + sel + '{' + prop + '}', m, g, ok ? '通过' : '不通过');
  return ok;
}
function cmpContains(id, item, file, needle, rtgoNeedle) {
  const hay = t => stripComments(t).replace(/\s+/g, ' ');
  const rNeedle = rtgoNeedle || needle;
  const m = hay(masterText[file]).includes(needle), g = hay(rtgoText).includes(rNeedle);
  const verdict = m && g ? '通过' : m ? '不通过' : '未做';
  row(id, item + ' · 母本含「' + (needle.length > 40 ? needle.slice(0, 40) + '…' : needle) + '」/ 资产含「' + (rNeedle.length > 40 ? rNeedle.slice(0, 40) + '…' : rNeedle) + '」', file, g ? '存在' : '缺失', verdict, m ? '' : 'needle 在母本中不存在（检查 needle 本身）');
  return verdict === '通过';
}
/* M0 裁决移除断言：母本有、资产必须没有（如 O-02 sticky-topbar，审阅判定"效果不佳，移除"） */
function cmpRemoved(id, item, file, needle) {
  const hay = t => stripComments(t).replace(/\s+/g, ' ');
  const m = hay(masterText[file]).includes(needle), g = hay(rtgoText).includes(needle);
  const verdict = m && !g ? '通过' : m ? '不通过' : '未做';
  row(id, item + ' · 应无「' + needle + '」', m ? '母本存在' : '母本无', g ? '资产仍存在' : '资产已移除', verdict, 'M0 R-12（2026-10-31 定稿）');
  return verdict === '通过';
}
function cmpConvert(id, item, file, sel, prop, occ, expect) {
  const m = findDecl(master, file, sel, prop, occ || 'last');
  const g = findDecl(rtgo, 'css', sel, prop, occ || 'last');
  const ok = g != null && norm(g) === norm(expect);
  row(id, item + ' · ' + sel + '{' + prop + '}', m + ' → ' + expect, g, ok ? '换件' : '不通过', 'B 换件记录：T15 口径换算，值零漂移由 expect 钉住');
  return ok;
}
/* 基态组断言：断言的选择器本身就是一组逗号列表，逐个成员比对 transition。
   以前拿整串组名去精确匹配规则，parseRules 拆条后永远取不到 ⇒ T13 七组全红。
   这里要求每个成员都真的有 transition，且与母本同名成员解析后相等。 */
function cmpGroup(id, item, file, sel) {
  const parts = splitSel(sel);
  const pick = (o, key, p) => {
    const nsel = norm(p);
    const hits = rulesOf(o, key).filter(r => norm(r.sel) === nsel && r.decls.has('transition'));
    return hits.length ? hits[hits.length - 1].decls.get('transition') : null;
  };
  const m = new Map(), g = new Map();
  parts.forEach(p => {
    const mv = pick(master, file, p); if (mv != null) m.set(norm(p), mv);
    const gv = pick(rtgo, 'css', p); if (gv != null) g.set(norm(p), gv);
  });
  let ok = m.size === parts.length && g.size === parts.length;
  if (ok) for (const [k, mv] of m) {
    if (!g.has(k) || norm(resolveMaster(mv)) !== norm(resolveVars(g.get(k)))) { ok = false; break; }
  }
  const fmt = x => [...x.values()][0] + '（' + x.size + '/' + parts.length + ' 成员）';
  row(id, item, m.size ? fmt(m) : null, g.size ? fmt(g) : null, ok ? '通过' : '不通过');
  return ok;
}

/* ══════════ 以下 1)~4b) 全部需要 --master（微信母本工程）══════════
   缺母本时整段跳过（否则空母本会与资产逐条比对，把「没数据」误报成「不一致」）。
   ⚠ 段内缩进保持原样是刻意的：多处模板字符串对缩进敏感，整体重排会改变输出文本。 */
if (HAVE_MASTER) {

/* ========== 1) 令牌全量对账（T01/T02：逐令牌 × 浅/暗 × 双写序列） ========== */
function tokenMap(srcObj, file, fromMedia) {
  const map = new Map();
  const collect = rules => rules.forEach(r => {
    if (r.sel !== 'page' && r.sel !== 'body') return;
    r.decls.forEach((v, k) => {
      if (!k.startsWith('--')) return;
      if (!map.has(k)) map.set(k, []);
      const arr = map.get(k);
      if (arr[arr.length - 1] !== v) arr.push(v);   // 去相邻重复（解析保留序）
    });
  });
  if (fromMedia) srcObj[file].media.filter(m => /prefers-color-scheme:\s*dark/.test(m.cond)).forEach(m => collect(m.rules));
  else collect(rulesOf(srcObj, file));
  return map;
}
(function tokenCheck() {
  // T16 资产归纳层（--radius/--shadow/--ease/--dur/--page/--bp/--z 与 --brand-ink）不在母本令牌集内，
  // 由下方 T16 专项断言从母本内联值现查对账；这里跳过以免误报。
  const isDerivedKey = k => /^--(radius|shadow|ease|dur|page|bp|z)/.test(k) || k.includes('--brand-ink');
  for (const mode of ['light', 'dark']) {
    const M = tokenMap(master, 'app', mode === 'dark'), G = tokenMap(rtgo, 'css', mode === 'dark');
    const names = new Set([...M.keys(), ...G.keys()].filter(k => !isDerivedKey(k)));
    let bad = 0;
    for (const n of names) {
      const mv = JSON.stringify((M.get(n) || []).map(norm)), gv = JSON.stringify((G.get(n) || []).map(norm));
      if (mv !== gv) { bad++; if (bad <= 8) row('T01/T02', mode + ' ' + n, (M.get(n) || []).join(' ‖ ') || '缺', (G.get(n) || []).join(' ‖ ') || '缺', '不通过'); }
    }
    row('T01/T02', mode + ' 模式令牌对账（' + names.size + ' 枚 × 双写序列）', 'app.wxss page{}（现查）', bad ? bad + ' 处不一致' : '全部一致', bad ? '不通过' : '通过');
    // T01-08 根底色
    const grab = (obj, file) => {
      const pool = mode === 'dark'
        ? obj[file].media.filter(m => /dark/.test(m.cond)).flatMap(m => m.rules)
        : rulesOf(obj, file);
      const hits = pool.filter(r => r.sel === 'page' || r.sel === 'body');
      const last = hits[hits.length - 1];
      return last ? (last.decls.get('background') || '') + ' / ' + (last.decls.get('color') || '') : null;
    };
    const mv = grab(master, 'app'), gv = grab(rtgo, 'css');
    row('T01-08', mode + ' 根底色 background/color', mv, gv, mv && gv && norm(mv) === norm(gv) ? '通过' : '不通过');
  }
})();

/* ========== 2) A 类逐件断言 ========== */
const A = [
  ['T03-02', '顶栏高 72', 'idx', '.ios-fixed-topbar', 'height'],
  ['T03-02', '顶栏底', 'idx', '.ios-fixed-topbar', 'background'],
  ['T03-02', '顶栏下边', 'idx', '.ios-fixed-topbar', 'border-bottom'],
  ['T03-02', '顶栏投影', 'idx', '.ios-fixed-topbar', 'box-shadow'],
  // T03-02b 半透明档：配色出处是旧代 .fixed-topbar（母本 index:376-395），
  // 故两侧选择器不同名——第 7 参数 rtgoSel 指资产变体档；occ=first 取基础档（不是半透明变体）。
  ['T03-02b', '半透明档底色', 'idx', '.fixed-topbar', 'background', 'first', '.ios-fixed-topbar.is-translucent'],
  ['T03-02b', '半透明档下边框', 'idx', '.fixed-topbar', 'border-bottom', 'first', '.ios-fixed-topbar.is-translucent'],
  ['T03-04', '返回钮圆', 'idx', '.back', 'border-radius'],
  // T03-05：母本已把返回钮字形换成 T18-01/T18-02 图形件（.glyph-back / .glyph-home），
  // 旧的字符字形 .back-glyph / .home-glyph 在母本中已不存在。
  // 2026-11-10 删除两条过期断言；图形件的尺寸/线宽由 T18-01 单独看守。
  ['T03-01', '标题字号', 'idx', '.title', 'font-size'],
  ['T03-01', '副标字号', 'idx', '.sub', 'font-size'],
  ['T04-01', '卡壳圆角', 'idx', '.panel,.route-card,.summary,.segment', 'border-radius'],
  ['T04-01', '卡壳投影', 'idx', '.panel,.route-card,.summary,.segment', 'box-shadow'],
  ['T04-01', 'panel 内距', 'idx', '.panel', 'padding'],
  ['T04-01', 'route-card 底距归零', 'idx', '.route-card', 'padding-bottom'],
  ['T04-02', '描边变体', 'idx', '.border-for-route', 'border'],
  ['T04-03', '卡外标题缩进', 'idx', '.page-h2', 'padding-left'],
  ['T04-05', '分隔线', 'idx', '.page-divider', 'border-top'],
  ['T04-06', '屏体安全区', 'idx', '.screen-body', 'padding'],
  ['T04-07', '空态', 'idx', '.empty', 'padding'],
  ['T04-08', '容器宽', 'idx', '.app', 'max-width', 'first'],
  ['T02-07', '继承字号双写(第2行)', 'idx', '.app', 'font-size', 'first'],
  ['T05-02', '输入框圆角', 'idx', '.input,.picker', 'border-radius'],
  ['T05-02', '输入框定高', 'idx', '.input,.picker', 'min-height'],
  ['T05-02', '输入框底', 'idx', '.input,.picker', 'background'],
  ['T05-03', 'JSON 域高', 'idx', '.json-input', 'height'],
  ['T05-06', '站点对高', 'idx', '.station-pair', 'height'],
  ['T05-06', '槽外圆角', 'idx', '.station-slot.is-origin', 'border-radius'],
  ['T05-06', '交换脸', 'idx', '.swap-face', 'width'],
  ['T05-06', '迷你交换钮', 'idx', '.station-pair.is-manual .swap-btn,.swap-btn.is-mini', 'height'],
  ['T05-07', '日期对标签', 'idx', '.dt-label', 'font-size'],
  ['T05-08', '搜索框高', 'sp', '.station-search-box', 'min-height'],
  ['T05-09', '时刻表钮', 'idx', '.schedule-query-btn', 'min-height'],
  ['T06-01', '主钮高', 'idx', '.actions .primary', 'min-height'],
  ['T06-01', '主钮底', 'idx', '.primary', 'background'],
  ['T06-01', '次钮底', 'idx', '.secondary', 'background'],
  ['T06-01', '次钮最小宽', 'idx', '.actions .secondary', 'min-width'],
  ['T06-03', '分享钮', 'idx', '.share-btn', 'min-height'],
  ['T06-03', '禁用降透', 'idx', '.share-btn[disabled]', 'opacity'],
  ['T06-04', '交换钮', 'idx', '.swap-btn', 'height'],
  ['T06-05', '选择钮', 'idx', '.station-select-btn', 'flex'],
  ['T06-06', '取消钮 Flyme 底', 'dtp', '.dtp-btn.is-cancel', 'background'],
  ['T06-06', '确定钮底', 'dtp', '.dtp-btn.is-confirm', 'background'],
  ['T06-07', 'snp 取消钮', 'snp', '.snp-btn', 'background'],
  ['T06-08', '完成钮', 'mp', '.nb-done', 'background'],
  ['T06-08', 'is-dim', 'mp', '.nb-done.is-dim', 'opacity'],
  ['T06-10', '预览钮', 'idx', '.route-actions .expand-btn', 'font-weight'],
  ['T07-01', '胶囊高', 'idx', '.chip', 'height', 'last'],
  ['T07-01', '胶囊行高(内容盒)', 'idx', '.chip', 'line-height', 'last'],
  ['T07-01', '胶囊底(基态)', 'idx', '.chip', 'background', 'first'],
  ['T07-01', 'active 底', 'idx', '.chip.active', 'background'],
  // 这 7 条显式带 'first' 是保留「基态值」语义：本组件后面还有按压组只声明 transition，
  // 新版 findDecl 已会跳过不声明目标属性的同名规则；这里带 first 是为了钉住基态，
  // 不随后面新增的状态规则漂（2026-11-10 匹配模型统一后，first/last 都不再会被按压组抢走）。
  ['T07-02', '线路胶囊高', 'sp', '.station-line-chip', 'height', 'first'],
  ['T07-02', '线路胶囊描边', 'sp', '.station-line-chip', 'border', 'first'],
  // 右侧展开钮（2026-11-09）：本行此前只被 T13-03 基态组按按压过渡顺带核过，
  // 34 圆 / 浅底 / 透明描边三个外观值没有看守 —— 改小一圈不会有人报。
  ['T07-02', '展开钮宽', 'sp', '.line-expand-btn', 'width', 'first'],
  ['T07-02', '展开钮高', 'sp', '.line-expand-btn', 'height', 'first'],
  ['T07-02', '展开钮正圆', 'sp', '.line-expand-btn', 'border-radius', 'first'],
  ['T07-02', '展开钮底', 'sp', '.line-expand-btn', 'background', 'first'],
  ['T07-02', '展开钮描边(占位)', 'sp', '.line-expand-btn', 'border', 'first'],
  ['T07-03', '线路色胶囊高', 'idx', '.line-pill', 'min-height', 'last'],
  ['T07-03', 'snp 内胶囊高(作用域件)', 'snp', '.line-pill', 'min-height', null, '.snp-panel .line-pill'],
  ['T07-04', '方案卡胶囊', 'idx', '.route-card .axis-route .mode-badge', 'min-height'],
  ['T07-05', 'seg 定高', 'idx', '.seg-type', 'height', 'last'],
  ['T07-07', '最近组合', 'idx', '.recent-combo', 'padding'],
  ['T07-08', '附近条底', 'sp', '.nearby-bar', 'background'],
  ['T07-08', '附近胶囊高', 'sp', '.nearby-chip', 'height'],
  ['T07-09', 'dtp 快捷胶囊', 'dtp', '.dtp-chip', 'height'],
  ['T07-10', '口名胶囊', 'snp', '.snp-chip', 'height'],
  ['T07-11', '第x徽标(圆)', 'idx', '.trip-badge.is-circle', 'background'],
  ['T07-12', '警示徽标底', 'idx', '.warning-badge', 'background'],
  ['T07-12', '警示徽标高', 'idx', '.route-badges .warning-badge', 'min-height'],
  ['T07-14', 'sd 导航钮', 'sd', '.sd-nav', 'background'],
  ['T08-01', '主轴列宽', 'idx', '.timeline-row', 'grid-template-columns'],
  ['T08-02', '节点尺寸', 'idx', '.node', 'width'],
  ['T08-02', '节点边框', 'idx', '.node', 'border'],
  ['T08-02', '换乘节点同心', 'idx', '.node-transfer', 'transform'],
  ['T08-02', '轨线宽', 'idx', '.rail-line', 'width'],
  ['T08-03', '时刻下移', 'idx', '.time', 'transform'],
  ['T08-03', '推算时刻下移', 'idx', '.time-est', 'transform'],
  ['T08-03', '站名字号', 'idx', '.station', 'font-size'],
  ['T08-05', '换乘框', 'idx', '.transfer-box', 'border-radius'],
  ['T08-05', '城际框', 'idx', '.transfer-box.intercity', 'margin-left'],
  ['T08-06', '站内换乘 75.5', 'idx', '.inner-transfer', 'margin-left'],
  ['T08-07', '途经行列宽', 'idx', '.leg-row', 'grid-template-columns'],
  ['T08-07', '途经环', 'idx', '.leg-dot', 'border'],
  ['T08-08', '轴时间高', 'idx', '.axis-time', 'height'],
  ['T08-08', '轴时刻色', 'idx', '.axis-clock', 'color'],
  ['T08-09', '预览节点网格', 'idx', '.preview-node', 'grid-template-columns'],
  ['T08-10', '出闸图标档', 'idx', '.route-card .axis-route .mode-gate', 'width'],
  ['T08-11', '总时长大字', 'idx', '.summary-time', 'font-size'],
  ['T08-11', '汇总行', 'idx', '.summary-line', 'font-size'],
  ['T08-12', 'tl 列宽', 'tl', '.tl-col', 'flex'],
  ['T08-12', 'tl 胶囊宽', 'tl', '.tl-capsule', 'width'],
  ['T08-12', 'tl 色条', 'tl', '.tl-link', 'width'],
  ['T08-12', 'tl 基准线', 'tl', '.tl-ref', 'opacity'],
  ['T09-01', '查询摘要列', 'tt', '.tt-query-summary', 'grid-template-columns'],
  ['T09-02', '表头投影', 'tt', '.tt-head-wrap', 'box-shadow'],
  ['T09-02', '表头高', 'tt', '.tt-head .tt-cell', 'min-height'],
  ['T09-03', '行网格', 'tt', '.tt-row', 'grid-template-columns'],
  ['T09-04', '车次字距', 'tt', '.tt-code', 'letter-spacing'],
  ['T09-04', '站名字', 'tt', '.tt-primary', 'font-size'],
  ['T09-05', '主行高', 'tt', '.tt-main', 'min-height'],
  ['T09-05', '展开行底', 'tt', '.tt-main.is-open', 'background'],
  ['T09-05', '展开行过渡(状态)', 'tt', '.tt-main', 'transition'],
  ['T09-06', 'chevron 闭', 'tt', '.tt-chevron', 'transform'],
  ['T09-06', 'chevron 开', 'tt', '.tt-chevron.open', 'transform'],
  ['T09-07', '详情面板', 'tt', '.tt-detail', 'border-left'],
  ['T09-07', '区间行底', 'tt', '.tt-station-row.in-range', 'background'],
  ['T10-01', 'sheet 高', 'sp', '.station-picker-panel', 'height'],
  ['T10-01', 'sheet 圆角', 'sp', '.station-picker-panel', 'border-radius'],
  ['T10-01', 'sheet 投影', 'sp', '.station-picker-panel', 'box-shadow'],
  ['T10-01', 'sheet 底', 'sp', '.station-picker-panel', 'background'],
  ['T10-02', 'dtp 面板底(卡)', 'dtp', '.dtp-panel', 'background'],
  ['T10-02', 'dtp 选中带', 'dtp', '.dtp-band', 'background'],
  ['T10-03', 'snp 宽', 'snp', '.snp-panel', 'width'],
  ['T10-03', 'snp 投影', 'snp', '.snp-panel', 'box-shadow'],
  ['T10-05', '关闭钮', 'sp', '.station-picker-close', 'width'],
  // T10-05：母本关闭叉已换成 .glyph-close（T18-02），旧的字符 × 规则 .station-picker-close-x
  // 在母本中已不存在；2026-11-10 删除该过期断言，图形件由 T18-02 看守。
  ['T11-01', '错误条', 'idx', '.error', 'background'],
  ['T11-02', '警示卡', 'idx', '.service-warning-card', 'background'],
  ['T11-02', '警示卡投影', 'idx', '.service-warning-card', 'box-shadow'],
  ['T11-02', 'late 态', 'idx', '.service-warning-card.status-late', 'background'],
  ['T11-02', 'ok 态', 'idx', '.service-warning-card.status-ok', 'background'],
  ['T11-03', '末班 late 色', 'idx', '.lasttime-time-warn.lasttime-status-late', 'color'],
  ['T11-04', '空态虚线框', 'er', '.ex-empty', 'border'],
  ['T12-01', 'chevron 基件', 'idx', '.action-glyph', 'width'],
  ['T12-01', '途经 chevron', 'idx', '.leg-toggle .action-glyph', 'transform'],
  ['T12-01', '预览 chevron', 'idx', '.expand-btn .action-glyph', 'transform'],
  ['T12-03', '详情导航 chevron', 'det', '.nav-chev', 'transform'],
  ['T12-05', '定位针盒', 'mp', '.nb-pin', 'height'],
  ['T12-06', '勾画布 3x', 'mp', '.check-glyph', 'width'],
  ['T12-06', '勾缩放', 'mp', '.check-glyph', 'transform'],
  ['T12-06', '勾槽', 'mp', '.nb-row-chk', 'width'],
  // T13 按压（C 类，数值同样刚性）
  ['T13-01', '.press 缩放', 'idx', '.press', 'transform'],
  ['T13-01', '.press 曲线', 'idx', '.press', 'transition'],
  ['T13-01', '.press 换底', 'idx', '.press', 'background'],
  ['T13-01', '.press-scale', 'idx', '.press-scale', 'transform'],
  ['T13-01', '.press-flat', 'idx', '.press-flat', 'background'],
  ['T13-05', '站名导航按压', 'det', '.station-nav-hover', 'opacity'],
  ['T13-05', '预览按压带', 'idx', '.route-actions .expand-hover', 'border-radius'],
  ['T13-07', 'dtp 禁用', 'dtp', '.dtp-cell.is-disabled .dtp-cell-inner', 'opacity'],
  ['T13-08', 'dtp 圆钮按压', 'dtp', '.dtp-press-round', 'transform'],
  ['T13-09', 'snp 按压', 'snp', '.snp-press', 'transform'],
];
let aFail = 0;
for (const [id, item, file, sel, prop, occ, rtgoSel] of A) if (!cmp(id, item, file, sel, prop, occ, rtgoSel)) aFail++;

/* ========== 2b) T03-02b 顶栏·半透明档（软件端；配色出处 = 旧代 .fixed-topbar） ==========
   T03-02 = 微信小程序方案（不透明底 + 强边框，苹果端渲染 bug 的补丁），默认档；
   T03-02b = 只换 background / border-bottom 两条，几何与投影继承。上面 A 表两条已跨选择器对账，
   这里补一条**防恒真**：两档必须真的不同，否则"写了变体但和默认一样"会静默通过。 */
(function translucentTopbarGuard() {
  const cfg = (sel) => ({
    bg: findDecl(rtgo, 'css', sel, 'background', 'first'),
    bd: findDecl(rtgo, 'css', sel, 'border-bottom', 'first'),
  });
  const def = cfg('.ios-fixed-topbar'), alt = cfg('.ios-fixed-topbar.is-translucent');
  const differ = def.bg && alt.bg && norm(resolveVars(def.bg)) !== norm(resolveVars(alt.bg));
  const differBd = def.bd && alt.bd && norm(resolveVars(def.bd)) !== norm(resolveVars(alt.bd));
  row('T03-02b', '两档底色/边框确实不同（防恒真）',
    '默认档 ≠ 半透明档', `${def.bg} ‖ ${alt.bg} · ${def.bd} ‖ ${alt.bd}`,
    differ && differBd ? '通过' : '不通过');
})();

/* ========== 2c) T03-02c 顶栏三子项布局（新增件，无母本出处） ==========
   母本顶栏只有「返回 + 标题组」两个子项，所以 `:last-child{flex:1 1 auto}` 是对的。
   宿主加第三个子项（右侧动作钮）时，动作钮会变成被拉伸的那个 —— 这是 2026-11-02
   外部测试报告里 P2 的成因。修法是新增 `.topbar-main` / `.topbar-actions` 两个显式类（只加不改）。
   这里**不钉 flex 的值**（那是复述实现常量），只钉那条会随书写顺序失效的不变量：
   两条规则的特异性与 `:last-child` 同为 (0,2,0)，靠书写顺序取胜，谁挪到前面谁失效。 */
(function topbarTripleGuard() {
  const src = stripComments(componentsText);
  const at = needle => src.indexOf(needle);
  const lastChild = at('.ios-fixed-topbar>view:last-child');
  const mainSel = at('.ios-fixed-topbar>.topbar-main{');
  const actSel = at('.ios-fixed-topbar>.topbar-actions{');
  const present = lastChild >= 0 && mainSel >= 0 && actSel >= 0;
  const ordered = present && mainSel > lastChild && actSel > lastChild;
  row('T03-02c', '.topbar-main / .topbar-actions 写在 :last-child 之后（同特异性靠顺序取胜）',
    '两者都靠后', present ? (ordered ? '都靠后' : `main@${mainSel} actions@${actSel} last-child@${lastChild}`) : '缺规则',
    present && ordered ? '通过' : '不通过',
    present && ordered ? '' : '挪到 :last-child 之前会被它压回去，动作钮又会被拉伸');
  // 第三子项是显式 API：gallery 得有样片，否则这条规则没人用（孤儿）
  const sampled = galleryText.includes('topbar-actions') && galleryText.includes('topbar-main');
  row('T03-02c', 'gallery 有三子项样片（规则有人用）', '有', sampled ? '有' : '缺', sampled ? '通过' : '不通过');
})();

cmpConvert('T15-03', '渐隐宽 rpx→px（375 设计宽）', 'idx', '.hscroll-fade', 'width', 'first', '26px');

/* ========== 3) C 类基态组（各组原样保留，不合并） ========== */
cmpGroup('T13-02', 'index 系基态组(19 成员，v1.6 +ig-entryline/ig-card-entry)', 'idx', '.route-card,.primary,.secondary,.swap-btn,.chip,.back,.share-btn,.station-select-btn,.api-preview,.schedule-query-btn,.lasttime-close,.station-pick,.picker,.recent-combo,.custom-stop-del,.station-swap,.station-manual-pick,.ig-entryline,.ig-card-entry');
cmpGroup('T13-03', 'tl 基态组', 'tl', '.back,.chip');
cmpGroup('T13-03', 'station-picker 基态组', 'sp', '.station-picker-close,.station-picker-map,.line-expand-btn,.station-line-chip,.nearby-bar,.nearby-chip,.nearby-act');
cmpGroup('T13-03', 'map 基态组(含bg/opacity)', 'mp', '.nb-sheet-close,.nb-act,.nb-gate-btn,.nb-row,.nb-done');
cmpGroup('T13-03', 'sd 基态组(含bg/opacity)', 'sd', '.sd-close,.sd-nav');
cmpGroup('T13-03', 'dtp 基态组', 'dtp', '.dtp-quick,.dtp-chip,.dtp-btn,.dtp-nav');
cmpGroup('T13-03', 'snp 基态组', 'snp', '.snp-chip,.snp-btn');

/* ========== 4) contains：媒体档 / 关键帧 / 机制（needle 先在母本核实） ========== */
cmpContains('T03-06', '窄屏顶栏覆盖', 'idx', '.ios-fixed-topbar .title{font-size:var(--fs-title-24)}');
cmpContains('T03-03', '旧代 fixed 顶栏（O-01 保留备用）', 'idx', '.fixed-topbar{');
cmpRemoved('T03-03', '旧代 sticky 顶栏（O-02 移除）', 'idx', '.sticky-topbar{');

/* ========== 4a-bis) T16 资产归纳层断言（v1.3 回流）：派生令牌值 ≡ 母本内联值（现查） ========== */
(function derivedTokens() {
  const tok = (name, mode) => {
    const pool = mode === 'dark'
      ? rtgo.css.media.filter(m => /dark/.test(m.cond)).flatMap(m => m.rules)
      : rtgo.css.rules;
    const hits = pool.filter(r => r.sel === 'body' && r.decls.has(name));
    return hits.length ? hits[hits.length - 1].decls.get(name) : null;
  };
  const masterRegexVal = (file, re, gi) => { const m = stripComments(masterText[file]).match(re); return m ? m[gi] : null; };
  const D = [
    ['--radius-pill', () => findDecl(master, 'idx', '.chip', 'border-radius', 'first')],
    ['--radius-card', () => findDecl(master, 'idx', '.panel,.route-card,.summary,.segment', 'border-radius', 'first')],
    ['--radius-box', () => findDecl(master, 'idx', '.transfer-box', 'border-radius', 'first')],
    ['--radius-ctrl', () => findDecl(master, 'idx', '.input,.picker', 'border-radius', 'first')],
    ['--radius-inner', () => findDecl(master, 'idx', '.error', 'border-radius', 'first')],
    ['--radius-chip', () => findDecl(master, 'idx', '.lasttime-close', 'border-radius', 'first')],
    ['--shadow-card', () => findDecl(master, 'idx', '.panel,.route-card,.summary,.segment', 'box-shadow', 'first')],
    ['--shadow-pop', () => findDecl(master, 'idx', '.back', 'box-shadow', 'last')],
    ['--shadow-topbar', () => findDecl(master, 'idx', '.ios-fixed-topbar', 'box-shadow', 'first')],
    ['--shadow-sheet', () => findDecl(master, 'sp', '.station-picker-panel', 'box-shadow', 'first')],
    ['--ease-press', () => masterRegexVal('idx', /transition:transform \.25s (cubic-bezier\(\.33,\.33,\.67,1\))/, 1)],
    ['--ease-sheet', () => masterRegexVal('sp', /animation:picker-panel-in 380ms (cubic-bezier\(0\.32,0\.72,0,1\))/, 1)],
    ['--dur-press', () => masterRegexVal('idx', /transition:transform (\.25s) cubic-bezier/, 1)],
    ['--dur-fade', () => masterRegexVal('idx', /animation:rail-fade-in (180ms) ease-out/, 1)],
    ['--dur-screen', () => masterRegexVal('idx', /animation:screen-in (220ms) ease-out backwards/, 1)],
    ['--dur-mask', () => masterRegexVal('sp', /animation:picker-mask-in (200ms) ease-out backwards/, 1)],
    ['--dur-sheet-in', () => masterRegexVal('sp', /animation:picker-panel-in (380ms) cubic-bezier/, 1)],
    ['--dur-sheet-out', () => masterRegexVal('sp', /animation:picker-panel-out (300ms) cubic-bezier/, 1)],
    ['--page-max', () => findDecl(master, 'idx', '.app', 'max-width', 'first')],
    ['--page-pad', () => masterRegexVal('idx', /padding:0 (14px) calc\(50px/, 1)],
    ['--z-node', () => findDecl(master, 'idx', '.node', 'z-index', 'first')],
    ['--z-overlay', () => findDecl(master, 'sp', '.line-grid-overlay', 'z-index', 'first')],
    ['--z-actionbar', () => findDecl(master, 'idx', '.saved-select-bar', 'z-index', 'first')],
    ['--z-fade', () => findDecl(master, 'idx', '.hscroll-fade', 'z-index', 'first')],
    ['--z-mask', () => findDecl(master, 'sp', '.station-picker-mask', 'z-index', 'first')],
    ['--z-topbar', () => findDecl(master, 'idx', '.ios-fixed-topbar', 'z-index', 'first')],
  ];
  for (const [name, get] of D) {
    const mv = get(), gv = tok(name, 'light');
    const ok = mv != null && gv != null && norm(mv) === norm(gv);
    row('T16', '派生令牌 ' + name + ' ≡ 母本内联值（现查）', mv, gv, ok ? '通过' : '不通过');
  }
  const bpOk = /@media\(max-width:430px\)/.test(stripComments(rtgoText).replace(/\s+/g, ''));
  row('T16-05b', '--bp-narrow 430（母本媒体档锚点）', '@media(max-width:430px)', bpOk ? '存在' : '缺失', bpOk ? '通过' : '不通过');
  // T16-25 --brand-ink 两档 ≡ --brand 同档现值（1:1 映射，零视觉变化）
  for (const mode of ['light', 'dark']) {
    const brandV = (tokenMap(rtgo, 'css', mode === 'dark').get('--brand') || []).slice(-1)[0];
    const ink = tok('--brand-ink', mode);
    row('T16-25', '--brand-ink ' + mode + ' 档 ≡ --brand 现值（1:1 映射）', brandV, ink, norm(brandV || '') === norm(ink || '') ? '通过' : '不通过');
  }
})();

/* ========== 4a-ter) T17 回收件断言（v1.4）：rtgo 值 ≡ 另一产品真值（现查于 另一产品 文件） ========== */
/* 另一产品同样是作者本地工程；缺 --host 时这 42 条无法成立，整组跳过而不是记 42 条「未做」。 */
if (HAVE_HOST) (function t17Audit() {
  const hostDecl = (file, sel, prop, occ) => {
    const nsel = norm(sel);
    const hits = host[file].rules.filter(r => norm(r.sel) === nsel && r.decls.has(prop));
    if (!hits.length) return null;
    const r = occ === 'first' ? hits[0] : hits[hits.length - 1];
    return r.decls.get(prop);
  };
  const rtgoDecl = (sel, prop, occ) => findDecl(rtgo, 'css', sel, prop, occ || 'last');
  const D = [
    // [id, rtgoSel, prop, spec, hostSel（改名件的 kit 原名；缺省=同 rtgoSel）]
    ['T17-01', '.stop-row', 'padding', null, null], ['T17-01', '.stop-dir', 'font-size', null, null],
    ['T17-01', '.stop-eta', 'font-size', null, null], ['T17-01', '.stop-eta.is-none', 'color', null, null],
    ['T17-02', '.bus-timeline .timeline-row', 'grid-template-columns', null, null],
    ['T17-02', '.bus-timeline .node', 'width', null, null],
    ['T17-02', '.bus-timeline .timeline-row.is-current', 'min-height', null, null],
    ['T17-02', '.bus-timeline .eta-bar', 'flex', null, null],
    ['T17-02', '.bus-timeline .eta-row + .timeline-row .rail-line', 'top', null, null],
    ['T17-03', '.tt-flat-row', 'grid-template-columns', null, '.tt-row'],
    ['T17-03', '.tt-flat-min', 'font-variant-numeric', null, '.tt-min'],
    ['T17-03', '.tt-flat-min.is-next', 'color', null, '.tt-min.is-next'],
    ['T17-04', '.sample-tip', 'padding', null, null], ['T17-04', '.sample-tip.is-stale', 'background', null, null],
    ['T17-05', '.notice-strip', 'border-radius', null, null], ['T17-05', '.notice-close', 'width', null, null],
    ['T17-06', '.skeleton.line', 'height', null, null], ['T17-06', '.skeleton-row', 'padding', null, null],
    ['T17-07', '.state-card', 'padding', null, null], ['T17-07', '.state-btn', 'min-height', null, null],
    ['T17-08', '.adv-toggle', 'min-height', null, null], ['T17-08', '.adv-count', 'height', null, null],
    ['T17-08', '.adv-toggle.open', 'background', null, null],
    ['T17-09', '.cat-chip', 'border-color', null, null], ['T17-09', '.cat-expand', 'flex', null, null],
    ['T17-09', '.cat-expand.open .cat-expand-arrow', 'transform', null, null],
    ['T17-10', '.sort-dir', 'width', null, null], ['T17-10', '.sort-dir.asc', '-webkit-mask-image', 'contains:M2 17H22L12 2Z', null],
    ['T17-11', '.find-icon', 'width', null, null],
    ['T17-12', '.tag', 'height', null, null], ['T17-12', '.tag', 'padding', null, null],
    ['T17-13', '.bnav .cell', 'min-height', null, null], ['T17-13', '.bn-ico', 'width', null, null],
    ['T17-13', '.bn-ico.home', '-webkit-mask-image', 'contains:stroke-width=\'1.8\'', null],
    ['T17-14', '.detail-top .cover-sm', 'width', null, '.detail-top .cover.sm'],
    ['T17-14', '.fact-plain .v', 'font-size', null, '.fact .v'],
    ['T17-15', '.toc-row', 'padding', null, null], ['T17-15', '.toc-row.current', 'background', null, null],
    ['T17-15', '.toc-vol', 'padding-left', null, null],
    ['T17-17', '.cover', 'aspect-ratio', null, null], ['T17-17', '.shelf-progress-bar', 'height', null, null],
  ];
  let fail = 0;
  for (const [id, sel, prop, spec, hostSel] of D) {
    const hv0 = hostDecl('kitui', hostSel || sel, prop) ?? hostDecl('kitapp', hostSel || sel, prop);
    const gv0 = rtgoDecl(sel, prop);
    /* 两侧同过 resolver：另一产品 令牌值已证与 rtgo 一致（Y-T1），var 引用解析后可比 */
    let h = hv0 == null ? null : resolveVars(hv0), gv = gv0 == null ? null : resolveVars(gv0);
    if (spec && spec.startsWith('contains:')) {
      const needle = spec.slice(9);
      h = hv0 && hv0.includes(needle) ? needle + '（含）' : null;
      gv = gv0 && gv0.includes(needle) ? needle + '（含）' : null;
    }
    const ok = h != null && gv != null && norm(h) === norm(gv);
    row(id, sel + '{' + prop + '}' + (spec ? '（' + spec.split(':')[0] + '）' : ''), h, gv, ok ? '通过' : (h == null ? '未做' : '不通过'));
    if (!ok) fail++;
  }
  // T10-03 修正断言：out 键含 margin 补偿表达式
  const outOk = stripComments(rtgoText).replace(/\s+/g, '').includes('calc(100%+16px+env(safe-area-inset-bottom))');
  row('T10-03', 'snp-panel-out 位移 ≡ margin-bottom 表达式（真 Bug 修正）', 'calc(100%+16px+safe)', outOk ? '已修正' : '未修', outOk ? '通过' : '不通过', '另一产品 ConfirmSheet 同款实证（app.css:444-448）');
})();

/* ========== 4a-quater) T19 票务指南弹层断言（v1.6，现查源=母本） ========== */
(function t19Audit() {
  const D = [
    ['T19-01', '壳形态自适应档', 'ig', '.ig-panel', 'max-height', null, '86vh'],
    ['T19-01', '壳底', 'ig', '.ig-panel', 'background', null, 'var(--sheet)'],
    ['T19-02', '头部标题', 'ig', '.ig-head-title', 'font-size', null, 'var(--fs-title-21)'],
    ['T19-02', '关闭钮', 'ig', '.ig-close', 'width', 'first', '42px'],   // 基态值（后面的按压组只带 transition，不参与取值）
    ['T19-03', '通栏滚动区（margin 补偿）', 'ig', '.ig-body', 'margin', null, '0 -14px'],
    ['T19-03', '通栏滚动区（padding 补位）', 'ig', '.ig-body', 'padding', null, '0 14px'],
    ['T19-04', '要点列表缩进', 'ig', '.ig-p2', 'padding', null, '7px 0 0 15px'],
    ['T19-06', '着色字', 'ig', '.hl-r', 'color', null, 'var(--danger)'],
    ['T19-07', '开关行底', 'ig', '.ig-switch-row', 'background', null, 'var(--fill)'],
    ['T19-10', '行式入口', 'idx', '.ig-entryline', 'padding', null, '12px 2px'],
    ['T10-06b', '.sd-body 通栏化（盲区补看守）', 'sd', '.sd-body', 'margin', null, '0 -14px'],
  ];
  for (const [id, item, file, sel, prop, occ, want] of D) {
    const mv = findDecl(master, file, sel, prop, occ || 'last');
    const gv = findDecl(rtgo, 'css', sel, prop, occ || 'last');
    const ok = mv != null && gv != null && norm(mv) === norm(gv) && norm(mv) === norm(want);
    row(id, sel + '{' + prop + '} ≡ ' + want, mv, gv, ok ? '通过' : '不通过');
  }
})();

/* ========== 4a-quater) T21 / T22（v1.14）==========
   母本实现用的是页面私有的 .saved-* / .confirm-* 名，资产侧已改名通用化（2026-11-07 定稿）。
   所以这里一律用 cmp 的第 4 参 rtgoSel 做「跨名对账」：值必须一致，名字可以不同。
   ⚠ 这几族是**静态层**（件已定稿、不会随产品口径改），所以写死断言并做反向注入。 */
(function t21t22() {
  const D = [
    // 对话框（母本 confirm-dialog.wxss）
    ['T21-02', '对话框正文·内距', 'conf', '.confirm-body', 'padding', null, '.snp-body'],
    ['T21-02', '对话框正文·字号', 'conf', '.confirm-body', 'font-size', null, '.snp-body'],
    ['T06-06b', '对钮·危险档底', 'conf', '.confirm-btn.primary.danger', 'background', null, '.dtp-btn.is-danger'],
    ['T06-06b', '对钮·危险档字色', 'conf', '.confirm-btn.primary.danger', 'color', null, '.dtp-btn.is-danger'],
    // 列表管理底栏（母本 index.wxss 的 .saved-* 块）
    ['T22-01', '底栏·宽度口径', 'idx', '.saved-select-bar', 'max-width', null, '.select-bar'],
    ['T22-01', '底栏·内距（含安全区）', 'idx', '.saved-select-bar', 'padding', null, '.select-bar'],
    ['T22-01', '底栏·层级', 'idx', '.saved-select-bar', 'z-index', null, '.select-bar'],
    ['T22-02', '底栏·全选触控高', 'idx', '.saved-select-all', 'min-height', null, '.select-all'],
    ['T22-02', '底栏·全选字色', 'idx', '.saved-select-all', 'color', null, '.select-all'],
    ['T22-02', '底栏·计数字号', 'idx', '.saved-select-count', 'font-size', null, '.select-count'],
    ['T22-02', '底栏·删除字色', 'idx', '.saved-select-del', 'color', null, '.select-del'],
    ['T22-02', '底栏·删除禁用', 'idx', '.saved-select-del.is-disabled', 'opacity', null, '.select-del.is-disabled'],
    ['T22-03', '卡级选中·描边色', 'idx', '.saved-card.is-selected', 'border-color', null, '.route-card.is-selected'],
    ['T22-03', '卡级选中·ring', 'idx', '.saved-card.is-selected', 'box-shadow', null, '.route-card.is-selected'],
    ['T22-04', '顶栏动作·触控高', 'idx', '.topbar-action', 'min-height', null, null],
    ['T22-04', '顶栏动作·字号', 'idx', '.topbar-action', 'font-size', null, null],
    ['T22-05', '选中模式页面让位', 'idx', '.screen-body.is-selecting', 'padding-bottom', null, null],
    // 变体（挂回原族）
    ['T06-01b', '主钮紧凑档·容器', 'idx', '.actions.is-compact', 'justify-content', null, null],
    ['T06-01b', '主钮紧凑档·宽度', 'idx', '.actions.is-compact .primary', 'width', null, null],
    ['T07-06b', '站名胶囊强调档·内距', 'idx', '.saved-stale', 'padding', null, '.station-chip.is-strong'],
    ['T07-06b', '站名胶囊强调档·字色', 'idx', '.saved-stale', 'color', null, '.station-chip.is-strong'],
    ['T07-12b', '警示徽标紧凑档·高', 'idx', '.saved-warning', 'min-height', null, '.warning-badge.is-compact'],
    ['T12-06b', '勾槽空环·环径', 'idx', '.saved-check::before', 'width', null, '.nb-row-chk.is-hollow::before'],
    ['T12-06b', '勾槽空环·环粗', 'idx', '.saved-check::before', 'border', null, '.nb-row-chk.is-hollow::before'],
    ['T17-05b', '公告条静默档·内距', 'idx', '.snapshot-note', 'padding', null, '.notice-strip.is-quiet'],
    ['T17-05b', '公告条静默档·底色', 'idx', '.snapshot-note', 'background', null, '.notice-strip.is-quiet'],
  ];
  D.forEach(([id, item, file, sel, prop, occ, rtgoSel]) => cmp(id, item, file, sel, prop, occ, rtgoSel || undefined));

  /* T21-01 组合件：壳/头/正文/钮四件必须同时出现在 T21 样片里（组合纪律的可执行形式） */
  const seg = (galleryText.match(/<section[^>]*id="g-t21"[\s\S]*?<\/section>/) || [''])[0];
  const need = ['snp-mask', 'snp-panel', 'snp-head', 'snp-title', 'snp-body', 'dtp-actions', 'dtp-btn'];
  const missing = need.filter(c => !seg.includes(c));
  row('T21-01', '组合件：样片同时含壳/头/正文/钮（' + need.length + ' 类）', '0', missing.length ? missing.join(',') : '0',
    seg && !missing.length ? '通过' : '不通过', 'T21 样片缺件或整段缺失');
})();

/* ========== 4b) U-5 哨兵（M0 定稿 2026-10-31）：母本漂移预警 ==========
   口径：stripComments 后统计。rpx 声明必须恰好是已知 2 处（同一规则在页面/组件两个镜像文件里）；
   hex 色声明数必须与基线一致 —— 多出的每一个都要人工审计后更新基线（资产同步对账）。 */
(function sentinels() {
  const sortKeys = o => Object.keys(o).sort().reduce((a, k) => (a[k] = o[k], a), {});
  const rpxWant = { idx: ['52rpx'], sp: ['52rpx'] };   // 同一 .hscroll-fade 规则的两个镜像（资产 width:26px 覆盖两处场景）
  const hexBase = {   // M0 定稿基线（2026-10-31，D-01 代删后现查）
    idx: 8, tl: 2, er: 1, exs: 2,
    sp: 3, dtp: 3, mp: 2, sd: 2, snp: 1,
  };
  // rpx
  const rpxGot = {};
  for (const f in F) {
    const hits = stripComments(masterText[f]).match(/\d+rpx/g) || [];
    if (hits.length) rpxGot[f] = hits;
  }
  const rpxNorm = JSON.stringify(sortKeys(rpxGot)), rpxW = JSON.stringify(sortKeys(rpxWant));
  row('U-5a', 'rpx 声明哨兵（剥注释；新增即需资产对账）', rpxW, rpxNorm, rpxNorm === rpxW ? '通过' : '不通过', '已知：.hscroll-fade 同规则在 idx/sp 两镜像，资产 width:26px');
  // hex
  const hexGot2 = {};
  for (const k in F) {
    if (k === 'app') continue;   // app.wxss 是令牌真源，hex 合法，不入哨兵
    const n = (stripComments(masterText[k]).match(/#[0-9a-fA-F]{3,8}\b/g) || []).length;
    if (n) hexGot2[k] = n;
  }
  const hNorm = JSON.stringify(sortKeys(hexGot2)), hW = JSON.stringify(sortKeys(hexBase));
  row('U-5b', '硬编码色哨兵（剥注释计数；漂移即人工审计）', hW, hNorm, hNorm === hW ? '通过' : '不通过', '基线 = M0 定稿日现查；例外口径见件号表 T15（#fff 白字、#6D6D72 占位、rgba 投影不在 hex 内）');
})();
cmpContains('T09-08', '表格通栏 430', 'tt', '.tt-table-block{margin-left:-14px;margin-right:-14px;border-left:0;border-right:0}');
cmpContains('T10-03', '母本回修（v1.4）：snp-panel-out 位移带 margin', 'snp', 'to{transform:translateY(calc(100% + 16px + env(safe-area-inset-bottom)))}');
cmpContains('T10-03', '母本回修（v1.4）：snp-panel-in 起点带 margin', 'snp', 'from{transform:translateY(calc(100% + 16px + env(safe-area-inset-bottom)))}');
cmpContains('T09-03', '超窄屏列宽 340', 'tt', '.tt-row{grid-template-columns:66px minmax(0,1fr) 18px minmax(0,1fr) 48px 22px}');
cmpContains('T14-01', '切屏动效（资产侧已令牌化）', 'idx', 'screen-in 220ms ease-out backwards', 'screen-in var(--dur-screen) ease-out backwards');
cmpContains('T14-01', '切屏位移', 'idx', 'translateY(12px)');
cmpContains('T14-02', '局部淡入（资产侧已令牌化）', 'idx', 'rail-fade-in 180ms ease-out', 'rail-fade-in var(--dur-fade) ease-out');
cmpContains('T14-03', '半屏曲线（母本锚点=组件活文件；资产侧已令牌化）', 'sp', 'cubic-bezier(0.32,0.72,0,1)', 'var(--ease-sheet)');
cmpContains('T14-03', '半屏起点 115%', 'idx', 'translateY(115%)');
cmpContains('T14-03', '半屏折返 -3px', 'idx', '62%{transform:translateY(-3px)');
cmpContains('T10-07', '常驻挂载冻结', 'sp', '.picker-hidden{display:none;animation:none}');
cmpContains('T13-04', '暗档占位色', 'idx', '#6D6D72');
cmpContains('T14-04', '骨架脉冲', 'sp', 'nearby-pulse 1.2s ease-in-out infinite');
cmpContains('T12-01', 'chevron .18s 过渡', 'idx', 'transition:transform .18s ease');
cmpContains('T08-03', '数字等宽', 'idx', 'font-variant-numeric:tabular-nums');

}  /* ══════════ 结束 HAVE_MASTER 段：以下 4c/4d/5 只读本仓库，人人可跑 ══════════ */

/* ========== 4c) M1 构建完整性：bundle 必须恰为 tokens+components 的拼合 ========== */
(function integrity() {
  const core = t => stripComments(t).replace(/[\r\n\t ]+/g, ' ').trim();
  const want = core(tokensText) + ' ' + core(componentsText);
  const got = core(rtgoText);
  const ok = got === want;
  row('M1-完整性', 'bundle ≡ tokens + components（构建产物不许手改）', 'rtgo-tokens.css + rtgo-components.css', ok ? '逐字一致' : '不一致（bundle 被手改或源未重建）', ok ? '通过' : '不通过', 'node 构建脚本 重建');
})();

/* ========== 4e) M4 主题档：theme-overrides.css 必须与令牌层逐值一致 ==========
   它是 构建脚本 的产物，供「手动切浅/深」用（用户不改系统设置也要能切）。
   一旦它与令牌层不一致，手动切档就和跟随系统不是同一套颜色 —— 而且**不报错**。
   2026-11-02 的真事故：运行时用正则给 CSS 改作用域，`background:` / `color:` 这类
   以字母开头的声明被当成选择器，整段折进下一条规则而丢失 ⇒ 切深色后 body 底色仍是浅的。
   本组就是那次的看守：产物 vs 源，逐值对账。 */
(function themeTier() {
  const FILE = path.join(path.dirname(CSS), 'theme-overrides.css');
  const blocks = text => {
    const out = []; let i = 0;
    while (i < text.length) {
      while (i < text.length && /\s/.test(text[i])) i++;
      if (i >= text.length) break;
      if (text.startsWith('/*', i)) { const e = text.indexOf('*/', i + 2); i = e < 0 ? text.length : e + 2; continue; }
      const b = text.indexOf('{', i); if (b < 0) break;
      let d = 1, j = b + 1;
      while (j < text.length && d > 0) { if (text[j] === '{') d++; else if (text[j] === '}') d--; j++; }
      out.push({ sel: text.slice(i, b).trim(), body: text.slice(b + 1, j - 1) });
      i = j;
    }
    return out;
  };
  const declsOf = body => body.split(';').map(p => { const c = p.indexOf(':'); return c < 0 ? null : [p.slice(0, c).trim(), p.slice(c + 1).trim().replace(/\s+/g, '')]; }).filter(Boolean);
  const toMap = arr => { const m = new Map(); arr.forEach(([k, v]) => m.set(k, v)); return m; };
  const diff = (src, got) => {
    const bad = [];
    for (const [k, v] of src) if (got.get(k) !== v) bad.push(k + '（源 ' + v + ' / 产物 ' + (got.get(k) ?? '缺') + '）');
    for (const k of got.keys()) if (!src.has(k)) bad.push(k + '（产物多出）');
    return bad;
  };
  const darkMediaOf = css => blocks(css).filter(b => /prefers-color-scheme\s*:\s*dark/.test(b.sel));

  if (!fs.existsSync(FILE)) {
    row('M4-产物', 'theme-overrides.css 在位', '有', '缺', '未做', 'node 构建脚本 生成');
    return;
  }
  const out = blocks(stripComments(fs.readFileSync(FILE, 'utf8')));
  const lightOut = out.find(b => b.sel === 'body.theme-light');
  const darkOut = out.find(b => b.sel === 'body.theme-dark');

  // 浅档：令牌层基础 body{} 块 ⇄ 产物 body.theme-light
  const tokensCss = stripComments(tokensText);
  const lightSrc = toMap(declsOf(blocks(tokensCss).find(b => b.sel === 'body').body));
  if (!lightOut) {
    row('M4-浅档', '产物含 body.theme-light 块', '有', '缺', '不通过');
  } else {
    const bad = diff(lightSrc, toMap(declsOf(lightOut.body)));
    row('M4-浅档', 'body.theme-light ≡ 令牌层基础 body（逐值）', String(lightSrc.size) + ' 条', bad.length ? bad.join('；') : String(lightSrc.size) + ' 条', bad.length ? '不通过' : '通过');
  }

  // 深档：令牌层暗档 body{} 块 ⇄ 产物 body.theme-dark
  const dMedia = darkMediaOf(tokensCss)[0];
  const darkSrc = dMedia ? toMap(declsOf(blocks(dMedia.body).find(b => b.sel === 'body').body)) : new Map();
  if (!darkOut) {
    row('M4-深档', '产物含 body.theme-dark 块', '有', '缺', '不通过');
  } else {
    const gotDark = toMap(declsOf(darkOut.body));
    const bad = diff(darkSrc, gotDark);
    row('M4-深档', 'body.theme-dark ≡ 令牌层暗档 body（逐值）', String(darkSrc.size) + ' 条', bad.length ? bad.join('；') : String(darkSrc.size) + ' 条', bad.length ? '不通过' : '通过');
    // 单独盯底色：这是 2026-11-02 事故的直接症状（底色不变 = 用户唯一看得见的错）
    row('M4-深档底', 'body.theme-dark 必须自带 background/color', 'background: ' + (darkSrc.get('background') || '—'),
      'background: ' + (gotDark.get('background') || '缺'), gotDark.get('background') ? '通过' : '不通过',
      gotDark.get('background') ? '' : '深档没写 background ⇒ 切深色后仍用浅档底色');
  }

  // 组件层暗档规则（如 .input-ph）必须带作用域前缀，否则手动切档时它们不跟随
  const compDarkSels = darkMediaOf(stripComments(componentsText)).flatMap(b => blocks(b.body)).map(b => b.sel);
  const missSel = compDarkSels.filter(s => !out.some(o => o.sel === 'body.theme-dark ' + s));
  row('M4-深档件', '组件层暗档规则都带 body.theme-dark 前缀', '0', missSel.length ? missSel.join(',') : '0', missSel.length ? '不通过' : '通过');

  // 接线：gallery 静态引产物，且不再运行时改作用域（事故的根因就是那段运行时改写）
  const staticLink = /<link[^>]+href="theme-overrides\.css"/.test(galleryText);
  const runtimeRewrite = /XMLHttpRequest[\s\S]{0,400}rtgo-slate\.css/.test(galleryText);
  row('M4-接线', 'gallery 静态引 theme-overrides.css 且不做运行时改写', '有 / 无', (staticLink ? '有' : '缺') + ' / ' + (runtimeRewrite ? '仍有' : '无'),
    staticLink && !runtimeRewrite ? '通过' : '不通过', runtimeRewrite ? '运行时正则改作用域会吞掉 background/color 声明' : '');
})();

/* ========== 4c-2) T18 自建图形件（origin=本仓：没有母本可对，查「件在 + mask + 样片」） ========== */
/* 这一类件的真值源是本仓代码本身，所以不进母本对账；能查的是「件还在不在、尺寸还是不是那个、
   样片有没有接上」。盒子尺寸是按墨迹反算的（19/26/16/14/7/24/13×10/20/24），改盒子等于改墨迹，
   所以这里写死断言 —— 图形件是静态层，不会随产品设计漂。 */
(function selfGlyphs() {
  const norm = stripComments(componentsText).replace(/\s+/g, ' ');
  const blockOf = (cls) => {
    const i = norm.indexOf('.' + cls + '{');
    if (i < 0) return '';
    return norm.slice(i, norm.indexOf('}', i) + 1);
  };
  const want = [
    ['T18-01', 'glyph-back', 'width:19px;height:19px'],
    ['T18-02', 'glyph-close', 'width:26px;height:26px'],
    ['T18-03', 'glyph-chevron', 'width:16px;height:16px'],
    /* T18-04 的 14 盒与 stroke 3.43 是一组（= 2×24/14）：两值分开改就不再是 2px 屏幕线宽。 */
    ['T18-04', 'glyph-chevron-down', 'width:14px;height:14px', "stroke-width='3.43'"],
    ['T18-05', 'glyph-caret-down', 'width:7px;height:7px'],
    ['T18-06', 'glyph-swap', 'width:24px;height:24px'],
    ['T18-07', 'glyph-pick', 'width:13px;height:10px'],
    ['T18-09', 'glyph-more', 'width:20px;height:20px'],
    /* T18-10 的尺寸只是壳；真正的口径是「三枚点径都是 r=1.75」，由下面那条计数断言单独看守。
       塞进本行只查「文件里有 r='1.75'」，改掉其中一枚照样过。 */
    ['T18-10', 'glyph-more-disc', 'width:24px;height:24px']
  ];
  want.forEach(([id, cls, size, strokeNeed]) => {
    const blk = blockOf(cls);
    const hasSize = blk.includes(size) && (!strokeNeed || blk.includes(strokeNeed));
    /* 两条 mask 必须都在：带 -webkit- 前缀一条（老 WebView）、不带前缀一条（标准）。
       ⚠ 数的时候要排除前缀那条 —— 2026-11-07 验证时发现，原来直接 match `mask-image:url`
       会把 `-webkit-mask-image:url` 也算进去，于是「只留 webkit 一条」也能凑到 2，断言形同虚设。 */
    const stdMasks = (blk.match(/(?:^|[^-])mask-image:url\("data:image\/svg/g) || []).length;
    const webkitMasks = (blk.match(/-webkit-mask-image:url\("data:image\/svg/g) || []).length;
    const inGallery = galleryText.includes('.' + cls);
    row(id, '自建图形件 .' + cls + '（尺寸 + 双前缀 mask + 样片）', size + ' / 各 1 条 / 有',
      (hasSize ? size : '缺') + ' / ' + webkitMasks + ':' + stdMasks + ' / ' + (inGallery ? '有' : '缺'),
      hasSize && webkitMasks === 1 && stdMasks === 1 && inGallery ? '通过' : '不通过',
      '自建件无母本可对，只查件本身与样片是否在位');
  });
  /* T18-10 的点径必须三枚都对：泛型那条只查「文件里出现过 r='1.75'」，
     改掉其中一枚（或只改左右两枚）照样能过，反向注入实测过，那样断言是虚设的。
     两条 mask（webkit + 标准）× 三枚点 = 6 次，少一次就是有人动过点径。 */
  const discBlk = blockOf('glyph-more-disc');
  const discDots = (discBlk.match(/r='1\.75'/g) || []).length;
  row('T18-10', '圆钮三点点径（三枚 × 双前缀 mask = 6 次 r=1.75）', '6',
    String(discDots), discDots === 6 ? '通过' : '不通过',
    '点径是这一档真正的口径：盒子对了、点径退回 1.2 就会静默变回「圆里三个小点」');
  /* T18-08 是成对件（v1.19 改件）：两枚都要在、都要 13 盒 + stroke 3.69（= 2×24/13），
     样片里两枚都要出现。只查左向等于没查「成对」—— 那正是本件存在的理由。 */
  const switchPair = ['glyph-switch-left', 'glyph-switch-right'];
  const pairBlocks = switchPair.map(blockOf);
  const pairOk = pairBlocks.every(b =>
    b.includes('width:13px;height:13px') && b.includes("stroke-width='3.69'"));
  const pairMasks = pairBlocks.map(b => [
    (b.match(/-webkit-mask-image:url\("data:image\/svg/g) || []).length,
    (b.match(/(?:^|[^-])mask-image:url\("data:image\/svg/g) || []).length,
  ]);
  const pairMaskOk = pairMasks.every(([wk, std]) => wk === 1 && std === 1);
  const pairInGallery = switchPair.every(c => galleryText.includes('.' + c));
  row('T18-08', '选择器切换箭头对 .glyph-switch-left / .glyph-switch-right（13 盒 + stroke 3.69 + 双前缀 + 样片）',
    '13px / 各 1 条 / 有',
    (pairOk ? '13px' : '缺') + ' / ' + pairMasks.map(([w, s]) => w + ':' + s).join(' ') + ' / ' + (pairInGallery ? '有' : '缺'),
    pairOk && pairMaskOk && pairInGallery ? '通过' : '不通过',
    '成对件只查一个方向等于没查；两枚的盒与 stroke 必须同组');

  const hasCompare = galleryText.includes('字符版（历史）vs 图形版（现行）');
  row('T18-对照', '样片含字符版与图形版的对照（迁移依据）', '有', hasCompare ? '有' : '缺',
    hasCompare ? '通过' : '不通过', '两版并存时没有对照，宿主会不知道新页面该用哪个');
})();

/* ========== 4c-3) T17-19 设置列表（自建：照抄 另一产品 基底 + 3 处修正） ========== */
/* 查的是「修正在不在」：行必须居中（宿主原实现是 flex-start，箭头会顶对齐）、
   样片里的行尾必须是图形箭头而不是字符。 */
(function settingsList() {
  const norm = stripComments(componentsText).replace(/\s+/g, ' ');
  const blockOf = (cls) => {
    const i = norm.indexOf('.' + cls + '{');
    return i < 0 ? '' : norm.slice(i, norm.indexOf('}', i) + 1);
  };
  const rowRule = blockOf('set-row');
  const centered = rowRule.includes('align-items:center');
  const pad = rowRule.includes('padding:14px');
  const inGallery = galleryText.includes('set-row') && galleryText.includes('glyph-chevron set-chev');
  row('T17-19', '设置列表 .set-row（行居中 + 14 内距 + 样片用图形箭头）', 'center / 14px / 有',
    (centered ? 'center' : '非 center') + ' / ' + (pad ? '14px' : '非 14') + ' / ' + (inGallery ? '有' : '缺'),
    centered && pad && inGallery ? '通过' : '不通过',
    '宿主原实现是 flex-start，行尾箭头会顶对齐 —— 这是本件存在的理由');
})();

/* ========== 4c-5) T23 设置页族（v1.15 · 自建件：无母本可对，查「件在 + 值合体系 + 样片形态」） ==========
   自建件的四样：件号 / 样片 / 手册 / 断言。这里查后三样里的可执行部分。
   三条口径里只有②③能被机器查（"这行有没有箭头"），①靠手册与评审。 */
(function settingsFamily() {
  const n = stripComments(componentsText).replace(/\s+/g, ' ');
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  /* 取值按正则找：一条规则常常是「A,B{…}」的合并写法，用 indexOf(sel+'{') 会取不到 */
  const ruleOf = (sel) => {
    const m = n.match(new RegExp(esc(sel) + '\\s*(?:,[^{]+)?\\{([^}]*)\\}'));
    return m ? m[1] : '';
  };
  const gt = ruleOf('.set-group-title');
  row('T23-01', '分组标题 .set-group-title（12 档 + --text-2）',
    'font-size:var(--fs-small-12) / color:var(--text-2)',
    (gt.includes('font-size:var(--fs-small-12)') ? '12 档' : '非 12 档') + ' / ' + (gt.includes('color:var(--text-2)') ? '--text-2' : '其它色'),
    gt.includes('font-size:var(--fs-small-12)') && gt.includes('color:var(--text-2)') ? '通过' : '不通过',
    '值只从既有体系取（造件规则 §3）');

  const dg = ruleOf('.set-row.is-danger .set-title');
  row('T17-19c', '危险动作行 .set-row.is-danger（标题转 --danger）', 'color:var(--danger)',
    dg ? (dg.includes('color:var(--danger)') ? '--danger' : '其它色') : '缺规则',
    dg.includes('color:var(--danger)') ? '通过' : '不通过', '几何不动，只换色');

  /* 单选不铺底：.set-row 本身不能有 background（有就等于给单选行了底色） */
  const sr = ruleOf('.set-row');
  row('T23-03', '选择页单选行不铺底（.set-row 无 background）', '无 background',
    /(^|;)background:/.test(sr) ? '有 background' : '无', /(^|;)background:/.test(sr) ? '不通过' : '通过',
    '单选靠行尾勾表达当前值；铺 tint 是"临时选中待确认"的语义，留给多选');

  /* 多选 tint 必须与 T12-06 行级选中同值（两处口径不许漂） */
  const pk = ruleOf('.set-row.is-picked'), nb = ruleOf('.nb-row.is-picked');
  const val = s => (s.match(/background:([^;}]+)/) || [])[1] || null;
  row('T23-04', '多选行底色 ≡ T12-06 行级选中（同值）', val(nb), val(pk),
    val(pk) && val(nb) && val(pk) === val(nb) ? '通过' : '不通过', '两处选中态共用同一个令牌，改一处必须改另一处');

  /* 口径②③的机器可查部分：就地动作行（.is-danger）的样片里不许出现箭头 */
  const badRows = galleryText.split('\n').filter(l => l.includes('set-row is-danger') && l.includes('glyph-chevron'));
  row('T23-02', '就地动作行样片不带箭头（口径③）', '0 处', badRows.length ? badRows.length + ' 行带箭头' : '0 处',
    badRows.length ? '不通过' : '通过', '箭头承诺"还有内容"，确认框不是内容');
})();

/* ========== 4c-6) T24 菜单（v1.20 · 自建：查「件在 + 值合体系 + 锚点/动效不回退 + 样片」） ========== */
(function menuFamily() {
  const n = stripComments(componentsText).replace(/\s+/g, ' ');
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const ruleOf = (sel) => {
    /* 必须从规则起点匹配：`ruleOf('.menu')` 不能抓到 `.menu-layer.is-hidden .menu{…}` 的尾巴 */
    const m = n.match(new RegExp('(?:^|})\\s*' + esc(sel) + '\\s*(?:,[^{]+)?\\{([^}]*)\\}'));
    return m ? m[1] : '';
  };
  const keyframesOf = (name) => {
    const i = n.indexOf('@keyframes ' + name);
    if (i < 0) return '';
    let depth = 0, start = n.indexOf('{', i);
    for (let j = start; j < n.length; j++) {
      if (n[j] === '{') depth++;
      else if (n[j] === '}') { depth--; if (!depth) return n.slice(start + 1, j); }
    }
    return '';
  };
  const has = (s, ...needles) => needles.every(x => s.includes(x));

  const layer = ruleOf('.menu-layer');
  row('T24-01', '壳与点击层（fixed / inset 0 / topbar+1 / 圆角 / 投影 / 内距 6）',
    'fixed / 0 / calc / radius / shadow / 6px',
    (has(layer, 'position:fixed') ? 'fixed' : '非fixed') + ' / ' +
    (layer.includes('inset:0') ? '0' : '缺') + ' / ' +
    (layer.includes('z-index:calc(var(--z-topbar) + 1)') ? 'calc' : '缺') + ' / ' +
    (ruleOf('.menu').includes('border-radius:var(--radius-menu)') ? 'radius' : '缺') + ' / ' +
    (ruleOf('.menu').includes('box-shadow:var(--shadow-menu)') ? 'shadow' : '缺') + ' / ' +
    (ruleOf('.menu').includes('padding:6px') ? '6px' : '缺'),
    has(layer, 'position:fixed', 'inset:0', 'z-index:calc(var(--z-topbar) + 1)') &&
    has(ruleOf('.menu'), 'border-radius:var(--radius-menu)', 'box-shadow:var(--shadow-menu)', 'padding:6px') ? '通过' : '不通过',
    '菜单的层级必须高于顶栏；壳值全部走令牌');

  const item = ruleOf('.menu-item');
  const checked = ruleOf('.menu-item.is-checked');
  const danger = ruleOf('.menu-item.is-danger');
  const disabled = ruleOf('.menu-item.is-disabled');
  row('T24-02', '菜单行（44 / 15·600 / radius 14 / 勾槽 20 / 危险 / 禁用）',
    '44 / 15 / 600 / 14 / 20',
    (item.includes('min-height:44px') ? '44' : '缺') + ' / ' +
    (item.includes('font-size:var(--fs-body-15)') ? '15' : '缺') + ' / ' +
    (item.includes('font-weight:600') ? '600' : '缺') + ' / ' +
    (item.includes('border-radius:var(--radius-ctrl)') ? '14' : '缺') + ' / ' +
    (ruleOf('.menu-check').includes('width:20px') ? '20' : '缺'),
    has(item, 'min-height:44px', 'font-size:var(--fs-body-15)', 'font-weight:600', 'border-radius:var(--radius-ctrl)') &&
    has(ruleOf('.menu-check'), 'width:20px', 'flex:0 0 20px') &&
    checked.includes('color:var(--brand-ink)') && danger.includes('color:var(--danger)') &&
    disabled.includes('opacity:.4') ? '通过' : '不通过',
    '行几何与状态色只从既有体系取；勾槽常驻防横跳');

  const group = ruleOf('.menu-group-label');
  const sep = ruleOf('.menu-sep');
  row('T24-03', '分组标题 / 分隔线（12·650 / --border-weak）',
    '12 / 650 / --border-weak',
    (group.includes('font-size:var(--fs-small-12)') ? '12' : '缺') + ' / ' +
    (group.includes('font-weight:650') ? '650' : '缺') + ' / ' +
    (sep.includes('background:var(--border-weak)') ? '--border-weak' : '缺'),
    has(group, 'font-size:var(--fs-small-12)', 'font-weight:650') &&
    sep.includes('background:var(--border-weak)') ? '通过' : '不通过',
    '只分隔动作组，不给每一行画边框');

  const iconOpen = ruleOf('.icon-btn.menu-trigger.is-open');
  const bnavOpen = ruleOf('.bnav .cell.menu-trigger.is-open');
  row('T24-04', '触发器打开态（圆钮 brand-tint / 底栏中性 press）',
    'brand-tint / --press',
    (iconOpen.includes('background:var(--brand-tint)') ? 'brand-tint' : '缺') + ' / ' +
    (bnavOpen.includes('background:var(--press)') ? '--press' : '缺'),
    iconOpen.includes('background:var(--brand-tint)') && bnavOpen.includes('background:var(--press)') ? '通过' : '不通过',
    '底栏品牌字已给当前 tab；打开态不能再蓝第二次');

  const dots = ruleOf('.menu-dots');
  const dotsOpen = ruleOf('.menu-dots.menu-trigger.is-open');
  const inGallery = has(galleryText, 'menu-dots', 'menu-text-trigger', 'glyph-more', 'menu-item', 'menu-sep');
  row('T24-05', '正文裸三点（44 热区 / 无圆底 / 打开转 brand / T18-09 样片）',
    '44 / transparent / brand / 有',
    (dots.includes('min-width:44px') && dots.includes('min-height:44px') ? '44' : '缺') + ' / ' +
    (dots.includes('background:transparent') ? 'transparent' : '缺') + ' / ' +
    (dotsOpen.includes('color:var(--brand-ink)') ? 'brand' : '缺') + ' / ' +
    (inGallery ? '有' : '缺'),
    has(dots, 'min-width:44px', 'min-height:44px', 'background:transparent') &&
    dotsOpen.includes('color:var(--brand-ink)') && inGallery ? '通过' : '不通过',
    '正文不再套 42 圆钮；裸三点必须保留 44 热区');

  const textTrig = ruleOf('.menu-text-trigger');
  row('T24-06', '正文文字触发器（14·650 / brand / 无底 / T18-05 样片）',
    '14 / 650 / brand / none',
    (textTrig.includes('font-size:var(--fs-body-14)') ? '14' : '缺') + ' / ' +
    (textTrig.includes('font-weight:650') ? '650' : '缺') + ' / ' +
    (textTrig.includes('color:var(--brand-ink)') ? 'brand' : '缺') + ' / ' +
    (textTrig.includes('background:none') ? 'none' : '缺'),
    has(textTrig, 'font-size:var(--fs-body-14)', 'font-weight:650', 'color:var(--brand-ink)', 'background:none') &&
    galleryText.includes('menu-text-trigger') && galleryText.includes('glyph-caret-down') ? '通过' : '不通过',
    '资产暂无筛选/排序图标；文字 + T18-05 替代，不临时画图标');

  const inSoft = keyframesOf('menu-in-soft');
  const out = keyframesOf('menu-out');
  const fade = keyframesOf('menu-fade-out');
  const closeRule = ruleOf('.menu-layer.is-closing .menu');
  row('T24-07', '动效（只缩不位移 / 关闭一段连续 + 透明度延后 / 令牌在位）',
    '200 / 180 / 1.012 / .92 / 35%',
    (inSoft.includes('58%') && inSoft.includes('scale(1.012)') ? '1.012' : '缺') + ' / ' +
    (out.includes('scale(.92)') ? '.92' : '缺') + ' / ' +
    (fade.includes('35%') ? '35%' : '缺') + ' / ' +
    (closeRule.includes('var(--dur-menu-out)') && closeRule.includes('var(--ease-menu-close)') ? 'vars' : '缺'),
    has(inSoft, '58%', 'scale(1.012)') && !inSoft.includes('translateY') &&
    out.includes('scale(.92)') && !out.includes('opacity') &&
    has(fade, '35%', 'opacity:1', 'opacity:0') &&
    has(closeRule, 'menu-fade-out', 'var(--dur-menu-out)', 'var(--ease-menu-close)') &&
    has(tokensText, '--radius-menu: 20px', '--shadow-menu:', '--dur-menu-in: 200ms', '--dur-menu-out: 180ms', '--ease-menu-close:') ? '通过' : '不通过',
    '缩放拆两段会在接缝顿挫；位移会让锚点那侧的边也动');
})();

/* ========== 4c-4) T10-01 壳别名（.sheet-* ≡ .station-picker-*） ========== */
/* 两套名写在同一规则里时，声明本来就是一份（解析器按逗号拆开、共用同一 decls）；
   这条断言守的是「将来别有人把它们拆成两条规则各写一份值」—— 拆了就从这里红出来。 */
(function sheetAlias() {
  const pairs = [
    ['.sheet-mask', '.station-picker-mask', ['position', 'background', 'align-items']],
    ['.sheet-panel', '.station-picker-panel', ['height', 'background', 'border-radius']]
  ];
  pairs.forEach(([a, b, props]) => {
    const diff = props.filter(p => {
      const va = findDecl(rtgo, 'css', a, p, 'last');
      const vb = findDecl(rtgo, 'css', b, p, 'last');
      return va == null || vb == null || norm(va) !== norm(vb);
    });
    row(a + ' ≡ ' + b,
      '壳别名两套名取同一份声明（' + props.join('/') + '）', '一致',
      diff.length ? ('不一致：' + diff.join('/')) : '一致',
      diff.length ? '不通过' : '通过',
      'v1.13 起 .sheet-* 为正式名，旧名共存；拆成两条规则就会漂');
  });
})();

/* ========== 4d) M2 手册覆盖：件号表 ↔ 参考文档 双向（防文档腐烂 / 防造 ID） ========== */
(function manualCoverage() {
  // 展开简写：T06-01/02、T02-01~07、T03-01/02/06 → 全量 ID（与 gallery 索引同一口径）
  const expandIds = t => {
    const out = new Set();
    /* 带字母后缀的件号（T03-02b / T10-06b / T12-06b）必须一起认：
       早先的正则 `\\bT\\d{2}-\\d{2}\\b` 在「T10-06b」里匹配不到（b 是词字符，没有词边界），
       于是这些行从来没人检查覆盖 —— 2026-11-07 补上。 */
    const full = t.match(/\bT\d{2}-\d{2}[a-z]?\b/g) || [];
    full.forEach(x => out.add(x));
    (t.match(/\bT(\d{2})-((?:\d{2}\/)+\d{2})\b/g) || []).forEach(seg => {
      const m = seg.match(/T(\d{2})-((?:\d{2}\/)+\d{2})/);
      m[2].split('/').forEach(p => out.add('T' + m[1] + '-' + p));
    });
    (t.match(/\bT(\d{2})-(\d{2})~(\d{2})\b/g) || []).forEach(seg => {
      const m = seg.match(/T(\d{2})-(\d{2})~(\d{2})/);
      for (let i = +m[2]; i <= +m[3]; i++) out.add('T' + m[1] + '-' + String(i).padStart(2, '0'));
    });
    return out;
  };
  const idsOf = expandIds;
  const table = idsOf(fs.readFileSync(path.join(HERE, '..', '件号表.md'), 'utf8'));
  const manual = idsOf(fs.readFileSync(path.join(HERE, '..', 'docs', '组件手册.md'), 'utf8'));
  const tokensDoc = idsOf(fs.readFileSync(path.join(HERE, '..', 'docs', '令牌口径.md'), 'utf8'));
  const hostDoc = idsOf(fs.readFileSync(path.join(HERE, '..', 'docs', '宿主适配.md'), 'utf8'));
  // 正向：每个件号 必须有参考文档（T01/T02/T16→令牌口径；T15→宿主适配；其余→组件手册）
  const missing = [...table].filter(id => {
    const sec = id.slice(1, 3);
    const doc = (sec === '01' || sec === '02' || sec === '16') ? tokensDoc : (sec === '15') ? hostDoc : manual;
    return !doc.has(id);
  }).sort();
  row('M2-覆盖', '件号表每个 ID 都有参考文档', '0', missing.length ? missing.join(', ') : '0', missing.length ? '未做' : '通过', missing.length ? '缺：' + missing.join(', ') : '组件手册 T03~T14 / 令牌口径 T01-02·T16 / 宿主适配 T15');
  // 反向：文档不得造 ID（引用了件号表不存在的编号）
  const bogus = [...manual].filter(id => !table.has(id)).sort();
  row('M2-造ID', '手册引用的 ID 必须在件号表存在', '0', bogus.length ? bogus.join(', ') : '0', bogus.length ? '不通过' : '通过');
  // gallery 入口：手册可从 gallery 到达（顶栏链接）
  const linked = galleryText.includes('docs/组件手册.md');
  row('M2-入口', 'gallery 顶栏有「组件手册」入口', '有', linked ? '有' : '缺', linked ? '通过' : '不通过');
  // gallery ID 索引：索引容器与生成器在位（索引内容运行时生成，静态查容器+解析器）
  const idxOk = galleryText.includes('id="gIndex"') && galleryText.includes('buildIndex');
  row('M2-索引', 'gallery ID 索引区（自动生成）在位', '有', idxOk ? '有' : '缺', idxOk ? '通过' : '不通过');
})();

/* ========== 5) gallery 接线（孤儿=0 / 死控件=0） ========== */
(function wiring() {
  const used = new Set();
  const push = c => c.split(/\s+/).forEach(x => x && used.add(x));
  // 用捕获组取值，别用 slice(固定偏移)：`data-hover-class="` 是 18 个字符，
  // 早先写的 slice(17,-1) 少切一位，类名会带着开头的引号 —— 于是这十几个档
  // 一直被当成"未定义"。孤儿检查只有一个方向所以没暴露，反向检查一上就现形。
  [...galleryText.matchAll(/class="([^"]+)"/g)].forEach(m => push(m[1]));
  [...galleryText.matchAll(/data-hover-class="([^"]+)"/g)].forEach(m => push(m[1]));
  // JS 接线（classList.add/remove/toggle('…') 同样算接线：演示代码路径真实触达）
  [...galleryText.matchAll(/class(?:List)?\.(?:add|remove|toggle)\(([^)]*)\)/g)].forEach(m =>
    [...m[1].matchAll(/['"]([\w-]+)['"]/g)].forEach(q => used.add(q[1])));
  const defined = new Set();
  rtgo.css.rules.concat(rtgo.css.media.flatMap(m => m.rules)).forEach(r =>
    (r.sel.match(/\.([a-zA-Z_][\w-]*)/g) || []).forEach(c => defined.add(c.slice(1))));
  /* 别名组（2026-11-06）：同一声明块里的多个「纯单类」选择器互为别名
     （如 .sheet-mask,.station-picker-mask）——值是一份，接线也是同一条。
     只要组里有一个接到样片上，其余都不算孤儿；否则每加一个别名就要在 gallery 补一份重复样片。 */
  const dgroups = new Map();
  rtgo.css.rules.concat(rtgo.css.media.flatMap(m => m.rules)).forEach(r => {
    if (!dgroups.has(r.decls)) dgroups.set(r.decls, []);
    dgroups.get(r.decls).push(r.sel);
  });
  dgroups.forEach(sels => {
    const singles = sels.map(x => (x.match(/^\.([a-zA-Z_][\w-]*)$/) || [])[1]).filter(Boolean);
    if (singles.length !== sels.length || singles.length < 2) return;   // 不是纯别名组
    if (!singles.some(c => used.has(c))) return;
    singles.forEach(c => used.add(c));
  });

  // 件号表已记录的死选择器（W-01）：保留为级联安全，不要求接线
  /* 保留但不再演示的类：
     - mode-arrow（W-01 死选择器）
     - picker-hidden / picker-closing：站选器旧状态类，v1.13 壳改名后样板改用 .is-hidden/.is-closing；
       旧类与 .station-picker-mask 配对，保留给既有宿主，不要求再接演示。 */
  const allow = new Set(['mode-arrow', 'picker-hidden', 'picker-closing']);
  const orphans = [...defined].filter(c => !used.has(c) && !allow.has(c)).sort();
  row('接线·孤儿', '资产类在 gallery 零引用（写好了没接线）', '0', orphans.length ? orphans.join(', ') : '0', orphans.length ? '不通过' : '通过', orphans.join(', '));
  const tiers = new Set(['press', 'press-scale', 'press-flat', 'expand-hover', 'station-picker-close-hover', 'station-nav-hover', 'dtp-press-round', 'dtp-press-scale', 'dtp-press-flat', 'snp-press']);
  const dead = [...(galleryText.matchAll(/data-hover-class="([^"]+)"/g))].map(m => m[1]).filter(h => !tiers.has(h));
  row('接线·死控件', 'data-hover-class 挂了不存在的档', '0', dead.length ? dead.join(', ') : '0', dead.length ? '不通过' : '通过');

  /* 反向：gallery 挂的类必须在资产或 gallery 内联样式里有定义。
     挂一个不存在的类名**不会报错**，只是没有样式 —— 样片看起来"本来就这样"，
     实际是没接上。2026-11-02 外部测试报告的 P3 就是这一类（.p-text / .expand-btn-rot）。 */
  const inlineCss = (galleryText.match(/<style>[\s\S]*?<\/style>/) || [''])[0].replace(/\/\*[\s\S]*?\*\//g, '');
  const declared = new Set(defined);
  [...inlineCss.matchAll(/\.([a-zA-Z_][\w-]*)/g)].forEach(m => declared.add(m[1]));
  const allowUndef = new Set(['theme-']);   // 'theme-'+t 运行时拼接，静态只看得到前缀
  /* 样板（sample/）：同一套反向检查。样板是给外部 AI 照抄的，类名写错同样静默失效；
     它自己的外壳类（sample.css 里定义的）算已声明，不算资产件。 */
  const sampleDir = path.join(HERE, '..', 'sample');
  const sampleFiles = ['index.html', 'app.js', 'mock.js', 'sample.css'];
  const sampleMissing = sampleFiles.filter(f => !fs.existsSync(path.join(sampleDir, f)));
  const sampleUsed = new Set();
  sampleFiles.forEach(f => {
    const p = path.join(sampleDir, f);
    if (!fs.existsSync(p)) return;
    const t = fs.readFileSync(p, 'utf8');
    /* 模板字符串里的 class="……${x}……" 要先去掉插值，否则 ${p.last ? 'a' : ''} 会被当成类名 */
    const flat = t.replace(/\$\{[^}]*\}/g, ' ');
    [...flat.matchAll(/class="([^"]+)"/g)].forEach(m => m[1].split(/\s+/).forEach(c => c && sampleUsed.add(c)));
    [...t.matchAll(/classList\.(?:add|toggle|remove)\('([^']+)'/g)].forEach(m => sampleUsed.add(m[1]));
    if (f.endsWith('.css')) [...t.matchAll(/\.([a-zA-Z_][\w-]*)/g)].forEach(m => declared.add(m[1]));
  });
  const undef = [...new Set([...used, ...sampleUsed])].filter(c => !declared.has(c) && !allowUndef.has(c)).sort();
  const undefNote = [undef.length ? undef.join(', ') : '0', sampleMissing.length ? '缺文件:' + sampleMissing.join(',') : ''].filter(Boolean).join(' · ');
  row('接线·空类', 'gallery / 样板 挂的类都有样式定义（拼错/不存在的类不会报错，只会没样式）',
    '0', undefNote, undef.length || sampleMissing.length ? '不通过' : '通过');
})();

/* ---------- 输出 ---------- */
const pass = rows.filter(r => r.verdict === '通过').length;
const conv = rows.filter(r => r.verdict === '换件').length;
const fail = rows.filter(r => r.verdict === '不通过').length;
const undone = rows.filter(r => r.verdict === '未做').length;
/* 「没给」和「给了但不对」是两种错，提示要分开——否则用户以为自己传对了。 */
const noteOf = (has, p, probe) => has ? p : (!p ? '未提供' : `路径无效（找不到 ${probe}）：${p}`);
console.log('\n===== RTGo_slate verify =====');
console.log(`资产: ${CSS}\n展示: ${GALLERY}\n`);
console.log('本次运行覆盖包内自洽组：M1 完整性 / M4 主题档 / M2 覆盖 / 接线。\n');
for (const r of rows) {
  const mark = { '通过': '✓', '换件': '◌', '不通过': '✗', '未做': '○' }[r.verdict];
  console.log(`${mark} [${r.id}] ${r.item}`);
  if (r.verdict !== '通过') console.log(`    母本: ${r.master}\n    实测: ${r.got}`);
}
console.log(`\n通过 ${pass} · 换件记录 ${conv} · 不通过 ${fail} · 未做 ${undone}  （共 ${rows.length}）`);
/* 账本 ≠ 本次跑到的范围。无母本时 rows 里只有 4c/4d/5 那十几条，
   直接覆盖 last-run.md 会把上一次的完整对账记录冲掉。
   2026-11-04 实际发生过：270 行被 13 行顶掉，而且没有任何提示。
   所以：只有「母本 + 另一产品都在位」才算完整账本，其余情况另写一份副本。
   （另两个对账脚本缺外部工程时会提前 exit 0，走不到写入，不需要同样处理。） */
const FULL_RUN = HAVE_MASTER && HAVE_HOST;
const RUN_LOG = path.join(HERE, FULL_RUN ? 'last-run.md' : 'last-run-nomaster.md');
const runKind = FULL_RUN ? '' : (HAVE_MASTER ? ' · 缺另一产品，T17 组未跑' : ' · 仅自洽组，无母本');
fs.writeFileSync(RUN_LOG,
  `# last-run（verify 生成${runKind}）\n\n| ID | 断言 | 母本值 | 实测值 | 判定 |\n|---|---|---|---|---|\n` +
  rows.map(r => `| ${r.id} | ${r.item.replace(/\|/g, '/')} | ${String(r.master).replace(/\|/g, '/').slice(0, 100)} | ${String(r.got).replace(/\|/g, '/').slice(0, 100)} | ${r.verdict} |`).join('\n') + '\n');
console.log(FULL_RUN
  ? '记录：last-run.md（完整对账）'
  : '记录：last-run-nomaster.md（本次不完整，不覆盖 last-run.md）');
process.exit(fail || undone ? 1 : 0);
