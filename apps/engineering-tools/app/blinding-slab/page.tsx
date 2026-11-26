import { BlindingSlabTool } from "../BlindingSlabTool";

export default function BlindingSlabPage() {
  return (
    <main className="app-shell">
      <section className="workspace" style={{ marginLeft: 0 }}>
        <header className="hub-header"><span>Blinding Slab</span><a href="/">All engineering tools</a></header>
        <BlindingSlabTool />
      </section>
    </main>
  );
}
