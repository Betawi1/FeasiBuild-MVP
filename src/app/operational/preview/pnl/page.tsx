"use client";

import type { ReactNode } from "react";
import HotelPnlTable from "./components/HotelPnlTable";
import OfficePnlTable from "./components/OfficePnlTable";
import ResidentialPnlTable from "./components/ResidentialPnlTable";
import RetailPnlTable from "./components/RetailPnlTable";
import {
  streamKeyFromPrefix,
  useStreamPrefix,
} from "@/lib/stream-path";
import useFinModelStore from "@/store/useFinModelStore";

/** Pass-through wrapper; table components own page chrome and title. */
function PnlLayout({
  title: _title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return <>{children}</>;
}

export default function PnlPreviewPage() {
  const streamPrefix = useStreamPrefix();
  const finStream = streamKeyFromPrefix(streamPrefix);
  const buildingType = useFinModelStore(
    (s) => s[finStream].projectInfo.buildingType
  );

  return (
    <PnlLayout title="Operating Profit & Loss">
      {buildingType === "residential" && <ResidentialPnlTable />}
      {buildingType === "office" && <OfficePnlTable />}
      {buildingType === "retail" && <RetailPnlTable />}
      {buildingType === "hotel" && <HotelPnlTable />}
      {buildingType !== "residential" &&
        buildingType !== "retail" &&
        buildingType !== "hotel" &&
        buildingType !== "office" && <HotelPnlTable />}
    </PnlLayout>
  );
}
