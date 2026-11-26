import { AbutmentStability } from "../AbutmentStability";

export default function AbutmentFoundationsPage() {
  return (
    <main className="app-shell">
      <section className="workspace" style={{ marginLeft: 0 }}>
        <header className="hub-header"><h1>Abutment and Foundations</h1></header>
        <div className="grid max-w-5xl gap-5 p-6">
          <nav aria-label="Related bridge tools" className="flex flex-wrap gap-4 underline">
            <a href="/bank-seat">Bridge Bank Seat</a>
            <a href="/">All engineering tools</a>
          </nav>
          <AbutmentStability />
        </div>
      </section>
    </main>
  );
}
