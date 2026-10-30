import type { SavedInput, SavedProject } from "./WorkspacePanels";

export const PROJECT_FILE_FORMAT = "flood-risk-advisory-project";
export const MAX_PROJECT_FILE_BYTES = 5 * 1024 * 1024;

export function exportProjectFile(project: SavedProject): string {
  if (!project.inputs?.length) throw new Error("This project has no saved inputs. Open it, check the inputs and use Update saved project before exporting.");
  return JSON.stringify({ format: PROJECT_FILE_FORMAT, version: 1, exportedAt: new Date().toISOString(), project }, null, 2);
}

export function parseProjectFile(text: string, supportedTools: readonly string[]): SavedProject {
  if (new TextEncoder().encode(text).length > MAX_PROJECT_FILE_BYTES) throw new Error("Project files must be smaller than 5 MB.");
  let file;
  try { file = JSON.parse(text); } catch { throw new Error("This is not a valid project file. Choose a JSON file exported from Saved Projects."); }
  if (!file || file.format !== PROJECT_FILE_FORMAT || file.version !== 1) throw new Error("Unsupported project file. Choose a project exported from this tool, or update the tools for a newer file version.");
  const p = file.project;
  if (!p || typeof p.name !== "string" || !p.name.trim() || p.name.length > 500 || typeof p.toolView !== "string" || !supportedTools.includes(p.toolView) || typeof p.toolLabel !== "string" || p.toolLabel.length > 500 || (p.note !== undefined && (typeof p.note !== "string" || p.note.length > 10000))) throw new Error("The project details or calculation tool are not supported.");
  if (!Array.isArray(p.inputs) || !p.inputs.length || p.inputs.length > 10000) throw new Error("This file does not contain valid saved calculation inputs.");
  const inputs: SavedInput[] = p.inputs.map((v: SavedInput) => {
    if (!v || !Number.isSafeInteger(v.index) || v.index < 0 || v.index > 100000 || !["INPUT", "SELECT", "TEXTAREA"].includes(v.tag) || typeof v.type !== "string" || typeof v.value !== "string" || v.value.length > 100000 || (v.checked !== undefined && typeof v.checked !== "boolean") || (v.key !== undefined && (typeof v.key !== "string" || v.key.length > 2000))) throw new Error("The file contains invalid calculation inputs.");
    if (["file", "password", "hidden", "submit", "button", "reset", "image"].includes(v.type)) throw new Error("The file contains an unsupported input type.");
    return { index: v.index, tag: v.tag, type: v.type, value: v.value, ...(v.checked !== undefined ? { checked: v.checked } : {}), ...(v.key !== undefined ? { key: v.key } : {}) };
  });
  // Imported work always gets a new identity: never overwrite the recipient's saved project.
  return { id: crypto.randomUUID(), name: p.name.trim(), toolView: p.toolView, toolLabel: p.toolLabel, note: p.note, savedAt: Date.now(), inputs };
}

export function projectFilename(name: string): string {
  return `${name.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 100) || "calculation"}.engineering-project.json`;
}
