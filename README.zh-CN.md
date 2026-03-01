# ComfyUI Workflow State Presets

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE)

一个用于 **ComfyUI 工作流状态预设切换** 的插件。  
目标是在同一工作流中，通过 `int` 索引快速切换不同“套装（Preset）”，优先实现节点 **mode/bypass（启用/绕过/停用）** 状态切换，再逐步扩展到参数快照与连线切换。

## 🌐 语言切换

- [中文](./README.zh-CN.md)
- [English](./README.en.md)

## 项目状态

- 当前阶段：
  - **Phase 1 已实现**（预设记录/应用 + index 自动切换）
  - **Preset Group Editor 已新增**（分组三态：启用/绕过/停用）

## 功能特性

1. 新增节点：`Preset Switch`
   - 输入：`preset_index: INT`
   - 输出：`preset_index: INT`（透传）

2. 节点按钮（在 `Preset Switch` 上）
   - `Add Preset`：自动创建下一个可用索引的新预设并切换过去
   - `Record Current`：将当前工作流所有节点的 mode/bypass 状态记录到当前 index
   - `Delete Selected`：删除当前 index 对应预设
   - `Prev Preset` / `Next Preset`：在已有套装索引间循环切换并应用
   - `Preset Browser`：节点内嵌可视化 preset 列表，支持点击切换
   - `Rename Current`：通过字符串输入框重命名当前 preset

3. 自动切换
   - 当 `preset_index` 改变时，前端自动应用对应套装
   - 当 `preset_index` 输入被连接时，可从上游数字节点自动解析索引（支持 Reroute 链）

4. 持久化
   - 套装数据写入 `workflow.graph.extra.comfyui_workflow_state_presets`，随工作流保存
   - 预设快照按节点保存 `mode` 与 `bypass` 两类状态
   - 对于“未被该 preset 记录的新节点”，默认策略为**绕过（bypass）**，避免污染旧 preset 行为（可通过 `options.onUntrackedNode` 调整为 `preserve/enable/bypass`）

5. 新增节点：`Preset Group Editor`
   - 用于统一管理工作流 Group 内节点的三态切换：
     - 启用（`ALWAYS`）
     - 绕过（`BYPASS / mode=4`）
     - 停用（`NEVER`）
   - 保留并支持：颜色过滤、标题过滤、导航跳转、跨子图、排序、自定义字母序、启用限制（`default/max one/always one`）
   - 支持在分组名称区域双击重命名（调用 ComfyUI/LiteGraph 原生 prompt）
   - 支持批量按钮：`Enable All 全部启用` / `Bypass All 全部绕过` / `Muted All 全部停用`
   - 节点内置兼容输出 `OPT_CONNECTION`（已默认隐藏，不影响 UI 操作）

## 安装方式

1. 将本仓库克隆/复制到 ComfyUI 的 `custom_nodes` 目录：

   ```bash
   cd /path/to/ComfyUI/custom_nodes
   git clone <your-repo-url> comfyui_workflow_state_presets
   ```

2. 重启 ComfyUI。
3. 在节点列表中搜索并添加：`Preset Switch` / `Preset Group Editor`。

> Windows 用户示例目录：`ComfyUI\\custom_nodes\\comfyui_workflow_state_presets`

## 快速使用

1. 在工作流中添加 `Preset Switch` 节点。
2. 手动调整各节点启用/绕过/停用状态。
3. 将 `preset_index` 设为目标编号（如 0），点击 `Record Current`。
4. 继续设置另一套状态，改为 `preset_index=1`，再次 `Record Current`。
5. 运行时只需修改 `preset_index`，即可快速切换套装。

## 目录结构

```text
comfyui_workflow_state_presets/
├─ README.md
├─ README.zh-CN.md
├─ README.en.md
├─ LICENSE
├─ CHANGELOG.md
├─ __init__.py
├─ nodes.py
├─ docs/
│  ├─ 开发文档.md
│  └─ reference/
└─ web/
   ├─ preset_group_editor.js
   ├─ preset_switch.js
   └─ style.css
```

## 兼容性说明

- 依赖 ComfyUI 前端扩展机制（`/scripts/app.js`）。
- 建议使用较新的 ComfyUI 版本；如遇 API 变化，请在 issue 中附上版本信息。

## 已知限制

- 当前仅切换 mode/bypass，不包含参数快照与连线切换。
- 套装按 node id 恢复；若节点已删除会跳过并在控制台告警。
- 新增节点在旧 preset 中默认按“绕过”处理；如需兼容旧行为可将 `onUntrackedNode` 设为 `preserve`。
- 目前套装仅为工作流级存储（写入 workflow metadata），尚未提供全局共享预设库。

## 开源协议

本项目采用 **GNU General Public License v3.0**（GPL-3.0）。详见 [LICENSE](./LICENSE)。
