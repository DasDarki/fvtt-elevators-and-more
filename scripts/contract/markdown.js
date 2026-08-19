let cachedHtml = null;

export async function loadContractHtml() {
  if (cachedHtml !== null) return cachedHtml;
  const url = new URL("../../CONTRACT.md", import.meta.url).href;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const markdown = await response.text();
    cachedHtml = markdownToHtml(markdown);
  } catch (err) {
    console.error("elevators-and-more | failed to load CONTRACT.md", err);
    cachedHtml = "<p>The contract could not be summoned.</p>";
  }
  return cachedHtml;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inline(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\*)(.+?)\*(?!\*)/g, "$1<em>$2</em>");
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let buffer = [];

  const flush = () => {
    if (!buffer.length) return;
    out.push(`<p>${buffer.map(inline).join("<br>")}</p>`);
    buffer = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (trimmed === "") {
      flush();
      continue;
    }
    if (/^-{3,}$/.test(trimmed)) {
      flush();
      out.push('<hr class="eam-contract-rule">');
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flush();
      const level = heading[1].length;
      out.push(`<h${level} class="eam-contract-h eam-contract-h${level}">${inline(heading[2])}</h${level}>`);
      continue;
    }
    buffer.push(line.replace(/^\s+/, ""));
  }
  flush();
  return out.join("\n");
}
