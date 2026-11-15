# RTGo-UI

不止于交通信息呈现。

面向移动端的 UI 设计系统及组件库。

RTGo-UI 的数值取自「轨交速查」应用的界面层，提炼为通用 CSS：令牌、组件、展示页。同一套设计语言另有 Flutter 实现（`rtgo-flutter-ui`），共用一份组件词表。

## 快速开始

下载 ZIP 解压即用，或 `git clone https://github.com/AzusaKano/rtgo-ui`；包内没有构建步骤，也不需要安装依赖。要锁版本，取 Tags 页的存档点。

引入样式：

```html
<!-- 分开引（便于只覆盖令牌） -->
<link rel="stylesheet" href="rtgo-tokens.css">
<link rel="stylesheet" href="rtgo-components.css">

<!-- 或只用合体文件，内容等价 -->
<link rel="stylesheet" href="rtgo-slate.css">

<!-- 可选：需要手动切主题时再引 -->
<link rel="stylesheet" href="theme-overrides.css">
```

一个最小组装示例：

```html
<div class="app">
  <div class="panel">
    <div class="route-card">
      <div class="summary-line">淘金 → 体育西路<span class="summary-num">28 分钟</span></div>
      <div class="chip">地铁</div>
      <div class="actions">
        <button class="primary">开始导航</button>
        <button class="secondary">换乘详情</button>
      </div>
    </div>
  </div>
</div>
```

## 主题

颜色、字号、圆角都以 CSS 变量定义在令牌层，覆盖变量即可定制，无需改动组件：

```css
body { --brand: #1f6feb; }
```

不加主题类时跟随系统；手动切换给 `<body>` 挂 `theme-light` / `theme-dark`。变量声明在 `body` 上，主题档是 `body.theme-light` / `body.theme-dark`——多一个类、权重更高，所以手动切主题的页面两档各写一份，并放在 `theme-overrides.css` 之后：

```css
body.theme-light { --brand: #1f6feb; }
body.theme-dark  { --brand: #7aa2ff; }   /* 深色下品牌色提亮，保证对比度 */
```

改 `--brand` 时连同 `--brand-ink`（品牌色当文字用）和 `--brand-tint`（品牌浅底）一起改：选中态的浅底来自 `--brand-tint`，只改 `--brand` 会出现旧浅底配新字色。

深色模式不需要单独写分支——一切暗色由令牌层重新定义，组件层没有深色规则。

## 演示

逐件样片见 `gallery.html`：按家族分区，页首有索引，标注组件 ID 与类名，按压类样片可按住。整页样板见 `sample/index.html`（查询 / 结果 / 详情 / 时刻表），可交互。

## 文件

| 文件 | 内容 |
|---|---|
| `rtgo-tokens.css` | 令牌层：颜色（浅/暗）、字阶 17 档、圆角、阴影、动效、层级。定制发生在这里 |
| `rtgo-components.css` | 组件层，只消费 `var(--*)` |
| `rtgo-slate.css` | 前两个文件的拼合，内容等价；只想引一个文件时用它 |
| `theme-overrides.css` | 主题档（`.theme-light` / `.theme-dark`），手动切主题时才引 |
| `gallery.html` | 逐件样片与版式参考，纯静态，双击即开 |
| `sample/index.html` | 四页样板：查询 / 结果 / 详情 / 时刻表 |
| `docs/组件手册.md` | 主参考：按场景索引，逐家族的用途、变体与 Do / Don't |
| `docs/造件规则.md` | 缺件时的取值规则：六个维度的取值表与例外台账 |
| `docs/令牌口径.md` | 逐令牌的用途与禁区 |
| `docs/宿主适配.md` | 跨宿主通道：page / rpx / hover-class / 字号 / 原生组件 |
| `件号表.md` | 每个组件的 ID、类名与出处 |
| `check/verify.js` | 自检脚本 |
| `CHANGELOG.md` | 逐版变更，按件号锚定，破坏性变更标 ⚠ |
| `SKILL.md` | 给 AI 编码助手的使用说明 |

## 自检

```bash
node check/verify.js
```

零依赖（Node 自带模块），检查包内各文件的关系：合体文件与两分层一致、主题档与令牌一致、文档覆盖全部件号、gallery 与样式互相接线。输出绿色即内部自洽。

## 版本

当前版本见 `VERSION`，逐版变更见 [CHANGELOG.md](CHANGELOG.md)，历史版本在 Tags 页。

## 适用域

移动端组件型界面，浅色/深色双主题，Web 与小程序同一范式。React Native、桌面范式未验证。

## 许可

BSD-3-Clause © 2026 AzusaKano，全文见 [LICENSE](LICENSE)。
