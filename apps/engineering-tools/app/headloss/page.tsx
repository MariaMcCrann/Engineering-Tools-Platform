import { HeadlossTool } from "../HeadlossTool";

export default function HeadlossPage() {
  return (
    <main className="app-shell">
      <section className="workspace" style={{ marginLeft: 0 }}>
        <header className="hub-header"><span>Engineering Tools · Pipe Headloss</span></header>
        <HeadlossTool />
      </section>
    </main>
  );
}
