export function generateWarehousePhasingSCurve(
  constructionPeriodMonths: number,
  _subType: string
): {
  buildingShell: number[];
  siteYardWorks: number[];
  loadingAccess: number[];
  specialisedSystems: number[];
} {
  const generateCurve = (
    earlyPct: number,
    midPct: number,
    latePct: number,
    finalPct: number
  ): number[] => {
    const months = Math.max(1, Math.floor(constructionPeriodMonths));
    const curve: number[] = new Array(months + 1).fill(0);
    const quarter = Math.max(1, Math.floor(months / 4));

    for (let m = 0; m <= months; m++) {
      if (m <= quarter) {
        curve[m] = earlyPct / (quarter + 1);
      } else if (m <= quarter * 2) {
        curve[m] = midPct / quarter;
      } else if (m <= quarter * 3) {
        curve[m] = latePct / quarter;
      } else {
        const finalMonths = Math.max(1, months - quarter * 3);
        curve[m] = finalPct / finalMonths;
      }
    }

    const sum = curve.reduce((a, b) => a + b, 0);
    if (sum > 0) {
      for (let i = 0; i < curve.length; i++) {
        curve[i] = (curve[i]! / sum) * 100;
      }
    }

    return curve;
  };

  return {
    buildingShell: generateCurve(15, 35, 35, 15),
    siteYardWorks: generateCurve(40, 30, 20, 10),
    loadingAccess: generateCurve(10, 20, 40, 30),
    specialisedSystems: generateCurve(10, 20, 40, 30),
  };
}
