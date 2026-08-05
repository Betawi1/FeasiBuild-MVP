/** Resolve implications slide subtitle/section label from asset type. */
export function resolveImplicationsSubtitle(
  assetLabel?: string,
  options?: {
    buildingSubType?: string | null;
    salesWarehouseConfigType?: string | null;
  }
): string {
  if (!assetLabel && !options?.buildingSubType) return "Market Analysis";

  const subtype = (options?.buildingSubType ?? "")
    .toLowerCase()
    .replace(/\s+/g, "_");
  const isWarehouse =
    subtype === "commercial_strata_warehouse" ||
    subtype === "commercial-strata-warehouse" ||
    subtype === "warehouse_industrial" ||
    !!assetLabel?.includes("Warehouse") ||
    !!assetLabel?.includes("Industrial");

  if (isWarehouse) {
    if (options?.salesWarehouseConfigType === "industrial-park") {
      return "Industrial Park Development";
    }
    return "Single Warehouse Facility";
  }

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
