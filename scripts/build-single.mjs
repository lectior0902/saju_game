// 단일 HTML 파일 두 종류를 만든다.
//   dist-single/index.html    : 완전한 문서. 파일 하나로 어디에든 올릴 수 있다(폰트는 Google Fonts 링크).
//   dist-single/artifact.html : claude.ai 아티팩트용 조각(html/head/body 태그 없음, title 맨 위).
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const out = await build({
  entryPoints: [path.join(root, "src/ui/main.js")],
  bundle: true, format: "iife", minify: true, write: false, target: "es2020", legalComments: "none",
});
const js = out.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const css = read("src/styles/main.css");
const html = read("index.html");

const title = html.match(/<title>(.*?)<\/title>/)[1];
const description = html.match(/<meta name="description" content="(.*?)">/)[1];
const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/)[1].replace(/<script[\s\S]*?<\/script>/g, "").trim();

const FONTS = "https://fonts.googleapis.com/css2?family=Gothic+A1:wght@400;500;700&family=Nanum+Myeongjo:wght@400;700;800&display=swap";
const fontLinks = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">`;

const full = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
<meta name="description" content="${description}">
<meta name="color-scheme" content="dark light">
${fontLinks}
<style>${css}</style>
</head>
<body>
${body}
<script>${js}</script>
</body>
</html>
`;

const artifact = `<title>${title}</title>
<meta name="claude:viewport-fit-sides" content="cover">
${fontLinks}
<style>${css}</style>
${body}
<script>${js}</script>
`;

fs.mkdirSync(path.join(root, "dist-single"), { recursive: true });
fs.writeFileSync(path.join(root, "dist-single/index.html"), full);
fs.writeFileSync(path.join(root, "dist-single/artifact.html"), artifact);
console.log(`dist-single/index.html ${(full.length / 1024).toFixed(0)}KB, artifact.html ${(artifact.length / 1024).toFixed(0)}KB`);
