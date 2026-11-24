# Warmindo Sedunia: 3D Character Asset Library

A production character pipeline for the stylized 3D Indonesian animated comedy *Warmindo Sedunia*. Everything is built with Blender's Python API and runs headless.

## Status
| Phase | Status |
|---|---|
| 0 Environment and asset audit | ✅ Done: see `documentation/PHASE0_AUDIT.md` |
| 1 Kamal prototype | ⛔ **Blocked: no character reference images in the project** |
| 2–5 | Not started (approval-gated) |

## Adding references
Put the approved images in `references/characters/<Name>/`. Mark the approved version with an `APPROVED_` filename prefix or a `notes.txt`. Original references are never modified by the pipeline.

## Setup
```bash
bash scripts/setup/setup_env.sh .venv_blender
.venv_blender/bin/python scripts/validation/probe_environment.py /tmp/ws_probe
```

## Docs
- `documentation/PHASE0_AUDIT.md`: toolchain, hardware, blockers and risks
- `documentation/IMPLEMENTATION_PLAN.md`: pipeline architecture, standards and phase plan
