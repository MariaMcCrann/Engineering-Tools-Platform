export type StageRow = {
  stage: number;
  storage: number;
  area: number;
  length: number;
  width: number;
};

export type BasinGeometryInput = {
  nwlArea: number;
  lengthWidthRatio: number;
  permanentPoolDepth: number;
  extendedDetentionDepth: number;
  sideSlope: number;
  stageIncrement: number;
};

export function buildStageStorage(
  bottomLength: number,
  bottomWidth: number,
  sideSlope: number,
  maxStage: number,
  increment: number,
): StageRow[] {
  const rows: StageRow[] = [{
    stage: 0,
    storage: 0,
    area: bottomLength * bottomWidth,
    length: bottomLength,
    width: bottomWidth,
  }];

  let stage = 0;
  while (stage < maxStage - 1e-9) {
    const previous = rows[rows.length - 1];
    const nextStage = Math.min(Math.round((stage + increment) * 100) / 100, maxStage);
    const depthIncrement = nextStage - stage;
    const sideExpansion = depthIncrement * sideSlope;
    const length = previous.length + 2 * sideExpansion;
    const width = previous.width + 2 * sideExpansion;
    const area = length * width;

    // Matches the incremental trapezoidal stage-storage method in the source workbook.
    const storage = previous.storage
      + previous.area * depthIncrement
      + depthIncrement * sideExpansion * previous.length
      + previous.width * depthIncrement * sideExpansion;

    rows.push({ stage: nextStage, storage, area, length, width });
    stage = nextStage;
  }
  return rows;
}

export function storageAtDepth(rows: StageRow[], depth: number) {
  if (depth <= rows[0].stage) return rows[0].storage;
  for (let index = 1; index < rows.length; index += 1) {
    if (rows[index].stage >= depth) {
      const previous = rows[index - 1];
      const next = rows[index];
      const fraction = next.stage === previous.stage ? 0 : (depth - previous.stage) / (next.stage - previous.stage);
      return previous.storage + (next.storage - previous.storage) * fraction;
    }
  }
  return rows[rows.length - 1].storage;
}

export function calculateBasinGeometry(input: BasinGeometryInput) {
  const { nwlArea, lengthWidthRatio, permanentPoolDepth, extendedDetentionDepth, sideSlope, stageIncrement } = input;
  const values = [nwlArea, lengthWidthRatio, permanentPoolDepth, extendedDetentionDepth, sideSlope, stageIncrement];
  if (!values.every(Number.isFinite) || nwlArea <= 0 || lengthWidthRatio <= 0 || permanentPoolDepth <= 0 || extendedDetentionDepth < 0 || sideSlope <= 0 || stageIncrement <= 0) {
    throw new Error("Basin geometry inputs must be finite and within the permitted ranges.");
  }

  const nwlWidth = Math.sqrt(nwlArea / lengthWidthRatio);
  const nwlLength = lengthWidthRatio * nwlWidth;

  // NWL is at the top of the permanent pool, so the basin base is dp below NWL.
  // The earlier implementation incorrectly used the extended-detention depth here.
  const bottomLength = nwlLength - 2 * permanentPoolDepth * sideSlope;
  const bottomWidth = nwlWidth - 2 * permanentPoolDepth * sideSlope;
  if (bottomLength <= 0 || bottomWidth <= 0) {
    throw new Error("The selected NWL area is too small for the depth and side slopes.");
  }

  const stageRows = buildStageStorage(
    bottomLength,
    bottomWidth,
    sideSlope,
    permanentPoolDepth + extendedDetentionDepth,
    stageIncrement,
  );

  return {
    nwlWidth,
    nwlLength,
    bottomLength,
    bottomWidth,
    bottomArea: bottomLength * bottomWidth,
    stageRows,
  };
}
