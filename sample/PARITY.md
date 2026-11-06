# 样板 × 母本 对账表（2026-11-05）

基准：轨交速查微信小程序的 `pages/index` · `results` · `detail` · `timetable`。
组件层的数值由 `check/all.js` 对母本样式表逐件断言；**本表只管页面层**：件有没有用、用在哪、顺序对不对。

**数据来源**：`mock.js` 不是手写的。它取自 2026-11-03 19:15「竹料 → 广州南站」的一次真实查询（15 条方案，用户在小程序里查到的原始响应），经产品自己的路线视图模型（`createRouteList` / `createRouteDetail` / 方案标签模型）跑出，展示值全部是模型的输出，没有人工改写。**时刻表页仍是示意数据** —— 那次查询返回的是路线方案，里面没有时刻表。

判定四态：**通过** / **已修** / **未做**（设计上没做，不是漏）/ **待拍板**（需人决定）。

---

## 首页（母本 pages/index）

| ID | 件 | 母本 | 样板 | 判定 |
|---|---|---|---|---|
| P01-1 | 顶栏安全区 | inline `height: navTotalHeight`、`padding-top: statusBarHeight` | `.ios-fixed-topbar` 加 `env(safe-area-inset-top)` | 已修 |
| P01-2 | 板块条 | 3 颗：乘车方案 / 城际时刻表 / 附加功能 | 3 颗 | 已修 |
| P01-3 | 卡的范围 | `.panel` 只包到最近查询为止；日期时间、主钮、提示、指南入口都在**卡外** | 同（此前把它们全塞进了卡里） | 已修 |
| P01-4 | 最近查询构成 | `.recent > .recent-head(.recent-label + .recent-clear) + .recent-scroll-wrap > .recent-scroll > .recent-list > .recent-combo(.recent-combo-text + .recent-del ×)` | 同结构 | 已修 —— 补上每颗右侧的 ×（点 × 只删这一条，不跳转）；清空后整块连同分隔线一起消失 |
| P01-5 | 日期时间 | `.dt-grid.page-dt`（页面底变体，两列之间 `.dt-field+.dt-field` 竖线） | 同，值为「今天 / 现在」按打开时刻算 | 已修 |
| P01-6 | 动作区 | `.actions.actions-bg`，1 颗主钮（次钮在母本里被注释掉） | 同，文案「查询方案」 | 已修 |
| P01-7 | 免责提示 | `.hint` 一行 | 同 | 已修 |
| P01-8 | 票务指南入口 | `.ig-entryline`（`.ig-ico-ticket` + 文字 + `.ig-chev`） | 同；`.ig-chev` 用**空元素**（8×8 两条边转 45°），不是 `›` 字符 | 已修（外观）；未接线——样板没有指南页 |
| P01-9 | 站名占位 | `.station-slot-value.is-empty` + 「选择站点…」 | 同（查询前状态） | 已修 |
| P01-10 | 顶栏 | 首页只有 `.title`，**没有副标、没有返回** | 同（副标在首页整天不渲染） | 已修 |
| P01-11 | 第二板块 | 按站名手输的 `.field` 组（附加功能板块） | 无 | 未做 |

## 结果（母本 pages/results）

| ID | 件 | 母本 | 样板 | 判定 |
|---|---|---|---|---|
| P02-1 | 页首 | `.query-route` 一行查询条件 | 同 | 已修 |
| P02-2 | 排序条 | `.chip-bar-wrap > .toolbar > .toolbar-inner` 排序胶囊 | 4 颗（到达最早 / 用时最短 / 票价最低 / 舒适换乘） | 已修 |
| P02-3 | 方案卡 | `route-top > route-main-info(duration + route-detail-entry)` + `.axis`（axis-time/axis-dash/axis-route/mode-chip）+ `.facts` + `.route-actions > .expand-btn` | 同 | 已修 |
| P02-4 | 进场 | `.screen.screen-in`（每次切页重放 220ms） | 重放 `.screen` 的 screen-in | 已修 |
| P02-5 | 卡描边 | 标记写作 `class="route-card .border-for-route"`（带点）；实测小程序里描边在 | `route-card border-for-route`（标准写法） | 通过 |
| P02-6 | 方案标签 | `.route-tag-row > .route-tag` + `.is-recommend / .is-time / .is-comfort / .is-price`（T07-15） | 同（15 条里 2 条带标签：最便宜 / 少换乘） | 已修 —— 该家族原先不在资产里，本轮补进（令牌 6 枚 + 规则 5 条 + 件号表 T07-15 + 样片 + 手册） |
| P02-7 | 详情入口 | `route-detail-entry` 内**只有一个 `.action-glyph`**（空元素，靠 border 画箭头，`rotate(45deg)` 指右）；「查看方案详情」只在 `aria-label` | 同（此前误写成可见文字 + `›` 字符） | 已修 |
| P02-8 | 路线预览 | `.expand-btn > .action-glyph + 文字`；`.action-glyph` 是**空元素**，`rotate(135deg)` 指下、`.open` 指上；展开时文字改「收起」，上方出现 `.preview > .preview-node` | 同（此前误用 `›` 字符当箭头，且没有 `.preview` 内容） | 已修 |
| P02-9 | 整卡可点 + 按压 | `.route-card` 上 `bindtap="openDetail"` + `hover-class="press"`；预览钮 `catchtap` + `hover-stop-propagation` | 整卡 `data-go` + `data-hover-class="press"`；预览钮 `stopPropagation` + `data-press-stop` | 已修 |
| P02-10 | 服务警示 | `.route-badges > .warning-badge`（末班车 / 首班车两种文案） | 同（15 条里 2 条带末班车警示） | 已修 |

## 详情（母本 pages/detail）

| ID | 件 | 母本 | 样板 | 判定 |
|---|---|---|---|---|
| P03-1 | 骨架 | 无卡片外壳：`summary-line` →（警示卡）→ `journey > segment` | 同 | 已修 |
| P03-2 | 时间轴 | `timeline-row > time + rail(node/rail-line) + station + meta(line-pill)` | 同；数据来自真实 detailVM（第 10 条方案：城际 + 地铁 + 地铁，3 段、8 个节点、2 个换乘块） | 已修 |
| P03-6 | 段内换乘 | `.inner-transfer > bold + sub + platform`（不出闸换乘） | 同，两处（S4739 → C4893 / C4893 → 7号线） | 已修 |
| P03-3 | 段头 | `seg-head > trip-head(trip-badge.is-circle + trip-head-sub)` | 同 | 已修 |
| P03-4 | 末班车警示 | `.service-warning-card.status-*`（late / tight / ok 三态） | 无 | 未做：需要真实的末班车判断 |
| P03-5 | 保存路线图 | `.share-btn` | 有按钮，未接功能 | 未做（样板无分享） |

## 时刻表（母本 pages/timetable）

| ID | 件 | 母本 | 样板 | 判定 |
|---|---|---|---|---|
| P04-1 | 容器 | `screen-body tt-screen-body`（同一元素两个类） | 同（render 时切类） | 已修 |
| P04-2 | 表头 | `.tt-head-wrap > .tt-row.tt-head` | 同 | 已修 |
| P04-3 | 工具栏 | `toolbar tt-toolbar`（同一元素） | 同 | 已修 |
| P04-4 | 副行 | `.tt-subrow > .tt-sub-end(+ -right)` | 同 | 已修 |
| P04-5 | 行展开 | `.tt-main` 点击 → `.is-open` + `.tt-detail` 站站时刻 | 无 | 未做 |

---

## 弹层（母本 components/station-picker · datetime-picker）

| ID | 件 | 母本 | 样板 | 判定 |
|---|---|---|---|---|
| D01 | 选站弹层 | `.station-picker-mask > .station-picker-panel`：标题行（标题 + 关闭）、搜索框、线路横滑条、`.station-picker-list`（站点行 = 名称 + mark + 分支 · 城市） | 同结构；搜索按站名/线路/城市过滤，无结果显示 `.station-search-empty` | 已做 |
| D02 | 选站未做项 | 附近车站条、地图找站、线路网格展开（`.line-grid-overlay`） | 无 | 未做：前两个依赖 `wx.getLocation` / `wx.chooseLocation`，第三个是二级面板，本轮不铺 |
| D03 | 日期时间弹层 | `.dtp-mask > .dtp-panel`：标题、输入行 + 今天/现在、日期模式（月导航 + 周标 + 6×7 格）或时间模式（`picker-view` 双轮 + +15/+30）、取消/确定 | 日期模式逐件对齐（42 格、`.is-out / .is-today / .is-selected`）；时间模式用两个滚动列替身 | 已做（时间轮见换件记录） |
| D04 | 开合状态机 | 常驻挂载；`visible` 控显隐，退场动画播完才 `display:none` | 同（`.picker-closing` / `.is-closing` → 300ms 后加 `.picker-hidden` / `.is-hidden`） | 已做 |
| D05 | 选完回填 | 槽位写展示名（`originLabel`），空值时显示「选择站点…」+ `.is-empty` | 同 | 已做 |
| D06 | 弹层内的重画 | 母本用 `setData` 局部更新，只动变的那部分 | 只改动的节点（列表 `innerHTML`、日格、输入框值），**不重建遮罩与面板** | 已做 —— 整块重建会让入场动画重播、列表滚回顶部、搜索框失焦（2026-11-06 修） |
| D07 | 弹层按压档 | 选站：关闭 `press`、站点行 `press-flat`、线路胶囊 `press-scale`；日期时间：今天/现在与取消/确定 `dtp-press-scale`、月导航 `dtp-press-round`、日格 `dtp-press-flat` | 同 | 已做 —— 弹层在 `#overlays` 里，接线要在弹层内也扫一遍；列表/日格重画后再扫一次（接线幂等） |

## 换件记录（B 类：换平台件，视觉重心对齐）

| 母本 | 样板 | 理由 | 差异 |
|---|---|---|---|
| `<scroll-view scroll-x>` | `.hscroll`（T04-09，宿主新增件） | 小程序原生滚动容器，Web 无对应物 | 无（滚动行为等价） |
| `hover-class` + `hover-start/stay-time="1"` + `hover-stop-propagation` | `pointerdown/up` 挂同名类；要掐断的挂 `data-press-stop`（`stopPropagation`） | 平台机制 | 松手即撤，母本有 1ms 尾巴；手感略硬 |
| `<picker-view>`（时间轮） | 两列 `overflow-y:auto` + `scroll-snap`，行高 38、上下各 76px 占位 | 微信原生滚轮在 Web 无对应物 | 无回弹惯性；点选不滚动，靠手滑 |
| 母本按实测宽度给 `.axis-route` 挂 `wrap`（`routeWrap[index]`） | 按线路胶囊数 ≥3 判断 | 不测宽 | 只影响居中/左对齐，不影响折行（`.axis-route` 本身就 `flex-wrap:wrap`） |

## 字符墨迹的校准（不是设计值）

- **关闭钮的 ×**：`.station-picker-close-x` 是字符（Arial 30px / `line-height:1`），墨迹中心不等于行盒中心，随字体与像素密度浮动。样板补了 `translateY(1px)`。实测差异：无头 Chrome（1x–2x）基本居中（−0.2px），委托人桌面 Chrome 上高约 1.9px；取 1px 是折中，两边都不到 1px 看不出来。换字体或换平台要重新看图调。
- 同类做法在母本里已有先例：`.back-glyph` 的 `translateY` 就是按设备实拍校准的。

## 按委托人要求偏离的一处

- **顶栏用半透明档**：母本是 `.ios-fixed-topbar`（默认档，不透明底 + 强边框，为修苹果端小程序渲染 bug 落的补丁）；样板用 `.ios-fixed-topbar.is-translucent`（T03-02b，软件端档）。理由：不做小程序、没有那个 bug（2026-11-05 委托人指定）。

## 已知的资产层基准差

- 顶栏：资产写的是 `height:72px` + `padding-top:20px`（样式表值，把 20 当成状态栏）；母本运行时改成「高度 = 状态栏 + 62、内距 = 状态栏」。**样板按母本口径还原**（`62 + env(safe-area-inset-top)`），否则标题会比真机低 10px、且在刘海机上压进状态栏。资产里的 72/20 没有改 —— 那是母本样式表原值，改了小程序端就对不上。

## 宿主胶水缺口（做样板时暴露出来的）

- **按压接线要覆盖到页面容器之外**：`.back` 与右上角 `.icon-btn` 在静态外壳里（不在 `#view` 内），每次切页重挂 `#view` 时够不着它们 —— 表现就是「顶栏按钮按下去没反应」。这两处只在启动时接一次，否则每次 render 都会重复绑定。
- **按压接线还要覆盖「重画之后」的节点**：弹层的站点列表、日期格子会整块换 innerHTML，新节点上没有监听 —— 表现是「刚打开时按得动，一搜就按不动了」。接线做成幂等（每个节点每个用途只挂一次），重画后照原样再扫一遍即可。

- **`.expand-btn` 缺 `display:flex`**：`.route-actions .expand-btn` 写了 `justify-content:center`，这条只有在 flex 父级下才有意义，但资产里没有 `display:flex`。小程序端由 `button` 默认盒模型兜住了；换到 Web，`.action-glyph`（`view`，胶水里是 `block`）会掉到文字上一行。样板在 `sample.css` 里补了 `.expand-btn{display:flex;align-items:center;justify-content:center}`。
  这条该进 `docs/宿主适配.md` 的胶水清单，否则每个 Web 宿主都会踩一次。
