// Copy-to-clipboard for the company details.
// Markup contract: <span data-copy="VALUE" [data-copy-line="LABEL: VALUE"]>…</span>
// with a sibling <button class="copy-btn" hidden>. One <button class="copy-all" hidden>
// copies every value inside .details. A <p class="copy-status" role="status"> announces results.
// Buttons stay hidden without JS, so the details remain plain text.

export function formatDetails(items) {
  return items
    .map((item) => String(item).replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

export async function copyText(text, clipboard = globalThis.navigator?.clipboard) {
  if (!clipboard || typeof clipboard.writeText !== "function") return false;
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// Older browsers and non-secure pages: copy through a temporary off-screen textarea.
export function fallbackCopy(text, doc = globalThis.document) {
  const area = doc.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  doc.body.appendChild(area);
  try {
    area.select();
    return doc.execCommand("copy") === true;
  } catch {
    return false;
  } finally {
    doc.body.removeChild(area);
  }
}

async function copy(text) {
  return (await copyText(text)) || fallbackCopy(text);
}

function selectText(el) {
  const selection = globalThis.getSelection?.();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  selection.removeAllRanges();
  selection.addRange(range);
}

function flash(button, status, ok, what, selected = true) {
  const label = button.dataset.label ?? button.textContent;
  button.dataset.label = label;
  button.textContent = ok ? "Copied ✓" : selected ? "Selected — copy it" : "Copy failed";
  button.classList.toggle("is-copied", ok);
  if (status) {
    status.textContent = ok
      ? `Copied ${what}`
      : selected
        ? `Could not copy automatically. ${what} is selected — copy it manually.`
        : `Could not copy ${what} automatically — please copy them manually.`;
  }
  clearTimeout(button._resetTimer);
  button._resetTimer = setTimeout(() => {
    button.textContent = label;
    button.classList.remove("is-copied");
  }, ok ? 1500 : 4000);
}

export function initCopyButtons(root) {
  const status = root.querySelector(".copy-status");

  for (const el of root.querySelectorAll("[data-copy]")) {
    const button = el.closest("dd, .contact-line")?.querySelector(".copy-btn");
    if (!button) continue;
    const what = (button.getAttribute("aria-label") ?? "Copy").replace(/^Copy\s*/, "") || "text";
    button.hidden = false;
    button.addEventListener("click", async () => {
      const ok = await copy(el.dataset.copy);
      if (!ok) selectText(el);
      flash(button, status, ok, what);
    });
  }

  const details = root.querySelector(".details");
  const copyAll = root.querySelector(".copy-all");
  if (details && copyAll) {
    copyAll.hidden = false;
    copyAll.addEventListener("click", async () => {
      const text = formatDetails(
        [...details.querySelectorAll("[data-copy]")].map((el) => el.dataset.copyLine ?? el.dataset.copy)
      );
      const ok = await copy(text);
      flash(copyAll, status, ok, "all company details", false);
    });
  }
}
