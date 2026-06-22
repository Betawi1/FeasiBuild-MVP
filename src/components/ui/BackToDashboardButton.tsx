"use client";

import Link from "next/link";
import { studyToolbarSecondaryBtn } from "@/components/ui/studyToolbarStyles";

export default function BackToDashboardButton() {
  return (
    <Link href="/dashboard" className={studyToolbarSecondaryBtn}>
      ← Dashboard
    </Link>
  );
}
