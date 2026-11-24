# Phase 0 — Environment and Asset Audit

Date: 2026-11-24 · Status: **Complete. Phase 1 is BLOCKED because there are no reference images.**

## 1. Reference assets: BLOCKER

| Character | Reference found | Approved version identified |
|---|---|---|
| CHAR_001 Kamal (original V1) | **No** | — |
| CHAR_002 Bapak | **No** | — |
| CHAR_003 Mak | **No** | — |
| CHAR_004 Jali (revised) | **No** | — |
| CHAR_005 Bos Botak (original) | **No** | — |
| CHAR_006 HRD | **No** | — |
| CHAR_007 Satpam (revised) | **No** | — |

Where I searched:
- This repository (`candrikadewi/care`), every branch: `main` content and `claude/member-voice-app-html-tsncix`. The repo holds an unrelated Next.js/Supabase app ("CARE") and has no image assets except the default Next.js SVG icons.
- The container filesystem: I searched for `*.png/jpg/jpeg/webp` and for names containing kamal, warmindo, bapak or satpam. Nothing related turned up.

The brief says the approved reference images are the single source of truth. It also says not to substitute a generic or procedural guess for an approved character. So **no character modeling has been started.** Building Kamal from the text description alone would amount to redesigning him, which the brief forbids.

### What is needed per character
Put the files in `references/characters/<Name>/`. Use `APPROVED_` as a filename prefix, or include a `notes.txt`, to mark the approved version (for example Kamal V1 as opposed to the later real-face version).

Minimum: one clear full-body front view.
Strongly preferred, for fidelity:
- A turnaround with front, side, back and 3/4 views, or a model sheet
- A close-up of the face
- Colour callouts for skin, hair and clothing, plus a height or proportion note
- For Kamal, the corporate, casual-home and warmindo work outfits

## 2. Toolchain (verified by `scripts/validation/probe_environment.py`)

| Capability | Result | Notes |
|---|---|---|
| Blender | **5.3.0**, run as the `bpy` Python module from PyPI | The standalone Blender binary is not installed, and `download.blender.org` is blocked by the network policy. `bpy` is the same Blender core and runs headless. |
| Python scripting | OK | Python 3.13 |
| Cycles (CPU) | OK, 1.3 s for a 512² test at 32 spp | **Primary render engine** |
| EEVEE | OK but slow, about 27–41 s for a trivial scene | Software EGL (Mesa); no GPU. Use for checks only. |
| Rigify | OK | The human metarig generates a 706-bone rig. The addon must be enabled with `default_set=True`. |
| GLB / FBX export | OK | |
| Video (FFMPEG) | OK | System `ffmpeg` and ImageMagick are also available |
| numpy | OK | Used for image comparison metrics |

### Hardware
- CPU: 4 vCPU Intel Xeon @ 2.3 GHz · RAM: 15 GB · Free disk: about 60 GB
- **No GPU.** Renders are CPU-only, so turnaround and animation videos will use reduced resolution and samples (for example 960×540 at 64 spp with denoising). Final-quality renders should be redone on a GPU machine.

### Environment constraints
- Headless, with no Blender UI. Interactive sculpting is impossible, so modeling has to be done procedurally or through scripted mesh/bmesh construction followed by subdivision.
- The container is ephemeral. Anything worth keeping has to be committed to git, and large binaries should move to Git LFS (see Risks).

## 3. Image-to-3D tools

| Tool | Available | Notes |
|---|---|---|
| Meshy / Tripo / Rodin and similar | **No** | Paid APIs that need network allowlisting and an account. Per the brief, **not used without your explicit approval.** |
| Local image-to-3D (TripoSR, InstantMesh and similar) | Not practical | They need a GPU and model weights; CPU inference would be very slow and of low quality. |

## 4. Fidelity assessment (honest expectation)

Headless procedural modeling with no sculpting can produce clean, rounded, animation-friendly stylized characters with good edge flow. Matching a specific approved face closely is harder. The quality ceiling depends on the reference style:
- **Simple, graphic style** (big eyes, simple nose, clear shapes): procedural modeling can likely reach a recognisable match.
- **Detailed or painterly style**, or complex hair: procedural modeling will probably fall short on facial likeness and hair. In that case I'll recommend a reference-to-3D base mesh (Meshy or Tripo, needing your approval) followed by Blender retopology, rigging and materials.

I'll make that call once I see Kamal's V1 reference, and say so plainly in the comparison sheet. I won't claim a match the renders don't support.

## 5. Risks and limitations
1. **No references.** This is the hard blocker for Phases 1–5.
2. CPU-only rendering means longer iteration and reduced preview quality.
3. No interactive sculpting limits fine facial likeness (see §4).
4. Repo scope: the work lives in `Warmindo_Sedunia/` inside the unrelated `candrikadewi/care` repository. A dedicated repository would be cleaner; tell me if you want one.
5. Binary size: `.blend`, GLB/FBX and video files will grow quickly. I recommend Git LFS for `*.blend *.glb *.fbx *.mp4 *.mkv`.
