"use client";

import { useEffect, useRef } from "react";

/** Same-origin isolation preserves the verified calculator and its scoped print CSS.
 * Case import/export and printing are handled inside the calculator; generic DOM
 * project capture deliberately does not claim to capture iframe inputs. */
export function LiftingBeamTool() {
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    let observer: ResizeObserver | undefined;
    const connect = () => {
      observer?.disconnect();
      const body = element.contentDocument?.body;
      if (!body) return;
      const resize = () => {
        const height = Math.min(30000, Math.max(600, Math.ceil(body.getBoundingClientRect().height) + 4));
        if (element.style.height !== `${height}px`) element.style.height = `${height}px`;
      };
      observer = new ResizeObserver(resize);
      observer.observe(body);
      resize();
    };
    element.addEventListener("load", connect);
    connect();
    return () => {
      observer?.disconnect();
      element.removeEventListener("load", connect);
    };
  }, []);

  return <section aria-label="Lifting beam calculator" style={{ minWidth: 0 }}>
    <p className="answer-note" style={{ margin: "12px 20px" }}>
      Use Save case / Open case within this tool for calculation files, and Print report for the complete calculation record.
    </p>
    <iframe
      ref={frame}
      title="Lifting beam calculator"
      src="/calculators/lifting-beams/index.html"
      style={{ display: "block", width: "100%", height: 2400, border: 0, background: "#f4f6f5" }}
    />
  </section>;
}
