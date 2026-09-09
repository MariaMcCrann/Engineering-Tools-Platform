import { RockProtectionTool } from "../RockProtectionTool";

export default function RockProtectionPage() {
  return (
    <main className="app-shell">
      <section className="workspace" style={{ marginLeft: 0 }}>
        <header className="hub-header"><span>Rock Protection / Riprap</span></header>
        <RockProtectionTool />
      </section>
    </main>
  );
}
