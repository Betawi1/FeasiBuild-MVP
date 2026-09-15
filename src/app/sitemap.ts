import { getBlogListItems } from "@/content/blog/catalog";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import type { MetadataRoute } from "next";

const SITE_URL = "https://www.feasibuild.app";

type ChangeFrequency = NonNullable<
  MetadataRoute.Sitemap[number]["changeFrequency"]
>;

type PageSpec = {
  route: string;
  file: string;
  changeFrequency: ChangeFrequency;
  priority: number;
};

const MARKETING_PAGES: PageSpec[] = [
  {
    route: "/",
    file: "src/app/page.tsx",
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    route: "/pricing",
    file: "src/app/pricing/page.tsx",
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    route: "/comparison",
    file: "src/app/comparison/page.tsx",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    route: "/faq",
    file: "src/app/faq/page.tsx",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    route: "/vault",
    file: "src/app/vault/page.tsx",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    route: "/founder",
    file: "src/app/founder/page.tsx",
    changeFrequency: "monthly",
    priority: 0.5,
  },
  {
    route: "/terms",
    file: "src/app/terms/page.tsx",
    changeFrequency: "yearly",
    priority: 0.4,
  },
  {
    route: "/refund-policy",
    file: "src/app/refund-policy/page.tsx",
    changeFrequency: "yearly",
    priority: 0.4,
  },
  {
    route: "/privacy-policy",
    file: "src/app/privacy-policy/page.tsx",
    changeFrequency: "yearly",
    priority: 0.4,
  },
];

async function lastModifiedFor(filePath: string): Promise<Date> {
  try {
    const info = await stat(path.join(process.cwd(), filePath));
    return info.mtime;
  } catch {
    return new Date();
  }
}

function docsPriority(route: string): number {
  if (route === "/docs") return 0.8;
  const depth = route.slice("/docs/".length).split("/").length;
  return depth === 1 ? 0.7 : 0.6;
}

async function collectDocsRoutes(
  dir: string,
  urlPath: string,
): Promise<MetadataRoute.Sitemap> {
  const entries = await readdir(dir, { withFileTypes: true });
  const pages: MetadataRoute.Sitemap = [];

  const pageFile = entries.find(
    (entry) => entry.isFile() && /^page\.(tsx|ts|jsx|js|mdx)$/.test(entry.name),
  );

  if (pageFile) {
    const info = await stat(path.join(dir, pageFile.name));
    pages.push({
      url: `${SITE_URL}${urlPath}`,
      lastModified: info.mtime,
      changeFrequency: "monthly",
      priority: docsPriority(urlPath),
    });
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".") || entry.name.startsWith("_")) continue;
    if (entry.name.startsWith("(") && entry.name.endsWith(")")) continue;

    pages.push(
      ...(await collectDocsRoutes(
        path.join(dir, entry.name),
        `${urlPath}/${entry.name}`,
      )),
    );
  }

  return pages;
}

function toAbsoluteUrl(route: string): string {
  return route === "/" ? SITE_URL : `${SITE_URL}${route}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const marketing = await Promise.all(
    MARKETING_PAGES.map(async (page) => ({
      url: toAbsoluteUrl(page.route),
      lastModified: await lastModifiedFor(page.file),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
  );

  const docs = await collectDocsRoutes(
    path.join(process.cwd(), "src/app/docs"),
    "/docs",
  );

  const blogIndexModified = await lastModifiedFor("src/content/blog/posts.ts");
  const blogItems = getBlogListItems();
  const blog: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/blog`,
      lastModified: blogIndexModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...(await Promise.all(
      blogItems.map(async (item) => ({
        url: `${SITE_URL}/blog/${item.slug}`,
        lastModified: await lastModifiedFor(
          item.kind === "article"
            ? `src/content/blog/articles/${item.slug}.md`
            : "src/content/blog/posts.ts",
        ),
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
    )),
  ];

  return [...marketing, ...docs, ...blog];
}
