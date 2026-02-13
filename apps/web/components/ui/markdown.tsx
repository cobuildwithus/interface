import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

const components: Components = {
  h1: ({ children }) => <h1 className="mb-2 text-center text-3xl font-bold">{children}</h1>,
  h2: ({ children }) => (
    <h2 className="border-border mb-4 mt-10 border-b pb-2 text-xl font-semibold">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-muted-foreground mb-3 mt-6 text-sm font-semibold uppercase tracking-wide">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-foreground mb-2 mt-6 text-sm font-semibold tracking-wide">{children}</h4>
  ),
  p: ({ children }) => <p className="text-muted-foreground mb-4 leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="text-foreground font-semibold">{children}</strong>,
  em: ({ children }) => <em className="text-muted-foreground">{children}</em>,
  ul: ({ children }) => <ul className="mb-4 space-y-2">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 space-y-2">{children}</ol>,
  li: ({ children }) => <li className="text-muted-foreground leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-border text-muted-foreground my-6 border-l-2 pl-4">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-border my-10" />,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-foreground break-all underline underline-offset-2 hover:opacity-80"
    >
      {children}
    </a>
  ),
  pre: ({ children }) => (
    <pre className="border-border bg-background text-foreground my-4 max-h-[420px] overflow-x-auto overflow-y-auto rounded-lg border p-4 text-xs leading-relaxed shadow-sm">
      {children}
    </pre>
  ),
  code: ({ children, className }) => {
    const isBlock = Boolean(className?.includes("language-"));
    if (isBlock) {
      return (
        <code className="text-foreground block whitespace-pre font-mono text-xs">{children}</code>
      );
    }

    return (
      <code className="bg-muted/50 text-foreground rounded px-1.5 py-0.5 font-mono text-xs">
        {children}
      </code>
    );
  },
};

type MarkdownProps = {
  children: string;
  className?: string;
};

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={className}>
      <ReactMarkdown components={components}>{children}</ReactMarkdown>
    </div>
  );
}
