# Color Theme

This document captures the MECO Mission Control visual language from the web repository and records how mobile should mirror it. The web audit refreshed remote refs and compared all `origin/*` branches for the main color-bearing files: `color-theme.md`, `src/app/theme/index.ts`, `src/index.css`, auth/app CSS, workspace CSS, event styles, timeline task colors, workspace colors, CAD styles, task queue board styles, active worklog styles, and brand SVGs.

Core finding: every refreshed web branch shares the same `color-theme.md`, `src/app/theme/index.ts`, workspace color palette, milestone event styles, and timeline discipline color file. Branch-specific differences are mostly CSS organization, feature CSS, typography experiments, and brand SVG variants; those differences are noted below where they add color information.

## Brand

| Role | Hex |
| --- | --- |
| Primary blue | `#16478e` |
| Primary red | `#ea1c2d` |
| Brand grey | `#bbbbbb` |
| Black | `#000000` |
| White | `#ffffff` |

Brand blue is the default action, focus, selection, navigation, count, avatar, timeline-today, and identity color. Brand red is reserved for destructive emphasis, urgent accents, deadline/event emphasis, and brand artwork. Grey supports official artwork and neutral brand surfaces.

## Global Surface

Web uses CSS variables for official colors and app surfaces. Mobile mirrors those values in `src/theme.ts`.

| Role | Light | Dark |
| --- | --- | --- |
| Page start | `#ffffff` | `#08111f` |
| Canvas / page end | `#f5f7fb` | `#0f172a` |
| Panel surface | `#ffffff` | `#1e293b` |
| Border | `#e5e7eb` | `#334155` |
| Alternate row / track | `#f8fafc` / `#f1f5f9` | `#0f172a` |
| Title text | `#000000` | `#f8fafc` |
| Copy text | `#64748b` | `#e2e8f0` |
| Body text | `#11213d` | `#e2e8f0` |
| Row tint | blue wash at 14% opacity | blue wash at 18% opacity |

The web shell background layers soft brand-blue and brand-red radial washes over a white-to-slate light base or a deep navy dark base. React Native does not use the web CSS gradients directly; mobile should preserve the same color relationships through flat surfaces, washes, and panel hierarchy.

## Typography

The current web `development` branch uses system UI stacks. A set of branches including `codex/controller-slices`, `docs/update-web-specs-20260509`, `feature/metrics-decision-dashboard`, and related shell/CSS branches introduces a display stack with `Nasalization` plus `Inter`, and a mono stack with `JetBrains Mono`. The color system is unchanged in those branches.

Mobile should keep its native font behavior unless custom fonts are added intentionally, but it should follow the same hierarchy: strong display/heading weight, small uppercase operational labels, compact metadata, and mono styling only for machine-like identifiers.

## Status Colors

Shared status tones from web:

| Status | Light Background | Light Text | Dark Background | Dark Text |
| --- | --- | --- | --- | --- |
| Success | `#dcfce7` | `#166534` | `#064e3b` | `#34d399` |
| Info | `#e0f2fe` | `#075985` | `#082f49` | `#38bdf8` |
| Warning | `#fef3c7` | `#92400e` | `#451a03` | `#fbbf24` |
| Danger | `#fee2e2` | `#991b1b` | `#450a0a` | `#f87171` |
| Neutral | `#f1f5f9` | `#475569` | `#1e293b` | `#94a3b8` |

Task and workflow accents:

| Meaning | Hex |
| --- | --- |
| Not started / neutral | `#54627b` |
| In progress | `#b77900` |
| Waiting for QA | `#275098` |
| Complete | `#246847` |
| Blocked alternate | `#8f4b5d` |
| Waiting on dependency | `#c25a14` |
| High priority / purchase in progress | `#a84712` |
| Alternate in-progress text | `#8a5c00` |

Mobile uses these through `statusToneColors` and related status pill styles.

## Workspace Palette

Workspace-generated colors are normalized to six-character uppercase hex values and fall back to this web palette:

`#E76F51`, `#F4A261`, `#E9C46A`, `#2A9D8F`, `#4F86C6`, `#7A5CFA`, `#C855BC`, `#D64550`

These colors are used for workstreams, subsystems, timeline grouping, and user-selected workspace accents. The fallback subsystem highlight is `#4F86C6`. Mobile uses this palette for subsystem timeline accents.

## Timeline Discipline Colors

Web timeline task bars use discipline-based accents:

| Discipline | Hex |
| --- | --- |
| Design | `#c67b1f` |
| Manufacturing | `#b86125` |
| Assembly | `#d1863d` |
| Electrical | `#c9a227` |
| Programming | `#6d5bd0` |
| Testing | `#b84f7a` |
| Planning | `#6a7f96` |
| Communications | `#2f8f83` |
| Finance | `#5d8c4a` |
| Research | `#4b7ca8` |
| Documentation | `#8c6b4d` |
| Engagement | `#b26d3b` |
| Presentation | `#a05fb8` |
| Media production | `#d05b7f` |
| Partnerships | `#3a8a76` |
| Game analysis | `#3e7cc7` |
| Scouting | `#3aa0b8` |
| Data analysis | `#4f65b8` |
| Risk review | `#8b5c4d` |
| Curriculum | `#5e8f6a` |
| Instruction | `#7d62c7` |
| Practice | `#3d9b7a` |
| Assessment | `#c16b4a` |
| Photography | `#a85c46` |
| Video | `#7a5be0` |
| Graphics | `#d45e8c` |
| Writing | `#6f7b91` |
| Web | `#2f8fa6` |
| Social media | `#dd6f5a` |
| Fallback | `#7a8799` |

Mobile maps its smaller discipline set onto the web palette:

| Mobile discipline | Web color role |
| --- | --- |
| Mechanical | Manufacturing |
| Electrical | Electrical |
| Software / programming | Programming |
| Integration / QA test | Testing |

Timeline selection and hover states in web use `color-mix` with the active discipline or subsystem accent. Mobile approximates this with translucent blue/brand washes and direct timeline bar colors.

## Milestone Events

Milestone columns and chips use event-specific tints:

| Event | Light Text | Dark Text |
| --- | --- | --- |
| Practice | `#0d2e5c` | `#bfdbfe` |
| Competition | `#1f3f7a` | `#dbeafe` |
| Deadline | `#8e1120` | `#fecdd3` |
| Internal review | `#1d5338` | `#bbf7d0` |
| Demo | `#36475f` | `#e2e8f0` |

Light event surfaces:

| Event | Column / Background | Border | Chip |
| --- | --- | --- | --- |
| Practice | blue wash at 10% | blue wash at 32% | blue wash at 18% |
| Competition | support-blue wash at 12% | support-blue wash at 35% | support-blue wash at 20% |
| Deadline | brand-red wash at 11% | brand-red wash at 36% | brand-red wash at 18% |
| Internal review | green wash at 11% | green wash at 34% | green wash at 18% |
| Demo | slate wash at 13% | slate wash at 35% | slate wash at 22% |

Mobile exposes these as `eventTypeColors`.

## Alerts, Risk, And Destructive UI

Destructive actions use red surfaces and red text. Web also uses:

| Role | Hex |
| --- | --- |
| Main danger text on light | `#b42318` |
| Main danger text on dark | `#fca5a5` |
| Delete/action light surface | `#fff1f2` |
| Delete/action accent | `#fda29b` |
| Task detail destructive gradient stops | `#b81d2c`, `#f02c3d`, `#8f1320` |

Risk, CAD, and active worklog branch CSS adds these operational accents:

| Use | Color |
| --- | --- |
| CAD warning surface | amber wash at 12% |
| CAD warning border | amber wash at 28% |
| CAD warning text | `#92400e` |
| CAD info surface | blue wash at 10% |
| CAD info border | blue wash at 22% |
| Active worklog help badge | amber wash at 13% |
| Active worklog help text | `#854d0e` |
| Active worklog blocker fallback | `#991b1b` |
| Task board drag/drop focus | brand-blue wash at 8%, 38%, and 44% stroke/focus mixes |

Mobile risk severity uses brand red for high severity, amber/orange for medium, and brand blue washes for low severity.

## Secondary Blues And Neutrals

Web uses support blues for focus, dark-mode labels, progress/CAD states, and notification timers:

`#93c5fd`, `#bfdbfe`, `#dbeafe`, `#2563eb`, `#0ea5e9`, `#60a5fa`, `#38bdf8`, `#deebff`, `#eef2f8`

Common cool neutrals and surfaces:

`#21304a`, `#58667d`, `#64748b`, `#94a3b8`, `#cbd5e1`, `#d1d1d1`, `#d6dbe6`, `#e5e7eb`, `#e6e7f3`, `#f1f5f9`, `#f8fafc`, `#f8fbff`, `#eef4fb`

The palette should stay cool slate rather than warm grey, except where official brand grey is used.

## Shell And Navigation

Web shell chrome:

- Top bar height is 58px.
- Expanded sidebar and brand area are 156px wide.
- Collapsed sidebar is 64px wide.
- Top bar is flat, panel-colored, and separated by a single border.
- Sidebar uses a vertical gradient between alternate-row and panel surfaces.
- Active sidebar tabs use soft brand-blue wash, brand-blue text, and a modest border.
- Overlay mode adds a dark scrim and sidebar shadow.

Mobile mirrors the shell through compact top bars, drawer navigation, panel surfaces, blue active states, pill count badges, and slate overlay scrims.

## Controls, Cards, Boards, And Tables

Web controls use compact density:

- Select controls: 10px radius, compact padding, chevron from current text color, brand-blue focus ring.
- Filter controls: rounded pills, compact icons, uppercase counts, and tone-specific labels.
- Cards and board columns: panel surfaces, thin borders, soft shadows, and medium radii.
- Task queue columns: 16px radius, compact grid spacing, uppercase micro-headings, and blue-tinted count badges.
- Tables: grid-based layouts with muted uppercase headers and brand-blue sort arrows.

Mobile applies the same direction with native panels, pills, chips, modals, queue cards, and timeline controls.

## Auth Experience

Web auth uses a large MECO backdrop image with soft brand atmosphere. Light auth uses a clean blue/red radial atmosphere over `#f8fbff` to `#eef4fb`. Dark auth uses a deep blue gradient between `#0b1731` and `#10284d`, brand-colored radial washes, white text, rounded corners near 30px, and stronger shadow.

Mobile auth now follows that intent:

| Token | Value |
| --- | --- |
| Light shell | `#f8fbff` |
| Light card | `#ffffff` |
| Light lower wash | `#eef4fb` |
| Dark shell | `#10284d` |
| Dark shell start | `#0b1731` |
| Dark input | `#172746` |
| Placeholder | `#f1f5ff` |
| Notice | `#dbeafe` |
| Dark error | `#fecdd3` |
| Google button | `#1e293b` |
| Badge blue | `#1e5aae` |

## Branch Audit Notes

- All refreshed web branches share the same `color-theme.md` and `src/app/theme/index.ts`.
- Branches with the alternate `src/index.css` add `Nasalization`, `Inter`, and `JetBrains Mono` font declarations but keep the official color values.
- Several shell/CSS branches contain newer compact logo and tab icon SVGs. The official blue/red/grey/black/white brand palette remains the source for those assets.
- `feature/task-kanban-focused-view` adds focused task-board drag/drop states with brand-blue mixed outlines and backgrounds.
- CAD branches add subtle sky-blue/neutral card gradients, amber warnings, and blue info messages.
- Active worklog branches add amber help badges and danger fallback text.

## Mobile Source Map

Mobile implementation sources:

- `src/theme.ts`: canonical mobile tokens derived from the web theme.
- `src/ui/styles.ts`: shared React Native styles using those tokens.
- `src/ui/constants.ts`: event styles mapped from web milestone colors.
- `src/ui/landscapeTimeline/landscapeTimelineModel.ts`: workspace and discipline accent colors.
- `src/ui/landscapeTimeline/landscapeTimelinePalette.ts`: planner colors mapped from the central theme.
- `App.tsx`: auth status bar, login title, placeholder, and error colors.

Implementation rule: add new reusable color values to `src/theme.ts` first, then consume named tokens from screens/components. Local one-off shadow or text-shadow effects can remain inline when they do not represent a reusable theme role.
