# Authority 17 — known source defects

Status: **binding addendum to Authority 17**

This file does not alter the preserved Authority-17 PNG or professional-tool-library PNG. It records verified source defects so implementation does not reproduce false visual information.

## Safety helmet cell

Verified 22 August 2026 during PR #154 control review.

The Authority-17 board and the 6×5 professional tool sprite both label cell `(3,4)` as **Safety helmet**, but the pixels in that cell depict a second pair of **gloves**. The supplied standalone cell at `/mnt/data/tool-library-cells/safety_helmet.png` was independently inspected and contains the same gloves artwork; there is currently no approved helmet visual in the controlled library.

### Binding interpretation

- Do **not** render the gloves artwork for an item named Safety helmet.
- Until a proper helmet visual is designed and explicitly approved, Safety helmet must use the restrained neutral `visual not assigned` treatment and should not appear as a visually selectable library item.
- Do not modify, redraw, crop, recompress or silently replace the preserved Authority-17 board/sprite to hide this historical source defect.
- When a proper helmet visual is later approved, add it through a new controlled visual-library revision and remove the temporary suppression in code/tests.

This addendum applies only to the verified helmet/gloves mismatch. It does not weaken the rest of Authority 17 or authorise Claude Code to create or substitute artwork.