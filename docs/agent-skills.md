# Agent Skills — Install and Use

p5-phone ships two **agent skills** — markdown files that teach AI coding assistants (Claude Code, Cursor, ZCode, OpenCode, GitHub Copilot, and others) how the library works so generated sketches use the right APIs and contemporary p5.js patterns.

| Skill | What it teaches |
|-------|-----------------|
| **p5-phone** | The library's API surface, activation patterns (`enableXTap/Button/Canvas/Banner/On`), status flags, callbacks, platform quirks, and the single-file implementation conventions. Steers models to p5-phone's helpers instead of reinventing mobile-browser plumbing. |
| **p5js-2x** | The p5.js 1.x → 2.x transition. Models default to 1.x patterns (`preload()`, `curveVertex`, `keyCode`, `TypedDict`); this skill points them at the contemporary 2.x idioms (`async setup()` + `await loadImage()`, `splineVertex`, the unified pointer model, etc.). |

**Pair them.** They cover different layers and are designed to be used together:
- `p5-phone` unlocks phone hardware and hands you p5 values (`rotationX`, `mic.getLevel()`, `window.sensorsEnabled`, …).
- `p5js-2x` governs the surrounding p5.js 2.x language (async asset loading, renamed curve/data APIs, unified touch).

The failure this pairing prevents: a model hand-rolling a `DeviceOrientationEvent` listener instead of reading `rotationX`, or wrapping code in `preload()` when the sketch targets p5.js 2.x.

---

## Where the files live

The skills are committed to this repo in four agent-platform directories so a clone is ready to use immediately. Each platform reads from its own path; the contents are byte-identical across all four.

```
.agents/skills/p5-phone/SKILL.md          ← portable / ZCode / generic
.agents/skills/p5js-2x/SKILL.md
.claude/skills/p5-phone/SKILL.md          ← Claude Code
.claude/skills/p5js-2x/SKILL.md
.opencode/skills/p5-phone/SKILL.md        ← OpenCode
.opencode/skills/p5js-2x/SKILL.md
.github/skills/p5-phone/SKILL.md          ← GitHub Copilot
.github/skills/p5js-2x/SKILL.md
```

The `p5js-2x` skill also includes a detailed migration reference at `references/migration-1x-to-2x.md` inside each platform dir.

---

## Install

### Option A — clone this repo (simplest)

If your sketch lives inside a clone of `p5-phone`, the skills are already in place. Any agent that discovers skills from the repo's hidden directories will pick them up automatically — no copy step needed.

```bash
git clone https://github.com/npuckett/p5-phone.git
cd p5-phone
# skills are under .agents/, .claude/, .opencode/, .github/ — already present
```

### Option B — copy only the skill(s) you need into an existing project

Copy the `SKILL.md` for each skill you want into the directory your agent reads. You only need **one** platform directory — pick the one matching your tool.

```bash
# Example: add both skills to a Claude Code project
mkdir -p .claude/skills/p5-phone .claude/skills/p5js-2x
curl -o .claude/skills/p5-phone/SKILL.md \
  https://raw.githubusercontent.com/npuckett/p5-phone/main/.claude/skills/p5-phone/SKILL.md
curl -o .claude/skills/p5js-2x/SKILL.md \
  https://raw.githubusercontent.com/npuckett/p5-phone/main/.claude/skills/p5js-2x/SKILL.md
```

For `p5js-2x`, also grab the migration reference if you want the full 1.x → 2.x table:

```bash
mkdir -p .claude/skills/p5js-2x/references
curl -o .claude/skills/p5js-2x/references/migration-1x-to-2x.md \
  https://raw.githubusercontent.com/npuckett/p5-phone/main/.claude/skills/p5js-2x/references/migration-1x-to-2x.md
```

---

## Per-platform notes

| Platform | Directory | Notes |
|----------|-----------|-------|
| **Claude Code** | `.claude/skills/<name>/SKILL.md` | Auto-discovered. Skills trigger based on the `description` in frontmatter. |
| **Cursor** | `.cursor/skills/<name>/SKILL.md` (or `.cursorrules`) | If your Cursor version reads `.cursor/skills/`, use that; otherwise paste the relevant section into `.cursorrules`. The `.agents/` copy is also a safe fallback. |
| **ZCode** | `.agents/skills/<name>/SKILL.md` (and/or `.zcode/`) | Reads from `.agents/skills/`. The portable location — preferred for cross-tool compatibility. |
| **OpenCode** | `.opencode/skills/<name>/SKILL.md` | Auto-discovered. |
| **GitHub Copilot** | `.github/skills/<name>/SKILL.md` | Pair with a reference in `.github/copilot-instructions.md` or `.github/instructions/`. |
| **Any / unsure** | `.agents/skills/<name>/SKILL.md` | The portable, platform-agnostic location. Most tools that read hidden skill directories will find it here. |

### Portable recommendation

If you use more than one tool, or aren't sure which one you'll use, put the skills in **`.agents/skills/`** — it's the cross-platform default, and the other directories in this repo mirror it so every tool finds a copy.

---

## Verify the skill is active

After installing, confirm each skill loads by asking your agent a question that should trigger it:

- **p5-phone**: *"How do I read NFC tags in a p5 sketch on Android?"* — the agent should reach for `enableNfcTap()` + `nfcRead()` and mention HTTPS/Android-only constraints, not a hand-rolled `NDEFReader` setup.
- **p5js-2x**: *"Write a p5 sketch that loads an image and draws it."* — the agent should use `async function setup()` + `await loadImage()`, not `preload()`.

If the agent still reaches for 1.x patterns or hand-rolled hardware code, the skill isn't being discovered — check the directory path against the table above.

---

## Updating

Skills are versioned with the library. When you update p5-phone, re-copy the `SKILL.md` files (Option B) or `git pull` (Option A) to pick up new features. The `description` in each skill's frontmatter notes the current version it targets.

All copies across `.agents/`, `.claude/`, `.opencode/`, and `.github/` are kept byte-identical on purpose — if you edit one, mirror the change to the others (or just edit the `.agents/` copy and symlink/copy outward).

---

## See also

- [p5-phone documentation home](../examples/homepage/index.html) — full API reference, example catalog, compatibility tables
- [README](../README.md) — library overview and setup
- [CONTRIBUTING.md](../CONTRIBUTING.md) — release workflow, including how skill files are kept in sync across platform dirs
