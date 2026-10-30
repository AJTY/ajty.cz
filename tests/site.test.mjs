import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { createHash } from "node:crypto";

const PUBLIC = new URL("../public/", import.meta.url).pathname;
const read = (p) => readFileSync(join(PUBLIC, p), "utf8");
const TEXT_EXT = new Set([".html", ".css", ".js", ".mjs", ".json", ".txt", ".svg", ".xml", ".webmanifest"]);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

// Client names that must never appear, stored as SHA-256 of the lowercase name
// (length, hash) so this public repo doesn't name them either.
const FORBIDDEN = [
  [4, "3a2f9831dcd1d323649fec49a7aeef10e65af22cf5b7151224795d90b5f37f66"],
  [7, "1fccdf7e43c8727bcfe12b960dcb23ad202b05cad5d89f667ee16eef948b9422"],
  [9, "69d94c12822d074442b3a268f3376da9fbd7508a44247b993726d14071abb1d8"],
];
const sha256 = (s) => createHash("sha256").update(s).digest("hex");

test("no forbidden client names", () => {
  for (const file of walk(PUBLIC).filter((f) => TEXT_EXT.has(extname(f)))) {
    const text = readFileSync(file, "utf8").toLowerCase();
    for (const [len, hash] of FORBIDDEN) {
      for (let i = 0; i + len <= text.length; i++) {
        assert.notEqual(sha256(text.slice(i, i + len)), hash, `${file} mentions a forbidden client name at offset ${i}`);
      }
    }
  }
});

test("no external scripts, images or trackers", () => {
  const html = read("index.html");
  assert.doesNotMatch(html, /<script[^>]+src="https?:/i);
  assert.doesNotMatch(html, /<img[^>]+src="https?:/i);
  assert.doesNotMatch(html, /<link[^>]+href="https?:\/\/fonts/i);
  assert.doesNotMatch(html, /newrelic|NREUM/);
});

test("old site removed", () => {
  for (const p of ["tiskni3d", "test.txt", "js/libs", "vendors", "js/script.js"]) {
    assert.ok(!existsSync(join(PUBLIC, p)), `${p} still exists`);
  }
});

test("index_cz redirects to home", () => {
  const html = read("index_cz.html");
  assert.match(html, /http-equiv="refresh"/);
  assert.match(html, /url=\//);
});

test("english page", () => {
  assert.match(read("index.html"), /<html lang="en"/);
});

test("software section", () => {
  const html = read("index.html");
  assert.match(html, /id="software"/);
  assert.ok(html.includes("CWA Engineers"));
  assert.ok(html.includes("ČVUT"));
  assert.match(html, /href="#company"/);
  assert.doesNotMatch(html, /<img[^>]+src="[^"]*(cwa|cvut)[^"]*"/i, "client names only, no logos");
});

test("muller motorsport section", () => {
  const html = read("index.html");
  assert.match(html, /id="muller-motorsport"/);
  assert.match(html, /href="https:\/\/mullermotorsport\.com"/);
  const imgs = [...html.matchAll(/<img[^>]+src="img\/mm\/[^"]+"[^>]*>/g)].map((m) => m[0]);
  assert.ok(imgs.length >= 3, "at least 3 product images");
  for (const img of imgs) {
    assert.match(img, /alt="[^"]+"/);
    assert.match(img, /width="\d+"/);
    assert.match(img, /height="\d+"/);
    assert.match(img, /loading="lazy"/);
    const src = img.match(/src="([^"]+)"/)[1];
    assert.ok(existsSync(join(PUBLIC, src)), `${src} exists`);
    assert.ok(statSync(join(PUBLIC, src)).size <= 150 * 1024, `${src} ≤ 150 KB`);
  }
});

test("meta and a11y basics", () => {
  const html = read("index.html");
  assert.match(html, /<meta name="viewport"/);
  assert.match(html, /<meta name="description"/);
  assert.match(html, /<link rel="icon"/);
  for (const p of ["og:title", "og:description", "og:image"]) assert.match(html, new RegExp(`property="${p}"`));
  const og = html.match(/property="og:image" content="([^"]+)"/)[1];
  assert.ok(!/^https?:\/\/(?!ajty\.cz)/.test(og), "og:image is local to ajty.cz");
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, "exactly one h1");
  for (const img of html.match(/<img[^>]*>/g) || []) assert.match(img, /alt="/);
});
