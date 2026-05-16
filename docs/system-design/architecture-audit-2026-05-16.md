# 页面组件化与样式抽离架构审计（2026-05-16）

本文档回答一个问题：

> 项目页面层组件拆分与样式抽离的现状，对照已有规则（`component-library-governance` / `feature-component-decomposition` / `detail-composition-boundaries` 三份 stable spec + `component-library.md` + `ui-style-guidelines.md`）有哪些落差，按什么优先级收口？

它是一次性架构盘点，**不替代规则文档**。规则定义看 stable spec 与上述两份 system-design 文档；本文只列现状、落差和建议节奏。

## 0. 阅读前提

- 本审计**不重新发明组件分层规则**。规则以 `openspec/specs/component-library-governance/spec.md`、`openspec/specs/feature-component-decomposition/spec.md`、`openspec/specs/detail-composition-boundaries/spec.md` 为准。
- 本审计**不替代** `docs/system-design/component-library.md`（组件分层、公共化判断、候选池）与 `docs/system-design/ui-style-guidelines.md`（页面骨架、视觉、状态反馈、动作层级、样式写法）。
- 本审计**不替代** `docs/system-design/ui-style-audit.md`（按时间累积的渐进收口审计记录）。如果某项落差被收口落地，应该在 `ui-style-audit.md` 追加 entry，而不是回来改本文。
- 后续若发现新落差，按本文同一格式在末尾追加新章节，不删除历史结论。

## 1. 现状盘点

### 1.1 顶层目录与角色

| 路径 | 角色 | 当前文件/子目录 |
| --- | --- | --- |
| `src/app/(app)/*` | 主应用路由层 | today / scenes / scene / chunks / review / progress / settings / admin / lesson(legacy redirect) |
| `src/app/(auth)/*` | 认证路由层 | login / signup / verify-email |
| `src/app/(marketing)/*` | 营销路由层 | landing / demo / privacy / terms |
| `src/components/ui/*` | UI primitives | 17 个文件（avatar / badge / button / card / drawer / input / ...） |
| `src/components/shared/*` | 跨 feature 稳定复用 | 22 个文件，但混了 4 个 admin-* 实际只服务 admin |
| `src/components/audio/*` | 音频动作子域 | 4 个 |
| `src/components/admin/*` | 管理后台子域 | 6 个 |
| `src/components/scenes/*` | 命名混淆（单 1 文件） | `generate-scene-sheet.tsx` 只被 `app/(app)/scenes/page.tsx` 用 |
| `src/components/settings/*` | 命名异常（单 1 文件） | `settings-page-client.tsx`，按规则应在 `app/(app)/settings/` |
| `src/components/branding/*` | 品牌物料 | `wordmark.tsx` |
| `src/components/layout/*` | 应用壳 | sidebar / topbar / page-shell / pull-to-refresh / mobile-nav / ... |
| `src/features/<x>/components/*` | feature 私有组件 | today / chunks / lesson / review / scene / progress 各自有目录 |
| `src/features/auth/`、`src/features/marketing/` | **空目录** | 应删除或填充 |
| `src/lib/ui/apple-style.ts`、`admin-style.ts` | TS 常量层 token | `APPLE_*` 系列 |
| `src/styles/mobile-adaptive.css`、`rhythm.css` | CSS var 层 token | `--mobile-*` 系列 |
| `src/styles/mobile-adaptive-guidelines.md` | **位置错位**的样式指南 | 应在 `docs/system-design/` |

### 1.2 大文件 TOP 12（含 hook / selector / page）

| LoC | 文件 | 类型 |
| --- | --- | --- |
| 2368 | `src/app/(app)/chunks/page.tsx` | 页面入口（单一 default function） |
| 1326 | `src/app/(app)/scene/[slug]/scene-detail-page.tsx` | 页面入口（单一 default function） |
| 868 | `src/app/(app)/chunks/chunks-list-view.tsx` | feature view（已做过文件内私有展示块收口） |
| 742 | `src/features/lesson/components/lesson-reader.tsx` | feature view（已做过第一轮拆分，仍偏重） |
| 677 | `src/app/(app)/scene/[slug]/use-scene-detail-actions.ts` | hook |
| 599 | `src/features/today/components/today-page-selectors.ts` | selectors |
| 572 | `src/app/(app)/review/page.tsx` | 页面入口 |
| 568 | `src/app/(app)/chunks/chunks-page-logic.ts` | 页面 logic |
| 562 | `src/features/lesson/components/use-lesson-reader-controller.ts` | hook |
| 539 | `src/app/(app)/review/review-page-stage-panel.tsx` | 页面级 section |
| 511 | `src/app/(app)/admin/actions.ts` | server actions（非 UI，可接受） |
| 497 | `src/features/today/components/today-page-client.tsx` | feature view |

### 1.3 Token 使用量化

- `var(--mobile-*)`（CSS 变量层）：**407 处引用**，覆盖 spacing / typography / control sizes
- `APPLE_*`（TS 常量层）：**394 处引用**，覆盖 surface / border / banner / badge / button-style / panel
- 两套并存且**没有任何文档说明分工边界**

### 1.4 Feature-private styles 入口分布

| 入口 | LoC | 备注 |
| --- | --- | --- |
| `src/app/(app)/review/review-page-styles.ts` | 213 | review 页族 |
| `src/features/scene/components/scene-page-styles.ts` | ~80 | scene 页族 |
| `src/features/today/components/today-page-styles.ts` | 未量化 | today 页族 |
| `src/features/lesson/styles/dialogue-theme.ts` | 未量化 | lesson 对话主题，命名口径与其它不一致 |
| **chunks 缺失** | — | chunks/page.tsx 2368 行，**无对应 chunks-page-styles.ts** |

### 1.5 跨 feature / 反向依赖检查

- `features/<x>/components/` 引用其它 `features/<y>/components/`：**0 处**（grep 出来的全是同 feature 内自引用）。✓
- `src/components/shared` 反向引用 `src/features/*`：**0 处**。✓
- 结论：**真正的 cross-feature 依赖目前不存在**。架构边界守得住。

## 2. 落差清单

每条按 **现状 → 违反规则 → 风险 → 收口建议** 四步描述，分级标准：

- **P0**：违反现有 stable spec 或 component-library.md 的明文规则，且影响日常维护成本。
- **P1**：边界模糊或命名不一致，会让新维护者判断成本上升，但短期不阻塞业务。
- **P2**：架构设计层面的结构性遗留，独立改动收益小，但未来 page 数量增加后会放大代价。
- **P3**：长期演进风险或开放问题，本轮不强制处理。

### 2.1 P0：components/shared/ 误放 4 个 admin-* 组件

**现状**：

```
src/components/shared/admin-action-bar.tsx
src/components/shared/admin-detail-section.tsx
src/components/shared/admin-info-card.tsx
src/components/shared/admin-list-shell.tsx
```

`grep -rln "from \"@/components/shared/admin-" src` 显示这 4 个文件 **只被 `src/app/(app)/admin/*` 引用**，没有 admin 之外的 feature 使用。

**违反规则**：

- `component-library.md` §2 "`src/components/admin`" 段：**"只服务 `/admin` 及后台维护页面"** 的组件应放在 `src/components/admin/`。
- `component-library-governance` Requirement "已跨 feature 复用的组件必须迁移到公共层" 的反面：**未跨 feature 复用的组件不应放在公共层**。
- shared 层文件名带 `admin-` 前缀本身就是命名信号：它们属于 admin 子域。

**风险**：

- 新维护者按 component-library.md 规则会先去 `components/admin/` 找 admin 组件，找不到再去 shared 翻，提高判断成本。
- 后续如果 admin 真正需要"非 admin 也能用"的稳定 detail-section/info-card，会在 shared 重复抽一份。
- 单元测试入口分裂（admin 组件测试在 shared 目录），git blame / 影响范围分析复杂化。

**收口建议**：

- 把 4 个文件迁到 `src/components/admin/`，同步更新 import 路径与测试文件位置。
- 这是机械重命名，不改组件 props 也不改行为，按 `component-library-governance` Requirement "公共组件迁移不得改变既有交互行为" 保持兼容即可。
- 估算 1 个 commit，跑 admin 相关测试（admin actions / admin invites / admin users 等）+ tsc --noEmit。

### 2.2 P0：page-header.tsx 通过 `variant="admin"` 强行揉合两个语义

**现状**：

```ts
// src/components/shared/page-header.tsx
export function PageHeader({
  eyebrow, title, description, actions,
  variant = "default",  // "default" | "admin"
}) {
  const isAdmin = variant === "admin";
  // ... isAdmin ? "mb-8 items-start" : "items-end"
  // ... isAdmin ? "text-2xl font-bold text-slate-800" : "text-3xl font-semibold..."
}
```

**违反规则**：

- `component-library.md` §1.1 "公共化不是把 class 变成变量" 的精神：把两个不同子域（learning workspace / admin）的视觉表达**通过 variant 揉进一个组件**，等于用代码分支替代了组件分层。
- `ui-style-guidelines.md` §3 明确 admin 和 workspace 是两种页面角色，不应共用同一个 header 实现。
- 该文件**当前只被 admin 页用**（grep 显示 9 个 import 全在 `app/(app)/admin/*`），却挂着 `variant="default"` 的"为未来准备的接口"——是典型的预防性抽象反例。

**风险**：

- "default" 分支没有真实使用方，未来 default 视觉演进时会忘记同步，造成"两个分支都坏一个"。
- admin 页面 header 调整需要绕过 shared 文件，提高 admin 子域内聚成本。

**收口建议**：

- 把当前 `page-header.tsx` **整体迁到 `src/components/admin/admin-page-header.tsx`**，移除 variant 分支，固定 admin 视觉。
- shared 层不留 `PageHeader`，等真有第二种页面（学习工作台主页）需要复用同一语义时再抽。
- 与 2.1 合并一个 commit。

### 2.3 P0：chunks/page.tsx 2368 行单一 default function

> **状态**：2026-05-16 已部分落地（commit `3301dc5`，OpenSpec change `decompose-chunks-page-r2`）。chunks/page.tsx 2368 → 2125 行（-243，-10.3%）。抽出 3 个动作 hook（quick-add-related / builtin-phrases-actions / detail-audio-actions）+ 1 个 view section（chunks-page-hero）。本轮目标不是一次降到 800 行而是验证拆分模式，第三轮对象转向 chunks-list-view.tsx（868 行）+ chunks-page-sheets.tsx（449 行）。详细见 dev-log [2026-05-16] 与 ui-style-audit §21。

**现状**：

`src/app/(app)/chunks/page.tsx` 共 2368 行，唯一的页面级 export 是 `export default function ChunksPage()`。文件内 17 个其它顶层 const 都是配置/常量。

**违反规则**：

- `feature-component-decomposition` Requirement "超重页面与 feature 容器必须优先做内部职责拆分" + Scenario "`chunks/page.tsx` 或 `scene-detail-page.tsx` 持续膨胀" **明确点名了这个文件**。
- 也违反 Requirement "重入口第二轮拆分必须继续保持页面级动作与分支语义稳定" — spec 已经预期这个文件需要"第二轮拆分"。

**风险**：

- 当前已经做过一轮（`chunks-page-logic.ts` 568 / `chunks-page-sheets.tsx` 449 / `chunks-list-view.tsx` 868 / `use-expression-cluster-actions.ts` 344 已经抽出），但 page.tsx 仍然 2368 行，说明第二轮 review 启动 / expression map 打开 / focus detail 回退 / 多 sheet 装配等动作编排仍堆在主入口。
- 任何 chunks 主链路改动都要在 2000+ 行文件里读上下文，AI 协作和人维护都受影响。
- 测试覆盖率难以聚焦（已有 `chunks-page-load-logic` / `-focus-detail-sync` / `-notify` / `-sheets.interaction` 等多文件测试，但都是测拆出来的部分，主入口本身只能靠 `page.interaction.test.tsx`）。

**收口建议**：

- 不在本 audit 直接修，需要走独立 OpenSpec change（已有 spec 边界：`feature-component-decomposition` Requirement "重入口第二轮拆分必须继续保留入口级交互回归"）。
- 推荐拆分方向：
  1. 抽 `chunks-page-actions.ts`（review 启动 / map 打开 / focus 成功回退）
  2. 抽 `chunks-page-sheets-controller.ts`（多 sheet 装配的状态机）
  3. 主 page.tsx 退化为路由参数同步 + 装配
- **优先级判断**：这是已知技术债，但属于"代价大、收益分散"的拆分，应按 spec 要求带充分测试，不在通用 audit 收口里做。

### 2.4 P0：scene-detail-page.tsx 1326 行同 chunks/page.tsx

**现状**：`src/app/(app)/scene/[slug]/scene-detail-page.tsx` 1326 行，唯一 default export `SceneDetailClientPage`。同目录已经拆出 `use-scene-detail-actions.ts` 677 / `use-scene-detail-data.tsx` / `use-scene-detail-playback.ts` 364 / `use-scene-detail-route-state.ts` / `use-scene-learning-sync.ts` / `scene-detail-controller` 等多个 hook。

**违反规则**：与 2.3 相同。

**风险**：与 2.3 相同，且 scene detail 是学习闭环主路径，重构风险更高。

**收口建议**：与 2.3 相同，独立 change 推进。**优先级低于 chunks/page.tsx**，因为 scene 已经把更多职责拆到 hook，主文件复杂度集中在 JSX 装配。

### 2.5 P1：components/settings/settings-page-client.tsx 位置违反分层

**现状**：

```
src/components/settings/settings-page-client.tsx  (216 行)
```

只被 `src/app/(app)/settings/page.tsx` 引用。整个目录只这一个文件。

**违反规则**：

- `component-library.md` §2 "页面层 `src/app/*`" 段：**"放页面级组装与路由编排，不放可复用展示组件"**。反过来说，**页面级组装应该在 `src/app/*`** 同目录。
- 当前该文件位置等于宣称 "settings 是一个公共子域"，但实际没有跨页面复用。

**风险**：

- 新人按规则在 `src/app/(app)/settings/` 找 page client，找不到再去 `src/components/settings/` 翻一次。
- 鼓励了"为了把 page.tsx 看起来薄，把 client 部分挪到 components"的反模式（page.tsx 内只剩 server 校验 + 转发）。

**收口建议**：

- 选项 A：把 `settings-page-client.tsx` 迁到 `src/app/(app)/settings/settings-page-client.tsx`，删除空目录 `src/components/settings/`。
- 选项 B：把 settings 升格为正式 feature：建 `src/features/settings/components/settings-page-client.tsx`。
- 推荐 **A**——settings 没有 selector/controller/logic 等横向能力，不构成 feature 体量。
- 改 import 路径，跑 settings 相关测试（如果有）+ tsc。

### 2.6 P1：components/scenes/（复数）vs features/scene/（单数）命名冲突

**现状**：

- `src/components/scenes/generate-scene-sheet.tsx`（单文件，只被 `app/(app)/scenes/page.tsx` 用）
- `src/features/scene/components/*`（scene detail 相关 feature 组件）

`scenes`（复数）= 列表页 / `scene`（单数）= 详情页 / feature 名是单数 / 公共组件目录是复数 — 三方命名错位。

**违反规则**：

- 没有明文规则违反，但 `component-library.md` §4 "判断顺序" 与 §5 "什么情况下不要抽公共" 的精神：**单一使用方的组件不应在公共层**。

**风险**：

- 维护者搜 scene 相关组件时需要同时检查 `components/scenes/`、`components/admin/scene-*`、`features/scene/components/`、`app/(app)/scene/` 四处。
- 单数复数差异容易产生 typo bug（import 时 IDE 自动补全可能跨目录跳跃）。

**收口建议**：

- `generate-scene-sheet.tsx` 是 scenes **列表页**的 sheet，逻辑上属于该页面族。
- 推荐迁到 `src/app/(app)/scenes/generate-scene-sheet.tsx`（不需要 feature 容器），删空目录 `src/components/scenes/`。
- 也可以迁到 `src/features/scene/components/generate-scene-sheet.tsx`，但 scene feature 主要服务 detail 页，列表页 sheet 放进去会让 feature 边界变宽。

### 2.7 P1：空 feature 目录 features/auth/、features/marketing/

**现状**：两个目录存在但空（既无 `components/` 也无 `*.ts`）。

**违反规则**：

- `component-library.md` §2 "`src/features/*/components`" 段隐含：feature 目录的存在意味着有 feature 私有组件或 logic；空目录是 git history 残留或预设占位。

**风险**：

- 误导新人以为 auth / marketing 有未公开的 feature 模块。
- IDE 文件树噪音。

**收口建议**：

- 直接删除两个空目录。一行 git rm 操作。
- 如果未来 auth 真正需要 feature 化（例如登录后引导流程），届时再建。

### 2.8 P1：features/chunks/expression-clusters/ 与 components/ 同级

**现状**：

```
src/features/chunks/
  components/          ← 其它 feature 都用这个名字
  expression-clusters/ ← 独有的额外子目录
```

`expression-clusters/` 只有 `ui-logic.ts` + `ui-logic.test.ts` 两个文件。

**违反规则**：

- `component-library.md` 的事实约定（其它 feature `today/scene/lesson/review/progress` 都只有 `components/` + 可选 `styles/`）：**feature 子目录命名应跨 feature 一致**。

**风险**：

- 新人按 today/scene 习惯只看 components/ 子目录，会漏掉 expression-clusters 的 ui-logic。
- 后续 chunks 若再独立出 cluster-actions / cluster-state，会形成新的子目录蔓延。

**收口建议**：

- 选项 A：把 `expression-clusters/ui-logic.ts` 迁到 `src/features/chunks/components/expression-clusters-ui-logic.ts`（按 chunks/ 现有 ui-logic 命名约定）。
- 选项 B：保留 expression-clusters/ 子目录但补 `chunks/README.md` 说明这是有意分子域。
- 推荐 **A**——降低目录层级，对齐其它 feature。

### 2.9 P2：双轨 design token（`--mobile-*` CSS var + `APPLE_*` TS const）缺分工说明

**现状**：

- `src/styles/mobile-adaptive.css`（117 行）+ `src/styles/rhythm.css`（6 行）：定义 `--mobile-space-*`、`--mobile-font-*`、`--mobile-control-*` 等 CSS 变量。407 处 `var(--mobile-*)` 引用。
- `src/lib/ui/apple-style.ts`（57 行）+ `admin-style.ts`（35 行）：定义 `APPLE_BG_*`、`APPLE_PANEL_*`、`APPLE_BADGE_*`、`APPLE_BUTTON_*` 等 TS 常量。394 处 `APPLE_*` 引用。
- `component-library.md` §1.1 提到 "design tokens：颜色、圆角、阴影、字体、间距等底层变量"，但**没有说明 `--mobile-*` 与 `APPLE_*` 谁是底层、谁是中层、什么场景用哪个**。

**违反规则**：

- 没有明文违反，但 `ui-style-guidelines.md` §12 "样式写法约束" 期望 token 分层清晰，否则维护者每次写新 class 都要做选择题。

**风险**：

- 当前模式 = **CSS var 管空间 + 字号；TS const 管表面 / 组件级语义**。这个分工**实际上是合理的**，但因为没文档化，新维护者会随意混用（例如把 spacing 写成 `gap-3` 而不是 `gap-[var(--mobile-space-sm)]`）。
- 后续如果再加第三套（例如 dark mode token / theme variant），会形成更深的分裂。

**收口建议**：

- **不动代码，补一段文档**到 `docs/system-design/component-library.md` 的 §1.1 之后，明确：
  - `--mobile-*` CSS var：**间距 / 字号 / 控件尺寸**等"密度变量"，移动端响应式适配，**所有页面间距/字号优先使用**
  - `APPLE_*` TS const：**表面 / 边框 / 阴影 / 配色 / banner / badge / button-style** 等"视觉语义常量"，**所有跨组件视觉元素优先使用**
  - 二者**不互相替代**：spacing 不要硬编码 `p-4`、表面色不要硬编码 `bg-white shadow-sm`
- 同时把 `src/styles/mobile-adaptive-guidelines.md` 迁到 `docs/system-design/mobile-adaptive-tokens.md`（见 2.10）。

### 2.10 P2：src/styles/mobile-adaptive-guidelines.md 位置错位

**现状**：85 行的样式使用约定文档藏在 `src/styles/` 源码目录里。

**违反规则**：

- `docs/README.md` 文档分层规则：**指南和约定应在 `docs/system-design/` 或 `docs/dev/`**。
- 当前位置让该文档无法被 `docs/README.md` 入口表索引，新人按约定流程读 docs 时不会看到。

**风险**：

- 项目中只有 0 处引用这份 guidelines（在 `src/lib/ui/admin-style.ts` 的注释里？需 grep）；实际上 `--mobile-*` 407 处使用，但维护者更可能从代码反推而不是先读这份指南。

**收口建议**：

- 迁到 `docs/system-design/mobile-adaptive-tokens.md`。
- 在 `docs/README.md` 高频问题入口表加入"移动端 spacing / 字号 / 控件尺寸 token 使用约定 → mobile-adaptive-tokens.md"。
- 与 2.9 一起做：补文档 + 改位置。

### 2.11 P2：chunks 是最大文件却没 chunks-page-styles.ts

> **状态**：2026-05-16 已落地（commit `3301dc5`，作为 decompose-chunks-page-r2 §1 前置）。chunks-page-styles.ts 新建，收口 page.tsx 顶层 3 个 const + view-mode/content-filter/review-filter pill group + library tab 共 11 个常量。chunks 页族现在与 today / scene / review 对齐，都有自己的 *-page-styles.ts 入口。

**现状**：today / scene / review 三个页族都有 `*-page-styles.ts` 文件收口私有 class 常量。chunks/page.tsx 2368 行，**没有对应 styles 入口**。

**违反规则**：

- 不直接违反规则。但 `component-library.md` §1.1 "feature-private styles" 段的精神：**当一个 feature 内重复出现 class pattern 时，优先抽到 feature-private styles**。
- chunks 2368 行 + 868 行 list view + 449 行 sheets + 568 行 logic，class 重复概率极高，反而没收口入口。

**风险**：

- chunks 后续做 padding 收口或视觉调整时，要在 4 个文件里逐处搜 class 字符串，遗漏率高。
- 与 P0 2.3 拆分关联：chunks/page.tsx 二轮拆分时，私有样式收口会同步发生，但**先抽 styles.ts 反而能降低拆分难度**（拆出来的小组件直接 import 常量）。

**收口建议**：

- 不本轮强推。建议在 chunks/page.tsx 二轮拆分前先建 `src/app/(app)/chunks/chunks-page-styles.ts`，把已知重复的 class 常量先收口。
- 估算量：先收 10-20 个常量，~150 行 styles 文件，1 个 commit，不动业务。

### 2.12 P2：lesson/styles/dialogue-theme.ts 命名口径不一致

**现状**：

```
src/app/(app)/review/review-page-styles.ts
src/features/scene/components/scene-page-styles.ts
src/features/today/components/today-page-styles.ts
src/features/lesson/styles/dialogue-theme.ts   ← 命名异常
```

前 3 个都叫 `*-page-styles.ts` 且与 components/ 同级；lesson 单独叫 `dialogue-theme.ts` 且在独立 `styles/` 子目录。

**违反规则**：

- 没明文规则，但 `component-library.md` §1.1 "feature-private styles" 例子里举的全是 `*-page-styles.ts`，事实约定是这个命名。

**风险**：

- 命名分裂让新维护者不知道 lesson 私有样式入口叫什么。
- 后续如果 lesson 要补真正的 page-styles（区别于 dialogue 主题），需要决定是否合并到 dialogue-theme 或新建 lesson-page-styles。

**收口建议**：

- 保留 `dialogue-theme.ts` 命名，但**补 lesson/components/README.md 或在 component-library.md 注一行**："lesson feature 内 `dialogue-theme.ts` 是 dialogue 视觉主题，不是通用 page-styles 入口"。
- 不强求统一命名（dialogue 确实是 theme 不是 layout styles）。

### 2.13 P3：(app) 页面 root 缺共享 page-shell 组件

**现状**：今天的 padding 收口暴露了一点—— `src/app/(app)/` 下所有页面 root 都手写 `min-h-screen bg-[#f8fafc] px-3 lg:px-5 ...`，重复 5+ 处。已有的 `src/components/layout/page-shell.tsx` 只承担 sidebar + min-h，不带 padding 与 max-width。

**违反规则**：

- `component-library.md` §3.1 候选池里没有这一项，说明历史上没看作公共候选。
- `ui-style-guidelines.md` §6 "容器规则"提到 "页面主体优先用固定最大宽度或已有布局容器"，但事实上没提供共享容器。

**风险**：

- 每次想统一调整页面 root padding / max-width / pb-28 都要改 5+ 个文件（本次 padding 收口刚做过）。
- 但抽公共 `<AppPageContent padding="default" maxWidth="default">` 又会形成"为了 DRY 而 DRY"的预防性抽象，违反 `component-library.md` §5 反例 "为了'以后可能复用'提前抽象"。

**收口建议**：

- **本轮不抽**。理由：今天的 padding 收口能直接改 5 处（已做），证明分散写并未阻塞维护。
- 候选记录：如果未来再有一次跨多个 (app) 页面的 root 容器调整（例如全局加 floating bottom bar 或 viewport-fit），届时再评估抽 `AppPageContent`。
- 在 `component-library.md` §3.1 "当前公共语义候选池" 表追加一行：
  ```
  | (app) page root shell | today/scenes/review/chunks/scene/progress/settings 全部手写 px-3 lg:px-5 min-h-screen bg-[#f8fafc] | 候选 | 暂不抽，重复成本低，再发生一次跨页 root 调整后评估 |
  ```

### 2.14 P3：review-page-stage-panel 539 行 + review/page.tsx 572 行

**现状**：review 已经收过一轮 `review-page-styles.ts` 213 行，但主页面 + stage panel 仍各 500+ 行。

**违反规则**：

- 不严重违反 `feature-component-decomposition`，但接近"持续膨胀"信号。
- spec Requirement "重页面拆分必须保持任务阶段与缓存语义稳定" 已为 review 拆分定边界。

**风险**：

- 比 chunks/scene-detail 小一档，但 review 是学习闭环关键路径，未来加 phrase / sentence 新阶段时复杂度会再涨。

**收口建议**：

- 不本轮处理。持续观察。如果未来加一个 review 阶段或改 footer 动作，作为该 change 的一部分顺手拆。

## 3. 推荐收口节奏

按"修复成本 / 风险 / 收益"排序，建议分批：

### 批次 A（本轮可做，机械重命名为主）

- 2.1 迁移 4 个 admin-* 到 components/admin/
- 2.2 page-header.tsx 整体迁到 components/admin/admin-page-header.tsx 移除 variant
- 2.5 settings-page-client.tsx 迁到 app/(app)/settings/
- 2.6 generate-scene-sheet.tsx 迁到 app/(app)/scenes/
- 2.7 删 features/auth/、features/marketing/ 空目录
- 2.8 expression-clusters/ui-logic.ts 改名迁到 components/

**验证**：跑 admin / scenes / settings / chunks 相关测试 + tsc --noEmit + lint。预计 1-2 个 commit。

### 批次 B（文档收口）

- 2.9 component-library.md 补 token 分工段
- 2.10 src/styles/mobile-adaptive-guidelines.md 迁到 docs/system-design/mobile-adaptive-tokens.md
- 2.12 component-library.md 注一行 lesson dialogue-theme 命名说明
- 2.13 component-library.md 候选池追加 page root shell 候选项
- 同步更新 docs/README.md 高频入口表加入这份 audit + mobile-adaptive-tokens

### 批次 C（独立 OpenSpec change，本审计不直接做）

- 2.3 chunks/page.tsx 二轮拆分
- 2.4 scene-detail-page.tsx 二轮拆分
- 2.11 在 2.3 启动前先建 chunks-page-styles.ts

### 持续观察（不主动做）

- 2.14 review/page.tsx + review-page-stage-panel.tsx

## 4. 不收项

明确**不在本审计范围内做**的事，记录原因避免后续反复争论：

- **不重写组件分层规则**。规则在 `component-library-governance` spec + `component-library.md`，本审计只列落差不重写规则。
- **不引入新组件库 / 设计系统抽象**。当前 `APPLE_*` + `--mobile-*` + `shadcn/ui` primitives 三层已能满足；额外抽象违反 `component-library.md` §5。
- **不抽通用 page shell 组件**（2.13）。当前重复 5 处可接受，等真正出现跨页 root 联动需求时再评估。
- **不主动拆 chunks/page.tsx**（2.3）和 scene-detail-page.tsx（2.4）。spec 已经规划，但属于带回归风险的大动作，必须走独立 OpenSpec change。
- **不动 features/lesson/styles/dialogue-theme.ts 命名**（2.12）。dialogue 是该文件实际表达的语义，强行改为 lesson-page-styles 会丢语义。
- **不动 admin / scene-admin-actions / scene-sentence-editor-sheet 等 admin 内 scene 命名**。它们是 admin 子域内处理 scene 数据的工具，命名跨域是合理的。

## 5. 相关文档

- `openspec/specs/component-library-governance/spec.md` — 组件分层、公共化、共享交互、UI 风格指南、私有 styles 与公共抽象的区别
- `openspec/specs/feature-component-decomposition/spec.md` — 超重页面/容器拆分、拆分不改用户行为、必带测试
- `openspec/specs/detail-composition-boundaries/spec.md` — detail 组件的共享 / 领域边界
- `docs/system-design/component-library.md` — 组件分层规则、公共化判断、当前候选池、最近验证过的边界样例
- `docs/system-design/ui-style-guidelines.md` — 页面骨架、视觉语言、间距密度、状态反馈、动作层级、样式写法
- `docs/system-design/ui-style-audit.md` — 历次 UI 渐进收口的审计累积记录（本审计的姊妹文档）
- `src/styles/mobile-adaptive-guidelines.md` — `--mobile-*` token 使用约定（2.10 建议迁到 docs/）
- `AGENTS.md` §1 §7 — 修改前必做、文档维护规则
