import { BLOG_CATEGORIES, type BlogCategory, type BlogPersona } from "@/content/blog/posts";

export const ARTICLE_CATEGORIES = [
  "Guide",
  "Metrics",
  "Comparison",
  "Software",
] as const;

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

export type UnifiedBlogCategory = BlogCategory | ArticleCategory;

export const BLOG_FILTER_CATEGORIES: UnifiedBlogCategory[] = [
  ...BLOG_CATEGORIES,
  ...ARTICLE_CATEGORIES,
];

export type BlogKind = "post" | "article";

export type BlogListItem = {
  kind: BlogKind;
  slug: string;
  title: string;
  excerpt: string;
  category: UnifiedBlogCategory;
  persona: BlogPersona;
  jurisdictions: string[];
  tags: string[];
  keywords: string[];
  date: string;
  readTime: string;
  author: string;
  poster: string;
  deckPdf: string;
  slides: string[];
  posterExists?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  related?: string[];
};

export type BlogArticle = Omit<BlogListItem, "kind" | "category" | "metaTitle" | "metaDescription" | "related"> & {
  kind: "article";
  category: ArticleCategory;
  metaTitle: string;
  metaDescription: string;
  related: string[];
  markdown: string;
};

export function searchBlogItems(
  items: BlogListItem[],
  query: string,
  category: UnifiedBlogCategory | "All"
): BlogListItem[] {
  const needle = query.trim().toLowerCase();
  return items.filter((item) => {
    if (category !== "All" && item.category !== category) return false;
    if (!needle) return true;
    const haystack = [
      item.title,
      item.excerpt,
      item.persona,
      item.category,
      item.author,
      item.metaDescription ?? "",
      ...item.tags,
      ...item.keywords,
      ...item.jurisdictions,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}
