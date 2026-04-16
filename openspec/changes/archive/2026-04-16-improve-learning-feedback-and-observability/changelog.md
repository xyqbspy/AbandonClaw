# CHANGELOG Draft

> 说明：本文件只用于第五阶段变更在归档前准备正式 `CHANGELOG.md` 文案。
> 按仓库规则，正式 `CHANGELOG.md` 只在代码合并 `main` 后更新。

## 用户可感知变化

- `today` 页面现在会在继续学习卡片里展示更明确的结果摘要，帮助用户快速知道“今天已经带走了什么、后面还剩什么”。
- `review` 提交成功后会根据当前剩余待复习数量给出不同反馈，不再只有固定成功提示。
- 场景学习完成时会补充“已沉淀多少表达 / 下一步建议”的结果反馈。
- `scene full` 播放失败时会提供“改为逐句跟读”的替代 CTA，减少音频失败带来的链路中断感。

## 运维与排查补充

- 新增最小客户端业务事件与失败摘要记录：
  - `today_continue_clicked`
  - `today_review_opened`
  - `review_submitted`
  - `scene_learning_completed`
  - `tts_scene_loop_failed`
  - `tts_scene_loop_fallback_clicked`
