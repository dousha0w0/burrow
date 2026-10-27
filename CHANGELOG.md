# Changelog

## 0.1.3

- **修复「占比」把同一块空间算两次**：Mole 的整机概览会把 `~/Library`、各类缓存与 `Home` 并排列出。顶层项现在按去重后的顶层合计计算（合计 100%），嵌套项显示 `⊂ Home` 且不参与顶层占比，列表头标注「其中 N GB 嵌套于父级」；矩形分布图也只画顶层项。逻辑抽到 `src/lib/space-share.ts` 并配了基于真实引擎输出的测试。
- **修复 Homebrew 来源识别**：GUI 启动时继承 launchd 的最小 PATH，`brew` 不可见，导致「应用」页把 Homebrew 应用全部标成 `App`（截图里的「0 个来自 Homebrew」）。引擎子进程现在会补上 `/opt/homebrew/bin`、`/usr/local/bin` 等常见前缀。
- **修复「占用分布」矩形图空白**：`Treemap` 把尺寸绑成了 `w`/`h` 属性，而 SVG `rect` 只认 `width`/`height`，所以永远画成一块灰底。已修正，并加了组件测试断言每个 tile 的面积大于 0。
- **应用页卸载按钮显示文字**：图标按钮改为「卸载」，列头从「应用」改为「操作」；Bundle ID 过长时悬停可看全。

## 0.1.2

- **修复**：设置页「打开系统设置」按钮点了没反应。原因是 `open_privacy_settings` 没有注册进 Tauri 的 `generate_handler!`，webview 侧收到 `Command open_privacy_settings not found` 又被静默吞掉。
  - 命令已注册；失败现在会弹 Toast 并写入 `~/Library/Logs/Burrow/burrow.log`，不再无声。
  - 成功打开后提示路径：隐私与安全性 → 完整磁盘访问。
  - 深链失败时回退到直接打开系统设置本体。
  - 新增契约测试：`src/lib/bridge.ts` 里所有 `call("…")` 必须都能在 `generate_handler!` 中找到，防止同类遗漏。

## 0.1.1

- **自检**：设置页新增「引擎完整性」——入口脚本、运行库、`status-go` / `analyze-go`、版本探测、`--help` 启动自检；任一失败会在侧栏给出提示。
- **更新检查**：对比 [tw93/Mole](https://github.com/tw93/Mole) 与本项目的最新 GitHub Release。内置引擎随 Burrow 发版更新；系统安装可一键在终端执行 `mo update`；网络不可用时显式报错而不是假装最新。
- **权限与安装诊断**：完整磁盘访问状态（TCC 可读性探测 + 深链到系统设置）、应用是否位于「应用程序」、是否带隔离标记，并说明未授权时 Mole 的 partial 扫描行为。

## 0.1.0

首个版本：把 Mole 的能力装进一个 macOS 工作台。

- **概览**：`mo status --watch` 流式驱动；健康度、CPU / 内存 / 磁盘 / 网络指标卡与走势线、核心负载、电池与温度、网络与代理、进程前 8 名。
- **空间**：`mo analyze --json` 的整机概览与逐层下钻，矩形树图 + 可排序表格；`partial` 扫描状态显式标注。
- **清理**：系统垃圾与项目缓存（`clean` / `purge`）的预览、执行、停止；分类化预览、原始日志、会话内运行记录、确认弹窗；需要 sudo 的系统缓存按 Mole 的非交互路径跳过，并提供终端入口。
- **历史**：`mo history --json` 会话表、累计回收量、操作/删除日志定位。
- **应用**：`mo uninstall --list` 清单，搜索与来源标记；卸载交给终端中的 Mole 逐项确认。
- **外壳**：DriveDesk 设计语言（浅/深/跟随系统、三套配色、三种圆角、双布局、行密度、可拖拽侧栏、中英双语、⌘1–⌘6 / ⌘R / ⌘,）。
- **打包**：Mole 作为 git submodule 固定在 V1.64.0，`status-go` / `analyze-go` 在构建时编译并随 .app 一起分发；arm64 与 x86_64 各自构建 DMG。
