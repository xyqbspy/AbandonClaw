# AI 智能体 Token 效率手册

本文件**仅针对 AI 智能体**（Claude Code、Codex、其它 Agent）在本仓库执行任务时的 token 节省。不是给人看的代码规则。

每次启动新会话或拿到新任务时，**第一时间应当读完本文**，并按其中的约束执行。`AGENTS.md` §1.5 已把"先读本文"列入修改前必做。

读不读这份文档，往往是同一任务用 30k vs 100k token 的差别。下面所有条目都是从真实任务复盘中提炼的高 ROI 项。

## 0. 思维方式：每一次工具调用都在花钱

把每个 `Read` / `Bash` / `Edit` / `AskUserQuestion` 都当成会**永久占据上下文**的开销。一旦读进来：

- 模型每后续 token 都要带着它推理一次。
- 它会推动**自动压缩**提前触发，让原本应保留的关键上下文被截断。
- 平均每 1 KB 文本 ≈ 250-400 token。一个 2000 行 `.tsx` 文件 ≈ 20-30k token，相当于整轮对话窗口的 3-5%。

**默认假设**：能不读就不读，能不输出就不输出，能并行就不串行。

## 1. 强制约束（违反成本最高 / 5 条最高 ROI）

这 5 条违反任意一条，就可能让单任务多花 2-5 倍 token。**这 5 条与 AGENTS.md 同级，违反需要在最终答复里明确说明原因**。

### 1.1 用专用工具，不要用 Bash 重做

| ✗ 浪费 | ✓ 推荐 | 节省 |
|---|---|---|
| `Bash cat file.ts` | `Read file_path=…` | 50-80% |
| `Bash grep -rn "X" src/` | `Grep pattern="X" path="src/"` | 60-90%（head_limit 默认 250 行） |
| `Bash find src -name '*.tsx'` | `Glob pattern="src/**/*.tsx"` | 50% |
| `Bash sed -i 's/A/B/'` | `Edit ... replace_all=true` | 70% + 安全 |
| `Bash echo "done"` | 直接输出文本 | 100% |

**例外**：`git status` / `git diff` / `git log` / `pnpm run …` / `npx tsc` 这类必须走 Bash 的命令保持不变。

### 1.2 并行无依赖的工具调用

**反模式**：连续 3 条 message，每条 1 个 Bash。
**推荐**：1 条 message，3 个并行 Bash。

```
# ✗ 串行（3 个 round trip）
git status
→ wait
git diff
→ wait
git log --oneline -5

# ✓ 并行（1 个 round trip）
[git status, git diff, git log --oneline -5] 同一 message
```

判定方式：**B 的执行 / 参数是否依赖 A 的输出？** 不依赖就并行。

`git status` / `git diff` / `git log` 三者无依赖 → 并行
`Read A.ts` / `Read B.ts` / `Read C.ts` 无依赖 → 并行
`lint` / `tsc --noEmit` / `mojibake` 无依赖 → 并行
但 `npm install` / `npm test` 通常串行（test 依赖 install）

### 1.3 任务分流定方向再动手

读 `AGENTS.md` §2 决定 Fast Track / Cleanup / Spec-Driven，再决定要读什么。

- Fast Track 改一个 className → 读 1 个文件 + 跑 1 个测试。不读 spec、不写 dev-log。
- Cleanup → 读删除对象 + 引用方 + 影响范围。
- Spec-Driven → 才读 stable spec 全文 / 写 proposal / 走 archive。

把 Fast Track 当 Spec-Driven 做，一个改 className 的任务能花掉 20k token 在无关读文件上。

### 1.4 不复述用户已知内容

**反模式**：
- "好的，我会先 X 然后 Y 再 Z" → 用户不需要预告，直接做
- "现在我已经完成了 X，结果是 …" + 大段 paste 之前发过的代码
- "✅ ✅ ✅ 全部完成！本次改动包含 …" + 重复 commit message 全文

**推荐**：
- 开始前一句话说要做什么（"先看现状再列差异"）
- 工具调用过程中不解说
- 结束时一句话说结果（"提交完成 commit X，N/N 测试通过"）

### 1.5 默认不写 emoji / 不做装饰

emoji、表情、分隔线（`━━━━━━━━`）、box drawing、ASCII art 在中文环境每字符 2-4 token，纯装饰无信息量。

只在用户明确要求或对比图表时使用。

## 2. 读文件：从大到小，从结构到内容

### 2.1 黄金顺序

1. **Glob**：找到候选文件路径（不读内容）
2. **Grep**：在候选范围内定位 symbol/字符串行号
3. **Read offset+limit**：只读真正需要的 10-80 行

直接 `Read` 一个 2000+ 行的大文件全文几乎总是浪费。

### 2.2 不要重复读

如果一个文件本轮已经 Read 过：
- 后续引用直接用 `file_path:line_number`，不重新 Read
- 用户问"X 在哪定义" → 直接报路径，不重新读全文

判断方式：在心里记一个"已读文件清单"。

### 2.3 大文件用 offset+limit 而不是 head/tail

```
✗ Bash "head -100 big.ts"     ← 200-line file 仍读全文
✓ Read file="big.ts" limit=100 ← 只读 100 行，自带行号
```

### 2.4 避免读这些类型的文件

| 文件类型 | 为什么 | 替代 |
|---|---|---|
| `pnpm-lock.yaml` | 几万行噪音 | 不读，必要时 `cat | head -50` |
| `*.test fixture` 大 JSON | 占 context 无价值 | Grep 关键字定位 |
| `node_modules/**` | 几乎从不需要 | 默认忽略 |
| `dist/` `.next/` 编译产物 | 不该看 | 默认忽略 |
| `*.svg` `*.png` `*.mp3` 资产 | 无文本含义 | 默认忽略 |
| 历史 archive 的 `proposal.md` | 历史快照 | 只在做相同 capability 时参考 |

## 3. 搜索：Grep / Glob / subagent 三选一

### 3.1 一击命中：Grep

知道关键字、想找定义 / 用法 → **Grep**。

- 默认 `output_mode=files_with_matches`，不要 `content`（除非真要看上下文）
- 用 `-n` 加行号
- 用 `glob` / `type` 过滤而非搜整库
- `head_limit` 默认 250 够用，不要刻意改大

### 3.2 不知道在哪：subagent

跨多文件、跨多目录、需要多轮探索 → **Agent(Explore)**。

- 给 subagent 明确边界："只读，不改"
- 让 subagent 返回 ≤ 200 字摘要 + file_path:line
- 不要在主对话里硬搜（一轮 Grep 不到就停，换 Agent）

### 3.3 反模式

```
# ✗ 主对话连发 5 个 Grep 都没找到，第 6 个改换关键字
# ✓ 第 2 个 Grep 不行就停，开 Agent 一次性找完
```

## 4. 工具调用：批量 / 并行 / 一气呵成

### 4.1 一次 message 多个工具调用

只要工具之间无依赖，**永远**塞进同一 message：

- 多文件 Read（独立的）
- 多个 Edit（不同文件）
- `git status` + `git diff` + `git log`
- `lint` + `tsc` + `mojibake`

### 4.2 不要"打一枪看一眼"

```
# ✗
Bash "ls src/app/"
→ "ls src/app/(app)/"
→ "ls src/app/(app)/chunks/"

# ✓
Glob "src/app/**" head_limit=50
```

### 4.3 验证类命令批量跑

写代码阶段先**全部改完**，最后一次跑：

```
# 1 message:
[pnpm run lint, npx tsc --noEmit, pnpm run text:check-mojibake, node --test ...]
```

而不是改一个文件跑一遍 lint。

## 5. 编辑：精准 / 复用 / 不重写

### 5.1 Edit > Write

- 修改已有文件：**Edit**（只发 diff）
- 创建新文件 / 整体重写：才用 **Write**
- Write 一个 2000 行文件 ≈ 烧掉 20-30k token

### 5.2 用 replace_all 一次性 rename

```
# ✗ 同一 symbol 改 10 处，10 次 Edit
# ✓ Edit ... replace_all=true 一次搞定
```

### 5.3 多处 Edit 一次 message 发完

```
# ✗
Edit A
→ Edit B
→ Edit C

# ✓ 同一 message 发 [Edit A, Edit B, Edit C]
```

### 5.4 不要为了"看是否编辑成功"再 Read

Edit 失败会直接报错。`harness` 已经跟踪文件状态。Read 一遍只为确认 = 浪费。

## 6. 输出：短 / 准 / 不装饰

### 6.1 不要前言后语

```
✗ "好的，我现在将按照您的要求，先 X 然后 Y 再 Z。让我们开始吧！"
✓ 直接动手
```

### 6.2 不要 echo 代码

```
✗ "我已经实现了如下代码：[paste 整段]"
✓ "已在 src/foo.ts:123 加 handleX，行为同 handleY"
```

### 6.3 file_path:line_number 是最省 token 的引用方式

```
✗ "请看这段代码：function handleX() { ... 30 行 ... }"
✓ "见 src/foo.ts:123-153，逻辑是 …"
```

### 6.4 最终答复 ≤ 3-5 句话

完成一个任务后，结尾说清：
- 改了什么
- 验证结果（N/N 测试通过 / lint OK）
- 是否要继续下一步

不要再次列改动文件清单（commit log 已经有）。

### 6.5 中间过程的"进度更新"≤ 1 句

```
✗ "§1 完成 ✓ 3/3 测试通过。下面开始 §2，我会先建文件然后……"
✓ "§1 通过。继续 §2。"
```

## 7. 验证：批量 / 对齐 / 不重复

### 7.1 改完批量验证，而不是每改一行就跑

一个 OpenSpec change 7 个子任务：
- ✗ 每个子任务结束跑一次 lint + tsc + test = 21 次跑
- ✓ 全部子任务实施完一次跑 lint + tsc + test = 1 次跑

例外：page.interaction.test 这种"快速 smoke"可以中间跑（每次 ~2s），主要为防止累积错误。

### 7.2 测试范围对齐改动

- 改 chunks → 跑 chunks 全套
- 改 today-page-client → 跑 today + 受影响的 hook test
- ✗ 改 chunks 跑 `pnpm test`（30 分钟全套）

### 7.3 不要重复跑同一检查

mojibake check 只在改文档/字符串后跑一次。改代码后不跑。
spec validate 只在改 spec 文件后跑。改实现代码后不跑。

## 8. 任务追踪：颗粒度对齐价值

### 8.1 不要为小任务开 TaskCreate

3 步以下的简单任务直接做，不开 task。

`TaskCreate` 本身 + 后续 `TaskUpdate` 每次都耗 token。开了又不更新更糟（系统会反复提醒）。

### 8.2 不要每个微小动作 TaskUpdate

把多个相关动作合并成一个 task，做完一次性 update。

### 8.3 AskUserQuestion 不要 4 个选项凑数

- 真正需要决策 → 2-3 个不同方向的选项
- 没歧义的事情 → 不问，直接做
- 不要为了"显得严谨"硬凑选项

## 9. Spec-Driven 收尾：阶段批量

按 `openspec-workflow.md`：

- propose：proposal + tasks + spec delta 一次写完一次提交
- implement：所有子任务做完一次性验证
- archive：archive + doc 同步一次 commit

不要边 propose 边 commit、边写 hook 边 commit、边写 doc 边 commit。每次 commit 都触发审视、记忆、上下文重置。

## 10. subagent 使用

### 10.1 适合 subagent 的场景

- 大范围探索（Explore）
- 跨多文件的独立任务（多个 Agent 并行）
- 中间报告（要求 ≤ 200 字）
- 隔离上下文（让大 Read 不污染主对话）

### 10.2 不适合 subagent 的场景

- 单点查找（直接 Grep）
- 已知文件的局部修改（直接 Edit）
- 用户在场的交互动作（subagent 看不到用户后续输入）

### 10.3 多个 subagent 并行

如果需要 3 个独立的研究任务，**同一 message 开 3 个 Agent**，不要串行。

## 11. 其它高 ROI 小技巧

### 11.1 `git log --oneline -N` 而非 `git log -N`

带完整 commit body 的 log 是带 oneline 的 5-10 倍 token。

### 11.2 `Read` 时优先看文件末尾的 export

定位"这个文件对外提供什么"，往往看 export 比看实现更省。先 `Grep "^export"`。

### 11.3 大段错误日志只 tail 最后 30 行

```
# ✗
Bash "pnpm run test"  ← 几百行 stdout
# ✓
Bash "pnpm run test 2>&1 | tail -20"
```

但**首次跑**还是要看全的 — 之后失败重跑用 `tail`。

### 11.4 不要重复读 docs/README.md / AGENTS.md

这些会自动出现在 system prompt 或前置 context 中。再次 Read 是纯浪费。

### 11.5 ScheduleWakeup / Cron 默认不用

只在用户明确要"5 分钟后回来看 deploy"才用。不要主动开 timer 来"以防万一"。

## 12. 反模式速查表

| 反模式 | 替代 |
|---|---|
| 串行 3 个 Bash | 同 message 并行 |
| Bash cat / head / grep | Read / Grep |
| Read 2000 行大文件 | offset+limit 局部 |
| 改一行跑全套 test | 改完批量跑相关 test |
| 4 个 AskUserQuestion 选项 | 真正有差别的 2-3 个 |
| TaskCreate 3 个 1 步任务 | 直接做 |
| Write 修改已有文件 | Edit |
| "我将先 X 然后 Y" 前言 | 直接做 |
| paste 整段代码到答复 | file_path:line 引用 |
| emoji / box drawing 装饰 | 纯文本 |
| 每子任务 commit | 阶段批量 commit |
| 主对话硬搜 | subagent |
| `git log -100` | `git log --oneline -N` |

## 13. 自我反思触发器

每完成一个大型任务（≥ 5 个工具调用）后，问自己：

- 这次用了多少 token？（看 system prompt 报的 context window 占用）
- 哪些 Read / Grep 现在回头看是不必要的？
- 哪些 Bash 应该并行而我串行了？
- 哪些用户已经知道的事我又复述了？

下次同类任务直接避免这些浪费。

## 14. 例外与权衡

不是所有节省都值得：

- 用户明确要"完整解释" → 该长就长，不要为省 token 模糊
- 主链路修改（auth / payment / 数据回写）→ 该读的 spec / domain-rules 必须读全，不要为省 token 漏掉关键约束
- 第一次接触陌生 feature → 应该读 docs/README.md → feature-flow → spec 至少 3 层，不要直接动手
- 用户复杂多轮决策中 → 不要为省 token 一次问 4 题（会让用户混乱）

**省 token 的目标是让真正重要的任务有足够上下文，而不是把每个任务都做得过于简略**。

## 15. 引用

- `AGENTS.md` §1 修改前必做
- `docs/README.md` 文档分层与高频入口
- `docs/dev/README.md` 开发维护入口
- `openspec/specs/project-maintenance/spec.md` 长期维护契约
