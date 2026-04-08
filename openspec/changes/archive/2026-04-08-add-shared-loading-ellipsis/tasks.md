# 任务清单

## Status

implemented

## 实施

- [x] 1. 新增公共动态省略号 loading 文案组件，并接入共享 loading 组件体系
- [x] 2. 在 scene 练习“重新生成题目”入口接入统一的“正在生成中” loading 展示
- [x] 3. 盘点首批高频长等待入口，并统一替换为公共动态 loading 文案
- [x] 4. 在场景生成、导入、句子保存、后台场景动作、复习页进入场景等入口接入统一 loading 组件

## 验证

- [x] 5. 补充共享 loading 组件测试，覆盖动态省略号展示
- [x] 6. 补充 scene 练习交互测试，覆盖“重新生成题目”时的统一 loading 文案
- [x] 7. 补充首批接入入口的交互或渲染测试，覆盖动态省略号展示
- [x] 8. 运行受影响测试与 `pnpm run text:check-mojibake`

## 文档

- [x] 9. 如实施后用户可感知行为发生变化，更新 `CHANGELOG.md`
