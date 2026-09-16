import { expect, test } from "bun:test";
import { chromium } from "playwright";
import path from "node:path";

test("conversion preserves the strict vector renderer configuration", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(await Bun.file(path.resolve(import.meta.dir, "../lib/diagram-render/dist/diagram-render.html")).text());
    await page.waitForFunction(() => document.querySelector("#status")?.textContent === "ready");
    const result = await page.evaluate(async () => {
      const api = window as any;
      const before = await api.__renderMermaid("before", "flowchart LR; A[Hello]-->B[World]");
      const scene = JSON.parse(await api.__mermaidToExcalidraw("flowchart LR; A-->B"));
      const after = await api.__renderMermaid("after", "flowchart LR; A[Hello]-->B[World]");
      return { before, after, elements: scene.elements.length };
    });
    expect(result.elements).toBeGreaterThan(0);
    expect(result.before).not.toContain("<foreignObject");
    expect(result.after).not.toContain("<foreignObject");
    expect(result.before).toContain("Liberation Sans");
    expect(result.after).toContain("Liberation Sans");
  } finally {
    await browser.close();
  }
}, 30_000);
