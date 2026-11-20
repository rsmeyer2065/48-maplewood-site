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

function val(v) {
  return v ? esc(v) : '<span class="todo">To add</span>';
}

// A document is { "title": "Permit", "file": "docs/basement-permit.pdf" } or a link { "title": "...", "url": "https://..." }.
function docLinks(list) {
  if (!list || list.length === 0) return '<span class="todo">To add</span>';
  return list
    .map((d) => `<a href="${esc(d.url || url(d.file))}" target="_blank" rel="noopener">${esc(d.title || d.file || d.url)}</a>`)
    .join("<br>");
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
    `<a href="/#systems">Systems</a>`,
    `<a href="/maintenance/"${active === "maintenance" ? ' aria-current="page"' : ""}>Maintenance</a>`,
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

function systemsTable() {
  const rows = (site.systems || [])
    .map(
      (x) => `<tr>
  <th scope="row">${esc(x.name)}</th>
  <td data-label="Installed / age">${val(x.installed)}</td>
  <td data-label="Last service">${val(x.lastService)}</td>
  <td data-label="Notes">${x.notes ? esc(x.notes) : ""}${x.documents?.length ? `<div class="docs">${docLinks(x.documents)}</div>` : ""}</td>
</tr>`
    )
    .join("\n");
  return `<table class="systems">
<thead><tr><th scope="col">System</th><th scope="col">Installed / age</th><th scope="col">Last service</th><th scope="col">Notes</th></tr></thead>
<tbody>${rows}</tbody>
</table>`;
}

function mapEmbed() {
  if (!site.showMap || !site.address) return "";
  const q = encodeURIComponent(site.address);
  return `<div class="map"><iframe title="Map of ${esc(site.address)}" src="https://maps.google.com/maps?q=${q}&amp;z=15&amp;output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>`;
}

function homePage() {
  const h = site.home;
  const facts = h.facts
    .map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`)
    .join("");
  const links = [
    site.zillowUrl ? `<a href="${esc(site.zillowUrl)}" target="_blank" rel="noopener">Zillow listing</a>` : "",
  ].filter(Boolean).join(" · ");
  const recent = (site.maintenance || []).slice(-3).reverse();
  const body = `
<section class="hero">
  ${h.heroPhoto ? `<img src="${esc(url(h.heroPhoto))}" alt="${esc(site.title)}">` : placeholder("House photo to add")}
  <h1>${esc(site.title)}</h1>
  ${site.address ? `<p class="address">${esc(site.address)}</p>` : ""}
  <p class="tagline">${esc(site.tagline)}</p>
  <dl class="facts">${facts}</dl>
  ${h.intro ? `<div class="intro">${paras(h.intro)}</div>` : ""}
  ${links ? `<p class="links">${links}</p>` : ""}
</section>
<section>
  <h2>Improvements</h2>
  <div class="cards">${projects.map(projectCard).join("\n")}</div>
</section>
<section id="systems">
  <h2>Systems at a glance</h2>
  ${systemsTable()}
</section>
<section>
  <h2>Maintenance</h2>
  ${
    recent.length
      ? `<ul class="log">${recent.map(maintenanceItem).join("")}</ul>`
      : placeholder("Maintenance entries to add")
  }
  <p><a href="/maintenance/">Full maintenance record</a></p>
</section>
${mapEmbed() ? `<section><h2>Location</h2>${mapEmbed()}</section>` : ""}`;
  return layout({ title: site.title, body, active: "home" });
}

// A maintenance entry is { "date": "2024-10", "item": "Gutters cleaned", "by": "Self", "notes": "" }.
function maintenanceItem(m) {
  return `<li><span class="log-date">${esc(m.date || "")}</span><span class="log-item">${esc(m.item || "")}${m.by ? ` <span class="meta">· ${esc(m.by)}</span>` : ""}${m.notes ? `<br><span class="meta">${esc(m.notes)}</span>` : ""}${m.documents?.length ? `<br>${docLinks(m.documents)}` : ""}</span></li>`;
}

function maintenancePage() {
  const list = [...(site.maintenance || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const body = `
<h1>Maintenance record</h1>
<p class="meta">Routine upkeep, newest first.</p>
${list.length ? `<ul class="log">${list.map(maintenanceItem).join("")}</ul>` : placeholder("Maintenance entries to add")}`;
  return layout({ title: `Maintenance · ${site.title}`, body, active: "maintenance" });
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
<dl class="details">
  <div><dt>Date</dt><dd>${val(p.date)}</dd></div>
  <div><dt>Done by</dt><dd>${val(p.doneBy)}</dd></div>
  <div><dt>Permit</dt><dd>${val(p.permit)}</dd></div>
  <div><dt>Warranty</dt><dd>${val(p.warranty)}</dd></div>
  <div class="wide"><dt>Work done</dt><dd>${p.summary ? paras(p.summary) : '<span class="todo">To add</span>'}</dd></div>
  <div class="wide"><dt>Documents</dt><dd>${docLinks(p.documents)}</dd></div>
</dl>
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
copyDir(path.join(ROOT, "docs"), path.join(OUT, "docs"));

write("index.html", homePage());
write("home/index.html", redirectPage("/"));
write("maintenance/index.html", maintenancePage());
write("home-improvements/index.html", projectsPage());
projects.forEach((p, i) => write(`home-improvements/${p.slug}/index.html`, projectPage(p, i)));
write(
  "404.html",
  layout({ title: `Not found · ${site.title}`, body: `<h1>Page not found</h1><p><a href="/">Back to the home page</a></p>` })
);
if (site.noindex) write("robots.txt", "User-agent: *\nDisallow: /\n");

console.log(`Built ${projects.length} project pages into public/`);
