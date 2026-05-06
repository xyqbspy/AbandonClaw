## 1. 现状审计

- [x] 1.1 梳理当前 Chunks 页面、卡片、详情、sheet 和 actions 中的用户动作，标记主路径动作与高级整理动作
- [x] 1.2 梳理 sentence 与 expression 条目的展示、CTA、review session 入口和来源场景回流差异
- [x] 1.3 标记调整入口层级后必须保持的数据副作用：保存、relation、cluster、expression map、review session、cache invalidation 与页面反馈

## 2. 用户路径收口

- [x] 2.1 调整 Chunks 工作台主视图，让搜索/筛选、进入详情、表达复习、来源场景回流优先于高级整理动作
- [x] 2.2 将 relation、cluster、expression map、AI 候选、移动、合并等高级整理动作收进详情上下文、更多操作或二级入口
- [x] 2.3 调整 sentence 条目主动作，提供来源场景巩固、查看句内表达或提取表达的明确路径，避免伪装为 expression review
- [x] 2.4 检查用户可见文案，移除“待开放”“待接入”等开发态提示，统一 sentence 与 expression 的动作语义

## 3. 组件与边界整理

- [x] 3.1 按动作域最小拆分 Chunks 页面私有 hook、selector、view-model 或 feature 组件，保持 page.tsx 编排清晰
- [x] 3.2 保留 FocusDetailSheet、ExpressionMapSheet、MoveIntoClusterSheet 等强业务容器在 Chunks feature 边界内
- [x] 3.3 若发现纯视觉壳可复用，仅抽取无 Chunks 业务语义的 shared primitive，并确认不承载数据写入或 review 语义

## 4. 测试验证

- [x] 4.1 更新或补充 Chunks 纯逻辑测试，覆盖 expression 与 sentence 主动作派生和高级动作层级
- [x] 4.2 更新或补充 Chunks 交互测试，覆盖详情入口、复习入口、来源场景回流与至少一个高级整理入口
- [x] 4.3 验证入口移动后 relation、cluster、expression map 或 review session 至少一个受影响副作用仍可追踪
- [x] 4.4 运行最小相关测试与文本/维护检查，并记录未覆盖原因或剩余风险

## 5. 文档与收尾

- [x] 5.1 同步 `docs/system-design/chunks-data-mapping.md` 中受影响的页面动作与数据副作用说明
- [x] 5.2 如组件边界有调整，同步 `docs/system-design/component-library.md` 或相关维护文档
- [x] 5.3 在实现完成后对照 proposal、design、spec delta 做实现 Review，并更新 tasks 完成状态
- [x] 5.4 archive 前同步 stable spec，运行维护检查，并按合入范围判断是否需要更新正式 `CHANGELOG.md`
