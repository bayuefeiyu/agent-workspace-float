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

## 通过 GitHub 安装

1. 将本目录作为一个独立 Git 仓库上传到 GitHub。
2. 打开 TauriTavern 的“扩展”管理界面。
3. 点击安装第三方扩展。
4. 输入仓库地址，例如：

```text
https://github.com/your-name/agent-workspace-float
```

5. 如需指定分支或 tag，在安装弹窗的分支/tag 输入框中填写，例如 `main`、`v0.1.0`。

上传前建议把 `manifest.json` 中的 `author` 和 `homePage` 改成你的 GitHub 信息。

## 仓库结构

```text
agent-workspace-float/
├─ manifest.json
├─ index.js
├─ style.css
├─ README.md
└─ .gitignore
```

TauriTavern 安装第三方扩展时会读取仓库根目录下的 `manifest.json`，所以不要把这些文件再套一层子目录。

## 本地开发安装

也可以把本目录复制到 TauriTavern 的第三方扩展目录：

```text
data/default-user/extensions/agent-workspace-float
data/extensions/third-party/agent-workspace-float
```

本地用户扩展优先级高于全局扩展。

## 当前实现说明

TauriTavern 当前对前端扩展公开了 `readWorkspaceFile()`，但没有公开 `listWorkspaceFiles()`。因此本扩展会从当前 run 的事件日志中提取文件路径，主要包括 `workspace.list_files`、`workspace.read_file`、`workspace.write_file`、`workspace.apply_patch` 和提交相关事件。

扩展不会添加兜底路径。未被事件发现的文件不会自动出现；如果需要固定查看某个文件，请在配置页添加自定义路径。
