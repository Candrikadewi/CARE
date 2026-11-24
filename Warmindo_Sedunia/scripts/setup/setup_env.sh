#!/usr/bin/env bash
# Sets up a headless Blender (bpy) toolchain for the Warmindo Sedunia pipeline.
# Usage: bash scripts/setup/setup_env.sh [venv_dir]
# Afterwards run pipeline scripts with: <venv_dir>/bin/python scripts/<...>.py
set -euo pipefail
VENV="${1:-.venv_blender}"

# Software EGL so EEVEE/Workbench can initialise without a GPU (Cycles works without it).
if command -v apt-get >/dev/null 2>&1; then
  apt-get install -y -q libegl1 libegl-mesa0 libgl1-mesa-dri libgbm1 >/dev/null \
    || { apt-get update -q >/dev/null && apt-get install -y -q libegl1 libegl-mesa0 libgl1-mesa-dri libgbm1 >/dev/null; }
fi

python3 -m venv "$VENV"
"$VENV/bin/pip" install -q bpy numpy pillow
"$VENV/bin/python" -c "import bpy; print('bpy', bpy.app.version_string)"
