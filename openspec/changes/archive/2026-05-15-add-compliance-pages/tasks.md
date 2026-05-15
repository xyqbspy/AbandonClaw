# 任务清单

## Status
done

## 1. 占位页面

- [x] 1.1 新增 `src/app/(marketing)/privacy/page.tsx`：覆盖 6 项核心内容（收集信息 / 目的 / 存储 / 用户权利 / 分享对象 / 联系方式），全部标 `__待法律审阅__`。
- [x] 1.2 新增 `src/app/(marketing)/terms/page.tsx`：覆盖 7 项核心内容（服务范围 / 用户行为规范 / 免责 / 账号与数据 / 知识产权 / 条款变更 / 适用法律），全部标 `__待法律审阅__`。
- [x] 1.3 两个页面都使用现有 marketing layout，不需要新组件。

## 2. 注册同意 checkbox

- [x] 2.1 注册页 `src/app/(auth)/signup/page.tsx` 增加 consent checkbox state。
- [x] 2.2 checkbox 文案：「我已阅读并同意《服务条款》和《隐私政策》」，链接指向 `/terms` 与 `/privacy`（`target="_blank"`）。
- [x] 2.3 提交按钮在 checkbox 未勾选时 disabled。
- [x] 2.4 提交时若 checkbox 未勾选（防绕过），toast 提示并阻止提交。

## 3. 测试

- [x] 3.1 更新 `src/app/(auth)/signup/page.test.tsx`：未勾选 checkbox 时按钮 disabled、勾选后可点击；现有 invite_only 与 redirect 测试加 click consent 步骤。
- [x] 3.2 验证 `/privacy` 与 `/terms` build 成功。

## 4. 文档与收尾

- [x] 4.1 更新 `docs/dev/release-readiness-assessment.md`：P2-4 标记代码侧完成，列出找律师审阅的步骤。
- [x] 4.2 更新 `docs/dev/dev-log.md`。
- [x] 4.3 spec delta `openspec/changes/add-compliance-pages/specs/auth-api-boundaries/spec.md`。
- [x] 4.4 完成态收尾归档。
- [x] 4.5 同步主 stable spec `openspec/specs/auth-api-boundaries/spec.md`。

## 不收项说明

- 实际法律条款内容：占位结构已就位，必须用户找律师审阅替换。
- Cookie 同意 banner（欧盟用户）：当前用户主要在国内，未来面向欧盟需另起 change。
- GDPR 数据导出 / 删除请求 API：等真实欧盟用户出现再做。
- 网站底部 footer 统一加链接：等 footer 重构时一起做。
