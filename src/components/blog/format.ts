import { format, parseISO } from "date-fns";
import type { BlogPost } from "@/content/blog/posts";

export function formatPostDate(date: string): string {
  return format(parseISO(date), "d MMM yyyy");
}

export function postMetaLine(post: Pick<BlogPost, "date" | "readTime">): string {
  return `${formatPostDate(post.date)} • ${post.readTime}`;
}
