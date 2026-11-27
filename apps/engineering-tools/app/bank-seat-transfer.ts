import { useSyncExternalStore } from "react";

export const bankSeatPath = "/bank-seat";
export const abutmentPath = "/abutment-foundations";
export const seatTransferKey = "engineering-tools.bank-seat.reactions";
export const seatInputsKey = "engineering-tools.bank-seat.inputs";
export const abutmentInputsKey = "engineering-tools.abutment.inputs";
export const openToolEvent = "engineering-tools:open-tool";

export type BridgeView = "bank-seat" | "abutment-foundations";

export type SeatReactions = {
  permanent: number | null;
  superimposed: number | null;
  traffic: number | null;
  trafficOptions: { name: string; value: number }[];
  span?: number | null;
  lanes?: number | null;
  braking?: number | null;
  governing?: string | null;
};

// Latest deck actions calculated in Bridge Bank Seat during this browser session.
export function readSeatTransfer(): string {
  try {
    return window.sessionStorage.getItem(seatTransferKey) ?? "";
  } catch {
    return "";
  }
}

export function parseSeatTransfer(raw: string): SeatReactions | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as SeatReactions | null;
    const valid = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0;
    return data && [data.permanent, data.superimposed, data.traffic, data.span ?? null, data.lanes ?? null, data.braking ?? null]
      .every(value => value === null || valid(value)) &&
      (data.governing === undefined || data.governing === null || typeof data.governing === "string") &&
      Array.isArray(data.trafficOptions) && data.trafficOptions.every(row => row && typeof row.name === "string" && valid(row.value))
      ? data : null;
  } catch {
    return null;
  }
}

export function loadState<T>(key: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

export function saveState(key: string, value: unknown) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable (private mode). The tools still work without it.
  }
}

// Inside the dashboard the tool views switch in place; on the standalone pages this falls back to a page load.
export function openBridgeTool(view: BridgeView) {
  const handled = !window.dispatchEvent(new CustomEvent(openToolEvent, { detail: view, cancelable: true }));
  if (!handled) window.location.assign(view === "bank-seat" ? bankSeatPath : abutmentPath);
  else window.scrollTo({ top: 0 });
}

const noSubscribe = () => () => {};
// False during server rendering and hydration, true afterwards, so saved inputs load without a hydration mismatch.
export function useClientReady() {
  return useSyncExternalStore(noSubscribe, () => true, () => false);
}
