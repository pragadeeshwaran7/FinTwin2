// Minimal, safe Markdown renderer for assistant replies:
// paragraphs, "- " bullet lists, **bold**, _italic_ and `code`. No raw HTML.
function inline(text, keyPrefix) {
  const parts = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|_[^_]+_|\*[^*]+\*)/g;
  let last = 0;
  let m;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyPrefix}-${i++}`;
    if (tok.startsWith('**')) parts.push(<strong key={key} className="font-semibold text-foreground">{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith('`')) parts.push(<code key={key}>{tok.slice(1, -1)}</code>);
    else parts.push(<em key={key}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function Markdown({ text }) {
  const blocks = [];
  let list = null;
  text.split('\n').forEach((raw, idx) => {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)$/);
    if (bullet) {
      if (!list) {
        list = [];
        blocks.push({ type: 'ul', items: list });
      }
      list.push(bullet[1]);
      return;
    }
    list = null;
    if (!line.trim()) return;
    const heading = line.match(/^#{1,4}\s+(.*)$/);
    blocks.push({ type: heading ? 'h' : 'p', text: heading ? heading[1] : line, idx });
  });
  return (
    <div className="prose-chat text-sm leading-relaxed">
      {blocks.map((b, i) =>
        b.type === 'ul' ? (
          <ul key={i}>
            {b.items.map((it, j) => (
              <li key={j}>{inline(it, `${i}-${j}`)}</li>
            ))}
          </ul>
        ) : b.type === 'h' ? (
          <p key={i} className="font-semibold text-foreground">
            {inline(b.text, `${i}`)}
          </p>
        ) : (
          <p key={i}>{inline(b.text, `${i}`)}</p>
        ),
      )}
    </div>
  );
}
