class WorkflowPresetSwitch:
    """
    Phase 1 骨架节点：提供 preset_index 输入。
    后续由前端扩展监听该值变化并应用 preset。
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "preset_index": (
                    "INT",
                    {
                        "default": 0,
                        "min": 0,
                        "max": 999999,
                        "step": 1,
                    },
                )
            }
        }

    RETURN_TYPES = ("INT",)
    RETURN_NAMES = ("preset_index",)
    FUNCTION = "run"
    CATEGORY = "workflow/preset"

    def run(self, preset_index):
        return (int(preset_index),)


NODE_CLASS_MAPPINGS = {
    "WorkflowPresetSwitch": WorkflowPresetSwitch,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "WorkflowPresetSwitch": "Workflow Preset Switch",
}
