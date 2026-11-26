import { AbutmentStability } from "../AbutmentStability";

export default function AbutmentFoundationsPage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto grid w-full max-w-5xl gap-5 px-4 py-6 sm:px-6">
        <header>
          <h1 className="text-2xl font-semibold">Abutment and Foundations</h1>
        </header>
        <nav aria-label="Related bridge tools" className="flex flex-wrap gap-4 underline">
          <a href="/bank-seat">Bridge Bank Seat</a>
          <a href="/">All engineering tools</a>
        </nav>
        <AbutmentStability />
      </div>
    </main>
  );
}
