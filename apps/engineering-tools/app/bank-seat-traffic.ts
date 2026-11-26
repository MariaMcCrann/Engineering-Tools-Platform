export function peakReaction(span: number, axles: number[][]) {
  let peak = 0;
  for (const [, offset] of axles) {
    // Between axle crossings, the reaction is linear in the train position.
    for (const first of [-offset, span - offset]) {
      const reaction = axles.reduce((sum, [load, distance]) => {
        const x = first + distance;
        const inside = x >= -1e-9 && x <= span + 1e-9;
        return sum + (inside ? load * (1 - Math.max(0, Math.min(span, x)) / span) : 0);
      }, 0);
      peak = Math.max(peak, reaction);
    }
  }
  return peak;
}


export function sm1600Reactions(span: number, lanes: number) {
  // For a positive, decreasing end-reaction influence line, the minimum gap
  // governs. Check both travel directions for the asymmetric group spacing.
  const offsets = [0, 1.25, 2.5, 6.25, 7.5, 8.75, 15, 16.25, 17.5, 22.5, 23.75, 25];
  const laneFactor = 1 + (lanes >= 2 ? 0.8 : 0) + Math.max(0, lanes - 2) * 0.4;
  return [
    { name: "S1600", axle: 80, offsets, udl: 24, alpha: 0 },
    { name: "M1600", axle: 120, offsets, udl: 6, alpha: 0.3 },
    { name: "M1600 tri-axle", axle: 120, offsets: offsets.slice(0, 3), udl: 6, alpha: 0.35 },
    { name: "A160", axle: 160, offsets: [0], udl: 0, alpha: 0.4 },
  ].map(model => {
    const forward = model.offsets.map(x => [model.axle, x]);
    const end = model.offsets[model.offsets.length - 1];
    const reverse = model.offsets.map(x => [model.axle, end - x]);
    const axleReaction = Math.max(peakReaction(span, forward), peakReaction(span, reverse));
    const udlReaction = model.udl * span / 2;
    const laneReaction = (axleReaction + udlReaction) * (1 + model.alpha);
    return { ...model, axleReaction, udlReaction, laneReaction, total: laneReaction * laneFactor };
  });
}

export function rectangularContactArea(length: number, width: number) {
  return length > 0 && width > 0 && Number.isFinite(length * width) ? length * width : NaN;
}
