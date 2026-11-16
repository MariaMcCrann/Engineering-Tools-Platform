import Link from "next/link";
import { LiftingBeamTool } from "../LiftingBeamTool";

export const metadata = {
  title: "Lifting Beams | Engineering Tools",
  description: "Bridge lifting beam actions, deflection and load envelopes. Preliminary member analysis with explicit design assumptions.",
};

export default function LiftingBeamsPage() {
  return <main className="app-shell">
    <section className="workspace" style={{ marginLeft: 0, width: "100%" }}>
      <header className="hub-header"><span>Lifting Beams</span><Link href="/">All engineering tools</Link></header>
      <LiftingBeamTool />
    </section>
  </main>;
}
