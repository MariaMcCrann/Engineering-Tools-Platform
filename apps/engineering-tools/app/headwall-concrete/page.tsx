import { HeadwallStructuralTool } from "../StructuralConcreteTools";

export default function HeadwallConcretePage() {
  return (
    <main className="app-shell">
      <section className="workspace" style={{ marginLeft: 0 }}>
        <header className="hub-header"><span>Headwall Concrete</span></header>
        <HeadwallStructuralTool />
      </section>
    </main>
  );
}
