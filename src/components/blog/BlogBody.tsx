import type { BlogBodyBlock } from "@/content/blog/posts";

export default function BlogBody({ body }: { body: BlogBodyBlock[] }) {
  return (
    <div className="space-y-6">
      {body.map((block, index) => {
        if (block.type === "h2") {
          return (
            <h2
              key={`${block.type}-${index}`}
              className="pt-4 text-2xl font-semibold text-white"
            >
              {block.text}
            </h2>
          );
        }
        if (block.type === "p") {
          return (
            <p
              key={`${block.type}-${index}`}
              className="text-base leading-relaxed text-slate-300"
            >
              {block.text}
            </p>
          );
        }
        if (block.type === "ul") {
          return (
            <ul
              key={`${block.type}-${index}`}
              className="list-disc space-y-2 pl-5 text-slate-300"
            >
              {block.items.map((item) => (
                <li key={item} className="leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <blockquote
            key={`${block.type}-${index}`}
            className="border-l-2 border-emerald-500 bg-emerald-500/5 px-5 py-4 text-lg italic leading-relaxed text-slate-200"
          >
            {block.text}
          </blockquote>
        );
      })}
    </div>
  );
}
