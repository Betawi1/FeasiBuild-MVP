import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
  h1: ({ children }) => (
    <h2 className="pt-2 text-3xl font-semibold text-white">{children}</h2>
  ),
  h2: ({ children }) => (
    <h2 className="pt-4 text-2xl font-semibold text-white">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="pt-2 text-xl font-semibold text-white">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-base leading-relaxed text-slate-300">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc space-y-2 pl-5 text-slate-300">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal space-y-2 pl-5 text-slate-300">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-emerald-500 bg-emerald-500/5 px-5 py-4 text-lg italic leading-relaxed text-slate-200">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-emerald-400 underline-offset-2 transition hover:text-emerald-300 hover:underline"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-slate-200">{children}</em>,
  hr: () => <hr className="border-slate-800" />,
  code: ({ children }) => (
    <code className="rounded bg-slate-800 px-1.5 py-0.5 text-sm text-emerald-300">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-200">
      {children}
    </pre>
  ),
};

function isPlaceholder(markdown: string): boolean {
  const stripped = markdown.replace(/<!--[\s\S]*?-->/g, "").trim();
  return stripped.length === 0;
}

export default function MarkdownBody({ markdown }: { markdown: string }) {
  if (isPlaceholder(markdown)) {
    return (
      <p className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-6 text-sm text-slate-500">
        Article body coming soon.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
