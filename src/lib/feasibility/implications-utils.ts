/** Resolve implications slide subtitle/section label from asset type. */
export function resolveImplicationsSubtitle(assetLabel?: string): string {
  if (!assetLabel) return "Market Analysis";
  if (
    assetLabel === "High-Rise Residential Tower" ||
    assetLabel === "Landed Housing Estate" ||
    assetLabel.includes("BTR") ||
    assetLabel.includes("Residential")
  ) {
    return "Residential";
  }
  if (
    assetLabel === "Regional Shopping Mall" ||
    assetLabel.includes("Mall") ||
    assetLabel.includes("Retail")
  ) {
    return "Retail";
  }
  if (
    assetLabel === "Strata Office Tower" ||
    assetLabel.includes("Office")
  ) {
    return "Office";
  }
  if (
    assetLabel.includes("Hotel") ||
    assetLabel.includes("Hospitality")
  ) {
    return "Hospitality";
  }
  if (assetLabel.includes("Mixed-Use")) return "Mixed-Use";
  return "Market Analysis";
}
