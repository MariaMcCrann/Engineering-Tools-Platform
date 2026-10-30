import type { SavedInput } from "./WorkspacePanels";
type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
export function projectControls(root: HTMLElement): Control[] {
  // Keep original indices for older saves; exclude non-data controls only when capturing values.
  return Array.from(root.querySelectorAll<Control>("input, select, textarea")).filter(el => !el.closest("header, .save-project-form"));
}
function fieldKeys(controls: Control[]): string[] {
  const occurrences = new Map<string, number>();
  return controls.map(el => {
    const label = el.closest("label");
    const copy = label?.cloneNode(true) as HTMLElement | undefined;
    copy?.querySelectorAll("input,select,textarea,small,svg").forEach(n => n.remove());
    const name = el.id || el.name || copy?.textContent?.replace(/\s+/g, " ").trim() || el.getAttribute("aria-label") || el.getAttribute("placeholder") || "unlabelled";
    const base = `${el.tagName}:${el.type}:${name}`;
    const occurrence = occurrences.get(base) ?? 0;
    occurrences.set(base, occurrence + 1);
    return `${base}:${occurrence}`;
  });
}
export function captureProjectInputs(root: HTMLElement): SavedInput[] {
  const controls = projectControls(root), keys = fieldKeys(controls);
  return controls.flatMap((el, index) => ["file", "password", "hidden", "submit", "button", "reset", "image"].includes(el.type) ? [] : [{ index, tag: el.tagName, type: el.type, key: keys[index], value: el.value, ...(el instanceof HTMLInputElement ? { checked: el.checked } : {}) }]);
}
export function restoreProjectInputs(root: HTMLElement, inputs: SavedInput[]) {
  const controls = projectControls(root), keys = fieldKeys(controls);
  for (const saved of inputs) {
    // Label keys prevent newly inserted fields shifting values into unrelated inputs.
    const el = saved.key ? controls[keys.indexOf(saved.key)] : controls[saved.index];
    if (!el || el.tagName !== saved.tag || el.type !== saved.type || ["file", "password", "hidden", "submit", "button", "reset", "image"].includes(el.type) || ("readOnly" in el && el.readOnly)) continue;
    if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
      if (el.checked !== Boolean(saved.checked)) el.click();
    } else if (el.value !== saved.value) {
      if (el instanceof HTMLSelectElement && !Array.from(el.options).some(o => o.value === saved.value)) continue;
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, saved.value);
      el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
    }
  }
}
