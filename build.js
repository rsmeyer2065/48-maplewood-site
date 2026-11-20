#!/usr/bin/env node
// Builds the static site into ./public from ./content, ./src and ./photos.
// No dependencies: run with `node build.js`.
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const OUT = path.join(ROOT, "public");

const site = readJson("content/site.json");
const projects = readJson("content/projects.json");

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Notes and summaries may contain blank-line separated paragraphs.
function paras(text) {
  return String(text || "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`)
    .join("\n");
}

// A photo is either "photos/x.jpg" or { "src": "photos/x.jpg", "caption": "..." }.
function photo(p) {
  return typeof p === "string" ? { src: p, caption: "" } : { src: p.src, caption: p.caption || "" };
}

function url(rel) {
  return "/" + String(rel).replace(/^\/+/, "");
}

function placeholder(text) {
  return `<div class="placeholder">${esc(text)}</div>`;
}

function gallery(list, label) {
  if (!list || list.length === 0) return placeholder(`${label} photos to add`);
  return `<div class="gallery">${list
    .map(photo)
    .map(
      (p) => `<figure>
  <a href="${esc(url(p.src))}" class="lightbox-link"><img src="${esc(url(p.src))}" alt="${esc(p.caption || label)}" loading="lazy"></a>
  ${p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : ""}
</figure>`
    )
    .join("\n")}</div>`;
}

function compare(before, after, title) {
  if (!before?.length || !after?.length) return "";
  const b = photo(before[0]);
  const a = photo(after[0]);
  return `<div class="compare" data-compare>
  <img src="${esc(url(a.src))}" alt="${esc(title)} after" class="compare-after">
  <div class="compare-before-wrap"><img src="${esc(url(b.src))}" alt="${esc(title)} before" class="compare-before"></div>
  <input type="range" min="0" max="100" value="50" aria-label="Drag to compare before and after">
  <span class="compare-tag compare-tag-before">Before</span>
  <span class="compare-tag compare-tag-after">After</span>
</div>`;
}

function photoCount(p) {
  return p.sections.reduce((n, s) => n + (s.before?.length || 0) + (s.after?.length || 0), 0);
}

function coverFor(p) {
  if (p.cover) return p.cover;
  for (const s of p.sections) {
    if (s.after?.length) return photo(s.after[0]).src;
  }
  for (const s of p.sections) {
    if (s.before?.length) return photo(s.before[0]).src;
  }
  return "";
}

function layout({ title, body, active }) {
  const nav = [
    `<a href="/"${active === "home" ? ' aria-current="page"' : ""}>Home</a>`,
    `<a href="/home-improvements/"${active === "projects" ? ' aria-current="page"' : ""}>Projects</a>`,
  ].join("");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${site.noindex ? '<meta name="robots" content="noindex">' : ""}
<title>${esc(title)}</title>
<link rel="stylesheet" href="/styles.css">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
</head>
<body>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="/">${esc(site.title)}</a>
    <nav>${nav}</nav>
  </div>
</header>
<main class="wrap">
${body}
</main>
<footer class="site-footer"><div class="wrap">${esc(site.title)}</div></footer>
<script src="/site.js" defer></script>
</body>
</html>
`;
}

function projectCard(p) {
  const cover = coverFor(p);
  const meta = [p.date, photoCount(p) ? `${photoCount(p)} photos` : ""].filter(Boolean).join(" · ");
  return `<a class="card" href="/home-improvements/${esc(p.slug)}/">
  ${cover ? `<img src="${esc(url(cover))}" alt="" loading="lazy">` : `<div class="card-blank" aria-hidden="true"></div>`}
  <div class="card-body">
    <h3>${esc(p.title)}</h3>
    ${meta ? `<p class="meta">${esc(meta)}</p>` : ""}
    <p class="areas">${p.sections.map((s) => esc(s.title)).join(" · ")}</p>
  </div>
</a>`;
}

function homePage() {
  const h = site.home;
  const facts = h.facts
    .map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`)
    .join("");
  const body = `
<section class="hero">
  ${h.heroPhoto ? `<img src="${esc(url(h.heroPhoto))}" alt="${esc(site.title)}">` : placeholder("House photo to add")}
  <h1>${esc(site.title)}</h1>
  <p class="tagline">${esc(site.tagline)}</p>
  <dl class="facts">${facts}</dl>
  ${h.intro ? `<div class="intro">${paras(h.intro)}</div>` : ""}
</section>
<section>
  <h2>Projects</h2>
  <div class="cards">${projects.map(projectCard).join("\n")}</div>
</section>`;
  return layout({ title: site.title, body, active: "home" });
}

function projectsPage() {
  const body = `
<h1>Projects</h1>
<div class="cards">${projects.map(projectCard).join("\n")}</div>`;
  return layout({ title: `Projects · ${site.title}`, body, active: "projects" });
}

function projectPage(p, i) {
  const prev = projects[i - 1];
  const next = projects[i + 1];
  const sections = p.sections
    .map(
      (s) => `<section class="area">
  <h2>${esc(s.title)}</h2>
  ${s.notes ? `<div class="notes">${paras(s.notes)}</div>` : ""}
  ${compare(s.before, s.after, s.title)}
  <div class="before-after">
    <div><h3>Before</h3>${gallery(s.before, "Before")}</div>
    <div><h3>After</h3>${gallery(s.after, "After")}</div>
  </div>
</section>`
    )
    .join("\n");
  const body = `
<p class="crumbs"><a href="/home-improvements/">Projects</a></p>
<h1>${esc(p.title)}</h1>
<p class="meta">${p.date ? esc(p.date) : '<span class="todo">Date to add</span>'}</p>
${p.summary ? `<div class="summary">${paras(p.summary)}</div>` : `<div class="summary">${placeholder("A few lines about this project to add")}</div>`}
${sections}
<nav class="pager">
  ${prev ? `<a href="/home-improvements/${esc(prev.slug)}/">&larr; ${esc(prev.title)}</a>` : "<span></span>"}
  ${next ? `<a href="/home-improvements/${esc(next.slug)}/">${esc(next.title)} &rarr;</a>` : "<span></span>"}
</nav>`;
  return layout({ title: `${p.title} · ${site.title}`, body, active: "projects" });
}

// Old Google Sites address /home sends people to the new home page.
function redirectPage(to) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=${to}"><link rel="canonical" href="${to}"><title>Redirecting</title></head><body><a href="${to}">Continue</a></body></html>\n`;
}

function write(rel, content) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
copyDir(path.join(ROOT, "src"), OUT);
copyDir(path.join(ROOT, "photos"), path.join(OUT, "photos"));

write("index.html", homePage());
write("home/index.html", redirectPage("/"));
write("home-improvements/index.html", projectsPage());
projects.forEach((p, i) => write(`home-improvements/${p.slug}/index.html`, projectPage(p, i)));
write(
  "404.html",
  layout({ title: `Not found · ${site.title}`, body: `<h1>Page not found</h1><p><a href="/">Back to the home page</a></p>` })
);
if (site.noindex) write("robots.txt", "User-agent: *\nDisallow: /\n");

console.log(`Built ${projects.length} project pages into public/`);
