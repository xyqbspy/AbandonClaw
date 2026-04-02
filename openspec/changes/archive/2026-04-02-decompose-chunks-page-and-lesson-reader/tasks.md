## 1. Chunks 页面第二轮拆分

- [x] 1.1 审计 `src/app/(app)/chunks/page.tsx` 中最适合第二轮拆分的页面动作域、sheet 装配与 expression map / review 入口边界
- [x] 1.2 提取 chunks 页第二轮页面动作模块，优先收口 review 启动、focus detail 回退、map 打开或 quick add related 链路
- [x] 1.3 提取 chunks 页第二轮局部装配模块，优先处理多 sheet / panel 组装，减少主文件内联装配复杂度

## 2. Lesson Reader 第二轮拆分

- [x] 2.1 审计 `src/features/lesson/components/lesson-reader.tsx` 中最适合第二轮拆分的 selection、dialogue/mobile 分支与训练桥接边界
- [x] 2.2 提取 lesson reader 第二轮控制或桥接模块，优先收口 selection / active sentence-chunk 或训练上报链路
- [x] 2.3 提取 lesson reader 第二轮局部 section 组件，优先处理 dialogue/mobile 分支装配

## 3. 文档、验证与记录

- [x] 3.1 更新受影响入口与新拆出模块的测试，确认 chunks / lesson reader 的交互、上报和状态链路保持一致
- [x] 3.2 更新项目维护文档，补充 chunks / lesson reader 这类重入口的后续拆分判断与回归要求
- [x] 3.3 更新根目录 `CHANGELOG.md`，记录拆分范围、维护规则补充和验证情况
