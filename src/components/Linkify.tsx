import { Fragment, type ReactNode } from "react";

// Matches full URLs (http/https/www) and bare domains like czek.qzz.io or site.com/path
const URL_RE =
  /\b((?:https?:\/\/|www\.)[^\s<]+|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,24}(?::\d+)?(?:\/[^\s<]*)?)/gi;

function trimTrailing(url: string) {
  const m = url.match(/[.,!?;:)\]'"]+$/);
  return m ? [url.slice(0, -m[0].length), m[0]] : [url, ""];
}

export function linkify(text: string | null | undefined): ReactNode {
  if (!text) return text;
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const match of text.matchAll(URL_RE)) {
    const start = match.index ?? 0;
    // Skip emails (preceded by @)
    if (start > 0 && text[start - 1] === "@") continue;
    const [url, tail] = trimTrailing(match[0]);
    if (start > last) out.push(text.slice(last, start));
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    out.push(
      <a
        key={`l${i++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="break-all text-sky-400 underline underline-offset-2 hover:text-sky-300"
      >
        {url}
      </a>,
    );
    if (tail) out.push(tail);
    last = start + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.map((n, k) => <Fragment key={k}>{n}</Fragment>);
}

export function Linkify({ text }: { text: string | null | undefined }) {
  return <>{linkify(text)}</>;
}
