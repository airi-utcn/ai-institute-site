# Institute floor plans

Original images supplied by the maintainers in [issue #256](https://github.com/airi-utcn/ai-institute-site/issues/256#issuecomment-6789188922), copied without alteration.

| File | Floor | GitHub attachment |
| --- | --- | --- |
| ground.png | Ground | a37c9d6d-477f-4bb0-bc38-8e9026e26fb0 |
| first.png | First | 238ff380-908b-4560-b0f4-5797322f363e |
| second.png | Second | d3f556a8-b1a2-4838-8f2d-c7d6bb40f27b |
| third.png | Third | c20f9a68-5bc7-4592-b6ef-67a725d61d59 |
| fourth.png | Fourth | 4d3deaae-daec-416d-86c7-e74f04ddab7e |
| fifth.png | Fifth (setback floor) | de555e4c-a36e-4998-a961-a8a7bece1128 |

Image paths and dimensions live in `web/src/lib/laboratory-floor-plans.js`. The plans are displayed without interactive room markers. If replacing a plan, verify its dimensions.

The listing derives floors from Strapi's existing `roomNumber` field (L001–L599 or S001–S599, with optional spaces/dashes/dots; bare three-digit numbers are treated as L rooms). Unrecognized locations appear in a separate section. No CMS schema change or data migration is needed.
