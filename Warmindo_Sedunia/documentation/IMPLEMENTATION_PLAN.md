# Implementation Plan

## Pipeline architecture
Everything is script-driven and reproducible. A character is defined by data plus shared builders, never by one-off scene edits.

```
scripts/
  setup/setup_env.sh                 headless bpy toolchain
  modeling/
    ws_core.py                       units, naming, collections, shared utils
    ws_body.py                       base body generator (stylized proportions, edge loops)
    ws_head.py                       head/face generator (eye sockets, mouth loops, lids)
    ws_hair.py                       hair as sculpted-curve / mesh-card shells
    ws_clothing.py                   clothing shells offset from body + shoes/accessories
    characters/kamal.py ...          per-character spec (proportions, colors, costumes)
  rigging/
    ws_rig.py                        Rigify metarig fit → generate → weight bind
    ws_face_rig.py                   face bones + shape keys (expressions, visemes)
    ws_actions.py                    validation action library (idle, blink, walk…)
  rendering/
    ws_lighting.py                   ONE shared look-dev light rig + world for all chars
    render_views.py                  front/side/back/3-4, transparent, turnaround video
    render_expressions.py            expression sheet
  validation/
    probe_environment.py             Phase 0 checks
    compare_reference.py             side-by-side sheet + silhouette IoU / colour ΔE metrics
    validate_asset.py                normals, scale, intersections, naming → report JSON
```

## Standards
- **Scale:** 1 Blender unit = 1 m. Characters stand on Z=0, face −Y, and are centred at the origin. Heights come from the references; the lineup locks relative scale.
- **Naming:** `CHAR_001_Kamal_<part>` for objects, `M_<Char>_<Part>` for materials, `CS_<Costume>` for collections, `ACT_<Char>_<Action>` for actions.
- **Materials:** a shared node group `NG_ToonSkin` for subsurface skin with low specular and fixed roughness, plus `NG_StylizedHair` and `NG_Cloth`. Each character only sets colour parameters, so lighting response stays the same across the cast.
- **Topology:** quad-dominant base meshes with Subdivision Surface (render level 2). Loops around the eyes and mouth, and three loops at the elbow, knee and shoulder.
- **Files:** one `.blend` per character in `blender/characters/`, with relative paths and packed textures. Assets are marked for the Asset Browser.

## Phase 1 — Kamal prototype (starts as soon as references arrive)
1. Study the reference: extract proportions (head-to-body ratio, eye spacing, colours sampled from the image).
2. Put the reference images on camera-aligned image planes in the scene and model against them from the front and side.
3. Build the head (the priority) and iterate render → compare → adjust. Then the body, hair, office outfit and shoes.
4. Build the shared materials and look-dev lighting.
5. Render front, side, back, 3/4 and transparent views, plus a 360° turnaround preview video.
6. Make a reference comparison sheet at matched camera angles, with written discrepancies.
7. **STOP for approval.** If procedural fidelity turns out to be insufficient, I'll say so and propose the reference-to-3D route.

## Phases 2–5
As specified in the brief: Kamal rig, expressions and visemes, then approval; then the remaining six characters, each with its own validation; then the master library, lineup and exports; then the Kamal + Bapak test scene.
Each character gets a metadata JSON and a validation report produced by `validate_asset.py`.
