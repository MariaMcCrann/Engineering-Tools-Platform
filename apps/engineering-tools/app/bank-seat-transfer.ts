export const abutmentPath = "/abutment-foundations";
export const seatTransferKey = "engineering-tools.bank-seat.reactions";

export type SeatReactions = {
  permanent: number | null;
  superimposed: number | null;
  traffic: number | null;
  trafficOptions: { name: string; value: number }[];
};

export function readSeatTransfer(): string {
  try {
    return new URLSearchParams(window.location.search).has("from-seat")
      ? window.sessionStorage.getItem(seatTransferKey) ?? "" : "";
  } catch {
    return "";
  }
}

export function parseSeatTransfer(raw: string): SeatReactions | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as SeatReactions | null;
    const valid = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0;
    return data && [data.permanent, data.superimposed, data.traffic].every(value => value === null || valid(value)) &&
      Array.isArray(data.trafficOptions) && data.trafficOptions.every(row => row && typeof row.name === "string" && valid(row.value))
      ? data : null;
  } catch {
    return null;
  }
}
