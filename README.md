# ComfyUI Workflow State Presets

ComfyUI workflow preset switching plugin.  
Use an `int` index (`preset_index`) to quickly switch between multiple presets in a single workflow.

## 🌐 Language / 语言

- [简体中文 README](./README.zh-CN.md)
- [English README](./README.en.md)

---

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE)

## ✨ About

`ComfyUI Workflow State Presets` is a custom node plugin for ComfyUI that helps you quickly toggle workflow states.

You can record the current node bypass/mode status as a preset, and switch between presets by changing a single integer value (`preset_index`). This is useful when one workflow needs multiple runtime configurations (different node activation combinations) without manually toggling nodes one by one.

---

## 🚀 Features (Current: Phase 1)

- Add node: `Preset Switch`
  - Input: `preset_index: INT`
  - Output: `preset_index: INT` (pass-through)
- Preset actions on node:
  - `Record Current`
  - `Apply Current`
  - `Prev Preset` / `Next Preset`
  - `Preset Browser` (visual list + click to switch)
  - `Rename Current`
- Auto-apply when `preset_index` changes
- Workflow-level persistence via:
  - `workflow.graph.extra.comfyui_workflow_state_presets`
- Add node: `Preset Group Editor`
  - Group tri-state control: Enable / Bypass / Disable
  - Supports filtering, sorting, navigation, and restriction strategies
  - Compatibility output `OPT_CONNECTION` is hidden by default

---

## 📦 Installation

1. Put this repo into your ComfyUI `custom_nodes` directory:

   ```bash
   cd /path/to/ComfyUI/custom_nodes
   git clone <your-repo-url> comfyui_workflow_state_presets
   ```

2. Restart ComfyUI.
3. Search and add nodes: `Preset Switch` / `Preset Group Editor`.

> Windows example: `ComfyUI\\custom_nodes\\comfyui_workflow_state_presets`

---

## 🧭 Quick Start

1. Add `Preset Switch` to your workflow.
2. Set node bypass/mode states as preset A.
3. Set `preset_index=0`, click `Record Current`.
4. Change node states as preset B.
5. Set `preset_index=1`, click `Record Current`.
6. Switch `preset_index` during runtime to toggle presets.

---

## 📁 Project Structure

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
│  └─ 需求简述.ini
└─ web/
   ├─ preset_switch.js
   ├─ preset_group_editor.js
   └─ style.css
```

---

## ⚠ Known Limitations

- Current version focuses on mode/bypass switching only.
- Parameter snapshots and link switching are planned for future phases.
- Presets restore by node id; missing nodes are skipped with warnings.

---

## 📚 Documentation

- 中文完整说明：[`README.zh-CN.md`](./README.zh-CN.md)
- Full English guide: [`README.en.md`](./README.en.md)
- Development notes: [`docs/开发文档.md`](./docs/开发文档.md)

---

## 📄 License

This project is licensed under **GNU General Public License v3.0 (GPL-3.0)**. See [LICENSE](./LICENSE).
