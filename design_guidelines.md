{
  "product": {
    "name": "Frith Classroom",
    "tagline": "Peaceful structure for learning",
    "brand_attributes": [
      "calm",
      "predictable",
      "professional (staff)",
      "warm + playful (pupil)",
      "high-clarity",
      "accessible-first",
      "low-distraction"
    ],
    "non_negotiables": {
      "no_purple": true,
      "no_unnecessary_animation": true,
      "light_mode_primary": true,
      "gradients": {
        "allowed": "near-zero in Staff Mode; minimal decorative only in Pupil Mode",
        "max_viewport_coverage": "< 20%",
        "never": [
          "dark/saturated gradients",
          "gradients on text-heavy surfaces",
          "gradients on small UI elements (<100px)",
          "stacked gradients"
        ]
      },
      "accessibility_controls_must_work": [
        "html[data-density=compact|comfortable|spacious]",
        "html[data-contrast=normal|high]",
        "html[data-animation=subtle|none]",
        "root font scale multiplier (html font-size)"
      ],
      "touch_targets": {
        "staff_min": "44x44px",
        "pupil_min": "72x72px (recommended 80x80px for primary tiles)"
      },
      "testing": {
        "data_testid_required": "All interactive + key informational elements must include data-testid in kebab-case"
      }
    }
  },

  "logo_mark_brief": {
    "concept": "Soft squircle containing three stacked rounded bars (Now / Next / Later). Top bar highlighted to indicate 'Now'.",
    "why": "Directly encodes the platform’s core promise: visual structure and predictability.",
    "geometry_spec": {
      "canvas": "64x64 viewBox",
      "outer_shape": {
        "type": "squircle-like rounded rect",
        "x": 4,
        "y": 4,
        "width": 56,
        "height": 56,
        "rx": 16,
        "notes": "Use a single rounded-rect; the large radius reads as a squircle at small sizes."
      },
      "bars": [
        {
          "name": "now",
          "x": 16,
          "y": 18,
          "width": 32,
          "height": 8,
          "rx": 4,
          "fill": "primary",
          "emphasis": "solid"
        },
        {
          "name": "next",
          "x": 18,
          "y": 30,
          "width": 28,
          "height": 8,
          "rx": 4,
          "fill": "primary-muted",
          "emphasis": "80% opacity"
        },
        {
          "name": "later",
          "x": 20,
          "y": 42,
          "width": 24,
          "height": 8,
          "rx": 4,
          "fill": "ink-muted",
          "emphasis": "55% opacity"
        }
      ],
      "stroke": {
        "outer": "1.5px border in staff mode; none in pupil mode",
        "bars": "no stroke"
      }
    },
    "color_application": {
      "staff": {
        "outer_fill": "hsl(var(--wp-surface-ivory))",
        "outer_border": "hsl(var(--border))",
        "now": "hsl(var(--primary))",
        "next": "hsl(var(--wp-primary-soft))",
        "later": "hsl(var(--wp-ink-muted))"
      },
      "pupil": {
        "outer_fill": "hsl(var(--wp-pupil-canvas))",
        "outer_border": "transparent",
        "now": "hsl(var(--wp-pupil-primary))",
        "next": "hsl(var(--wp-pupil-primary-soft))",
        "later": "hsl(var(--wp-pupil-ink-muted))"
      }
    },
    "wordmark": {
      "text": "Frith Classroom",
      "font": "Montserrat 700 (staff) / Fredoka 700 (pupil contexts)",
      "kerning": "-0.01em",
      "case": "Title Case"
    }
  },

  "typography": {
    "approved_fonts_only": true,
    "staff_mode": {
      "display": {
        "family": "Montserrat",
        "weights": [600, 700],
        "usage": "Page titles, section titles, key numbers"
      },
      "body": {
        "family": "Figtree",
        "weights": [400, 500, 600, 700],
        "usage": "All body copy, labels, table text"
      },
      "mono_optional": {
        "family": "Roboto Mono",
        "usage": "IDs, timestamps, debug/admin-only strings"
      }
    },
    "pupil_mode": {
      "display_and_body": {
        "family": "Fredoka",
        "weights": [500, 600, 700],
        "usage": "All pupil UI text for friendliness + legibility"
      },
      "fallback": "Figtree"
    },
    "type_scale_tailwind": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl",
      "h2": "text-base md:text-lg",
      "body": "text-sm md:text-base",
      "small": "text-xs"
    },
    "line_heights": {
      "display": "leading-[1.1]",
      "body": "leading-[1.45]",
      "dense_labels": "leading-[1.2]"
    },
    "staff_specific_sizes": {
      "page_title": "text-2xl sm:text-3xl font-bold",
      "section_title": "text-lg font-semibold",
      "body": "text-sm sm:text-base",
      "meta": "text-xs font-medium uppercase tracking-[0.14em]"
    },
    "pupil_specific_sizes": {
      "primary_tile_label": "text-2xl sm:text-3xl font-semibold",
      "secondary_label": "text-lg sm:text-xl",
      "helper": "text-base sm:text-lg",
      "avoid": "text-xs in pupil mode"
    }
  },

  "color_system": {
    "notes": [
      "Keep Staff Mode calm and neutral; primary accent is muted green.",
      "Restrained red only for destructive/alerts.",
      "Zones of Regulation must remain Blue/Green/Yellow/Red semantically; do not reuse primary green for Zone Green to avoid confusion—use distinct hue families + labels/icons.",
      "All tokens remain HSL and consumed via hsl(var(--token))."
    ],

    "css_custom_properties": {
      "staff_base_tokens": {
        "--background": "40 33% 98%",
        "--foreground": "196 28% 14%",
        "--card": "0 0% 100%",
        "--card-foreground": "196 28% 14%",
        "--popover": "0 0% 100%",
        "--popover-foreground": "196 28% 14%",

        "--primary": "154 34% 28%",
        "--primary-foreground": "0 0% 100%",

        "--secondary": "40 18% 94%",
        "--secondary-foreground": "196 28% 14%",

        "--muted": "40 16% 93%",
        "--muted-foreground": "196 10% 36%",

        "--accent": "154 28% 92%",
        "--accent-foreground": "196 28% 14%",

        "--destructive": "6 68% 46%",
        "--destructive-foreground": "0 0% 100%",

        "--border": "196 16% 84%",
        "--input": "196 16% 84%",
        "--ring": "154 40% 32%",

        "--radius": "1rem"
      },

      "wp_namespace_extensions": {
        "--wp-surface-cream": "40 33% 98%",
        "--wp-surface-ivory": "42 26% 96%",
        "--wp-ink": "196 28% 14%",
        "--wp-ink-muted": "196 10% 36%",

        "--wp-primary": "154 34% 28%",
        "--wp-primary-700": "154 38% 20%",
        "--wp-primary-soft": "154 28% 88%",

        "--wp-danger": "6 68% 46%",
        "--wp-warning": "35 85% 45%",
        "--wp-success": "160 42% 28%",

        "--wp-focus": "154 55% 38%",

        "--wp-tint-mint": "154 30% 92%",
        "--wp-tint-peach": "24 70% 92%",
        "--wp-tint-butter": "48 80% 92%",
        "--wp-tint-sage": "120 18% 92%",
        "--wp-tint-sky": "205 55% 92%",
        "--wp-tint-blush": "350 45% 93%",
        "--wp-tint-rose": "340 45% 93%",

        "--wp-shadow-sm": "0 1px 0 rgba(16, 24, 40, 0.04), 0 1px 2px rgba(16, 24, 40, 0.06)",
        "--wp-shadow-md": "0 2px 6px rgba(16, 24, 40, 0.08), 0 10px 24px rgba(16, 24, 40, 0.06)",
        "--wp-shadow-float": "0 14px 40px rgba(16, 24, 40, 0.14)",

        "--wp-radius-sm": "0.75rem",
        "--wp-radius-md": "1rem",
        "--wp-radius-lg": "1.25rem",
        "--wp-radius-xl": "1.75rem",
        "--wp-radius-2xl": "2.25rem",

        "--wp-gap": "1.5rem",
        "--wp-card-pad": "1.25rem"
      },

      "pupil_mode_overrides": {
        "activation": "Apply on a root attribute, e.g. html[data-mode='pupil'] or body[data-shell='pupil'] (choose whichever exists).",
        "tokens": {
          "--background": "42 40% 97%",
          "--foreground": "196 28% 14%",
          "--card": "0 0% 100%",
          "--card-foreground": "196 28% 14%",

          "--primary": "154 45% 34%",
          "--primary-foreground": "0 0% 100%",

          "--border": "196 18% 82%",
          "--ring": "154 60% 40%",

          "--wp-pupil-canvas": "42 40% 97%",
          "--wp-pupil-ink": "196 28% 14%",
          "--wp-pupil-ink-muted": "196 10% 34%",

          "--wp-pupil-primary": "154 45% 34%",
          "--wp-pupil-primary-soft": "154 40% 88%",

          "--wp-pupil-tile-mint": "154 45% 90%",
          "--wp-pupil-tile-peach": "24 80% 90%",
          "--wp-pupil-tile-sky": "205 70% 90%",
          "--wp-pupil-tile-butter": "48 90% 88%",
          "--wp-pupil-tile-lilac": "255 45% 92%"
        }
      },

      "high_contrast_overrides": {
        "keep_existing_mechanism": "Use html[data-contrast='high'] to bump borders + deepen muted text.",
        "recommended": {
          "--border": "196 28% 62%",
          "--muted-foreground": "196 18% 22%",
          "--wp-ink-muted": "196 18% 22%",
          "focus_outline": "3px outline in high contrast"
        }
      }
    },

    "semantic_state_palettes": {
      "timetable_status": {
        "now": {
          "bg": "154 28% 90%",
          "fg": "154 38% 20%",
          "border": "154 30% 70%",
          "icon": "play"
        },
        "next": {
          "bg": "205 55% 92%",
          "fg": "205 55% 26%",
          "border": "205 35% 72%",
          "icon": "arrow-right"
        },
        "later": {
          "bg": "40 16% 93%",
          "fg": "196 10% 34%",
          "border": "196 16% 84%",
          "icon": "dot"
        },
        "finished": {
          "bg": "160 35% 92%",
          "fg": "160 45% 22%",
          "border": "160 25% 72%",
          "icon": "check"
        },
        "skipped": {
          "bg": "35 90% 92%",
          "fg": "35 85% 28%",
          "border": "35 55% 72%",
          "icon": "ban"
        }
      },

      "zones_of_regulation": {
        "rule": "Always show zone name text + icon; never rely on color alone.",
        "blue": {
          "bg": "205 70% 92%",
          "fg": "205 70% 26%",
          "border": "205 45% 70%"
        },
        "green": {
          "bg": "140 45% 92%",
          "fg": "140 55% 24%",
          "border": "140 30% 70%",
          "note": "Different hue family from primary muted green (154) to avoid confusion."
        },
        "yellow": {
          "bg": "48 95% 90%",
          "fg": "40 90% 26%",
          "border": "48 55% 70%"
        },
        "red": {
          "bg": "6 85% 92%",
          "fg": "6 70% 30%",
          "border": "6 45% 72%"
        }
      },

      "speak_affordance": {
        "idle": {
          "bg": "154 28% 92%",
          "fg": "154 38% 20%",
          "ring": "154 55% 38%"
        },
        "loading": {
          "bg": "40 16% 93%",
          "fg": "196 10% 34%",
          "spinner": "use Loader2"
        },
        "speaking": {
          "bg": "154 35% 88%",
          "fg": "154 38% 20%",
          "motion": "subtle pulse opacity only if data-animation=subtle"
        }
      }
    }
  },

  "layout_and_grid": {
    "staff_shell": {
      "sidebar": {
        "width": "248px fixed (existing)",
        "style": "ivory surface, 1px border-right, active item uses left 3px accent bar + subtle background tint",
        "nav_item_height": "44-48px",
        "icon_size": "18-20px",
        "section_labels": "text-xs uppercase tracking"
      },
      "header": {
        "height": "56px mobile / 64px desktop",
        "sticky": true,
        "contents": "page title, context switchers, quick actions, search (optional)"
      },
      "content": {
        "max_width": "none (full) but use internal grids",
        "page_padding": "var(--wp-gap)",
        "grid": "12-col at lg; 4-col at sm; use gap var(--wp-gap)"
      }
    },
    "pupil_shell": {
      "header": {
        "minimal": true,
        "height": "56px",
        "contents": "current pupil name + voice selector (staff-only overlay)"
      },
      "bottom_tabs": {
        "count": 5,
        "height": "88px",
        "tab_target": "min 80x80",
        "labels": "large, Fredoka"
      },
      "content": {
        "padding": "16px mobile, 24px tablet",
        "grid": "2 columns mobile, 3 columns tablet for tiles"
      }
    }
  },

  "component_path": {
    "shadcn_primary": [
      "/app/frontend/src/components/ui/button.jsx",
      "/app/frontend/src/components/ui/card.jsx",
      "/app/frontend/src/components/ui/tabs.jsx",
      "/app/frontend/src/components/ui/dialog.jsx",
      "/app/frontend/src/components/ui/alert-dialog.jsx",
      "/app/frontend/src/components/ui/tooltip.jsx",
      "/app/frontend/src/components/ui/dropdown-menu.jsx",
      "/app/frontend/src/components/ui/select.jsx",
      "/app/frontend/src/components/ui/switch.jsx",
      "/app/frontend/src/components/ui/slider.jsx",
      "/app/frontend/src/components/ui/progress.jsx",
      "/app/frontend/src/components/ui/table.jsx",
      "/app/frontend/src/components/ui/calendar.jsx",
      "/app/frontend/src/components/ui/sonner.jsx"
    ],
    "common_vocabulary_to_restyle_in_place": "/app/frontend/src/components/common.js",
    "global_tokens": "/app/frontend/src/index.css",
    "app_css": "/app/frontend/src/App.css"
  },

  "common_components_restyle_spec": {
    "PageHeader": {
      "staff": {
        "eyebrow": "text-xs uppercase tracking-[0.14em] muted",
        "title": "Montserrat, bold, tighter leading",
        "description": "max-w-2xl, text-sm/base, muted",
        "actions": "right aligned, wrap, primary button first"
      },
      "pupil": {
        "title": "Fredoka, larger",
        "description": "avoid long paragraphs"
      }
    },

    "SectionCard": {
      "staff": {
        "surface": "white card, 1px border, wp-shadow-sm",
        "radius": "--wp-radius-2xl",
        "header_row": "title left, actions right; keep compact",
        "symbol_slot": "24-28px icon or small Widgit symbol framed"
      },
      "pupil": {
        "surface": "clay tile variant (see clay recipe)",
        "radius": "28-32px",
        "padding": "24-28px",
        "title": "large, minimal"
      }
    },

    "ListRow": {
      "staff": {
        "height": "min 56px",
        "hover": "bg accent 4%",
        "active": "ring 2px",
        "layout": "left content + right actions; never cramped"
      },
      "pupil": {
        "avoid": "Prefer tiles over rows"
      }
    },

    "EmptyState": {
      "change": "Remove mascot usage in staff mode; replace with simple icon + calm copy.",
      "staff": {
        "icon": "lucide icon relevant to page",
        "surface": "muted tint background, border",
        "copy": "short, actionable"
      },
      "pupil": {
        "icon": "large Widgit symbol or friendly lucide icon",
        "copy": "very short"
      }
    },

    "SampleBadge": {
      "keep": true,
      "style": "more neutral amber; ensure high contrast"
    },

    "StatusChip": {
      "change": "Replace text marks (▶ → • ✓ ⊘) with lucide icons for professionalism; keep labels.",
      "sizes": "text-xs font-semibold, min height 28px",
      "colors": "use timetable_status palette tokens"
    },

    "StatTile": {
      "staff": {
        "surface": "tinted background via tint(), border",
        "value": "Montserrat bold",
        "label": "uppercase optional"
      },
      "pupil": {
        "avoid": "Use big tiles with symbols"
      }
    },

    "ConfirmAction": {
      "staff": {
        "dialog": "clean, no mascot, clear destructive styling",
        "buttons": "Cancel secondary, Confirm destructive"
      }
    },

    "AddButton": {
      "staff": {
        "variant": "primary",
        "icon": "Plus 18px",
        "height": "44px"
      }
    },

    "Loading": {
      "staff": {
        "spinner": "Loader2",
        "copy": "text-sm muted"
      },
      "pupil": {
        "copy": "bigger text + optional progress bar"
      }
    },

    "AccessDenied": {
      "staff": {
        "surface": "card",
        "copy": "direct, no blame"
      }
    },

    "PupilAvatar": {
      "staff": {
        "shape": "rounded-lg",
        "border": "2px white",
        "shadow": "wp-shadow-sm"
      },
      "pupil": {
        "size": "larger default 72",
        "shape": "rounded-2xl"
      }
    },

    "Mascot": {
      "action": "REMOVE/DEPRECATE. Replace with school identity text: 'Braunstone Frith Primary School, Leicester'.",
      "implementation": "Keep component but render a simple crest-like placeholder: a squircle with 'BF' monogram (Montserrat) OR remove from EmptyState usage."
    },

    "SparkPill": {
      "staff": {
        "surface": "butter tint, readable",
        "icon": "Sparkles",
        "size": "text-sm"
      },
      "pupil": {
        "surface": "clay pill, larger"
      }
    },

    "SampleDataBanner": {
      "staff": {
        "surface": "amber-50 with border",
        "copy": "keep as-is but ensure spacing + readability"
      }
    }
  },

  "widgit_symbol_framing": {
    "problem": "Flat line drawings on white can look like clipart dropped onto cards.",
    "solution": {
      "staff": {
        "frame": "24–32px symbol inside a 40px rounded-2xl chip",
        "background": "hsl(var(--wp-primary-soft)) or hsl(var(--muted))",
        "border": "1px solid hsl(var(--border))",
        "padding": "6–8px",
        "rule": "Never tint the symbol itself; tint the frame behind it."
      },
      "pupil": {
        "frame": "symbol inside a 96–140px tile area",
        "background": "pastel tile color",
        "padding": "12–16px",
        "rule": "Keep symbol on white plate: add an inner white rounded rect behind symbol (like a sticker) with subtle shadow."
      }
    }
  },

  "claymorphism_recipe_pupil": {
    "principles": [
      "Clay only in Pupil Mode tiles/buttons; Staff Mode stays flat-elevated.",
      "Use colored shadows (not gray) to avoid dirty look.",
      "No glossy gradients; rely on soft highlights + inset shadows."
    ],
    "radii": {
      "tile": "28–32px",
      "button": "18–22px",
      "icon_plate": "20–24px"
    },
    "shadow_tokens_to_add": {
      "--wp-clay-shadow": "10px 12px 24px hsl(var(--wp-clay-shadow-color) / 0.35)",
      "--wp-clay-inset-dark": "inset -10px -12px 18px hsl(var(--wp-clay-shadow-color) / 0.22)",
      "--wp-clay-inset-light": "inset 8px 8px 14px rgba(255,255,255,0.55)"
    },
    "example_tailwind_class_scaffold": {
      "tile": "rounded-[32px] border border-white/60 bg-white shadow-[var(--wp-clay-shadow),var(--wp-clay-inset-light),var(--wp-clay-inset-dark)]",
      "press": "active:scale-[0.98]",
      "transition": "transition-[box-shadow,transform,background-color] duration-200"
    }
  },

  "motion": {
    "rule": "No unnecessary animation. Only feedback + state transitions.",
    "durations": {
      "fast": "150ms",
      "standard": "200ms",
      "slow": "250ms"
    },
    "allowed": [
      "hover background tint",
      "press scale 0.98",
      "opacity/transform entrance for dialogs",
      "speaking subtle pulse (opacity) only when data-animation=subtle"
    ],
    "never": [
      "parallax",
      "looping decorative animations",
      "transition: all"
    ]
  },

  "brain_breaks_ui": {
    "staff_config_view": {
      "layout": "Two tabs: Built-in Activities | Video Library",
      "components": [
        "Tabs (shadcn)",
        "Card list rows for activities",
        "Dialog for add/edit video link",
        "Switch for enabled",
        "Select for voice"
      ],
      "data_testids": [
        "brain-breaks-tabs",
        "brain-breaks-add-video-button",
        "brain-breaks-video-url-input",
        "brain-breaks-save-button"
      ]
    },
    "pupil_run_view": {
      "layout": "Full-screen, single focus. Big start/stop. Countdown. Minimal chrome.",
      "built_in": {
        "breathing_circle": "Use a single circle that scales (transform) 1.0→1.18 over 4s inhale, then back over 4s exhale. Respect data-animation=none.",
        "stretch_steps": "Show 3–5 symbol steps as big tiles; auto-advance with timer.",
        "timer": "Large digits, Montserrat/Fredoka, tabular-nums"
      },
      "external_video": {
        "player": "Use responsive iframe container; provide fallback link button.",
        "safety": "Always show title + duration; confirm before opening external content"
      },
      "data_testids": [
        "brain-breaks-run-start-button",
        "brain-breaks-run-stop-button",
        "brain-breaks-timer",
        "brain-breaks-breathing-circle"
      ]
    }
  },

  "dark_mode_recommendation": {
    "recommendation": "Optional for Staff Mode only. Do NOT enable for Pupil Mode by default (projector/tablets in bright rooms).",
    "if_added": {
      "approach": "Add html.dark overrides for staff shell only; keep pupil always light.",
      "avoid": "Do not introduce gradients; keep surfaces near-neutral charcoal with high contrast."
    }
  },

  "image_urls": {
    "policy": "Avoid decorative stock imagery. Use symbols + UI clarity. Only use subtle textures/noise if needed.",
    "none_required": true
  },

  "instructions_to_main_agent": [
    "Update /app/frontend/src/index.css: replace Space Grotesk import with Montserrat + Fredoka + Figtree (keep Figtree). Ensure only approved fonts are imported.",
    "Remove all purple/aubergine tokens (e.g., --wp-aubergine, --wp-tint-lilac can remain as pastel but ensure no purple accents in staff UI).",
    "Implement a mode switch token override (staff vs pupil) via a root attribute already available in shells; do NOT rewrite styling architecture.",
    "Restyle the enumerated components in /app/frontend/src/components/common.js exactly per spec; this will propagate across pages.",
    "Replace Mascot usage in EmptyState with a lucide icon or the Frith logo mark; update branding text to 'Braunstone Frith Primary School, Leicester' and demo staff user to 'Ashley Gert'.",
    "Update StatusChip to use lucide icons and the timetable_status palette; ensure each chip has data-testid.",
    "Ensure every speakable tile/button has a consistent speak affordance (small circular button with Volume2 icon) + loading/speaking state.",
    "Respect data-animation=none and prefers-reduced-motion: only transform/opacity transitions 150–250ms; never transition: all.",
    "Ensure touch targets: staff min 44px; pupil tiles min 80px; add padding accordingly.",
    "Keep WCAG 2.2 AA in staff; aim AAA for pupil text (bigger sizes + strong contrast)."
  ],

  "general_ui_ux_design_guidelines_appendix": "<General UI UX Design Guidelines>\n    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms\n    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text\n   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json\n\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. \n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.\n</General UI UX Design Guidelines>"
}
