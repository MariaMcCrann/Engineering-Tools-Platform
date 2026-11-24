import { BankSeatTool } from "../BankSeatTool";

export default function BankSeatPage() {
  return (
    <main className="app-shell">
      <section className="workspace" style={{ marginLeft: 0 }}>
        <header className="hub-header"><h1>Bridge Bank Seat</h1></header>
        <BankSeatTool />
      </section>
    </main>
  );
}
