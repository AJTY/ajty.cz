import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formatDetails, copyText } from "../public/js/copy.js";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
// Each copyable element: data-copy = bare value; optional data-copy-line = labelled line used by "Copy all".
const copyEls = [...html.matchAll(/<[a-z]+[^>]*\sdata-copy="([^"]*)"[^>]*>/g)].map((m) => {
  const line = m[0].match(/data-copy-line="([^"]*)"/);
  return { value: decode(m[1]), line: decode(line ? line[1] : m[1]) };
});

test("formatDetails trims, drops empties and collapses whitespace", () => {
  assert.equal(formatDetails(["  AjTy, s.r.o. ", "", "IČO:   28948742"]), "AjTy, s.r.o.\nIČO: 28948742");
});

test("copyText resolves true when clipboard write succeeds", async () => {
  assert.equal(await copyText("x", { writeText: async () => {} }), true);
});

test("copyText resolves false when clipboard write rejects", async () => {
  assert.equal(await copyText("x", { writeText: async () => { throw new Error("denied"); } }), false);
});

test("copyText resolves false when clipboard is unavailable", async () => {
  assert.equal(await copyText("x", undefined), false);
});

test("company block matches spec", () => {
  const expected = [
    "AjTy, s.r.o.",
    "Antala Staška 1074/53a, 140 00 Praha 4 – Krč, Czech Republic",
    "IČO: 28948742",
    "DIČ: CZ28948742",
    "Registered in the Commercial Register kept by the Municipal Court in Prague, Section C, Insert 155159",
    "+420 241 021 999",
    "info@ajty.cz",
  ];
  for (const v of expected) {
    assert.equal(copyEls.filter((c) => c.line === v).length, 1, `copy-all line "${v}" should appear exactly once`);
  }
  for (const v of ["28948742", "CZ28948742"]) {
    assert.ok(copyEls.some((c) => c.value === v), `single copy of "${v}" is the bare value`);
  }
  assert.match(
    html,
    /href="https:\/\/www\.google\.com\/maps\/search\/\?api=1&amp;query=Antala\+Sta%C5%A1ka\+1074%2F53a%2C\+140\+00\+Praha\+4"[^>]*target="_blank"/
  );
  assert.ok(html.includes("+420 731 573 068"), "CEO phone present");
  assert.doesNotMatch(html, /\+1[\s(]/, "no +1 number");
  assert.doesNotMatch(html, /DUNS/i, "no DUNS line");
});

test("copy buttons are hidden until JS runs", () => {
  const buttons = [...html.matchAll(/<button[^>]*class="[^"]*copy[^"]*"[^>]*>/g)].map((m) => m[0]);
  assert.ok(buttons.length >= 8, "a copy button per detail plus copy-all");
  for (const b of buttons) assert.match(b, /\shidden/);
});

test("fallbackCopy copies via a temporary textarea and cleans up", async () => {
  const { fallbackCopy } = await import("../public/js/copy.js");
  const made = [];
  const doc = {
    body: { appendChild: (el) => made.push(el), removeChild: (el) => { el.removed = true; } },
    createElement: () => ({ style: {}, setAttribute() {}, select() { this.selected = true; } }),
    execCommand: (cmd) => cmd === "copy" && made[0]?.selected === true,
  };
  assert.equal(fallbackCopy("A\nB", doc), true);
  assert.equal(made[0].value, "A\nB");
  assert.equal(made[0].removed, true);
  const broken = { ...doc, execCommand: () => { throw new Error("nope"); } };
  assert.equal(fallbackCopy("x", broken), false);
});

test("copy result is announced in a live region", () => {
  assert.match(html, /<p[^>]*class="[^"]*copy-status[^"]*"[^>]*role="status"[^>]*>/);
});

test("contact person email and phone are copyable but not in Copy all", () => {
  const card = html.match(/<div class="contact-card">([\s\S]*?)<\/div>\s*<\/div>/)[1];
  assert.match(card, /data-copy="tomas\.sykora@ajty\.cz"/);
  assert.match(card, /data-copy="\+420 731 573 068"/);
  const details = html.match(/<dl class="details">([\s\S]*?)<\/dl>/)[1];
  assert.doesNotMatch(details, /tomas\.sykora/);
});
