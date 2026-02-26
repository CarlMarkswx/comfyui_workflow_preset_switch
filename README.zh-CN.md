# comfyui_workflow_preset_switch

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE)

一个用于 **ComfyUI 组开关快速配置** 的插件。  
目标是在同一工作流中，通过 `int` 索引快速切换不同“组开关配置（Preset）”，以实现节点 **bypass（启用/忽略）** 状态的一键切换。

## 🌐 语言切换

- [中文](./README.zh-CN.md)
- [English](./README.en.md)

## 项目状态

- 当前版本：**组开关快速配置器已可用（bypass 套装记录/应用 + index 自动切换）**

## 功能特性

1. 新增节点：`WorkflowPresetSwitch`
   - 输入：`preset_index: INT`
   - 输出：`preset_index: INT`（透传）

2. 节点按钮（在 `WorkflowPresetSwitch` 上）
   - `Record Current`：将当前工作流所有节点的 bypass/mode 状态记录到当前 index
   - `Apply Current`：应用当前 index 的套装
   - `Prev Preset` / `Next Preset`：在已有套装索引间循环切换并应用

3. 自动切换
   - 当 `preset_index` 改变时，前端自动应用对应套装

4. 持久化
   - 套装数据写入 `workflow.graph.extra.comfyui_workflow_preset_switch`，随工作流保存

## 安装方式

1. 将本仓库克隆/复制到 ComfyUI 的 `custom_nodes` 目录：

   ```bash
   cd /path/to/ComfyUI/custom_nodes
   git clone <your-repo-url> comfyui_workflow_preset_switch
   ```

2. 重启 ComfyUI。
3. 在节点列表中搜索并添加：`Workflow Preset Switch`。

> Windows 用户示例目录：`ComfyUI\custom_nodes\comfyui_workflow_preset_switch`

## 快速使用

1. 在工作流中添加 `Workflow Preset Switch` 节点。
2. 手动调整各节点启用/忽略（bypass）状态。
3. 将 `preset_index` 设为目标编号（如 0），点击 `Record Current`。
4. 继续设置另一套状态，改为 `preset_index=1`，再次 `Record Current`。
5. 运行时只需修改 `preset_index`，即可快速切换套装。

## 目录结构

```text
comfyui_workflow_preset_switch/
├─ README.md
├─ README.zh-CN.md
├─ README.en.md
├─ LICENSE
├─ CHANGELOG.md
├─ __init__.py
├─ nodes.py
├─ docs/
│  ├─ 开发文档.md
│  └─ 需求简述.ini
└─ web/
   ├─ workflow_preset_switch.js
   └─ style.css
```

## 兼容性说明

- 依赖 ComfyUI 前端扩展机制（`/scripts/app.js`）。
- 建议使用较新的 ComfyUI 版本；如遇 API 变化，请在 issue 中附上版本信息。

## 已知限制

- 当前聚焦节点 bypass/mode 的组开关配置。
- 套装按 node id 恢复；若节点已删除会跳过并在控制台告警。

## 开源协议

本项目采用 **GNU General Public License v3.0**（GPL-3.0）。详见 [LICENSE](./LICENSE)。
