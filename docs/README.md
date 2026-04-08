# Docs Index

本目录用于描述项目结构、功能链路、规则与开发方式。

## 阅读顺序（强制建议）

当需要理解或修改复杂功能时，请按以下顺序阅读：

1. feature-map/README.md（理解系统模块）
2. 对应模块文档（如 today.md / scene.md）
3. feature-flows/ 对应链路文档
4. domain-rules/ 相关规则
5. 再进入代码

不要直接从局部代码开始推断业务逻辑。

---

## 文档分层说明

### feature-map
描述“模块是什么、做什么、依赖什么”

### feature-flows
描述“功能链路如何运行（入口 → 状态 → 输出 → 回退）”

### domain-rules
描述“规则系统（调度、阶段、信号）”

### system-design
描述“技术实现、数据结构、映射关系”

### dev
开发规则、测试策略、workflow

### meta
项目认知、脑图、结构理解

---

## 修改规则

当修改以下内容时必须同步文档：

- 主链路（Today / Scene / Session / Review）
- 状态流转
- 推荐逻辑
- 回写逻辑
- 恢复逻辑

若不确定影响范围，优先更新 feature-flow 文档。