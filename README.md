# Agent 工作区悬浮查看器

这是一个 TauriTavern 第三方扩展，用悬浮球和可拖拽面板查看当前或上一次 Agent run 的工作区文档。

## 功能

- Agent 模式开启时显示悬浮球，关闭时隐藏。
- 悬浮球和面板均可拖动，面板可拖拽右下角调整大小。
- 面板使用标签页结构，当前包含“工作区查看”和“配置”。
- 工作区查看页按目录分组展示文档，支持展开和收起。
- 支持查看 `output/`、`scratch/`、`plan/`、`summaries/`、`persist/` 下的文档。
- 配置页可勾选需要提取的工作区目录。
- 配置页可设置文档查看字号。
- 配置页可添加和移除自定义文件路径。
- 自定义路径会直接显示，不需要等待 Agent 事件捕获；属于五个工作区目录的路径会归入对应目录，否则归入“自定义路径”。
- run 结束后保留最后一次读取到的文档列表，直到下一次 run 开始时刷新。

## 安装

1. 打开 TauriTavern 的“扩展”管理界面。
2. 点击安装扩展。
3. 输入仓库地址。

## 当前实现说明

TauriTavern 当前对前端扩展公开了 `readWorkspaceFile()`，但没有公开 `listWorkspaceFiles()`。因此本扩展会从当前 run 的事件日志中提取文件路径，主要包括 `workspace.list_files`、`workspace.read_file`、`workspace.write_file`、`workspace.apply_patch` 和提交相关事件。

未被事件发现的文件不会自动出现；如果需要固定查看某个文件，请在配置页添加自定义路径。
