import fs from "node:fs";
const p = fs.readdirSync("D:/code/cs/docs/craft-ref/features/_harvest/js").find((f) => f.startsWith("index-"));
const src = fs.readFileSync("D:/code/cs/docs/craft-ref/features/_harvest/js/" + p, "utf8");
const a = Number(process.argv[2] || 137400), b = Number(process.argv[3] || 141600);
console.log(src.slice(a, b));
