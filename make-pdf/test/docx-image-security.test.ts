import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import path from "node:path";

// html-to-docx bundles image-size internally. A lockfile-only upgrade does not
// replace that parser: exercise both shipped entry points in a bounded child.
const root = path.resolve(import.meta.dir, "../..");
const icns = Buffer.alloc(16);
icns.write("icns");
icns.writeUInt32BE(16, 4);
icns.write("ic07", 8); // zero entry length previously left the parser looping
const truncated = Buffer.from(icns.subarray(0, 10));
const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jR1kAAAAASUVORK5CYII=";

for (const entry of ["umd", "esm"]) {
  describe(`DOCX ${entry} image parsing`, () => {
    for (const [name, payload] of [["zero-length ICNS", icns], ["truncated ICNS", truncated]] as const) {
      test(`rejects ${name} without hanging`, () => {
        const result = run(entry, payload.toString("base64"), true);
        expect(result.error).toBeUndefined();
        expect(result.status).toBe(0);
        expect(result.stdout).toContain("rejected");
      });
    }
    test("preserves a valid PNG in the generated DOCX", () => {
      const result = run(entry, png, false);
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("valid image preserved");
    });
  });
}

function run(entry: string, base64: string, shouldReject: boolean) {
  return spawnSync(process.execPath, ["-e", `
    import convert from "./node_modules/html-to-docx/dist/html-to-docx.${entry}.js";
    import JSZip from "jszip";
    const html = '<p>Image compatibility</p><img src="data:image/png;base64,${base64}"/>';
    try {
      const output = await convert(html);
      if (${shouldReject}) process.exit(2);
      const zip = await JSZip.loadAsync(output);
      const media = Object.keys(zip.files).filter(p => p.startsWith("word/media/") && !zip.files[p].dir);
      if (media.length < 1) process.exit(3);
      const bytes = await zip.files[media[0]].async("nodebuffer");
      if (bytes.toString("base64") !== ${JSON.stringify(base64)}) process.exit(4);
      console.log("valid image preserved");
    } catch (error) {
      if (!${shouldReject} || !/ICNS|bounds|length/i.test(String(error))) throw error;
      console.log("rejected");
    }
  `], { cwd: root, timeout: 5000, encoding: "utf8" });
}
