import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listWebEditorExamples } from "./load-catalog.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const projectsRoot = path.join(root, "webeditor/projects");
const ml5LoadingSource = path.join(root, "examples/ml5/ml5-loading.js");

const SKIP_FILES = new Set(["meta.json"]);
const GIF_SLUGS = new Set(["gif-fetch", "gif-collision", "gif-fly", "gif-roll"]);

function rewriteIndexHtml(html, { needsMl5Loading }) {
  let next = html;
  next = next.replace(/src="\.\.\/ml5-loading\.js"/g, 'src="ml5-loading.js"');
  next = next.replace(/src="([^"?]+\.(?:js|html))(\?[^"]*)?"/g, 'src="$1"');
  return next;
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function exportProject({ id, title, sourcePath, editorSketchId }) {
  if (!fs.existsSync(sourcePath)) {
    console.warn(`Skipping ${id}: missing ${sourcePath}`);
    return false;
  }

  const projectDir = path.join(projectsRoot, id);
  fs.rmSync(projectDir, { recursive: true, force: true });
  fs.mkdirSync(projectDir, { recursive: true });

  let indexSource = null;
  let needsMl5Loading = false;

  for (const entry of fs.readdirSync(sourcePath, { withFileTypes: true })) {
    if (entry.name === "meta.json" || entry.name.startsWith(".")) continue;

    const srcPath = path.join(sourcePath, entry.name);
    const destPath = path.join(projectDir, entry.name);

    if (entry.isDirectory()) {
      fs.cpSync(srcPath, destPath, { recursive: true });
      continue;
    }

    if (entry.isFile()) {
      if (entry.name === "index.html") {
        indexSource = fs.readFileSync(srcPath, "utf8");
        needsMl5Loading = indexSource.includes("../ml5-loading.js") || indexSource.includes("ml5-loading.js");
        continue;
      }
      copyFile(srcPath, destPath);
    }
  }

  if (!indexSource) {
    console.warn(`Skipping ${id}: no index.html in ${sourcePath}`);
    fs.rmSync(projectDir, { recursive: true, force: true });
    return false;
  }

  if (needsMl5Loading) {
    if (!fs.existsSync(ml5LoadingSource)) {
      throw new Error(`Missing ${ml5LoadingSource} required by ${id}`);
    }
    copyFile(ml5LoadingSource, path.join(projectDir, "ml5-loading.js"));
  }

  fs.writeFileSync(
    path.join(projectDir, "index.html"),
    rewriteIndexHtml(indexSource, { needsMl5Loading }),
  );

  if (GIF_SLUGS.has(id)) {
    fs.mkdirSync(path.join(projectDir, "gifs"), { recursive: true });
  }

  fs.writeFileSync(
    path.join(projectDir, "meta.json"),
    `${JSON.stringify(
      {
        slug: id,
        title,
        editorSketchId,
        sourcePath: path.relative(root, sourcePath),
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );

  return true;
}

export function exportWebEditorProjects({ slugs = null } = {}) {
  const catalog = listWebEditorExamples();
  const selected = slugs
    ? catalog.filter((entry) => slugs.includes(entry.id))
    : catalog;

  fs.mkdirSync(projectsRoot, { recursive: true });

  let count = 0;
  for (const entry of selected) {
    if (exportProject(entry)) {
      count += 1;
      console.log(`Exported ${entry.id}`);
    }
  }

  console.log(`Exported ${count} Web Editor project(s) to webeditor/projects/`);
  return { count, slugs: selected.map((entry) => entry.id) };
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  exportWebEditorProjects();
}
