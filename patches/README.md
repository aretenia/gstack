# Dependency patches

## html-to-docx 1.8.0

This release embeds an older `image-size` implementation in both its ESM and
UMD bundles. Updating the resolved dependency alone leaves those embedded
parsers active. The patch routes every `sizeOf` call in both exports through
the resolved `image-size` 2.x named export, while preserving the UMD factory's
CommonJS, AMD, and global dependency forms.

The root override requires image-size 2.0.4 or newer. This closes the ICNS
zero-length-entry infinite loop and the affected JXL/HEIF parsing range
(GHSA-w3rx-r6r6-pgpr and GHSA-5p2g-fcmc-qvqq). The DOCX regression test runs
both entry points in bounded child processes with malformed ICNS input and
verifies valid PNG media survives conversion.

Remove this patch only after the upstream bundles use a fixed image parser
and the regression tests pass without the patch.

## playwright-core 1.62.1

The existing patch adds Windows child-process hiding. Playwright remains
exactly pinned so dependency refreshes cannot bypass that patch.
