# Changelog

All notable changes to this project will be documented in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] - 2026-02-26

### Added
- Initial release of `WorkflowPresetSwitch` node.
- Phase 1 preset workflow:
  - Record current node bypass/mode states into indexed presets.
  - Apply preset by `preset_index`.
  - `Prev Preset` / `Next Preset` cycling.
  - Auto-apply when `preset_index` changes.
- Preset persistence in workflow metadata:
  - `workflow.graph.extra.comfyui_workflow_preset_switch`
- Bilingual documentation setup:
  - `README.zh-CN.md`
  - `README.en.md`
  - Root `README.md` as language switch entry.
- Repository publication essentials:
  - `LICENSE` (GPL-3.0)
  - `.gitignore`
