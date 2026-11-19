import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

const components: Components = {
  code: ({ children }) => (
    <code className="rounded-[3px] bg-muted px-[5px] py-px font-mono text-[0.9em]">{children}</code>
  ),
};

export function InlineMarkdown({ children }: { children: string }) {
  return (
    <span>
      <ReactMarkdown
        allowedElements={["code", "strong", "em"]}
        unwrapDisallowed
        skipHtml
        components={components}
      >
        {children}
      </ReactMarkdown>
    </span>
  );
}
