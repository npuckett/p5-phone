import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function loadExamplesCatalog(catalogPath = path.join(root, "examples/homepage/scripts/examples-data.js")) {
  const source = fs.readFileSync(catalogPath, "utf8");
  const sandbox = { window: {} };
  const fn = new Function("window", `${source}\nreturn window.P5PHONE_EXAMPLES;`);
  const examples = fn(sandbox.window);
  if (!Array.isArray(examples)) {
    throw new Error(`Could not load P5PHONE_EXAMPLES from ${catalogPath}`);
  }
  return examples;
}

export function editorSketchIdFromUrl(webEditorUrl) {
  if (!webEditorUrl) return null;
  return webEditorUrl.match(/sketches\/([^/?#]+)/)?.[1] || null;
}

export function listWebEditorExamples(examples = loadExamplesCatalog()) {
  return examples
    .filter((entry) => entry.sourcePath && (entry.webEditor || entry.webEditorSync))
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      sourcePath: path.join(root, decodeURIComponent(entry.sourcePath)),
      editorSketchId: editorSketchIdFromUrl(entry.webEditor),
      webEditor: entry.webEditor,
    }));
}
