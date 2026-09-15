import type { Metadata } from "next";
import BlogIndex from "@/components/blog/BlogIndex";
import { getBlogListItems } from "@/content/blog/catalog";

export const metadata: Metadata = {
  title: "FeasiBuild Learn — feasibility intelligence for developers, valuers & financiers",
  description:
    "Searchable essays, LinkedIn posters, and slide decks on real estate feasibility, underwriting, and FeasiBuild’s two financial engines.",
  keywords: [
    "FeasiBuild Learn",
    "feasibility study",
    "real estate underwriting",
    "development appraisal",
    "AI feasibility",
  ],
};

export default function BlogPage() {
  const entries = getBlogListItems();
  return <BlogIndex entries={entries} />;
}
