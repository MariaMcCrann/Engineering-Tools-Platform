import { BaseSlabStructuralTool } from "../StructuralConcreteTools";

export default function BaseSlabConcretePage() {
  return (
    <main className="app-shell">
      <section className="workspace" style={{ marginLeft: 0 }}>
        <header className="hub-header"><span>Base Slab Concrete</span></header>
        <BaseSlabStructuralTool />
      </section>
    </main>
  );
}
