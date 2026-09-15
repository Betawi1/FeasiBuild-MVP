import "server-only";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import {
  getPostsSorted,
  posts,
  type BlogPersona,
  type BlogPost,
} from "@/content/blog/posts";
import type {
  ArticleCategory,
  BlogArticle,
  BlogListItem,
} from "@/content/blog/categories";

const ARTICLES_DIR_CANDIDATES = [
  path.join(path.dirname(fileURLToPath(import.meta.url)), "articles"),
  path.join(process.cwd(), "src/content/blog/articles"),
];

const ARTICLES_DIR =
  ARTICLES_DIR_CANDIDATES.find((dir) => fs.existsSync(dir)) ??
  ARTICLES_DIR_CANDIDATES[1];

const ARTICLE_CATEGORY_SET = new Set<ArticleCategory>([
  "Guide",
  "Metrics",
  "Comparison",
  "Software",
]);

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item));
}

function parseCategory(value: unknown): ArticleCategory {
  const category = asString(value);
  if (ARTICLE_CATEGORY_SET.has(category as ArticleCategory)) {
    return category as ArticleCategory;
  }
  return "Guide";
}

function parsePersona(value: unknown): BlogPersona {
  const persona = asString(value, "All");
  const allowed: BlogPersona[] = [
    "Closer",
    "Scout",
    "Workhorse",
    "Auditor",
    "Teacher",
    "All",
  ];
  return allowed.includes(persona as BlogPersona)
    ? (persona as BlogPersona)
    : "All";
}

function loadArticleFile(fileName: string): BlogArticle {
  const slug = fileName.replace(/\.md$/, "");
  const raw = fs.readFileSync(path.join(ARTICLES_DIR, fileName), "utf8");
  const { data, content } = matter(raw);

  return {
    kind: "article",
    slug,
    title: asString(data.title, slug),
    excerpt: asString(data.excerpt),
    category: parseCategory(data.category),
    persona: parsePersona(data.persona),
    jurisdictions: asStringArray(data.jurisdictions),
    tags: asStringArray(data.tags),
    keywords: asStringArray(data.keywords),
    date: asString(data.date),
    readTime: asString(data.readTime, "4 min read"),
    author: asString(data.author, "Rashdan"),
    poster: asString(data.poster, `/blog/${slug}/poster.png`),
    deckPdf: asString(data.deckPdf),
    slides: asStringArray(data.slides),
    metaTitle: asString(data.metaTitle, `${asString(data.title, slug)} | FeasiBuild Learn`),
    metaDescription: asString(data.metaDescription, asString(data.excerpt)),
    related: asStringArray(data.related),
    markdown: content.trim(),
  };
}

export function loadArticles(): BlogArticle[] {
  if (!fs.existsSync(ARTICLES_DIR)) return [];
  return fs
    .readdirSync(ARTICLES_DIR)
    .filter((fileName) => fileName.endsWith(".md"))
    .map(loadArticleFile)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function getArticleBySlug(slug: string): BlogArticle | undefined {
  const fileName = `${slug}.md`;
  const filePath = path.join(ARTICLES_DIR, fileName);
  if (!fs.existsSync(filePath)) return undefined;
  return loadArticleFile(fileName);
}

function postToListItem(post: BlogPost): BlogListItem {
  return {
    kind: "post",
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    category: post.category,
    persona: post.persona,
    jurisdictions: post.jurisdictions,
    tags: post.tags,
    keywords: post.keywords,
    date: post.date,
    readTime: post.readTime,
    author: post.author,
    poster: post.poster,
    deckPdf: post.deckPdf,
    slides: post.slides ?? [],
    posterExists: posterFileExists(post.poster),
  };
}

function articleToListItem(article: BlogArticle): BlogListItem {
  return {
    kind: "article",
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    category: article.category,
    persona: article.persona,
    jurisdictions: article.jurisdictions,
    tags: article.tags,
    keywords: article.keywords,
    date: article.date,
    readTime: article.readTime,
    author: article.author,
    poster: article.poster,
    deckPdf: article.deckPdf,
    slides: article.slides,
    posterExists: posterFileExists(article.poster),
    metaTitle: article.metaTitle,
    metaDescription: article.metaDescription,
    related: article.related,
  };
}

export function getBlogListItems(): BlogListItem[] {
  const items: BlogListItem[] = [
    ...getPostsSorted().map(postToListItem),
    ...loadArticles().map(articleToListItem),
  ];
  return items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function getAllBlogSlugs(): string[] {
  return [
    ...posts.map((post) => post.slug),
    ...loadArticles().map((article) => article.slug),
  ];
}

export type BlogEntry =
  | { kind: "post"; post: BlogPost; item: BlogListItem }
  | { kind: "article"; article: BlogArticle; item: BlogListItem };

export function getBlogEntryBySlug(slug: string): BlogEntry | undefined {
  const post = posts.find((candidate) => candidate.slug === slug);
  if (post) {
    return { kind: "post", post, item: postToListItem(post) };
  }
  const article = getArticleBySlug(slug);
  if (article) {
    return { kind: "article", article, item: articleToListItem(article) };
  }
  return undefined;
}

export function resolveRelatedItems(slugs: string[]): BlogListItem[] {
  const catalog = new Map(getBlogListItems().map((item) => [item.slug, item]));
  return slugs
    .map((slug) => catalog.get(slug))
    .filter((item): item is BlogListItem => Boolean(item));
}

export function posterFileExists(poster: string): boolean {
  if (!poster.startsWith("/")) return false;
  return fs.existsSync(path.join(process.cwd(), "public", poster));
}

