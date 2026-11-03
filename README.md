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

**不需要构建、不需要装依赖。** 打开 `gallery.html` 就能看到 **71 张样片 / 17 个分区 / 65 个件号**：
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
| `SKILL.md` | 给 AI 编码助手用的使用说明 |

## 三条使用纪律

1. **改观感只动令牌**，不要改组件声明——组件值是逐件对过账的，改一处就与设计稿脱开。
2. **深色零分支**——组件层不写暗色规则，一切暗色由令牌层重定义。
3. **缺件先查手册**——多数场景已有对应件；确缺再扩展，扩展时沿用同一套令牌与命名。

## 适用域

移动端组件型界面、深浅双主题、Web / 小程序同范式。
React Native / 桌面范式未验证。

## 状态

版本见 `VERSION`。资产来源与判类过程属作者内部记录，不在本仓。

## 许可

**BSD-3-Clause** © 2026 AzusaKano —— 全文见 [LICENSE](LICENSE)。

可以商用、可以修改、可以闭源分发，只需保留版权声明与免责声明。
唯一比 MIT 多的一条：**不得用作者名义为衍生品背书** —— 你可以拿它做产品、改一版，
但不能声称"这是 RTGo 官方版"或"作者推荐用法"。

同源的另一范式（`rtgo-flutter-ui`）用同一份许可，两边可以一起用。
