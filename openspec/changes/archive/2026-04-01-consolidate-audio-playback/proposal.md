## Why

当前项目的 TTS 播放底层能力已经集中在公共模块里，但页面级“点按播放、再次点按停止、循环播放、错误提示、当前激活态和 loading 态判断”仍分别散落在 `lesson`、`scene`、`chunks` 等入口。相同行为被多处手写，导致改一处容易漏一处，也让后续继续优化播放体验时缺少稳定的公共落点。

现在需要把这层页面编排逻辑收敛成统一的公共控制器，让各页面只保留自身的业务输入与 UI 绑定，减少重复分支，降低播放行为回退和维护成本。

## What Changes

- 新增一层公共的 TTS 播放编排能力，统一处理播放、停止、循环、激活态、loading 态和错误兜底。
- 约束页面级播放入口的职责边界：页面只传入业务 payload、文案和少量页面特化判断，不再重复拼装完整播放状态机。
- 收敛 `lesson`、`scene detail`、`chunks` 等入口的重复播放逻辑到统一公共层，并补充对应回归测试。
- 明确这次改动的非目标：不调整底层 TTS 生成接口、不重写 `speechSynthesis` fallback、不改变现有缓存和预热契约。

## Capabilities

### New Capabilities
- `audio-playback-orchestration`: 约束前端 TTS 播放控制器的公共职责、页面接入边界和一致性行为。

### Modified Capabilities
- `runtime-cache-coherence`: 明确统一播放编排层接入后，既有 TTS 预热与缓存 key 不得因页面重构而分裂出新的重复调度路径。

## Impact

- 受影响页面与模块：`src/features/lesson/components/lesson-reader.tsx`、`src/app/(app)/scene/[slug]/use-scene-detail-playback.ts`、`src/app/(app)/chunks/page.tsx`
- 受影响公共层：`src/lib/utils/tts-api.ts`、`src/hooks/use-tts-playback-state.ts`、新增公共播放 controller/hook
- 受影响测试：页面交互测试、播放 controller 纯逻辑测试、必要的回归测试
- 不涉及数据库 schema、Supabase 表结构或服务端 TTS 存储协议变更
