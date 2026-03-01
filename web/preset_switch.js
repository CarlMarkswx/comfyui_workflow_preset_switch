import { app } from "/scripts/app.js";

/**
 * Phase 1: bypass 套装记录/应用 + index 自动切换
 */

const EXTENSION_NAME = "comfyui.preset_switch";
const TARGET_NODE_NAME = "PresetSwitch";
const STORE_KEY = "comfyui_workflow_state_presets";
const STORE_VERSION = 1;

function getGraph() {
  return app?.graph ?? null;
}

function ensureStore() {
  const graph = getGraph();
  if (!graph) return null;

  graph.extra = graph.extra || {};
  graph.extra[STORE_KEY] = graph.extra[STORE_KEY] || {
    version: STORE_VERSION,
    presets: {},
    options: {
      onMissingNode: "skip",
      indexOutOfRange: "warn",
    },
  };

  return graph.extra[STORE_KEY];
}

function normalizeIndex(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function asFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function readNumericWidgetValue(node, names = []) {
  if (!node?.widgets?.length) return null;

  for (const name of names) {
    const widget = node.widgets.find((w) => w?.name === name);
    if (!widget) continue;
    const n = asFiniteNumber(widget.value);
    if (n !== null) return n;
  }

  for (const widget of node.widgets) {
    const n = asFiniteNumber(widget?.value);
    if (n !== null) return n;
  }

  return null;
}

function resolvePresetIndexFromLink(node) {
  const graph = getGraph();
  if (!graph) return null;

  const presetInput = node?.inputs?.find((i) => i?.name === "preset_index");
  if (!presetInput || presetInput.link == null) return null;

  const visitedLinks = new Set();
  const visitedNodes = new Set();

  function resolveFromLink(linkId) {
    if (linkId == null || visitedLinks.has(linkId)) return null;
    visitedLinks.add(linkId);

    const link = graph.links?.[linkId];
    if (!link) return null;

    const sourceNode = graph.getNodeById?.(link.origin_id);
    if (!sourceNode || visitedNodes.has(sourceNode.id)) return null;
    visitedNodes.add(sourceNode.id);

    // 穿透 Reroute，继续向上游查找
    if (sourceNode.type === "Reroute") {
      const inputLink = sourceNode.inputs?.[0]?.link;
      return resolveFromLink(inputLink);
    }

    const fromNamedWidget = readNumericWidgetValue(sourceNode, [
      "preset_index",
      "value",
      "index",
    ]);
    if (fromNamedWidget !== null) return fromNamedWidget;

    if (Array.isArray(sourceNode.widgets_values)) {
      for (const value of sourceNode.widgets_values) {
        const n = asFiniteNumber(value);
        if (n !== null) return n;
      }
    }

    return null;
  }

  return resolveFromLink(presetInput.link);
}

function getPresetIndexFromNode(node) {
  const linkedValue = resolvePresetIndexFromLink(node);
  if (linkedValue !== null) return normalizeIndex(linkedValue);

  const widget = node?.widgets?.find((w) => w?.name === "preset_index");
  if (!widget) return 0;
  return normalizeIndex(widget.value);
}

function getAllNodes() {
  const graph = getGraph();
  return graph?._nodes || [];
}

function captureNodeBypassState(node) {
  return {
    mode: typeof node.mode === "number" ? node.mode : null,
    bypass: typeof node.bypass === "boolean" ? node.bypass : null,
  };
}

function defaultPresetName(index) {
  return `Preset ${normalizeIndex(index)} 预设`;
}

function isDefaultPresetName(name, index) {
  return String(name ?? "") === defaultPresetName(index);
}

function clonePresetForIndex(preset, oldIndex, newIndex) {
  const nextPreset = { ...(preset || {}) };
  if (isDefaultPresetName(nextPreset.name, oldIndex)) {
    nextPreset.name = defaultPresetName(newIndex);
  }
  return nextPreset;
}

function getPresetName(index) {
  const store = ensureStore();
  if (!store) return defaultPresetName(index);
  const idx = String(normalizeIndex(index));
  return store.presets?.[idx]?.name || defaultPresetName(idx);
}

function setPresetName(index, name) {
  const store = ensureStore();
  if (!store) return false;

  const idx = String(normalizeIndex(index));
  const preset = store.presets?.[idx];
  if (!preset) return false;

  const normalized = String(name ?? "").trim() || defaultPresetName(idx);
  if (preset.name === normalized) return true;

  preset.name = normalized;
  preset.updated_at = Date.now();
  app.graph?.setDirtyCanvas(true, true);
  return true;
}

function promptRenamePreset(node, targetIndex = null, triggerEvent = null) {
  const idx = targetIndex == null ? getPresetIndexFromNode(node) : normalizeIndex(targetIndex);
  const indexes = listPresetIndexes();
  if (!indexes.includes(idx)) {
    console.warn(`[${EXTENSION_NAME}] preset #${idx} not found, cannot rename`);
    return false;
  }

  const currentName = getPresetName(idx);
  const canvas = app.canvas;
  if (typeof canvas?.prompt !== "function") {
    console.warn(`[${EXTENSION_NAME}] canvas.prompt unavailable, rename aborted`);
    return false;
  }

  canvas.prompt("Rename Preset 重命名预设", currentName, (value) => {
    const ok = setPresetName(idx, value);
    if (!ok) return;
    refreshPresetWidgets(node);
  }, triggerEvent);

  return true;
}

function buildPresetDisplayLabel(index, isCurrent = false) {
  const name = getPresetName(index);
  const prefix = isCurrent ? "▶ " : "";
  return `${prefix}${normalizeIndex(index)}.${name}`;
}

function isPresetInputLinked(node) {
  const presetInput = node?.inputs?.find((i) => i?.name === "preset_index");
  return !!presetInput && presetInput.link != null;
}

function recordPreset(index) {
  const store = ensureStore();
  if (!store) return false;

  const idx = String(normalizeIndex(index));
  const existing = store.presets[idx];
  const snapshot = {
    name: existing?.name || defaultPresetName(idx),
    nodes: {},
    updated_at: Date.now(),
  };

  for (const node of getAllNodes()) {
    if (!node || typeof node.id === "undefined") continue;
    snapshot.nodes[String(node.id)] = captureNodeBypassState(node);
  }

  store.presets[idx] = snapshot;
  app.graph?.setDirtyCanvas(true, true);
  console.log(`[${EXTENSION_NAME}] recorded preset #${idx}`, snapshot);
  return true;
}

function applyStateToNode(node, state) {
  if (!node || !state) return;

  if (typeof state.mode === "number") {
    node.mode = state.mode;
  }

  if (typeof state.bypass === "boolean") {
    node.bypass = state.bypass;
  }

  if (typeof node.setDirtyCanvas === "function") {
    node.setDirtyCanvas(true, true);
  }
}

function applyPreset(index) {
  const store = ensureStore();
  if (!store) return false;

  const idx = String(normalizeIndex(index));
  const preset = store.presets?.[idx];

  if (!preset) {
    if (store.options?.indexOutOfRange === "warn") {
      console.warn(`[${EXTENSION_NAME}] preset #${idx} not found`);
    }
    return false;
  }

  let missingCount = 0;
  for (const [nodeId, state] of Object.entries(preset.nodes || {})) {
    const node = app.graph?.getNodeById?.(Number(nodeId));
    if (!node) {
      missingCount += 1;
      continue;
    }
    applyStateToNode(node, state);
  }

  if (missingCount > 0 && store.options?.onMissingNode === "skip") {
    console.warn(`[${EXTENSION_NAME}] preset #${idx} skipped ${missingCount} missing node(s)`);
  }

  app.graph?.setDirtyCanvas(true, true);
  console.log(`[${EXTENSION_NAME}] applied preset #${idx}`);
  return true;
}

function listPresetIndexes() {
  const store = ensureStore();
  if (!store) return [];
  return Object.keys(store.presets || {})
    .map((k) => Number(k))
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);
}

function deletePreset(index) {
  const store = ensureStore();
  if (!store) return false;

  const removeIdx = normalizeIndex(index);
  const removeKey = String(removeIdx);
  if (!store.presets?.[removeKey]) return false;

  const nextPresets = {};
  const indexes = Object.keys(store.presets || {})
    .map((k) => Number(k))
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);

  for (const oldIdx of indexes) {
    if (oldIdx === removeIdx) continue;

    const oldKey = String(oldIdx);
    const preset = store.presets[oldKey];
    const newIdx = oldIdx > removeIdx ? oldIdx - 1 : oldIdx;
    const nextPreset = clonePresetForIndex(preset, oldIdx, newIdx);

    nextPresets[String(newIdx)] = nextPreset;
  }

  store.presets = nextPresets;
  app.graph?.setDirtyCanvas(true, true);
  console.log(`[${EXTENSION_NAME}] deleted preset #${removeIdx} and reindexed presets`);
  return true;
}

function movePresetIndex(fromIndex, toIndex) {
  const store = ensureStore();
  if (!store) return false;

  const fromIdx = normalizeIndex(fromIndex);
  const toIdx = normalizeIndex(toIndex);
  const fromKey = String(fromIdx);

  if (!store.presets?.[fromKey]) return false;
  if (fromIdx === toIdx) return true;

  const movingPreset = store.presets[fromKey];
  const nextPresets = {};
  const indexes = listPresetIndexes();

  if (!indexes.length) return false;

  const maxIdx = indexes[indexes.length - 1];
  const boundedTo = Math.min(toIdx, maxIdx);

  for (const oldIdx of indexes) {
    if (oldIdx === fromIdx) continue;

    let newIdx = oldIdx;
    if (fromIdx < boundedTo && oldIdx > fromIdx && oldIdx <= boundedTo) {
      newIdx = oldIdx - 1;
    } else if (fromIdx > boundedTo && oldIdx >= boundedTo && oldIdx < fromIdx) {
      newIdx = oldIdx + 1;
    }

    const preset = store.presets[String(oldIdx)];
    nextPresets[String(newIdx)] = clonePresetForIndex(preset, oldIdx, newIdx);
  }

  nextPresets[String(boundedTo)] = clonePresetForIndex(movingPreset, fromIdx, boundedTo);
  store.presets = nextPresets;

  app.graph?.setDirtyCanvas(true, true);
  console.log(`[${EXTENSION_NAME}] moved preset #${fromIdx} to #${boundedTo}`);
  return true;
}

function nextPresetIndex(current) {
  const indexes = listPresetIndexes();
  if (!indexes.length) return normalizeIndex(current);
  const curr = normalizeIndex(current);
  for (const i of indexes) {
    if (i > curr) return i;
  }
  return indexes[0];
}

function prevPresetIndex(current) {
  const indexes = listPresetIndexes();
  if (!indexes.length) return normalizeIndex(current);
  const curr = normalizeIndex(current);
  for (let i = indexes.length - 1; i >= 0; i -= 1) {
    if (indexes[i] < curr) return indexes[i];
  }
  return indexes[indexes.length - 1];
}

function nextAvailablePresetIndex() {
  const indexes = listPresetIndexes();
  if (!indexes.length) return 0;
  return Math.max(...indexes) + 1;
}

function setIndexWidgetValue(node, value) {
  const widget = node?.widgets?.find((w) => w?.name === "preset_index");
  if (!widget) return;
  widget.value = normalizeIndex(value);
}

function clearDynamicPresetWidgets(node) {
  if (!Array.isArray(node?.widgets)) return;
  node.widgets = node.widgets.filter((w) => !w?.__wpsDynamicPresetItem);
}

function buildPresetPanelSignature(current, indexes) {
  const rows = indexes.map((idx) => `${idx}:${getPresetName(idx)}`).join("|");
  return `${current}::${rows}`;
}

function buildPresetPanelRows(current, indexes) {
  const rows = [];

  if (!indexes.length) {
    rows.push({ label: "No Recorded Presets 暂无已记录状态", clickable: false, selected: false });
    return rows;
  }

  for (const idx of indexes) {
    const selected = idx === current;
    rows.push({
      label: `${idx}.${getPresetName(idx)}`,
      clickable: true,
      selected,
      index: idx,
    });
  }
  return rows;
}

function ensurePresetPanelWidget(node) {
  if (node.__wpsPresetPanelWidget) return;

  const PANEL_ROW_HEIGHT = 22;
  const PANEL_PADDING = 8;

  node.__wpsPresetPanelWidget = node.addCustomWidget({
    type: "wps_preset_panel",
    name: "Preset Browser 预设浏览器",
    options: { serialize: false },
    computeSize(width) {
      const rows = node.__wpsPanelRows?.length || 3;
      return [Math.max(180, width - 20), rows * PANEL_ROW_HEIGHT + PANEL_PADDING * 2];
    },
    draw(ctx, _node, widgetWidth, y, _h) {
      this.__wpsLastDrawY = y;

      const rows = node.__wpsPanelRows || [];
      const dragState = node.__wpsPanelDragState || null;
      const x = 10;
      const width = widgetWidth - 20;
      const panelHeight = rows.length * PANEL_ROW_HEIGHT + PANEL_PADDING * 2;

      ctx.save();

      // 外层框（文件夹列表容器）
      ctx.fillStyle = "#1e1e1e";
      ctx.strokeStyle = "#3a3a3a";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, width, panelHeight, 6);
      ctx.fill();
      ctx.stroke();

      // 逐行绘制，选中行白底黑字（类似资源管理器）
      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        const rowY = y + PANEL_PADDING + i * PANEL_ROW_HEIGHT;
        const textY = rowY + PANEL_ROW_HEIGHT * 0.68;
        const isDraggingRow = !!dragState?.active && row.index === dragState.fromIndex;
        const isDropTarget = !!dragState?.active && row.index === dragState.overIndex;

        if (row.selected) {
          // 选中高亮改为中灰，进一步降低亮度
          ctx.fillStyle = "#9aa0a8";
          ctx.fillRect(x + 6, rowY + 2, width - 12, PANEL_ROW_HEIGHT - 4);
          ctx.fillStyle = "#111111";
        } else {
          ctx.fillStyle = row.clickable ? "#dfdfdf" : "#9ea1a6";
        }

        if (isDraggingRow) {
          ctx.fillStyle = "#3a4350";
          ctx.fillRect(x + 6, rowY + 2, width - 12, PANEL_ROW_HEIGHT - 4);
          ctx.fillStyle = "#e9edf5";
        }

        if (isDropTarget && dragState.fromIndex !== dragState.overIndex) {
          ctx.strokeStyle = "#79a9ff";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x + 6, rowY + 2, width - 12, PANEL_ROW_HEIGHT - 4);
        }

        ctx.font = "13px Arial";
        ctx.fillText(`↕ ${row.label}`, x + 12, textY);
      }

      ctx.restore();
    },
    mouse(event, pos, _node) {
      const rows = node.__wpsPanelRows || [];
      if (!rows.length) return false;
      const eventType = event?.type;
      const isDown = eventType === "pointerdown" || eventType === "mousedown";
      const isMove = eventType === "pointermove" || eventType === "mousemove";
      const isUp = eventType === "pointerup" || eventType === "mouseup";
      if (!isDown && !isMove && !isUp) return false;

      const maxY = rows.length * PANEL_ROW_HEIGHT;
      const drawY = this.__wpsLastDrawY ?? 0;
      const yFromWidget = pos[1] - PANEL_PADDING;
      const yFromNode = pos[1] - drawY - PANEL_PADDING;
      const localY =
        yFromNode >= 0 && yFromNode < maxY
          ? yFromNode
          : yFromWidget;

      if (localY < 0) return false;

      const rowIndex = Math.max(0, Math.min(rows.length - 1, Math.floor(localY / PANEL_ROW_HEIGHT)));
      const row = rows[rowIndex] || null;

      if (isDown) {
        if (!row || !row.clickable || typeof row.index !== "number") return false;
        node.__wpsPanelDragState = {
          active: true,
          fromIndex: row.index,
          overIndex: row.index,
          moved: false,
        };
        return true;
      }

      const dragState = node.__wpsPanelDragState;
      if (!dragState?.active) return false;

      if (isMove) {
        if (row && row.clickable && typeof row.index === "number") {
          dragState.overIndex = row.index;
          dragState.moved = dragState.moved || dragState.overIndex !== dragState.fromIndex;
          app.graph?.setDirtyCanvas(true, true);
          return true;
        }
        return false;
      }

      // pointerup/mouseup
      const fromIndex = dragState.fromIndex;
      const overIndex = dragState.overIndex;
      const moved = dragState.moved && typeof overIndex === "number" && overIndex !== fromIndex;
      node.__wpsPanelDragState = null;

      if (!moved) {
        if (row && row.clickable && typeof row.index === "number") {
          const now = Date.now();
          const lastClickAt = node.__wpsPanelLastClickAt || 0;
          const lastClickIndex = node.__wpsPanelLastClickIndex;
          const isDoubleClick = lastClickIndex === row.index && now - lastClickAt <= 320;

          node.__wpsPanelLastClickAt = now;
          node.__wpsPanelLastClickIndex = row.index;

          if (isDoubleClick) {
            switchPresetByIndex(node, row.index, { syncIndexWidget: !isPresetInputLinked(node) });
            promptRenamePreset(node, row.index, event);
            return true;
          }

          switchPresetByIndex(node, row.index);
          return true;
        }
        return false;
      }

      const ok = movePresetIndex(fromIndex, overIndex);
      if (!ok) {
        refreshPresetWidgets(node);
        return true;
      }

      switchPresetByIndex(node, overIndex, { syncIndexWidget: !isPresetInputLinked(node) });
      return true;
    },
  });
}

function switchPresetByIndex(node, index, { syncIndexWidget = true } = {}) {
  const idx = normalizeIndex(index);
  if (syncIndexWidget && !isPresetInputLinked(node)) {
    setIndexWidgetValue(node, idx);
  }

  applyPreset(idx);
  node.__wpsLastAppliedIndex = idx;
  refreshPresetWidgets(node);
}

function refreshPresetWidgets(node) {
  if (!node || !node.__wpsButtonsInjected) return;

  const current = getPresetIndexFromNode(node);
  const indexes = listPresetIndexes();
  const panelSignature = buildPresetPanelSignature(current, indexes);
  const rows = buildPresetPanelRows(current, indexes);

  if (node.__wpsPresetPanelSignature === panelSignature) return;
  node.__wpsPresetPanelSignature = panelSignature;
  node.__wpsPanelRows = rows;

  app.graph?.setDirtyCanvas(true, true);
}

function injectNodeButtons(node) {
  if (!node || node.__wpsButtonsInjected) return;
  node.__wpsButtonsInjected = true;

  node.__wpsLastAppliedIndex = null;
  ensurePresetPanelWidget(node);

  node.addWidget("button", "Add Preset 新增预设", null, () => {
    const idx = nextAvailablePresetIndex();
    const ok = recordPreset(idx);
    if (!ok) return;

    // 新增预设后自动切换到该 index；若输入已被外部连接，则只应用不改 widget 值
    switchPresetByIndex(node, idx, { syncIndexWidget: !isPresetInputLinked(node) });
    refreshPresetWidgets(node);
  });

  node.addWidget("button", "Record Current 记录当前", null, () => {
    const idx = getPresetIndexFromNode(node);
    recordPreset(idx);
    refreshPresetWidgets(node);
  });

  node.addWidget("button", "Delete Selected 删除所选", null, () => {
    const idx = getPresetIndexFromNode(node);
    const ok = deletePreset(idx);
    if (ok && !isPresetInputLinked(node)) {
      const indexes = listPresetIndexes();
      const fallback = indexes.length ? Math.min(idx, indexes[indexes.length - 1]) : 0;
      switchPresetByIndex(node, fallback, { syncIndexWidget: true });
      return;
    }
    refreshPresetWidgets(node);
  });

  node.addWidget("button", "Prev Preset 上一个预设", null, () => {
    const idx = getPresetIndexFromNode(node);
    const prev = prevPresetIndex(idx);
    switchPresetByIndex(node, prev);
  });

  node.addWidget("button", "Next Preset 下一个预设", null, () => {
    const idx = getPresetIndexFromNode(node);
    const next = nextPresetIndex(idx);
    switchPresetByIndex(node, next);
  });

  refreshPresetWidgets(node);
}

function autoApplyByIndexChange() {
  for (const node of getAllNodes()) {
    if (!node || node.type !== TARGET_NODE_NAME) continue;
    injectNodeButtons(node);

    const current = getPresetIndexFromNode(node);
    if (node.__wpsLastAppliedIndex !== current) {
      applyPreset(current);
      node.__wpsLastAppliedIndex = current;
      refreshPresetWidgets(node);
      continue;
    }

    refreshPresetWidgets(node);
  }
}

app.registerExtension({
  name: EXTENSION_NAME,

  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData?.name !== TARGET_NODE_NAME) return;

    const onNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function onNodeCreatedPatched(...args) {
      const result = onNodeCreated?.apply(this, args);
      try {
        injectNodeButtons(this);
      } catch (error) {
        console.error(`[${EXTENSION_NAME}] inject widgets failed`, error);
      }
      return result;
    };
  },

  async setup() {
    ensureStore();
    setInterval(autoApplyByIndexChange, 250);
    console.log(`[${EXTENSION_NAME}] loaded`);
  },
});
