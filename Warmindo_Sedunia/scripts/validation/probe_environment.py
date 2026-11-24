"""Phase 0 environment probe: verifies every pipeline capability end to end.

Run:  <venv>/bin/python scripts/validation/probe_environment.py [out_dir]
Writes a JSON report and sample outputs to out_dir (default: a temp dir).
"""
import json
import os
import sys
import tempfile
import time

import bpy  # must be imported before addon_utils
import addon_utils  # noqa: E402

out = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp(prefix="ws_probe_"))
os.makedirs(out, exist_ok=True)
report = {"blender_version": bpy.app.version_string, "checks": {}}


def check(name, fn):
    t = time.time()
    try:
        detail = fn()
        report["checks"][name] = {"ok": True, "seconds": round(time.time() - t, 2), "detail": detail}
    except Exception as e:  # noqa: BLE001 - we want every failure recorded
        report["checks"][name] = {"ok": False, "error": str(e)}


def build_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24)
    bpy.context.object.modifiers.new("subsurf", "SUBSURF").levels = 1
    bpy.ops.object.light_add(type="SUN", location=(2, -2, 3))
    bpy.ops.object.camera_add(location=(0, -5, 0), rotation=(1.5708, 0, 0))
    s = bpy.context.scene
    s.camera = bpy.context.object
    s.render.resolution_x = s.render.resolution_y = 512
    s.render.film_transparent = True


def render(engine):
    def _r():
        s = bpy.context.scene
        s.render.engine = engine
        if engine == "CYCLES":
            s.cycles.samples = 32
            s.cycles.device = "CPU"
        s.render.filepath = os.path.join(out, f"{engine}.png")
        bpy.ops.render.render(write_still=True)
        return s.render.filepath
    return _r


def rigify():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    addon_utils.enable("rigify", default_set=True, persistent=True)
    bpy.ops.object.armature_human_metarig_add()
    bpy.ops.pose.rigify_generate()
    return f"{len(bpy.data.objects['rig'].data.bones)} bones generated"


def exports():
    bpy.ops.export_scene.gltf(filepath=os.path.join(out, "probe.glb"))
    bpy.ops.export_scene.fbx(filepath=os.path.join(out, "probe.fbx"))
    return [f for f in os.listdir(out) if f.startswith("probe.")]


def video():
    s = bpy.context.scene
    s.render.image_settings.media_type = "VIDEO"
    s.render.image_settings.file_format = "FFMPEG"
    return "FFMPEG output available"


build_scene()
check("render_cycles_cpu", render("CYCLES"))
check("render_eevee", render("BLENDER_EEVEE"))
check("video_ffmpeg", video)
check("export_glb_fbx", exports)
check("rigify_generate", rigify)

path = os.path.join(out, "probe_report.json")
with open(path, "w") as f:
    json.dump(report, f, indent=2)
print(json.dumps(report, indent=2))
print("report:", path)
