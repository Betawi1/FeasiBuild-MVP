import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleView from "@/components/blog/ArticleView";
import LinkedInPostView from "@/components/blog/LinkedInPostView";
import {
  getAllBlogSlugs,
  getBlogEntryBySlug,
  posterFileExists,
  resolveRelatedItems,
} from "@/content/blog/catalog";
import { getRelatedPosts } from "@/content/blog/posts";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getAllBlogSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = getBlogEntryBySlug(slug);
  if (!entry) {
    return { title: "Post not found | FeasiBuild Learn" };
  }

  if (entry.kind === "article") {
    const { article } = entry;
    return {
      title: article.metaTitle,
      description: article.metaDescription,
      keywords: article.keywords,
      openGraph: {
        title: article.metaTitle,
        description: article.metaDescription,
        type: "article",
        publishedTime: article.date,
        authors: [article.author],
        images: [{ url: article.poster, alt: article.title }],
      },
      twitter: {
        card: "summary_large_image",
        title: article.metaTitle,
        description: article.metaDescription,
        images: [article.poster],
      },
    };
  }

  const { post } = entry;
  const title = `${post.title} | FeasiBuild Learn`;
  return {
    title,
    description: post.excerpt,
    keywords: post.keywords,
    openGraph: {
      title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      images: [{ url: post.poster, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: post.excerpt,
      images: [post.poster],
    },
  };
}

export default async function BlogEntryPage({ params }: PageProps) {
  const { slug } = await params;
  const entry = getBlogEntryBySlug(slug);
  if (!entry) notFound();

  if (entry.kind === "article") {
    return (
      <ArticleView
        article={entry.article}
        related={resolveRelatedItems(entry.article.related)}
        posterExists={posterFileExists(entry.article.poster)}
      />
    );
  }

  const relatedItems = getRelatedPosts(entry.post).flatMap((post) => {
    const related = getBlogEntryBySlug(post.slug);
    return related ? [related.item] : [];
  });

  return <LinkedInPostView post={entry.post} related={relatedItems} />;
}
