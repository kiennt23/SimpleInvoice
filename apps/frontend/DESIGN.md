# SimpleInvoice Frontend Design Contract

## 0. Research Log

- **Mode:** Greenfield operational product scaffold. There was no existing UI, component layer, theme,
  or design system to preserve.
- **Brief inference:** A reviewer needs a calm, precise financial workspace where hierarchy and status
  remain legible before any visual flourish. For this scaffold, the only content jobs are identify and
  explain; feature workflows belong to todos 12-15.
- **Design dials:** Design variance 2/10, motion intensity 1/10, visual density 4/10. The placeholder is
  intentionally quiet while preserving a firm data-product direction.
- **Embedded references:** Shortlisted IBM Carbon, Atlassian, and Primer for operational density. Read
  the general taste guidance and IBM reference in full. IBM was selected for its structured neutral
  layers, blue accent, sharp geometry, 8px rhythm, and data-oriented typography. Carbon is a visual
  reference only and is not a dependency.
- **Real-product screens:** Lazyweb searches `invoice management dashboard desktop` and `finance
operations data table dashboard` returned 12 screens. FreshBooks, Midday, and Causal were viewed.
  Harvested Midday's neutral hierarchy and tabular emphasis, FreshBooks' plain-language status
  treatment, and Causal's disciplined grouping. Marketing annotations, saturated navigation,
  spreadsheet density, and feature layouts are excluded from this scaffold.
- **Database lookup:** The UI/UX database suggested a dark OLED operations palette with green accent.
  It was rejected because a light, trust-first document workspace better fits invoice review and the
  selected IBM direction.
- **Concept drafts:** Imagen tooling is not available in this environment, so no generated visual draft
  was produced. The reference set above is the design input.
- **Tooling scope:** React inspection helpers are deferred until feature screens exist. Adding them to
  this bounded scaffold would introduce dependencies that the task did not request.

## 1. Atmosphere and Identity

SimpleInvoice is an operational financial tool, not a marketing surface. It should feel exact,
restrained, and dependable: cool neutrals, one blue accent, strong alignment, and enough whitespace to
make dense financial information scannable. Avoid gradients, glass, decorative cards, oversized hero
language, rounded-everything styling, and ornamental motion.

The current screen is only a semantic scaffold marker. It must not imply that authentication, invoice
lists, details, or creation already exist.

## 2. Color

The initial theme is light only. Future dark-mode work requires a separately reviewed token map.

| Token                | Value     | Role                                         |
| -------------------- | --------- | -------------------------------------------- |
| `--color-canvas`     | `#f4f4f4` | App background                               |
| `--color-surface`    | `#ffffff` | Raised working surface                       |
| `--color-text`       | `#161616` | Primary copy                                 |
| `--color-text-muted` | `#525252` | Secondary copy                               |
| `--color-border`     | `#c6c6c6` | Structural rules                             |
| `--color-accent`     | `#0f62fe` | Focus and primary action                     |
| `--color-success`    | `#198038` | Successful state with a text label           |
| `--color-warning`    | `#8e6a00` | Warning state with a text label              |
| `--color-danger`     | `#da1e28` | Error or destructive state with a text label |

Color never carries status alone. Every future status treatment pairs color with explicit text.

## 3. Typography

- Primary family token: `"IBM Plex Sans", "Avenir Next", "Segoe UI", sans-serif`.
- Numeric family token: `"IBM Plex Mono", "SFMono-Regular", Consolas, monospace` for money, dates,
  invoice numbers, and aligned figures.
- No network font request is added for the scaffold. A self-hosted font decision is deferred with the
  feature UI rather than hidden inside this setup task.
- Type roles: caption `0.75rem`, body `1rem`, heading `clamp(2rem, 6vw, 3rem)`.
- Body line height is `1.5`; heading line height is `1.1`. Use sentence case. Labels may use restrained
  uppercase only when they identify a small structural category.

## 4. Spacing and Layout

- Base unit: 4px. Named spacing tokens are 4, 8, 12, 16, 24, 32, and 48px.
- Product layouts use an 8px rhythm, with 4px only for fine alignment.
- Content gutters start at 24px and grow to 48px at 768px and above.
- Long copy stays within a 42rem measure. App content may grow to 64rem when feature pages arrive.
- Use square structural edges and 1px rules. Surface hierarchy comes from tone and borders, not shadow.
- Mobile-first layouts must avoid horizontal scrolling and remain usable at 375px, 768px, and 1280px.

## 5. Components and States

The only approved primitive in this todo is **Scaffold Marker**:

- one `main` landmark;
- one product label;
- one level-one heading;
- one short scope note;
- no action, navigation, status badge, card, form, table, or fabricated data.

Buttons, inputs, navigation, notifications, tables, loading states, empty states, errors, and invoice
status treatments are deliberately deferred to todos 12-15. Each must be specified here before use.

## 6. Motion and Interaction

The scaffold has no interactive controls and no animation. Future motion must communicate feedback or
state change, use only transform, opacity, or filter, and provide a `prefers-reduced-motion` fallback.
Decorative motion is not permitted.

## 7. Depth and Surface

Use tonal layers in this order: canvas, surface, then hairline boundary. The scaffold marker is not a
card and receives no shadow or radius. Future overlays may introduce elevation tokens only when depth
communicates interaction hierarchy.

## 8. Accessibility Constraints and Accepted Debt

### Personas and constraints

- **Operational reviewer:** needs immediate, unambiguous hierarchy and readable financial information
  across narrow and wide screens.
- **Keyboard and assistive-technology user:** needs landmark discovery, a logical heading order,
  visible focus on future controls, and status expressed in text.
- **Low-vision user:** needs text contrast of at least WCAG AA, zoom-safe layout, and no information
  encoded only by color.

The scaffold uses native semantics, one heading, readable line length, no interaction traps, and no
motion. Browser zoom must remain enabled.

### Accepted debt

- IBM Plex is not bundled yet, so platform fallbacks render on machines without it.
- Dark mode, interactive focus states, feature-state patterns, and data-density testing are deferred
  because their components do not exist in todo 4.
- Feature-page visual fidelity and full browser performance audits are deferred until todos 12-15.
  This scaffold still requires responsive smoke verification on its real production preview.
