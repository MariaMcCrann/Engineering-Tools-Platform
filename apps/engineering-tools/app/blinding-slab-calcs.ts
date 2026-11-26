export function blindingSlab(width: number, length: number, pressure: number, soil: number, density: number) {
  if (![width, length, soil, density].every(value => Number.isFinite(value) && value > 0) ||
      !Number.isFinite(pressure) || pressure < 0) return null;
  const area = width * length;
  const force = area * pressure;
  const requiredArea = force / soil;
  const areaIncrease = Math.max(0, requiredArea - area);
  // Positive root of (width + extension) × (length + extension) = requiredArea.
  // Rationalized to avoid subtracting nearly equal numbers.
  const extension = 2 * areaIncrease / (width + length + Math.hypot(width + length, 2 * Math.sqrt(areaIncrease)));
  const stripWidth = width * pressure / soil;
  const stripProjection = Math.max(0, stripWidth - width) / 2;
  const slabWidth = width + extension;
  const slabLength = length + extension;
  const slabArea = slabWidth * slabLength;
  const projection = extension / 2;
  // Round up so millimetre rounding cannot reduce the required spread.
  const thickness = Math.ceil(projection * 1000);
  const volume = slabArea * thickness / 1000;
  const mass = density * volume;
  const result = {
    area, force, requiredArea, slabWidth, slabLength, slabArea, projection, thickness, volume, mass,
    pressureWithoutWeight: force / slabArea,
    pressureWithWeight: (force + mass * 9.80665) / slabArea,
    stripReaction: width * pressure, stripWidth, stripProjection, stripThickness: Math.ceil(stripProjection * 1000),
  };
  return Object.values(result).every(Number.isFinite) ? result : null;
}
