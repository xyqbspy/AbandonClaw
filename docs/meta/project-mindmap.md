# AbandonClaw 项目思维导图

下面这份是 Mermaid 思维导图文本。支持 Mermaid 的编辑器里可以直接渲染；如果你要做 PPT，也可以基于这份结构继续精简。

```mermaid
mindmap
  root((AbandonClaw))
    产品主线
      今日入口
        今日入口
        继续学习
        今日复习
        今日输出
      场景学习
        场景学习主线
        阅读语境
        提取表达片段
        保存表达
        生成练习
        生成变体
        表达地图
        学习进度同步
      表达资产库
        表达资产库
        搜索筛选
        详情视图
        智能补全
        相近表达与对照表达
        表达分组
        复习入口
    页面结构
      路由层
        Today 路由
          今日页入口
        Scene 路由
          场景详情入口
        Chunks 路由
          表达库入口
        Scenes 路由
          场景列表入口
      页面拆分规范
        页面只做编排
        派生逻辑独立
        动作判断独立
        数据构造独立
        展示组件独立
    场景学习重点
      入口
        服务端场景入口页
        客户端场景详情页
      核心能力
        数据加载
        交互动作
        路由状态
        学习同步
        播放控制
      视图模式
        场景阅读
        场景练习
        场景变体
        变体学习
        表达地图
      数据能力
        场景缓存
        关联预取
        已保存表达同步
      生成能力
        练习生成
        变体生成
        表达地图生成
      学习同步
        start
        progress
        complete
        pause
    表达资产重点
      页面角色
        表达工作台
        不只是列表页
      列表系统
        列表数据加载
        列表加载策略
        表达查询接口
        表达列表缓存
      路由状态
        搜索词
        复习状态
        内容类型
        表达分组
      详情系统
        聚焦详情
        关联表达
        智能候选
      结构化能力
        表达分组
        建立分组
        合并分组
        移动表达
        拆出表达
        设置主表达
      主动沉淀
        手动记录表达
        手动记录句子
        智能辅助
        生成相近表达
        补全学习信息
    今日入口重点
      页面定位
        聚合入口
        不是内容生产页
      数据来源
        学习看板
        场景列表
        复习摘要
        表达摘要
      页面派生逻辑
        继续学习卡片
        今日任务
        推荐场景
    服务层
      场景服务
        seed scenes
        list scenes
        get scene
        import scene
        delete imported scene
        warm tts
      学习服务
        start scene learning
        update progress
        complete scene
        pause scene
        continue learning
        today tasks
        overview
      表达片段服务
        track user chunks
        candidate chunks
      表达分组服务
        分组关系管理
    数据闭环
      Today 分发任务
      Scene 执行学习
      Chunks 沉淀资产
      Learning Service 聚合统计
      Today 再次编排入口
    数据与缓存
      场景缓存
      场景列表缓存
      表达列表缓存
      学习看板缓存
      先读缓存再刷新网络
    数据库演进
      鉴权与场景基础
      学习闭环基础
      用户表达片段
      复习闭环
      表达关系
      表达分组
```

## 适合做 PPT 的简化版主干

如果你想把思维导图压成 1 页 PPT，可以只保留这条主干：

1. `Today`：今日入口与任务编排
2. `Scene`：主学习流程与进度同步
3. `Chunks`：表达资产沉淀与结构化
4. `Service`：Scene / Learning / Cluster 三个后端核心服务
5. `Loop`：Today -> Scene -> Chunks -> Learning -> Today
