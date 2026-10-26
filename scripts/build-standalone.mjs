import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");
const DIST = path.join(ROOT, "dist");
fs.mkdirSync(DIST, { recursive: true });

const html = fs.readFileSync(path.join(PUBLIC, "index.html"), "utf8");
const css = fs.readFileSync(path.join(PUBLIC, "styles.css"), "utf8");
let engine = fs.readFileSync(path.join(PUBLIC, "js", "engine.js"), "utf8");
let app = fs.readFileSync(path.join(PUBLIC, "js", "app.js"), "utf8");
const data = JSON.parse(fs.readFileSync(path.join(PUBLIC, "data", "methods.json"), "utf8"));

// engine: strip ES module exports and expose the namespace used by app.js
engine = engine.replace(/\bexport\s+(?=(const|let|var|function|class)\b)/g, "");
engine += `\nwindow.__ENGINE__ = { DOMAINS, DOMAIN_META, detectDomain, parseMinutes, parseDays, detectLevel, buildProfile, matchMethods, buildDiagnosis, buildTasks, buildNextDay, computeEffect, decideOutcome, SCENARIOS, MOODS, methodById, scoreLabel };\n`;

// app: replace the ES import with the global namespace
app = app.replace(/^import\s+\*\s+as\s+E\s+from\s+["']\.\/engine\.js["'];?\s*/m, "const E = window.__ENGINE__;\n");

const safeData = JSON.stringify(data).replace(/<\/script/gi, "<\\/script");
const bundle = [
  "<script>",
  `window.__METHODS__ = ${safeData};`,
  "</script>",
  "<script>",
  engine,
  "</script>",
  "<script>",
  app,
  "</script>",
].join("\n");

let out = html
  .replace(/<link rel="stylesheet" href="styles\.css" \/>/, () => `<style>\n${css}\n</style>`)
  .replace(/<script type="module" src="js\/app\.js"><\/script>/, () => bundle);

// tiny deployment badge (only in the standalone build)
out = out.replace(
  "</body>",
  `<div style="position:fixed;right:12px;bottom:12px;z-index:90;padding:6px 9px;border-radius:99px;background:rgba(16,35,30,.82);color:#b9f2d0;font:10px/1.4 'Microsoft YaHei',sans-serif;pointer-events:none">静态演示版 · 数据保存在浏览器本地</div>\n</body>`
);

fs.writeFileSync(path.join(DIST, "index.html"), out, "utf8");
console.log(`standalone: ${path.join(DIST, "index.html")}`);
console.log(`size: ${(Buffer.byteLength(out) / 1024).toFixed(1)} KB`);
