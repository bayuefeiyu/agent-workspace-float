# Agent 工作区悬浮查看器

这是一个 TauriTavern 第三方扩展，用悬浮球和可拖拽面板查看当前或上一次 Agent run 的工作区文档。

## 功能

- 扩展设置页提供本插件的展开菜单，可在其中开启或关闭悬浮球。
- 悬浮面板包含“工作区查看”“前置 Agent”“后置 Agent”和“配置”四个标签页。
- “前置 Agent”页可配置启动、前台/后台运行方式、Agent Profile 和输出文档映射。
- 启动前置 Agent 后，插件会在创建用户楼层前拦截消息，并自动运行所选 Agent Profile。
- 前置 Agent run 结束后，插件会将原用户消息与所有可读取的前置输出文件拼接，再通过 TauriTavern 的正常发送流程发出。
- 前置 Agent 运行期间会阻止重复发送，并可在状态区停止本次 run。
- “后置 Agent”页上方显示运行状态，下方可启用后置 Agent，并配置自动运行、前台/后台运行方式、Agent Profile 和输出文档映射。
- 双击悬浮球会使用所选 Agent Profile 启动当前聊天的后置 Agent 工作流。
- 开启“自动”后，TauriTavern 每次收到新的 AI 回复都会自动启动后置 Agent。
- 只有当前最新楼层是 AI 回复时才能启动后置 Agent；最新楼层是用户消息或系统消息时不会执行。
- 插件唤起的 Agent 结束前会锁定双击启动，避免重复创建工作流。
- “后置 Agent”页可跟踪子任务委派和 Agent 接力，并可停止插件唤起的 Agent。
- 悬浮球和面板均可拖动，面板可拖拽右下角调整大小。
- 工作区查看页按目录分组展示文档，支持展开和收起。
- 支持查看 `output/`、`scratch/`、`plan/`、`summaries/`、`persist/` 下的文档。
- 配置页可勾选需要提取的工作区目录。
- 配置页可设置文档查看字号。
- 配置页可添加和移除自定义文件路径。
- “后置 Agent”页可按 Profile ID 添加和移除输出文档路径映射。
- 插件唤起的 Profile 结束时，会读取其映射的输出文档并追加到当前聊天最新楼层末尾。
- 自定义路径会直接显示，不需要等待 Agent 事件捕获；属于五个工作区目录的路径会归入对应目录，否则归入“自定义路径”。
- run 结束后保留最后一次读取到的文档列表，直到下一次 run 开始时刷新。

## 安装

1. 打开 TauriTavern 的“扩展”管理界面。
2. 点击安装扩展。
3. 输入仓库地址。

## 当前实现说明

TauriTavern 当前对前端扩展公开了 `readWorkspaceFile()`，但没有公开 `listWorkspaceFiles()`。因此本扩展会从当前 run 的事件日志中提取文件路径，主要包括 `workspace.list_files`、`workspace.read_file`、`workspace.write_file`、`workspace.apply_patch` 和提交相关事件。

未被事件发现的文件不会自动出现；如果需要固定查看某个文件，请在配置页添加自定义路径。
