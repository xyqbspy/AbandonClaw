# 真实学习闭环验收清单

## 目标

用于人工验证主链路 `today -> scene -> save phrase -> review -> return today` 是否仍然成立，并确认结果反馈、业务事件和音频失败替代路径都符合当前约定。

## 环境前置

- [ ] 已登录真实用户
- [ ] 本地开发服务或目标环境已启动
- [ ] 当前账号是新账号，或已清空学习进度与相关 user_phrase 测试数据
- [ ] 当前账号允许从场景里保存表达并进入 review
- [ ] 浏览器已打开 `console`
- [ ] 如需回看事件，已打开 `/admin/observability`

## P0 发布前冒烟

- [ ] 新账号或清空进度账号进入 `/today`，能看到 starter recommendation。
- [ ] 点击 Today 主卡片后进入 `/scene/daily-greeting`。
- [ ] Scene 页面能看到核心 chunks。
- [ ] 保存一个 chunk，并看到成功提示。
- [ ] 进入 `/chunks`，能看到刚保存的表达。
- [ ] 进入 `/review`，能看到该表达进入 due。
- [ ] 提交一次 Review，提交成功且状态推进。
- [ ] 回到 `/today`，页面能正常承接下一步。
- [ ] 完成 `daily-greeting` 后，Today 推荐 `self-introduction`。
- [ ] 进入 `/scenes`，切换 L2 筛选；无内容时显示空状态和清除筛选入口。
- [ ] admin 测试账号访问 `/admin` 返回 200。
- [ ] restricted 测试账号访问 `/admin` 被拒绝或重定向。
- [ ] 登录、注册、验证码、Review submit 的错误不裸露 `failed fetch` 或 Supabase 英文错误。

## 验收步骤

### 1. 从 today 进入场景

- [ ] 打开 `/today`
- [ ] continue 卡片能看到当前进度与结果摘要
- [ ] 点击 continue 后成功进入目标场景
- [ ] `/admin/observability` 中出现 `today_continue_clicked`

### 2. 在场景里推进并保存表达

- [ ] 完成至少一次场景播放或训练推进
- [ ] 从场景中收藏一条表达
- [ ] 若场景完成，toast 会显示“已沉淀多少表达 / 下一步建议”
- [ ] `/admin/observability` 中出现 `scene_learning_completed`（若本轮确实完成）

### 3. 进入 review 并提交

- [ ] 从 today 或其他入口进入 `/review`
- [ ] 完成一条普通表达 review 提交
- [ ] 提交成功 toast 会说明“还剩多少”或“这一轮先收住”
- [ ] `/admin/observability` 中出现 `review_submitted`

### 4. 返回 today 验证承接

- [ ] 回到 `/today`
- [ ] continue 卡片摘要已反映最新聚合结果
- [ ] review 区块或任务状态与刚刚的正式提交保持一致

## 音频失败替代路径

- [ ] 在支持 `scene full` 的页面触发完整场景播放
- [ ] 若失败，页面会给出受控错误提示
- [ ] 错误提示里存在“改为逐句跟读” CTA
- [ ] 点击 CTA 后能直接回到逐句播放
- [ ] `/admin/observability` 中能看到：
  - `tts_scene_loop_failed`
  - `tts_scene_loop_fallback_clicked`（若点了 CTA）

## review 空队列反馈

- [ ] 当 review 队列清空时，页面不是只显示空白提示
- [ ] 若今天已完成过回忆，会展示“这轮回忆先收住了”
- [ ] 页面提供显式“返回 today”入口

## 当前边界

- 当前业务事件只保存在本地浏览器，不跨设备同步
- `/admin/observability` 主要用于开发、验收和发布前排查
- 这份清单验证的是“闭环是否成立”，不是容量或性能结果
