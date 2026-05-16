# 移动端样式使用约定

## 目标

- 保证 375px 左右小屏和 430px 左右大屏的视觉密度接近。
- 新页面优先复用公共变量，避免再次写回大量固定 `px`。
- 样式适配只收展示层，不改业务流程、状态机和接口链路。

## 变量使用

- 字号优先使用：
  - `--mobile-font-caption`
  - `--mobile-font-meta`
  - `--mobile-font-body-sm`
  - `--mobile-font-body`
  - `--mobile-font-title`
  - `--mobile-font-sheet-title`
  - `--mobile-font-sheet-body`
- 间距优先使用：
  - `--mobile-space-2xs`
  - `--mobile-space-xs`
  - `--mobile-space-sm`
  - `--mobile-space-md`
  - `--mobile-space-lg`
  - `--mobile-space-xl`
  - `--mobile-space-2xl`
  - `--mobile-space-sheet`
- 控件优先使用：
  - `--mobile-control-height`
  - `--mobile-button-height`
  - `--mobile-icon-button`
  - `--mobile-bubble-px`
  - `--mobile-bubble-py`
  - `--mobile-dialogue-width`
  - `--mobile-header-side`

## 何时不用固定 px

- 正文、标题、副标题不要直接写固定 `px`。
- 卡片 `padding`、列表 `gap`、弹窗 `header/body/footer` 间距不要直接写固定 `px`。
- 按钮高度、图标按钮尺寸、输入框内边距不要直接写固定 `px`。

## 何时可以保留固定 px

- 1px 边框、分隔线、阴影。
- 圆角、描边、视觉装饰尺寸。
- 特定图标或插画尺寸，且确认不会影响整体布局比例时。

## 推荐写法

```tsx
className="px-[var(--mobile-space-sheet)] py-[var(--mobile-space-xl)] text-[length:var(--mobile-font-body)]"
```

```tsx
className="h-[var(--mobile-control-height)] px-[var(--mobile-space-md)] text-[length:var(--mobile-font-body-sm)]"
```

## 弹框 / Sheet / 浮层约定

- `header`、`body`、`footer` 统一使用公共 spacing 变量。
- 标题优先用 `--mobile-font-sheet-title`。
- 正文优先用 `--mobile-font-sheet-body` 或 `--mobile-font-body`。
- 底部主按钮优先用 `--mobile-button-height`。
- 浮层里的二级卡片优先使用 `--mobile-space-xl` 或 `--mobile-space-sheet`。

## 页面排查顺序

1. 先看是否出现横向滚动。
2. 再看头部是否换行、按钮是否挤压。
3. 再看正文、卡片、弹层的字体和间距是否在小屏偏大。
4. 最后才处理装饰性尺寸。

## 测试约定

- 页面主链路样式调整后，至少回归对应交互测试。
- 弹层样式调整后，至少回归对应 sheet / panel / popup 测试。
- 如果样式改动依赖新的容器结构或文案布局，需要同步更新测试断言。
## 文本编码约定

- 所有源码文件统一按 UTF-8 保存。
- 仓库根目录的 `.editorconfig` 和 `.vscode/settings.json` 已固定默认编码为 UTF-8，新文件和常规保存都应遵循这套配置。
- 不要用不明确编码的编辑器批量改写文件，尤其是含中文和 emoji 的组件。
- 提交前运行 `pnpm run text:check-mojibake`，优先拦截 `馃`、`鐐瑰嚮`、`�` 这类高置信度乱码片段。
- 如果发现乱码，不要整库重转码，先定位具体文件和具体文案，再定点修复并回归测试。
