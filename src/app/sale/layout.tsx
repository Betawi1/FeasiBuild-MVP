"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import useFinModelStore from "@/store/useFinModelStore";

export default function SaleLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const assetType = useFinModelStore((s) => s.assetType);
  const setAssetType = useFinModelStore((s) => s.setAssetType);

  useEffect(() => {
    if (!assetType) {
      setAssetType("sale");
      return;
    }
    if (assetType !== "sale") {
      router.replace(pathname.replace(/^\/sale/, "/operational"));
    }
  }, [assetType, pathname, router, setAssetType]);

  return <>{children}</>;
}

