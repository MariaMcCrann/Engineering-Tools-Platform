import { BankSeatTool } from "../BankSeatTool";

export default function BankSeatPage() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <header>
          <h1 className="text-2xl font-semibold">Bridge Bank Seat</h1>
        </header>
        <BankSeatTool />
      </section>
    </main>
  );
}
