/* 样板的三件事：切页、按压接线、深浅切换。
   页面结构逐块对过母本（pages/index · results · detail · timetable）；
   仍与母本有差异的部分见 sample/PARITY.md。 */

const PAGES = {
  /* 母本首页顶栏只有标题，没有副标、没有返回 */
  home:      { title: '轨交速查',   sub: null,                                   back: null },
  results:   { title: '方案选择',   sub: () => MOCK.listSub,                     back: 'home' },
  detail:    { title: () => `${MOCK.detail.start} → ${MOCK.detail.end}`, sub: () => MOCK.detail.text, back: 'results' },
  timetable: { title: '城际时刻表', sub: () => `${nowDateText()} · ${MOCK.trains.length}趟列车`, back: 'home' }
};

function nowDateText() {
  const d = new Date();
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/* ── 四个页面 ───────────────────────────────────────────── */

/* 首页是**查询前**的状态：站点是占位、日期时间是「今天 / 现在」。
   与截图一致 —— 打开小程序看到的就是这一屏。 */
function nowParts() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return {
    dateShort: p(d.getMonth() + 1) + '-' + p(d.getDate()),
    time: p(d.getHours()) + ':' + p(d.getMinutes())
  };
}

function pageHome() {
  const now = nowParts();
  return `
  <div class="chip-bar-wrap">
    <div class="toolbar hscroll">
      <div class="toolbar-inner">
        <button class="chip active" data-hover-class="press-scale">乘车方案</button>
        <button class="chip" data-hover-class="press-scale">城际时刻表</button>
        <button class="chip" data-hover-class="press-scale">附加功能</button>
      </div>
    </div>
    <div class="hscroll-fade is-page"></div>
  </div>

  <div class="panel">
    <div class="station-pair">
      <view class="station-slot is-origin" data-hover-class="press-flat" data-open-snp="origin">
        <view class="station-slot-label">出发站</view>
        <view class="station-slot-value ${HOME.origin ? '' : 'is-empty'}">${HOME.origin || '选择站点…'}</view>
      </view>
      <view class="station-swap" data-hover-class="press-scale"><view class="swap-face">⇄</view></view>
      <view class="station-slot is-dest" data-hover-class="press-flat" data-open-snp="destination">
        <view class="station-slot-label">到达站</view>
        <view class="station-slot-value ${HOME.dest ? '' : 'is-empty'}">${HOME.dest || '选择站点…'}</view>
      </view>
    </div>

    ${MOCK.recent.length ? `
    <div class="page-divider"></div>

    <div class="recent">
      <div class="recent-head">
        <text class="recent-label">最近查询</text>
        <text class="recent-clear" data-hover-class="press" id="btnRecentClear">清空</text>
      </div>
      <div class="recent-scroll-wrap">
        <div class="recent-scroll hscroll">
          <div class="recent-list">
            ${MOCK.recent.map(r => `
            <view class="recent-combo" data-hover-class="press" data-go="results">
              <text class="recent-combo-text">${r.from} → ${r.to}</text>
              <text class="recent-del" data-hover-class="press">×</text>
            </view>`).join('')}
          </div>
        </div>
        <div class="hscroll-fade"></div>
      </div>
    </div>` : ''}
  </div>

  <div class="dt-grid page-dt">
    <div class="dt-field"><div class="dt-hit" data-hover-class="press-flat" data-open-dtp="date">
      <div class="dt-label">出发日期</div>
      <div class="dt-value">${HOME.date
        ? `<text>${HOME.date}</text>`
        : `<text class="is-now">今天</text><text class="dt-sub">${now.dateShort}</text>`}<text class="dt-chev">▾</text></div>
    </div></div>
    <div class="dt-field"><div class="dt-hit" data-hover-class="press-flat" data-open-dtp="time">
      <div class="dt-label">出发时间</div>
      <div class="dt-value">${HOME.time
        ? `<text>${HOME.time}</text>`
        : `<text class="is-now">现在</text>`}<text class="dt-chev">▾</text></div>
    </div></div>
  </div>

  <div class="actions actions-bg">
    <button class="primary" data-hover-class="press-scale" data-go="results">查询方案</button>
  </div>

  <div class="hint">时刻、站台、票价、编组等信息仅供参考；乘车时请以实际情况为准。</div>

  <view class="ig-entryline" data-hover-class="press-flat">
    <view class="ig-ico ig-ico-ticket"></view>
    <text>城际票务指南</text>
    <view class="ig-chev"></view>
  </view>`;
}

function pageResults() {
  return `
  <div class="query-route">${MOCK.origin} → ${MOCK.dest}</div>

  <div class="chip-bar-wrap">
    <div class="toolbar hscroll">
      <div class="toolbar-inner">
        ${MOCK.sorts.map((s, i) => `<button class="chip ${i === 0 ? 'active' : ''}" data-hover-class="press-scale">${s}</button>`).join('')}
      </div>
    </div>
    <div class="hscroll-fade is-page"></div>
  </div>

  <div class="route-list">
    ${MOCK.routes.map(r => `
    <div class="route-card border-for-route" data-hover-class="press" data-go="detail">
      <div class="route-top">
        <div class="route-main-info">
          <view class="duration">${r.dur}</view>
          <view class="route-detail-entry" data-go="detail" aria-role="button" aria-label="查看方案详情"><view class="action-glyph"></view></view>
        </div>
        ${r.warn ? `<view class="route-badges"><view class="warning-badge">${r.warn === 'lastTrain' ? '可能错过末班车' : '注意首班车时间'}</view></view>` : ''}
      </div>
      ${r.tags.length ? `<view class="route-tag-row">${r.tags.map(t => `<view class="route-tag ${t.cls}">${t.label}</view>`).join('')}</view>` : ''}

      <div class="axis">
        <div class="axis-time"><text class="axis-clock">${r.start}</text></div>
        <div class="axis-dash axis-dash-l"></div>
        <div class="axis-route${r.modes.length >= 3 ? ' wrap' : ''}">
          ${r.modes.map(m => `<view class="mode-chip">${m.gate ? '<view class="mode-gate"></view>' : ''}<view class="mode-badge" style="background:${m.color}">${m.label}</view></view>`).join('')}
        </div>
        <div class="axis-dash axis-dash-r"></div>
        <div class="axis-time"><text class="axis-clock">${r.end}</text></div>
      </div>

      <div class="facts">
        <view class="fact"><view>${r.mode}</view></view>
        <view class="fact"><view>换乘${r.transfer}次</view></view>
        <view class="fact"><view>${r.price}</view></view>
      </div>

      <div class="preview is-hidden">
        ${r.preview.map(p => `
        <div class="preview-node">
          <div class="preview-time">${p.time}</div>
          <div class="preview-content">
            <div class="preview-station">
              <text>${p.from}</text>${p.to ? `<text class="preview-station-arrow">→</text><text>${p.to}</text>` : ''}
            </div>
            ${p.line ? `<div class="preview-line"><div class="preview-line-dot" style="background:${p.color}"></div><text>${p.line}</text></div>` : ''}
          </div>
        </div>`).join('')}
      </div>

      <div class="route-actions">
        <button class="expand-btn" data-hover-class="expand-hover" data-press-stop data-expand aria-expanded="false">
          <view class="action-glyph"></view><text>路线预览</text>
        </button>
      </div>
    </div>`).join('')}
  </div>`;
}

function pageDetail() {
  const d = MOCK.detail;

  const rowOf = (p) => {
    if (p.kind === 'transfer') {
      return `
      <view class="inner-transfer">
        <view class="bold">${p.title}</view><view class="sub">${p.subtitle}</view>
        ${p.platform ? `<view class="platform">${p.platform}</view>` : ''}
        ${p.note ? `<view class="sub">${p.note}</view>` : ''}
      </view>`;
    }
    const color = p.color;
    const rail = p.last
      ? `<view class="node" style="border-color:${color}"></view>`
      : `<view class="node ${p.transfer ? 'node-transfer' : ''}" style="border-color:${color}"></view><view class="rail-line" style="background:${color}"></view>`;
    const meta = [
      p.badge ? `<view class="line-pill" style="background:${color}">${p.badge}</view>` : '',
      p.meta ? `<text>${p.meta}</text>` : '',
      p.secondary ? `<text>${p.secondary}</text>` : ''
    ].join('');
    return `
    <view class="timeline-row ${p.last ? 'timeline-last' : ''}">
      <view class="time${p.est ? ' time-est' : ''}">${p.time}<text>${p.label}</text></view>
      <view class="rail">${rail}</view>
      <view>
        <view class="station">${p.station}${p.suffix}</view>
        <view class="meta">${meta}</view>
      </view>
    </view>`;
  };

  return `
  <div class="summary-line">${d.summary.map(s => s.t === 'n' ? `<text class="summary-num">${s.v}</text>` : `<text>${s.v}</text>`).join('')}</div>

  <div class="journey">
    ${d.blocks.map(b => b.kind === 'transfer' ? `
    <div class="transfer-box${b.intercity ? ' intercity' : ''}">
      <div class="bold transfer-title"><view class="mode-gate"></view><text>${b.title}</text></div>
      <div class="sub">${b.subtitle}</div>
      ${b.note ? `<div class="transfer-note">${b.note}</div>` : ''}
      ${b.platform ? `<div class="platform">${b.platform}</div>` : ''}
    </div>` : `
    <div class="segment">
      <div class="seg-head">
        <div>
          <div class="trip-head">
            <div class="trip-badge is-circle">${b.order}</div>
            <div class="trip-head-sub">${b.typeText} • ${b.durationText}</div>
          </div>
        </div>
      </div>
      ${b.items.map(rowOf).join('')}
    </div>`).join('')}
  </div>

  <button class="share-btn" data-hover-class="press-scale">保存路线图</button>`;
}

function pageTimetable() {
  return `
  <div class="tt-query-summary">
    <div class="tt-query-point"><text class="tt-query-label">出发</text><text class="tt-query-name">广州东</text></div>
    <div class="tt-query-link"><view class="tt-query-line"></view><view class="tt-query-line"></view></div>
    <div class="tt-query-point tt-query-point-end"><text class="tt-query-label">到达</text><text class="tt-query-name">竹料（城际）</text></div>
  </div>

  <div class="tt-controls">
    <div class="tt-section-title">11月5日 城际时刻</div>
    <div class="tt-section-sub">共 ${MOCK.trains.length} 班</div>
  </div>

  <div class="toolbar tt-toolbar">
    <div class="toolbar-inner">
      <button class="chip active" data-hover-class="press-scale">全程</button>
      <button class="chip" data-hover-class="press-scale">本段</button>
    </div>
  </div>

  <div class="tt-table-block"><div class="tt-card">
    <div class="tt-head-wrap"><div class="tt-row tt-head">
      <view class="tt-cell tt-code">车次</view>
      <view class="tt-cell">出发</view>
      <view class="tt-cell tt-arrow"></view>
      <view class="tt-cell">到达</view>
      <view class="tt-cell">历时</view>
      <view class="tt-cell"></view>
    </div></div>

    ${MOCK.trains.map(t => `
    <div class="tt-row tt-main">
      <view class="tt-cell tt-code"><text class="tt-train-code">${t.code}</text></view>
      <view class="tt-cell tt-time tt-primary">${t.dep}</view>
      <view class="tt-cell tt-arrow">→</view>
      <view class="tt-cell tt-time">${t.arr}</view>
      <view class="tt-cell tt-duration">${t.dur}</view>
      <view class="tt-cell tt-more"><view class="tt-chevron"></view></view>
    </div>
    <div class="tt-row"><div class="tt-subrow">
      <div class="tt-sub-end"><text class="tt-sub-label">${t.from.label}</text><text class="tt-sub-time">${t.from.time}</text><text class="tt-sub-name">${t.from.name}</text></div>
      <div class="tt-sub-end tt-sub-end-right"><text class="tt-sub-name">${t.to.name}</text><text class="tt-sub-time">${t.to.time}</text><text class="tt-sub-label">${t.to.label}</text></div>
    </div></div>`).join('')}
  </div></div>`;
}

/* ── 弹层：选站 / 日期时间 ──────────────────────────────────
   母本这两个是常驻挂载的自定义组件：visible 控显隐，退场动画播完才 display:none。
   这里照搬同一套状态机 —— 重画只重画 #overlays，页面本身不重绘。 */

const EXIT_MS = 320;

/* 弹层里的示例数据：只服务演示，不是真实接口响应 */
const SAMPLE_LINES = [
  { id: 'ic',  name: '城际',   color: '#414f8d' },
  { id: 'l2',  name: '2号线',  color: '#2C659B' },
  { id: 'l3',  name: '3号线',  color: '#3970e5' },
  { id: 'l14', name: '14号线', color: '#6F2D25' }
];

const SAMPLE_STATIONS = [
  { name: '广州南站', branch: '城际', city: '广州 · 番禺', mark: '换乘', tone: 'blue', lines: ['ic', 'l2'] },
  { name: '广州东站', branch: '城际', city: '广州 · 天河', mark: '',     tone: 'gray', lines: ['ic'] },
  { name: '竹料',     branch: '城际', city: '广州 · 白云', mark: '',     tone: 'gray', lines: ['ic', 'l14'] },
  { name: '陈村',     branch: '城际', city: '佛山 · 顺德', mark: '',     tone: 'gray', lines: ['ic', 'l2'] },
  { name: '番禺',     branch: '城际', city: '广州 · 番禺', mark: '换乘', tone: 'blue', lines: ['ic', 'l2'] },
  { name: '虎门北',   branch: '城际', city: '东莞',        mark: '',     tone: 'gray', lines: ['ic'] },
  { name: '长安',     branch: '城际', city: '东莞',        mark: '',     tone: 'gray', lines: ['ic'] },
  { name: '体育西路', branch: '地铁', city: '广州 · 天河', mark: '',     tone: 'gray', lines: ['l3'] },
  { name: '珠江新城', branch: '地铁', city: '广州 · 天河', mark: '',     tone: 'gray', lines: ['l3'] },
  { name: '公园前',   branch: '地铁', city: '广州 · 越秀', mark: '换乘', tone: 'blue', lines: ['l2'] }
];

/* 表单里已经选好的值；空 = 还没选（占位态） */
const HOME = { origin: '', dest: '', date: '', time: '' };

const OVER = {
  snp: { open: false, closing: false, target: 'origin', q: '', line: '' },
  dtp: { open: false, closing: false, mode: 'date', y: 0, m: 0, date: '', time: '' }
};

const pad2 = (n) => String(n).padStart(2, '0');
const isoOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const hmOf = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

/* ── 选站 ──────────────────────────────────────────────── */

function snpFiltered() {
  const s = OVER.snp;
  const q = s.q.trim();
  return SAMPLE_STATIONS.filter(st =>
    (!s.line || st.lines.indexOf(s.line) >= 0) &&
    (!q || st.name.indexOf(q) >= 0 || st.city.indexOf(q) >= 0 ||
      st.branch.indexOf(q) >= 0 ||
      st.lines.some(id => (SAMPLE_LINES.find(l => l.id === id) || {}).name.indexOf(q) >= 0)));
}

function snpItemsHTML() {
  const list = snpFiltered();
  if (!list.length) {
    return `<view class="station-search-empty">
      <view class="station-search-empty-title">未找到匹配结果</view>
      <view class="station-search-empty-sub">尝试换一个关键词，或切换线路</view>
    </view>`;
  }
  return list.map(st => `
  <view class="station-picker-item" data-hover-class="press-flat" data-station="${st.name}">
    <view class="station-picker-title-row">
      <view class="station-picker-name">${st.name}</view>
      ${st.mark ? `<text class="station-picker-mark mark-tone-${st.tone}">${st.mark}</text>` : ''}
    </view>
    <view class="station-picker-meta"><text>${st.branch}</text><text> · </text><text>${st.city}</text></view>
  </view>`).join('');
}

function snpHTML() {
  const s = OVER.snp;
  const cls = ['station-picker-mask'];
  if (s.closing) cls.push('picker-closing');
  if (!s.open && !s.closing) cls.push('picker-hidden');
  const title = s.target === 'origin' ? '选择出发站' : '选择到达站';
  return `
  <div class="${cls.join(' ')}" id="snpMask">
    <div class="station-picker-panel" id="snpPanel">
      <div class="station-picker-head">
        <div><div class="station-picker-title">${title}</div></div>
        <div class="station-picker-head-acts">
          <view class="station-picker-close" data-hover-class="press" data-snp-close><text class="station-picker-close-x">×</text></view>
        </div>
      </div>
      <view class="station-search-box">
        <input class="station-search-input" id="snpSearch" placeholder="搜索车站、线路或城市" value="${s.q}">
        <view class="station-search-clear" data-snp-clear${s.q ? '' : ' hidden'}>清除</view>
      </view>
      <view class="station-line-bar">
        <div class="station-line-scroll-wrap">
          <div class="station-line-scroll hscroll">
            <div class="station-line-list">
              ${SAMPLE_LINES.map(l => `
              <view class="station-line-chip${s.line === l.id ? ' active' : ''}" data-hover-class="press-scale" data-line="${l.id}"
                style="${s.line === l.id ? `background:${l.color};border-color:${l.color}` : ''}">
                <view class="station-line-dot" style="background:${l.color}"></view><text>${l.name}</text>
              </view>`).join('')}
            </div>
          </div>
          <div class="hscroll-fade"></div>
        </div>
      </view>
      <div class="station-picker-list" id="snpList">${snpItemsHTML()}</div>
    </div>
  </div>`;
}

/* ── 日期时间 ──────────────────────────────────────────── */

function monthGrid(y, m) {
  const lead = new Date(y, m - 1, 1).getDay();
  const today = isoOf(new Date());
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(y, m - 1, 1 - lead + i);
    const iso = isoOf(d);
    const cls = [];
    if (d.getMonth() + 1 !== m) cls.push('is-out');
    if (iso === today) cls.push('is-today');
    if (iso === OVER.dtp.date) cls.push('is-selected');
    cells.push({ d: d.getDate(), iso, cls: cls.join(' ') });
  }
  return cells;
}

function gridHTML() {
  return monthGrid(OVER.dtp.y, OVER.dtp.m)
    .map(c => `<view class="dtp-cell ${c.cls}" data-hover-class="dtp-press-flat" data-day="${c.iso}"><view class="dtp-cell-inner">${c.d}</view></view>`).join('');
}

function dtpHTML() {
  const s = OVER.dtp;
  const cls = ['dtp-mask'];
  if (s.closing) cls.push('is-closing');
  if (!s.open && !s.closing) cls.push('is-hidden');
  const isDate = s.mode === 'date';
  return `
  <div class="${cls.join(' ')}" id="dtpMask">
    <div class="dtp-panel" id="dtpPanel">
      <div class="dtp-head"><div class="dtp-title">${isDate ? '出发日期' : '出发时间'}</div></div>
      <div class="dtp-input-row">
        <div class="dtp-input-wrap">
          <input class="dtp-input" id="dtpInput" value="${isDate ? s.date.replace(/-/g, '') : s.time.replace(':', '')}"
            maxlength="10" placeholder="${isDate ? '20260928' : '0830'}">
        </div>
        <div class="dtp-quick" data-hover-class="dtp-press-scale" data-dtp-quick>${isDate ? '今天' : '现在'}</div>
      </div>
      ${isDate ? `
      <div class="dtp-month">
        <div class="dtp-nav" data-hover-class="dtp-press-round" data-dtp-prev>‹</div>
        <div class="dtp-month-label">${s.y}年${s.m}月</div>
        <div class="dtp-nav" data-hover-class="dtp-press-round" data-dtp-next>›</div>
      </div>
      <div class="dtp-week">${['日', '一', '二', '三', '四', '五', '六'].map(w => `<div class="dtp-week-cell">${w}</div>`).join('')}</div>
      <div class="dtp-grid" id="dtpGrid">${gridHTML()}</div>` : `
      <div class="dtp-wheels">
        <div class="dtp-band" style="height:38px"></div>
        <div class="dtp-wheel" id="dtpWheel">
          <div class="dtp-col" data-col="h">
            ${Array.from({ length: 24 }, (_, i) => `<div class="dtp-wheel-item">${pad2(i)}</div>`).join('')}
          </div>
          <div class="dtp-col" data-col="m">
            ${Array.from({ length: 60 }, (_, i) => `<div class="dtp-wheel-item">${pad2(i)}</div>`).join('')}
          </div>
        </div>
        <div class="dtp-fade dtp-fade-top"></div>
        <div class="dtp-fade dtp-fade-bottom"></div>
        <div class="dtp-unit dtp-unit-a">时</div>
        <div class="dtp-unit dtp-unit-b">分</div>
      </div>
      <div class="dtp-quicks">
        <div class="dtp-chip" data-hover-class="dtp-press-scale" data-dtp-add="15">+15 分</div>
        <div class="dtp-chip" data-hover-class="dtp-press-scale" data-dtp-add="30">+30 分</div>
      </div>`}
      <div class="dtp-actions">
        <div class="dtp-btn is-cancel" data-hover-class="dtp-press-scale" data-dtp-cancel>取消</div>
        <div class="dtp-btn is-confirm" data-hover-class="dtp-press-scale" data-dtp-confirm>确定</div>
      </div>
    </div>
  </div>`;
}

/* ── 开合 ──────────────────────────────────────────────── */

function renderOverlays() {
  const box = document.getElementById('overlays');
  box.innerHTML = snpHTML() + dtpHTML();
  wirePress(box);
  wireOverlays(box);
}

/* 弹层打开之后只做「就地改」：整块重画会把入场动画重播一遍、把列表滚回顶部、
   也会把搜索框换成新节点（焦点丢失）。下面几个 paint / wire 只动该动的节点。 */

function paintSnp(box) {
  const s = OVER.snp;
  box.querySelectorAll('[data-line]').forEach(chip => {
    const id = chip.getAttribute('data-line');
    const on = s.line === id;
    const line = SAMPLE_LINES.find(l => l.id === id) || {};
    chip.classList.toggle('active', on);
    chip.style.background = on ? line.color : '';
    chip.style.borderColor = on ? line.color : '';
  });
  box.querySelector('#snpList').innerHTML = snpItemsHTML();
  wireSnpList(box);
  wirePress(box);
  const clear = box.querySelector('[data-snp-clear]');
  const input = box.querySelector('#snpSearch');
  if (clear && input) clear.hidden = !input.value;
}

function paintDtp(box) {
  const s = OVER.dtp;
  const input = box.querySelector('#dtpInput');
  if (input) input.value = s.mode === 'date' ? s.date.replace(/-/g, '') : s.time.replace(':', '');
  if (s.mode === 'date') {
    const label = box.querySelector('.dtp-month-label');
    if (label) label.textContent = `${s.y}年${s.m}月`;
    const grid = box.querySelector('#dtpGrid');
    if (grid) { grid.innerHTML = gridHTML(); wireGridCells(box); }
  } else {
    scrollWheel(box);
  }
}

function wireGridCells(box) {
  box.querySelectorAll('[data-day]').forEach(cell => cell.addEventListener('click', () => {
    OVER.dtp.date = cell.getAttribute('data-day');
    /* 走 paintDtp 而不是只刷格子：输入框也得跟着改，否则点「确定」时
       会拿输入框里的旧值把它盖回去 */
    paintDtp(box);
  }));
}

function scrollWheel(box) {
  const wheel = box.querySelector('#dtpWheel');
  if (!wheel) return;
  const [h, m] = OVER.dtp.time.split(':').map(Number);
  const cols = wheel.querySelectorAll('.dtp-col');
  if (cols[0]) cols[0].scrollTop = h * 38;
  if (cols[1]) cols[1].scrollTop = m * 38;
}

function closeLater(key) {
  const st = OVER[key];
  st.closing = true;
  renderOverlays();
  /* 退场期间若又打开（OVER[key] 会被换成新对象），这次收尾就不该再落到新的那个头上 */
  setTimeout(() => {
    if (OVER[key] !== st) return;
    st.open = false; st.closing = false;
    renderOverlays();
  }, EXIT_MS);
}

function openSnp(target) {
  OVER.snp = { open: true, closing: false, target, q: '', line: '' };
  renderOverlays();
}

function openDtp(mode) {
  const now = new Date();
  const base = mode === 'date' ? (HOME.date || isoOf(now)) : (HOME.time || hmOf(now));
  OVER.dtp = {
    open: true, closing: false, mode,
    y: Number(base.slice(0, 4)), m: Number(base.slice(5, 7)),
    date: mode === 'date' ? base : (HOME.date || isoOf(now)),
    time: mode === 'time' ? base : (HOME.time || hmOf(now))
  };
  renderOverlays();
}

function wireOverlays(box) {
  const snpMask = box.querySelector('#snpMask');
  const dtpMask = box.querySelector('#dtpMask');
  const stop = (el) => el && el.addEventListener('click', (e) => e.stopPropagation());

  if (snpMask) {
    snpMask.addEventListener('click', () => closeLater('snp'));
    stop(box.querySelector('#snpPanel'));
    const close = box.querySelector('[data-snp-close]');
    if (close) close.addEventListener('click', () => closeLater('snp'));

    const search = box.querySelector('#snpSearch');
    const clearBtn = box.querySelector('[data-snp-clear]');
    if (search) search.addEventListener('input', () => {
      OVER.snp.q = search.value;
      /* 只重画列表（连同按压重新扫一遍）：整块重画会把输入框换成新的，焦点就丢了 */
      paintSnp(box);
    });
    if (clearBtn) clearBtn.addEventListener('click', () => {
      OVER.snp.q = '';
      if (search) search.value = '';
      paintSnp(box);
      if (search) search.focus();
    });
    box.querySelectorAll('[data-line]').forEach(chip => chip.addEventListener('click', () => {
      const id = chip.getAttribute('data-line');
      OVER.snp.line = OVER.snp.line === id ? '' : id;
      paintSnp(box);
    }));
    wireSnpList(box);
  }

  if (dtpMask) {
    dtpMask.addEventListener('click', () => closeLater('dtp'));
    stop(box.querySelector('#dtpPanel'));

    const prev = box.querySelector('[data-dtp-prev]');
    const next = box.querySelector('[data-dtp-next]');
    if (prev) prev.addEventListener('click', () => { shiftMonth(-1); paintDtp(box); });
    if (next) next.addEventListener('click', () => { shiftMonth(1); paintDtp(box); });

    wireGridCells(box);

    const quick = box.querySelector('[data-dtp-quick]');
    if (quick) quick.addEventListener('click', () => {
      const now = new Date();
      if (OVER.dtp.mode === 'date') { OVER.dtp.date = isoOf(now); OVER.dtp.y = now.getFullYear(); OVER.dtp.m = now.getMonth() + 1; }
      else OVER.dtp.time = hmOf(now);
      paintDtp(box);
    });

    box.querySelectorAll('[data-dtp-add]').forEach(btn => btn.addEventListener('click', () => {
      const add = Number(btn.getAttribute('data-dtp-add'));
      const [h, m] = OVER.dtp.time.split(':').map(Number);
      const total = (h * 60 + m + add) % 1440;
      OVER.dtp.time = `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
      paintDtp(box);
    }));

    const cancel = box.querySelector('[data-dtp-cancel]');
    if (cancel) cancel.addEventListener('click', () => closeLater('dtp'));
    const confirm = box.querySelector('[data-dtp-confirm]');
    if (confirm) confirm.addEventListener('click', () => {
      /* 输入框可直接敲：日期 8 位、时间 3~4 位，能解析就以它为准 */
      const raw = ((box.querySelector('#dtpInput') || {}).value || '').trim();
      if (OVER.dtp.mode === 'date' && /^\d{8}$/.test(raw)) {
        OVER.dtp.date = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
      } else if (OVER.dtp.mode === 'time' && /^\d{3,4}$/.test(raw)) {
        const t = raw.padStart(4, '0');
        OVER.dtp.time = `${t.slice(0, 2)}:${t.slice(2, 4)}`;
      }
      if (OVER.dtp.mode === 'date') HOME.date = OVER.dtp.date;
      else HOME.time = readWheel() || OVER.dtp.time;
      closeLater('dtp');
      render();
    });

    /* 时间轮：滚到当前值 */
    scrollWheel(box);
  }
}

function wireSnpList(box) {
  box.querySelectorAll('[data-station]').forEach(item => item.addEventListener('click', () => {
    const name = item.getAttribute('data-station');
    if (OVER.snp.target === 'origin') HOME.origin = name; else HOME.dest = name;
    closeLater('snp');
    render();
  }));
}

function shiftMonth(delta) {
  const t = OVER.dtp.y * 12 + (OVER.dtp.m - 1) + delta;
  OVER.dtp.y = Math.floor(t / 12);
  OVER.dtp.m = ((t % 12) + 12) % 12 + 1;
}

function readWheel() {
  const wheel = document.getElementById('dtpWheel');
  if (!wheel) return '';
  const cols = wheel.querySelectorAll('.dtp-col');
  const pick = (col) => Math.min(Math.max(Math.round(col.scrollTop / 38), 0), col.children.length - 1);
  if (!cols[0] || !cols[1]) return '';
  return `${pad2(pick(cols[0]))}:${pad2(pick(cols[1]))}`;
}

/* ── 路由 ───────────────────────────────────────────────── */

const RENDER = { home: pageHome, results: pageResults, detail: pageDetail, timetable: pageTimetable };

function currentPage() {
  const key = (location.hash || '#/home').replace('#/', '');
  return RENDER[key] ? key : 'home';
}

function go(page) { location.hash = '#/' + page; }

function render() {
  const page = currentPage();
  const meta = PAGES[page];
  const view = document.getElementById('view');
  const sub = document.getElementById('pageSub');
  const subText = typeof meta.sub === 'function' ? meta.sub() : meta.sub;
  sub.textContent = subText || '';
  sub.hidden = !subText;      /* 母本首页顶栏只有标题，副标整天不出现 */
  document.getElementById('pageTitle').textContent = typeof meta.title === 'function' ? meta.title() : meta.title;
  document.getElementById('btnBack').hidden = !meta.back;
  /* tt-screen-body 与 screen-body 在母本是同一个元素上的两个类，不另开一层 */
  view.className = 'screen-body' + (page === 'timetable' ? ' tt-screen-body' : '');
  view.innerHTML = RENDER[page]();
  /* 只有换页才回到顶部、重放进场动画；选完站/日期重画同一页时这两样都得省掉，
     否则页会「闪一下」，像整屏重新加载 */
  if (render._page !== page) {
    document.getElementById('scroll').scrollTop = 0;
    render._page = page;
    replayEnter();
  }
  wirePress(view);
  const clear = document.getElementById('btnRecentClear');
  if (clear) clear.addEventListener('click', function () { MOCK.recent = []; render(); });
  /* 弹层容器只在首次进入时建一次；之后的重画由各弹层就地改 ——
     整块重建会让退场动画重播（选完站会闪一下） */
  if (!document.getElementById('overlays').childElementCount) renderOverlays();
}

/* 母本每次切页重放 screen-in（资产把动画挂在 .screen 上，这里重放一次） */
function replayEnter() {
  const screen = document.querySelector('.screen');
  screen.style.animation = 'none';
  void screen.offsetWidth;
  screen.style.animation = '';
}

/* ── 按压接线（小程序 hover-class 的 Web 等价物）─────────── */

const WIRED = new WeakMap();

function wirePress(root) {
  /* 幂等：列表 / 日格会重画，重画后再调一遍也只挂一次，不会重复绑定 */
  const once = (el, key) => {
    const set = WIRED.get(el) || new Set();
    if (set.has(key)) return false;
    set.add(key);
    WIRED.set(el, set);
    return true;
  };
  root.querySelectorAll('[data-hover-class]').forEach(function (el) {
    if (!once(el, 'press')) return;
    const cls = el.getAttribute('data-hover-class');
    /* data-press-stop：按下时不再往祖先传，等价母本的 hover-stop-propagation
       （预览钮按下去只亮它自己，不连累整张卡变暗） */
    const stop = (e) => { if (el.hasAttribute('data-press-stop')) e.stopPropagation(); };
    const down = (e) => { stop(e); el.classList.add(cls); };
    const up = (e) => { stop(e); el.classList.remove(cls); };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
  });
  root.querySelectorAll('[data-go]').forEach(function (el) {
    if (!once(el, 'go')) return;
    el.addEventListener('click', (e) => { e.stopPropagation(); go(el.getAttribute('data-go')); });
  });
  /* 首页两个入口：站名 → 选站弹层；日期/时间 → 日期时间弹层 */
  root.querySelectorAll('[data-open-snp]').forEach(function (el) {
    if (!once(el, 'snp')) return;
    el.addEventListener('click', () => openSnp(el.getAttribute('data-open-snp')));
  });
  root.querySelectorAll('[data-open-dtp]').forEach(function (el) {
    if (!once(el, 'dtp')) return;
    el.addEventListener('click', () => openDtp(el.getAttribute('data-open-dtp')));
  });
  /* 最近查询的 × ：删这一条，不触发整颗胶囊的跳转 */
  root.querySelectorAll('.recent-del').forEach(function (el) {
    if (!once(el, 'del')) return;
    el.addEventListener('click', function (e) {
      e.stopPropagation();
      const text = el.closest('.recent-combo').querySelector('.recent-combo-text').textContent;
      MOCK.recent = MOCK.recent.filter(r => `${r.from} → ${r.to}` !== text);
      render();
    });
  });
  /* 路线预览：展开态只切两个类 —— 箭头 .open 由 .expand-btn .action-glyph 的
     transition 负责翻转，内容 .preview 用 .is-hidden 收起。 */
  root.querySelectorAll('[data-expand]').forEach(function (btn) {
    if (!once(btn, 'exp')) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? '收起' : '路线预览');
      btn.querySelector('.action-glyph').classList.toggle('open', open);
      btn.querySelector("text").textContent = open ? '收起' : '路线预览';
      const card = btn.closest('.route-card');
      const box = card && card.querySelector('.preview');
      if (box) box.classList.toggle('is-hidden', !open);
    });
  });
}

/* ── 深浅切换（令牌层负责两套值，这里只切类）────────────── */

const THEME_KEY = 'rtgo-sample-theme';
const btnTheme = document.getElementById('btnTheme');

function applyTheme(mode) {
  document.body.classList.toggle('theme-dark', mode === 'dark');
  document.body.classList.toggle('theme-light', mode === 'light');
  btnTheme.textContent = mode === 'dark' ? '☀' : '☾';
}

function currentTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) return saved;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

btnTheme.addEventListener('click', function () {
  const next = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});

/* ── 启动 ───────────────────────────────────────────────── */

applyTheme(currentTheme());

document.getElementById('btnBack').addEventListener('click', function () {
  const page = currentPage();
  go(PAGES[page].back || 'home');
});

window.addEventListener('hashchange', render);
/* 顶栏在 #view 之外，只接一次按压（每次 render 再挂就会重复绑定） */
wirePress(document.querySelector('.ios-fixed-topbar'));
render();
