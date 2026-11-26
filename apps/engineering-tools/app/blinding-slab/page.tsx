import { BlindingSlabTool } from "../BlindingSlabTool";

export default function BlindingSlabPage() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <header><h1 className="text-2xl font-semibold">Blinding Slab</h1></header>
        <BlindingSlabTool />
      </section>
    </main>
  );
}
