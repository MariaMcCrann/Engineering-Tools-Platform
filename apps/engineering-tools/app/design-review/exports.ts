import type { Review } from "./engine";
import { TERMINAL } from "./engine";

export function download(data: BlobPart, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export const filename = (r: Review) => `${r.metadata.project}-${r.id.slice(0, 8)}-review`.replace(/[^a-zA-Z0-9_-]/g, "_");
const label = (key: string) => key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, c => c.toUpperCase());
export function readableDetail(detail: string): string {
  try {
    const value: unknown = JSON.parse(detail);
    const lines = (v: unknown, indent = ""): string => v && typeof v === "object" ? Object.entries(v).map(([key, item]) => item && typeof item === "object" ? `${indent}${label(key)}:\n${lines(item, indent + "  ")}` : `${indent}${label(key)}: ${item === "" ? "Not supplied" : String(item)}`).join("\n") : String(v);
    return lines(value);
  } catch { return detail; }
}
export async function workbook(r: Review) {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "Engineering Tools"; wb.created = new Date();
  const meta = wb.addWorksheet("Review metadata");
  meta.addRows([["Field", "Value"], ["Review ID", r.id], ["State", r.closed ? "Closed" : "Open"], ...Object.entries(r.metadata), ["Created", r.createdAt], ["Last updated", r.updatedAt], ["Storage", "Local browser workspace; names and roles are self-declared. Exports are snapshots. Use the review JSON file for sequential handoff." ]]);
  const register = wb.addWorksheet("Review register");
  register.addRow(["Comment ID", "Discipline", "Check", "Status", "Round", "Review guidance", "Source", "Latest reviewer entry", "Latest designer response", "Latest evidence reference", "Closed by", "Closed at"]);
  for (const c of r.items) {
    const reviewer = [...c.history].reverse().find(e => e.actor.role === "Reviewer");
    const designer = [...c.history].reverse().find(e => e.actor.role === "Designer");
    const last = c.history.at(-1);
    register.addRow([c.id, c.discipline, c.title, c.status, last?.round ?? 0, c.guidance, c.source, reviewer?.text ?? "", designer?.text ?? "", last?.evidence.reference ?? "", c.status === "Closed" ? last?.actor.name : "", c.status === "Closed" ? last?.at : ""]);
  }
  const history = wb.addWorksheet("All response rounds");
  history.addRow(["Comment ID", "Round", "Date (UTC)", "Name", "Role", "From", "To", "Comment / response / decision", "Evidence reference", "Calculator", "Snapshot", "Entry ID"]);
  r.items.forEach(c => c.history.forEach(e => history.addRow([c.id, e.round, e.at, e.actor.name, e.actor.role, e.from, e.to, e.text, e.evidence.reference, e.evidence.calculator ?? "", e.evidence.snapshot ? JSON.stringify(e.evidence.snapshot) : "", e.id])));
  const audit = wb.addWorksheet("Audit trail");
  audit.addRow(["Date (UTC)", "Name", "Role", "Action", "Details", "Event ID"]);
  r.audit.forEach(e => audit.addRow([e.at, e.actor.name, e.actor.role, e.action, readableDetail(e.detail), e.id]));
  wb.eachSheet(ws => {
    ws.views = [{ state: "frozen", ySplit: 1 }];
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, ws.rowCount), column: ws.columnCount } };
    ws.columns.forEach((col, i) => { col.width = i === 0 ? 30 : i === 2 || i >= 5 ? 48 : 25; });
    ws.eachRow((row, index) => {
      row.eachCell(cell => {
        if (typeof cell.value === "string" && cell.value.length > 32767) cell.value = cell.value.slice(0, 32700) + " [truncated in Excel; full text in review JSON]";
        cell.alignment = { vertical: "top", wrapText: true };
        if (index === 1) { cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF173F59" } }; }
      });
    });
    ws.pageSetup = { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: "1:1" };
  });
  return wb;
}
export function reportLines(r: Review): { text: string; heading?: boolean }[] {
  const lines: { text: string; heading?: boolean }[] = [
    { text: "Engineering Design Review & Close-out", heading: true },
    { text: `${r.metadata.project} — ${r.metadata.title}`, heading: true },
    { text: `Review ${r.id} | ${r.closed ? "CLOSED" : r.items.length && r.items.every(c => TERMINAL.includes(c.status)) ? "OPEN — awaiting final reviewer close-out" : "OPEN — unresolved or unreviewed checks remain"}` },
    { text: `Completed checks: ${r.items.filter(c => TERMINAL.includes(c.status)).length} / ${r.items.length}` },
    ...Object.entries(r.metadata).map(([key, value]) => ({ text: `${label(key)}: ${value || "Not supplied"}` })),
    { text: "Record basis", heading: true },
    { text: "This report records review decisions; it is not an engineering certificate. Local workspace, self-declared identities; no authenticated signatures. Original source references and every response round are retained below." },
  ];
  r.items.forEach(c => {
    lines.push({ text: `${c.id} · ${c.discipline} · ${c.status}`, heading: true }, { text: c.title }, { text: `Guidance: ${c.guidance}` }, { text: `Source: ${c.source}` });
    if (!c.history.length) lines.push({ text: "Not reviewed. No decision or designer response recorded." });
    c.history.forEach(e => lines.push({ text: `Round ${e.round} | ${e.at} | ${e.actor.name} (${e.actor.role}) | ${e.from} → ${e.to}` }, { text: e.text }, { text: `Evidence: ${e.evidence.reference || "Not supplied"}${e.evidence.calculator ? ` | Calculator: ${e.evidence.calculator}` : ""}${e.evidence.snapshot ? ` | Snapshot: ${JSON.stringify(e.evidence.snapshot)}` : ""}` }));
  });
  lines.push({ text: "Audit trail", heading: true });
  r.audit.forEach(e => lines.push({ text: `${e.at} | ${e.actor.name} (${e.actor.role}) | ${e.action}` }, { text: readableDetail(e.detail) }, { text: `Audit event: ${e.id}` }));
  return lines;
}
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]!)).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
export function reportHtml(r: Review) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(r.metadata.project)} review report</title><style>@page{size:A4;margin:18mm}body{font:11pt Arial;color:#183449;line-height:1.5;max-width:850px;margin:30px auto}h2{font-size:15pt;margin-top:24px;break-after:avoid}p{white-space:pre-wrap;overflow-wrap:anywhere}button{padding:12px}@media print{button{display:none}body{margin:0}}</style></head><body><button onclick="window.print()">Print / Save as PDF</button>${reportLines(r).map(l => `<${l.heading ? "h2" : "p"}>${escape(l.text)}</${l.heading ? "h2" : "p"}>`).join("")}</body></html>`;
}
export async function wordDocument(r: Review): Promise<Blob> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  zip.file("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file("_rels/.rels", '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${reportLines(r).flatMap(l => l.text.split("\n").map(t => `<w:p><w:pPr><w:spacing w:after="120"/>${l.heading ? '<w:keepNext/>' : ''}</w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="${l.heading ? 28 : 20}"/>${l.heading ? '<w:b/>' : ''}</w:rPr><w:t xml:space="preserve">${escape(t)}</w:t></w:r></w:p>`)).join("")}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1020" w:right="1020" w:bottom="1020" w:left="1020"/></w:sectPr></w:body></w:document>`);
  return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", compression: "DEFLATE" });
}
