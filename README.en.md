# ComfyUI Workflow State Presets

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE)

A plugin for **fast workflow switching in ComfyUI**.  
The goal is to quickly switch between different workflow presets in a single workflow using an `int` index. It prioritizes node **mode/bypass (enable/bypass/disable)** state switching first, and can be gradually extended to parameter snapshots and link switching.

## 🌐 Language

- [中文](./README.zh-CN.md)
- [English](./README.en.md)

## Project Status

- Current stage:
  - **Phase 1 implemented** (record/apply presets + auto-apply by index)
  - **Preset Group Editor added** (group tri-state: Enable / Bypass / Disable)

## Features

1. New node: `Preset Switch`
   - Input: `preset_index: INT`
   - Output: `preset_index: INT` (pass-through)

2. Node buttons (on `Preset Switch`)
   - `Add Preset`: Create a new preset with next available index and switch to it
   - `Record Current`: Record all nodes’ mode/bypass state to current index
   - `Delete Selected`: Delete preset at current index
   - `Prev Preset` / `Next Preset`: Cycle through recorded preset indexes and apply
   - `Preset Browser`: Embedded visual preset list panel with click-to-switch
   - `Rename Current`: Rename current preset via string widget

3. Auto switching
   - Preset is automatically applied when `preset_index` changes
   - If `preset_index` input is linked, value is resolved from upstream numeric nodes (supports reroute chains)

4. Persistence
   - Presets are stored in `workflow.graph.extra.comfyui_workflow_state_presets` and saved with the workflow
   - Snapshot data stores both `mode` and `bypass` per node
   - For newly added nodes that were not recorded in a preset, the default policy is **bypass** to avoid changing old preset behavior unexpectedly (configurable via `options.onUntrackedNode` with `preserve/enable/bypass`)

5. New node: `Preset Group Editor`
   - Manage Group node states in tri-state mode:
     - Enable (`ALWAYS`)
     - Bypass (`BYPASS / mode=4`)
     - Disable (`NEVER`)
   - Supports color filter, title filter, navigation jump, cross-subgraph scan, sorting, custom alphabet sorting, and enable restriction (`default/max one/always one`)
   - Supports double-click rename on group title area and native ComfyUI prompt dialog
   - Supports batch actions: `Enable All` / `Bypass All` / `Muted All`
   - Built-in compatibility output `OPT_CONNECTION` is hidden by default (non-intrusive for UI)

## Installation

1. Clone/copy this repository into ComfyUI `custom_nodes` directory:

   ```bash
   cd /path/to/ComfyUI/custom_nodes
   git clone <your-repo-url> comfyui_workflow_state_presets
   ```

2. Restart ComfyUI.
3. Search and add nodes: `Preset Switch` / `Preset Group Editor`.

> Windows example: `ComfyUI\\custom_nodes\\comfyui_workflow_state_presets`

## Quick Start

1. Add `Preset Switch` node to your workflow.
2. Manually set workflow nodes to Enable/Bypass/Disable states.
3. Set `preset_index` (e.g. `0`) and click `Record Current`.
4. Change node states for another setup, set `preset_index=1`, click `Record Current` again.
5. During runtime, change `preset_index` to switch presets quickly.

## Repository Structure

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
   ├─ preset_switch.js
   ├─ preset_group_editor.js
   └─ style.css
```

## Compatibility

- Depends on ComfyUI frontend extension API (`/scripts/app.js`).
- A recent ComfyUI version is recommended. If API changes break compatibility, please include your ComfyUI version in issues.

## Known Limitations

- Current version only switches mode/bypass.
- Presets are restored by node id; missing nodes are skipped with console warnings.
- New nodes in old presets are now handled as bypass by default; set `onUntrackedNode` to `preserve` if you need legacy behavior.
- Presets are workflow-scoped (saved in workflow metadata), no global shared preset library yet.

## License

Licensed under **GNU General Public License v3.0** (GPL-3.0). See [LICENSE](./LICENSE).
