import { BankSeatTool } from "../BankSeatTool";

export default function BankSeatPage() {
  return (
    <main className="app-shell">
      <section className="workspace" style={{ marginLeft: 0 }}>
        <header className="hub-header"><span>Bridge Bank Seat</span><a href="/">All engineering tools</a></header>
        <BankSeatTool />
      </section>
    </main>
  );
}
