{
  "brand": {
    "name": "Western Park Classroom Platform",
    "style_reference": {
      "source": "Project Spark design-system image (user-provided)",
      "must_match": [
        "warm cream/ivory backgrounds",
        "deep teal primary actions",
        "pastel-tinted cards (mint/peach/lilac/butter/blush/sage)",
        "very generous corner radii",
        "simple flat illustration accents (sparingly)",
        "mobile bottom tab bar + optional floating action button (staff only)",
        "desktop teacher dashboard with left icon rail + tabs"
      ]
    },
    "brand_attributes": [
      "warm",
      "calm",
      "premium",
      "playful-not-childish",
      "predictable",
      "accessible",
      "low-distraction"
    ],
    "non_negotiables": {
      "canonical_symbols": "Use Widgit/ARASAAC PNG pictograms served by backend. Do not recolor, restyle, or replace with icon fonts.",
      "consistency_rule": "One coherent component vocabulary reused across all screens.",
      "no_hardcoded_classroom_content": "All classroom content is configurable; UI must visually distinguish system structure vs configuration vs daily content vs pupil config.",
      "no_dark_mode_required": true,
      "no_transparent_text_surfaces": true
    }
  },

  "design_tokens": {
    "css_custom_properties": {
      "note": "Implement by overriding :root tokens in /frontend/src/index.css (shadcn HSL vars). Keep tokens semantic; avoid per-page colors.",
      "colors": {
        "--background": "38 45% 97%",
        "--foreground": "196 35% 14%",

        "--card": "0 0% 100%",
        "--card-foreground": "196 35% 14%",

        "--popover": "0 0% 100%",
        "--popover-foreground": "196 35% 14%",

        "--primary": "174 55% 28%",
        "--primary-foreground": "0 0% 100%",

        "--secondary": "38 35% 93%",
        "--secondary-foreground": "196 35% 14%",

        "--muted": "38 28% 92%",
        "--muted-foreground": "196 12% 38%",

        "--accent": "168 35% 90%",
        "--accent-foreground": "196 35% 14%",

        "--destructive": "6 72% 52%",
        "--destructive-foreground": "0 0% 100%",

        "--border": "196 18% 86%",
        "--input": "196 18% 86%",
        "--ring": "174 55% 28%",

        "--radius": "1rem",

        "--wp-surface-cream": "38 45% 97%",
        "--wp-surface-ivory": "42 40% 95%",
        "--wp-ink": "196 35% 14%",
        "--wp-ink-muted": "196 12% 38%",

        "--wp-teal": "174 55% 28%",
        "--wp-teal-600": "174 60% 24%",
        "--wp-teal-100": "168 35% 90%",

        "--wp-aubergine": "282 28% 22%",
        "--wp-aubergine-700": "282 30% 18%",

        "--wp-tint-mint": "160 45% 92%",
        "--wp-tint-peach": "24 85% 92%",
        "--wp-tint-lilac": "270 45% 93%",
        "--wp-tint-butter": "48 90% 92%",
        "--wp-tint-blush": "350 70% 93%",
        "--wp-tint-sage": "120 25% 92%",

        "--wp-state-now": "174 55% 28%",
        "--wp-state-next": "210 55% 40%",
        "--wp-state-later": "196 12% 38%",
        "--wp-state-done": "160 45% 30%",
        "--wp-state-skipped": "24 65% 45%",

        "--wp-focus": "174 70% 35%"
      },
      "shadows": {
        "--wp-shadow-sm": "0 1px 0 rgba(16,24,40,0.04), 0 1px 2px rgba(16,24,40,0.06)",
        "--wp-shadow-md": "0 2px 6px rgba(16,24,40,0.08), 0 10px 24px rgba(16,24,40,0.06)",
        "--wp-shadow-float": "0 10px 30px rgba(16,24,40,0.14)"
      },
      "spacing": {
        "--wp-space-1": "0.25rem",
        "--wp-space-2": "0.5rem",
        "--wp-space-3": "0.75rem",
        "--wp-space-4": "1rem",
        "--wp-space-5": "1.25rem",
        "--wp-space-6": "1.5rem",
        "--wp-space-8": "2rem",
        "--wp-space-10": "2.5rem",
        "--wp-space-12": "3rem"
      },
      "radii": {
        "--wp-radius-sm": "0.75rem",
        "--wp-radius-md": "1rem",
        "--wp-radius-lg": "1.25rem",
        "--wp-radius-xl": "1.75rem",
        "--wp-radius-2xl": "2.25rem"
      }
    },

    "typography": {
      "font_pairing": {
        "heading": "Space Grotesk (Google Fonts)",
        "body": "Figtree (Google Fonts)",
        "fallback": "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
      },
      "usage_notes": [
        "Headings: Space Grotesk for friendly-modern, premium classroom feel.",
        "Body/UI: Figtree for high legibility and calm rhythm.",
        "Avoid overly playful fonts; keep ‘playful’ in color + radius + illustration, not typography gimmicks."
      ],
      "text_size_hierarchy": {
        "h1": "text-4xl sm:text-5xl lg:text-6xl",
        "h2": "text-base md:text-lg",
        "body": "text-sm md:text-base",
        "small": "text-xs md:text-sm"
      },
      "line_height": {
        "tight": "leading-tight",
        "normal": "leading-relaxed"
      }
    }
  },

  "layout": {
    "grid_and_shells": {
      "staff_shell": {
        "desktop": "Left icon rail (aubergine) + top tabs within module + content canvas on warm cream background.",
        "mobile": "Bottom tab bar (Home/Today, Timetable, + Quick, Pupils, Settings). FAB optional for quick actions.",
        "content_width": "max-w-[1200px] for dense dashboards; max-w-[980px] for forms/settings; full-width for timetable boards.",
        "padding": "px-4 sm:px-6 lg:px-8 py-6"
      },
      "pupil_shell": {
        "principles": [
          "Calmer, larger, fewer controls",
          "No admin affordances",
          "One primary action per screen",
          "48px+ touch targets",
          "Minimal navigation chrome"
        ],
        "layout": "Full-screen cards with Now/Next prominent; optional bottom nav with 3 items max (Now/Next, Talk, Feel).",
        "padding": "px-4 sm:px-6 py-6",
        "type_scale_multiplier": "+1 step for key labels (e.g., body -> md:text-lg)"
      }
    },

    "now_next_later_hierarchy": {
      "structure": [
        "NOW: largest card, always first, includes symbol + label + time + status chip",
        "NEXT: medium card, includes symbol + label + time",
        "LATER: horizontal strip of small tiles (scrollable)"
      ],
      "status_not_color_only": [
        "NOW uses a left ‘current’ notch + bold outline + ‘Now’ chip",
        "NEXT uses ‘Next’ chip + dashed outline",
        "DONE uses checkmark badge + reduced opacity + strikethrough label",
        "SKIPPED uses ‘Skipped’ chip + diagonal hatch overlay (CSS background)"
      ],
      "chips": {
        "tailwind": "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
        "examples": {
          "now": "bg-[hsl(var(--wp-teal-100))] text-[hsl(var(--wp-teal-600))]",
          "next": "bg-sky-50 text-sky-700",
          "done": "bg-emerald-50 text-emerald-700",
          "skipped": "bg-amber-50 text-amber-800"
        }
      }
    }
  },

  "symbol_system": {
    "core_rules": [
      "Symbols are raster PNGs from GET /api/symbols/{conceptKey}/image.",
      "Never recolor, apply filters, or crop into circles.",
      "Always present symbols inside a deliberate ‘SymbolFrame’ so they look consistent even if the PNG includes its own white card.",
      "Do not silently substitute icons; if missing, show a standard MissingSymbol tile with the conceptKey and a ‘Needs symbol’ badge."
    ],
    "framing_specs": {
      "SymbolFrame": {
        "container": "rounded-[var(--wp-radius-xl)] bg-white border border-[hsl(var(--border))] shadow-[var(--wp-shadow-sm)]",
        "inner_padding": "p-3 (staff) / p-4 (pupil)",
        "image": "object-contain w-full h-full",
        "background": "Always solid white behind the PNG to avoid cream bleed.",
        "label_policy": {
          "problem": "Many Widgit/ARASAAC PNGs include printed English labels inside the image.",
          "default": "Staff mode: show app-rendered label under the symbol; Pupil mode: optionally hide app label to reduce duplication.",
          "setting": "Appearance setting: showSymbolLabels = true/false.",
          "when_png_has_label": "If PNG already contains a printed label, keep app label but render it smaller and muted (avoid double emphasis)."
        }
      },
      "sizes": {
        "SymbolTile_staff": {
          "frame": "h-16 w-16 sm:h-20 sm:w-20",
          "image": "max-h-[56px] max-w-[56px]",
          "label": "text-xs mt-2"
        },
        "SymbolTile_pupil": {
          "frame": "h-24 w-24 sm:h-28 sm:w-28",
          "image": "max-h-[92px] max-w-[92px]",
          "label": "text-sm mt-3"
        },
        "SymbolCard_staff": {
          "frame": "h-20 w-20",
          "layout": "icon left + text right",
          "touch_target": "min-h-[40px]"
        },
        "SymbolCard_pupil": {
          "frame": "h-28 w-28",
          "layout": "stacked icon + big label",
          "touch_target": "min-h-[56px]"
        }
      }
    },
    "components_to_create": {
      "SymbolTile": {
        "purpose": "Square tile used in grids (timetable, communication options, pickers).",
        "tailwind": "group rounded-[var(--wp-radius-xl)] bg-white border border-[hsl(var(--border))] shadow-[var(--wp-shadow-sm)] p-3 hover:shadow-[var(--wp-shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--wp-focus))]",
        "states": {
          "selected": "ring-2 ring-[hsl(var(--wp-teal))]",
          "disabled": "opacity-50 pointer-events-none"
        },
        "data_testid": "symbol-tile"
      },
      "SymbolCard": {
        "purpose": "Row/card used for lists (jobs, strategies, settings items).",
        "tailwind": "flex items-center gap-4 rounded-[var(--wp-radius-xl)] bg-white border border-[hsl(var(--border))] shadow-[var(--wp-shadow-sm)] p-4",
        "data_testid": "symbol-card"
      }
    }
  },

  "component_vocabulary": {
    "rule": "Use ONLY these patterns across all 18 screens; do not invent new card/list styles per module.",
    "components": {
      "PrimaryButton": {
        "shadcn": "src/components/ui/button.jsx",
        "tailwind_variant": "bg-[hsl(var(--wp-teal))] text-white hover:bg-[hsl(var(--wp-teal-600))] focus-visible:ring-[hsl(var(--wp-focus))]",
        "sizes": {
          "md": "h-11 px-5 rounded-[var(--wp-radius-lg)]",
          "lg_pupil": "h-14 px-6 rounded-[var(--wp-radius-xl)] text-base"
        },
        "interaction": "hover: translateY(-1px) shadow-sm; active: scale-[0.98] (no transition:all)",
        "data_testid": "primary-button"
      },
      "SecondaryButton": {
        "shadcn": "src/components/ui/button.jsx",
        "tailwind_variant": "bg-white border border-[hsl(var(--border))] hover:bg-[hsl(var(--wp-tint-mint))]",
        "data_testid": "secondary-button"
      },
      "GhostButton": {
        "shadcn": "src/components/ui/button.jsx",
        "tailwind_variant": "hover:bg-[hsl(var(--wp-tint-butter))]",
        "data_testid": "ghost-button"
      },
      "ConfirmDialog": {
        "shadcn": "src/components/ui/alert-dialog.jsx",
        "usage": "All destructive actions (delete activity, reset jobs, replace symbol globally).",
        "data_testid": "confirm-dialog"
      },
      "Sheet": {
        "shadcn": "src/components/ui/sheet.jsx",
        "usage": "Quick Observation, Quick Actions (+), Edit Activity, Award Spark.",
        "data_testid": "sheet"
      },
      "Tabs": {
        "shadcn": "src/components/ui/tabs.jsx",
        "style": "Underline tabs (Project Spark-like). Active tab uses teal underline; inactive muted.",
        "data_testid": "tabs"
      },
      "Card": {
        "shadcn": "src/components/ui/card.jsx",
        "style": "Large radius, subtle shadow, optional pastel tint header strip.",
        "base_tailwind": "rounded-[var(--wp-radius-2xl)] shadow-[var(--wp-shadow-sm)] border border-[hsl(var(--border))] bg-white",
        "data_testid": "card"
      },
      "ListRow": {
        "purpose": "Single reusable row for Recent Activity, Observation list, symbol library rows.",
        "tailwind": "flex items-center justify-between gap-4 rounded-[var(--wp-radius-xl)] bg-white border border-[hsl(var(--border))] p-4",
        "data_testid": "list-row"
      },
      "EditableRow": {
        "purpose": "Inline edit pattern for timetable activities, categories, jobs.",
        "tailwind": "flex items-center gap-3 rounded-[var(--wp-radius-xl)] bg-white border border-dashed border-[hsl(var(--border))] p-3",
        "affordance": "Use a small ‘Edit’ pill + pencil icon; never rely on hover only.",
        "data_testid": "editable-row"
      },
      "EmptyState": {
        "purpose": "One empty state component with calm illustration blob + clear CTA.",
        "tailwind": "rounded-[var(--wp-radius-2xl)] bg-[hsl(var(--wp-tint-butter))] border border-[hsl(var(--border))] p-6",
        "data_testid": "empty-state"
      },
      "Toast": {
        "shadcn": "src/components/ui/sonner.jsx",
        "rule": "Use sonner only.",
        "data_testid": "toast"
      }
    }
  },

  "module_specific_layout_notes": {
    "today": {
      "layout": "Top: date + class selector (if permitted). Main: Now card (2/3 width desktop), Next card (1/3), Later strip below. Right rail (desktop): Quick actions + Sparks summary.",
      "quick_actions": [
        "Morning Meeting",
        "Communication",
        "Regulation",
        "Quick Observation",
        "Picker"
      ],
      "visual_density": "Default comfortable; allow spacious for pupil-facing display."
    },
    "timetable": {
      "drag_reorder": "Use clear drag handle + ‘Reorder’ mode toggle to avoid accidental drags.",
      "status_markers": "Now/Done/Skipped chips + icon badges; do not rely on color.",
      "templates": "Template library in Tabs: Today | Templates | Activity Library | Per-pupil adaptations."
    },
    "morning_meeting_run_mode": {
      "mode": "Full-screen, one step per screen, progress dots, Back/Next, Skip.",
      "targets": "Pupil-facing: 56px+ buttons; staff: 44px+.",
      "predictability": "No surprise animations; only subtle fade between steps (disabled when animation level none)."
    },
    "communication": {
      "layout": "Left category rail (desktop) / top horizontal chips (mobile). Main grid of SymbolTiles.",
      "tap_to_speak": "On tap: immediate audio + visual confirmation (pulse ring) + optional wait-time cue.",
      "favourites": "Star toggle on each tile (staff only)."
    },
    "regulation": {
      "zones": "Blue/Green/Yellow/Red as canonical; show zone name + icon + pattern (not color-only).",
      "strategies": "Grouped sections: Calming, Movement, Sensory, Adult Support. Each uses SymbolCards."
    },
    "prepare_me": {
      "gallery": "Pastel template cards with big symbol + title.",
      "builder": "7-section stepper; each section is a Card with SymbolTile picker + short text.",
      "reader": "Pupil-facing reader: one section per page with Next; optional auto-advance disabled by default."
    },
    "pickers": {
      "spin": "Use a calm ‘shuffle’ animation (max 900ms) + reveal; must be disableable.",
      "history": "ListRow list with timestamps; no photos unless permitted."
    },
    "settings": {
      "structure": "Left settings nav (ListRow) + right panel. Keep consistent across modules.",
      "appearance_controls": [
        "visual density",
        "animation level",
        "font scale",
        "high contrast",
        "show/hide symbol labels",
        "show/hide pupil photographs"
      ]
    }
  },

  "motion_policy": {
    "principles": [
      "Motion is functional: confirms actions, indicates progress, supports attention.",
      "No decorative looping animations in classroom mode.",
      "All motion must be disableable via Appearance > Animation Level and prefers-reduced-motion."
    ],
    "levels": {
      "none": "No transitions except instant state changes; no animated reorders; no picker shuffle.",
      "subtle": "150–220ms opacity/box-shadow transitions; 1-step slide for sheets; gentle progress bar fill.",
      "full": "Adds small scale-on-press (0.98), hover lift, picker shuffle up to 900ms, step transitions in Morning Meeting."
    },
    "implementation_notes": {
      "tailwind": "Use transition-[background-color,box-shadow,opacity] duration-200 ease-out. Avoid transition-all.",
      "reduced_motion": "Wrap motion classes behind a boolean derived from prefers-reduced-motion + user setting."
    }
  },

  "accessibility": {
    "requirements": [
      "WCAG AA contrast",
      "Visible focus rings (2px) using --wp-focus",
      "Touch targets: >=40px staff, >=48px pupil",
      "Never color-only meaning (use chips, icons, patterns)",
      "Keyboard navigable (tabs, sheets, dialogs)",
      "ARIA labels for icon-only buttons"
    ],
    "high_contrast_mode": {
      "behavior": "Increase border contrast, reduce pastel tints, strengthen text color, add thicker outlines to NOW card.",
      "token_overrides": "Swap --border to 196 25% 70%, --muted-foreground to 196 18% 28%"
    }
  },

  "data_safety_and_roles_ui": {
    "photo_handling": {
      "rule": "Photographs only render when permission allows AND appearance setting showPupilPhotos is true.",
      "fallback": "Avatar initials or chosen avatar illustration.",
      "visual": "Photo/Avatar always in rounded-[var(--wp-radius-xl)] frame with white border."
    },
    "permissions_affordance": {
      "rule": "If user lacks permission, hide edit controls rather than disabling (except where discoverability is needed).",
      "audit": "Show ‘Locked’ badge with tooltip for restricted sections (staff only)."
    }
  },

  "sample_data_marking": {
    "rule": "Any seeded demo content must be clearly labeled as SAMPLE.",
    "badge": {
      "tailwind": "inline-flex items-center rounded-full bg-amber-50 text-amber-800 px-2.5 py-1 text-xs font-medium border border-amber-200",
      "text": "Sample"
    },
    "placement": "Top-right of cards or in list rows; never in the middle of pupil-facing content."
  },

  "images": {
    "image_urls": [
      {
        "category": "background_texture_optional",
        "description": "Soft pastel abstract texture for occasional section headers only (<=20% viewport).",
        "url": "https://images.unsplash.com/photo-1665441981562-f7f4b2505e86?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTF8MHwxfHNlYXJjaHwzfHxzb2Z0JTIwcGFzdGVsJTIwYWJzdHJhY3QlMjBibG9iJTIwYmFja2dyb3VuZCUyMHRleHR1cmV8ZW58MHx8fHdoaXRlfDE3ODczNTg4OTV8MA&ixlib=rb-4.1.0&q=85"
      },
      {
        "category": "classroom_hero_optional",
        "description": "Warm classroom supplies photo for sign-in side panel (staff only).",
        "url": "https://images.pexels.com/photos/5124894/pexels-photo-5124894.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
      }
    ],
    "mascot_usage": {
      "do": [
        "Use mascot as a small accent in empty states, onboarding, and success confirmations.",
        "Keep it static by default; allow subtle blink only in ‘full’ animation level."
      ],
      "dont": [
        "Do not place mascot next to sensitive pupil data.",
        "Do not animate continuously.",
        "Do not use mascot as a navigation icon."
      ]
    }
  },

  "libraries": {
    "recommended": [
      {
        "name": "framer-motion",
        "why": "Controlled, disableable micro-interactions (Morning Meeting step transitions, picker reveal).",
        "install": "npm i framer-motion",
        "usage_scaffold_js": "import { motion } from 'framer-motion';\n\nexport function FadeSwap({ children, enabled }) {\n  if (!enabled) return <>{children}</>;\n  return (\n    <motion.div\n      initial={{ opacity: 0, y: 6 }}\n      animate={{ opacity: 1, y: 0 }}\n      exit={{ opacity: 0, y: -6 }}\n      transition={{ duration: 0.18 }}\n    >\n      {children}\n    </motion.div>\n  );\n}\n"
      },
      {
        "name": "@dnd-kit/core @dnd-kit/sortable",
        "why": "Accessible drag-reorder for timetable with keyboard support.",
        "install": "npm i @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities"
      },
      {
        "name": "recharts",
        "why": "Progress patterns charts (staff-only) with calm visuals.",
        "install": "npm i recharts"
      }
    ]
  },

  "testing": {
    "data_testid_policy": {
      "rule": "All interactive and key informational elements MUST include data-testid.",
      "naming": "kebab-case describing role, not appearance.",
      "examples": [
        "data-testid=\"sign-in-submit-button\"",
        "data-testid=\"today-now-card\"",
        "data-testid=\"timetable-activity-drag-handle\"",
        "data-testid=\"communication-option-tile\"",
        "data-testid=\"regulation-zone-selector\"",
        "data-testid=\"quick-observation-save-button\""
      ]
    }
  },

  "component_path": {
    "shadcn_ui": "/app/frontend/src/components/ui/",
    "primary_components": [
      "button.jsx",
      "card.jsx",
      "tabs.jsx",
      "sheet.jsx",
      "alert-dialog.jsx",
      "progress.jsx",
      "avatar.jsx",
      "badge.jsx",
      "separator.jsx",
      "scroll-area.jsx",
      "calendar.jsx",
      "tooltip.jsx",
      "sonner.jsx"
    ]
  },

  "instructions_to_main_agent": [
    "Replace default shadcn tokens in /frontend/src/index.css with the provided warm-cream + teal system; increase --radius to 1rem and use wp radii for cards.",
    "Delete/ignore CRA starter App.css styles (dark centered header). Do not center the app container.",
    "Implement SymbolFrame + SymbolTile + SymbolCard first; use them everywhere symbols appear (timetable, communication, regulation, jobs, pickers, morning meeting).",
    "Implement the enumerated component vocabulary (Card, ListRow, EditableRow, EmptyState, Primary/Secondary/Ghost buttons, Sheet, ConfirmDialog, Tabs) and reuse across all 18 screens.",
    "Ensure Now/Next/Later hierarchy is consistent and status is never color-only (chips + icons + patterns).",
    "Build two shells: StaffShell (left rail on desktop, bottom tabs on mobile) and PupilShell (minimal chrome, larger targets, calmer spacing).",
    "Add Appearance settings that genuinely control: density, animation level, font scale, high contrast, show/hide symbol labels, show/hide pupil photos.",
    "All interactive and key informational elements must include data-testid attributes (kebab-case).",
    "Gradients: only mild, decorative, <=20% viewport; never on text-heavy surfaces; never dark/saturated combos."
  ],

  "general_ui_ux_design_guidelines": "<General UI UX Design Guidelines>  \n    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms\n    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text\n   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json\n\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. \n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.\n</General UI UX Design Guidelines>"
}
