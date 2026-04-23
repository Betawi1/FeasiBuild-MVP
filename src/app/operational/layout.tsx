"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import useFinModelStore from "@/store/useFinModelStore";

export default function OperationalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const assetType = useFinModelStore((s) => s.assetType);
  const setAssetType = useFinModelStore((s) => s.setAssetType);

  useEffect(() => {
    if (!assetType) {
      setAssetType("operational");
      return;
    }
    if (assetType !== "operational") {
      router.replace(pathname.replace(/^\/operational/, "/sale"));
    }
  }, [assetType, pathname, router, setAssetType]);

  return <>{children}</>;
}

