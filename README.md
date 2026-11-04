# RTGo_slate — 移动端设计系统（通用 CSS 资产包）

一套**拿来就能用的界面词汇表**：令牌 + 组件 + 展示页。每个件都经过逐值对账，
不是凭感觉画的设计稿；改观感只需要动令牌，不用碰组件。

> **同源另一范式**：同一套设计语言的 Flutter 表达在 `rtgo-flutter-ui` 仓。
> 两边共用同一套组件词表（T-ID），令牌值互相一致。

## 快速开始

```html
<!-- 方式一：分开引（推荐，便于只覆盖令牌） -->
<link rel="stylesheet" href="rtgo-tokens.css">
<link rel="stylesheet" href="rtgo-components.css">

<!-- 方式二：只用合体文件 -->
<link rel="stylesheet" href="rtgo-slate.css">

<!-- 可选：要「浅色/深色/跟随系统」三选一，再加这一份 -->
<link rel="stylesheet" href="theme-overrides.css">
```

```html
<!-- 一个最小组装示例 -->
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

**跟随系统**是不加类；要**手动切**就再引 `theme-overrides.css`，然后给 `<body>` 挂 `theme-light` / `theme-dark`（都不挂 = 跟随系统）。

改主题只覆盖令牌：

```css
:root { --brand: #1f6feb; --card: #ffffff; }   /* 深色由令牌层重定义，组件层零分支 */
```

**不需要构建、不需要装依赖。** 打开 `gallery.html` 就能看到 **71 张样片 / 17 个分区 / 70 个件号**：
每张样片左上角是对应的组件 ID 与类名，按压类样片可以按住体验手感。

## 文件

| 文件 | 作用 |
|---|---|
| `rtgo-tokens.css` | 令牌层（颜色浅/暗、字阶 17 档、圆角、阴影、动效、层级）。**定制入口** |
| `rtgo-components.css` | 组件层，只消费 `var(--*)`。值不要改 |
| `rtgo-slate.css` | 合体文件 = 上两者拼合。勿手改 |
| `theme-overrides.css` | 主题档（`.theme-light` / `.theme-dark`）。需要手动切主题才引，勿手改 |
| `gallery.html` | 71 张逐件样片 + 版式参考，纯静态，双击即开 |
| `docs/组件手册.md` | **主参考**：按场景索引 + 逐家族用途/变体/Do-Don't |
| `docs/令牌口径.md` | 逐令牌用途与禁区 |
| `docs/宿主适配.md` | 跨宿主通道：page/rpx/hover-class/字号/原生组件 |
| `件号表.md` | 每个件的拆件依据：ID、类名、取自哪里、为什么这么分 |
| `check/verify.js` | **自检脚本**，见下节。无需安装依赖 |
| `CHANGELOG.md` | 逐版变更，按件号锚定；破坏性变更标 ⚠ |
| `SKILL.md` | 给 AI 编码助手用的使用说明 |

## 自检

```bash
node check/verify.js
```

一条命令，13 条断言，零依赖（Node 自带模块）。检查的是这个包里各文件之间的关系：

| 组 | 断言什么 | 不查会怎样 |
|---|---|---|
| M1-完整性 | `rtgo-slate.css` 逐字等于 `tokens + components` | 合体文件被手改过 ⇒ 分开引和整体引不一样，且不报错 |
| M4-主题档 | `theme-overrides.css` 与令牌层逐值一致（浅/深两档 + 深档自带底色 + 组件层暗档规则带作用域） | 手动切深色时个别规则不跟，肉眼难查 |
| M2-覆盖 | `件号表.md` 的每个 ID 都在文档里出现；文档不得引用不存在的 ID | 文档腐烂、凭空造件号 |
| 接线 | gallery 挂的类都有样式定义；资产里的类都被 gallery 挂过 | 类名拼错不报错，只是静默没样式 |

改完值跑一遍：绿 = 内部自洽；红 = 有处关系断了，输出会指出是哪条、差多少。

这 13 条检查的是**包内关系**，不评价数值本身。上述值取自“轨交速查”并逐个对账，
本包不重新论证来源。

## 三条使用纪律

1. 改观感只动令牌，不改组件声明。组件值逐件对过账，改一处就与设计稿脱开。
2. 深色零分支：组件层不写暗色规则，一切暗色由令牌层重定义。
3. 缺件先查手册。多数场景已有对应件；确缺再扩展，沿用同一套令牌与命名。

## 适用域

移动端组件型界面、深浅双主题、Web / 小程序同范式。
React Native / 桌面范式未验证。

## 状态

当前版本见 `VERSION`，逐版变更见 [CHANGELOG.md](CHANGELOG.md)（按件号锚定，破坏性变更标 ⚠）。
每个件「取自哪里、为什么这么分」见 `件号表.md`。

## 许可

**BSD-3-Clause** © 2026 AzusaKano · 全文见 [LICENSE](LICENSE)。
