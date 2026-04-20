# 任务清单

## Status
draft

## 修改前分析
- 任务分类：Spec-Driven Change
- 问题定位：现有场景生成只有“情境 prompt”语义，缺少“句子锚点”模式的正式契约
- 涉及模块：Scenes 生成 sheet、场景生成 API、request schema、prompt builder、生成服务、相关测试
- 是否影响主链路：是，影响 scenes 页的生成入口与生成语义
- 最小改动方案：在现有入口增加模式切换，复用原有 API/服务链路，通过 `mode` 分流 prompt 约束
- 风险与影响范围：需要保证旧调用保持 `context` 兼容，且 `anchor_sentence` 模式下结果约束明确
- 最小测试方案：交互测试 + schema/prompt/service 最小单测
- 是否需要更新文档：需要，至少同步 feature-flow 与 system-design/或对应 capability
- 稳定性缺口：
  - 本轮收口项：入口模式边界、请求契约、锚点句最小结果保证、对应测试基线
  - 明确不收项：多变体生成、元数据抽取、与 review/资产沉淀联动

## 实施
- [x] 1. 为 scenes 生成 sheet 增加“按情境生成 / 按句子生成”模式切换，并调整输入文案
- [x] 2. 扩展场景生成请求参数，增加 `mode`，保持旧请求默认兼容 `context`
- [x] 3. 在服务端生成 prompt 中按模式分流，补齐 `anchor_sentence` 的锚点约束
- [x] 4. 在生成服务中补齐锚点句最小结果校验与缓存 key 维度
- [x] 5. 完成本轮已识别稳定性缺口的最小必要收口，不额外引入第二入口或新页面
- [x] 6. 明确记录本轮不收项、延后原因与风险去向

## 验证
- [x] 1. 补 scenes 页交互测试，覆盖模式切换与提交参数变化
- [x] 2. 补 request schema / prompt builder 测试，覆盖 `mode` 识别与分支约束
- [x] 3. 补服务端最小回归测试，覆盖锚点句必须出现在最终输出文本
- [x] 4. 检查 `context` 旧模式是否保持兼容
- [x] 5. 检查本轮未收口项是否已记录原因与风险

## 文档
- [x] 1. 更新 `docs/feature-flows/scene-entry.md`，补充双模式生成入口说明
- [x] 2. 根据实现情况更新对应 system-design 文档，明确生成模式与 prompt/服务协作边界
- [x] 3. 在实现阶段补充 `docs/dev/dev-log.md`，记录验证结论
- [x] 4. 在记录中写清本轮收口项与明确不收项
- [ ] 5. 如后续已合并 main 且存在用户可感知变化，再更新正式 `CHANGELOG.md`
