# Meta

本目录用于维护“项目认知层”文档。

这里不负责定义正式业务规则，也不负责描述实现细节，而是帮助新维护者、分享者或 AI 快速建立整个项目的认知骨架。

当前 meta 文档应围绕同一个产品北极星展开：

> 让每一次场景学习，都变成用户能复用、能回忆、能说出口的表达资产。

`today -> scene -> chunks -> review` 是实现机制，不应替代这个用户结果导向。新增或调整 meta 文档时，优先检查叙述是否仍服务于“表达资产 -> 主动回忆/输出能力”。

## 当前目录

- [product-overview.md](/d:/WorkCode/AbandonClaw/docs/meta/product-overview.md)
  - 产品说明总览，适合对外或对内快速说明产品结构与价值
- [technical-overview.md](/d:/WorkCode/AbandonClaw/docs/meta/technical-overview.md)
  - 技术方案总览，适合快速说明技术栈、架构、优化点与治理现状
- [project-learning-guide.md](/d:/WorkCode/AbandonClaw/docs/meta/project-learning-guide.md)
  - 讲解主入口，适合第一次系统性理解项目
- [project-tree-map.md](/d:/WorkCode/AbandonClaw/docs/meta/project-tree-map.md)
  - 结构总览图，适合讲项目和做结构化展示
- [project-mindmap.md](/d:/WorkCode/AbandonClaw/docs/meta/project-mindmap.md)
  - Mermaid 思维导图版本，适合在支持脑图的工具里快速浏览
- [project-mindmap-outline.md](/d:/WorkCode/AbandonClaw/docs/meta/project-mindmap-outline.md)
  - 脑图工具导入用的大纲文本，不作为首选阅读入口

## 推荐使用方式

- 需要一份产品总览说明
  - 先看 `product-overview.md`
- 需要一份技术总览说明
  - 先看 `technical-overview.md`
- 第一次读项目
  - 先看 `project-learning-guide.md`
- 想快速讲清结构
  - 优先看 `project-tree-map.md`
- 想导入脑图工具或快速改画布
  - 使用 `project-mindmap.md` 或 `project-mindmap-outline.md`

## 维护原则

- `product-overview.md`
  - 作为产品定位、用户价值和闭环说明的总览文档
- `technical-overview.md`
  - 作为技术栈、架构与优化策略的总览文档
- `project-learning-guide.md`
  - 作为叙述式主入口，负责讲清项目主线和阅读路径
- `project-tree-map.md`
  - 作为结构展示主图，优先保持稳定
- `project-mindmap.md`
  - 作为树状图的可视化变体，允许表达形式不同，但不应出现相反语义
- `project-mindmap-outline.md`
  - 只服务于导入工具，不单独承载新增项目规则

如果同一信息已经在其它 `docs/` 分类里有正式落点，这里应引用或概括，不要重新发明规则定义。

## 建议正文模板

新增或重写 `meta` 文档时，优先按这组章节组织：

1. 文档目标
2. 适用场景
3. 主体内容
4. 推荐用法
5. 与其它文档的关系
