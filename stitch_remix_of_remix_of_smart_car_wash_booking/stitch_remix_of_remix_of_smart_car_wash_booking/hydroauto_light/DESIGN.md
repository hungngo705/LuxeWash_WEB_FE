---
name: HydroAuto Light
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#3f484e'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#6f787f'
  outline-variant: '#bec8cf'
  surface-tint: '#006689'
  primary: '#006689'
  on-primary: '#ffffff'
  primary-container: '#4aa9d7'
  on-primary-container: '#003b51'
  inverse-primary: '#7ad1ff'
  secondary: '#545f73'
  on-secondary: '#ffffff'
  secondary-container: '#d5e0f8'
  on-secondary-container: '#586377'
  tertiary: '#006686'
  on-tertiary: '#ffffff'
  tertiary-container: '#50a9d0'
  on-tertiary-container: '#003b4f'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c3e8ff'
  primary-fixed-dim: '#7ad1ff'
  on-primary-fixed: '#001e2c'
  on-primary-fixed-variant: '#004c68'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#c0e8ff'
  tertiary-fixed-dim: '#7bd1fa'
  on-tertiary-fixed: '#001e2b'
  on-tertiary-fixed-variant: '#004d66'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Sora
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Sora
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Sora
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Sora
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  container-max: 1280px
---

## Brand & Style
The design system embodies the "HydroAuto" aesthetic: a high-tech, pristine, and refreshing approach to automotive care. It focuses on a premium light-themed experience that feels airy and clinical yet technologically advanced.

The visual style is **Refined Glassmorphism**. It utilizes the clarity of pure white surfaces paired with the energetic "Neon Blue" primary. By leveraging semi-transparent white overlays, subtle backdrop blurs, and precise typography, the UI evokes the feeling of a high-end laboratory or a futuristic vehicle interface. The target audience expects efficiency, transparency, and a frictionless digital environment that mirrors a premium physical service.

## Colors
The palette is dominated by **Pure White (#FFFFFF)** and **Cool Gray (#F8FAFC)** to create an expansive, airy foundation. 

- **Primary (Neon Blue):** Reserved for high-action items, active states, and brand highlights. It should feel like a glowing light source against the white background.
- **Secondary (Slate):** A deep, high-contrast gray used for primary text and structural icons to ensure maximum legibility and a grounded professional feel.
- **Surface Strategy:** Surfaces use subtle gradients of white to light-gray to define depth without relying on heavy borders.

## Typography
Typography in this design system balances geometric modernity with utilitarian precision. 

- **Sora (Headlines):** Its geometric construction feels engineered and futuristic. Use heavy weights for impact in display roles.
- **Inter (Body):** Selected for its exceptional readability at any scale. It provides a neutral, professional contrast to the expressive headlines.
- **Geist (Labels/Monospaced):** Used for technical data, time-stamps, and status indicators. The technical "developer-style" feel reinforces the tech-focused brand narrative.

## Layout & Spacing
This design system employs a **Fluid Grid** model with a generous 8px spatial rhythm. 

- **Desktop:** A 12-column grid with 24px gutters. Use large margins (64px+) to create an "airy" and "premium" sense of space, preventing the UI from feeling cluttered.
- **Mobile:** A 4-column grid with 16px margins. 
- **Philosophy:** Components should use internal padding of 16px or 24px (2x or 3x units) to maintain a consistent density. Avoid tight clustering; allow elements to "breathe" to mimic the cleanliness of a high-end service bay.

## Elevation & Depth
Depth is created through **Light Glassmorphism** rather than traditional heavy shadows.

- **Surface Tiers:** Backgrounds are #FFFFFF. Elevated containers use a semi-transparent white fill (e.g., `rgba(255, 255, 255, 0.7)`) with a `backdrop-filter: blur(12px)`.
- **Shadows:** Use extremely soft, diffused shadows with a slight blue tint: `0 8px 32px rgba(74, 169, 215, 0.08)`. This keeps the design feeling "weightless" and clean.
- **Borders:** Use 1px solid borders in a very light neutral (e.g., #E2E8F0) to define edges where glass effects overlap.

## Shapes
The shape language is modern and approachable, using a **Rounded (Level 2)** system. 

- **Standard Elements:** 0.5rem (8px) radius for buttons and input fields.
- **Cards/Containers:** 1rem (16px) for larger surface areas like modal containers and wash-package cards.
- **Interactive States:** Use a subtle "squish" animation or scale-down (0.98x) on click to add a tactile, high-tech response.

## Components
- **Buttons:** Primary buttons use a solid Neon Blue (#4AA9D7) with white text. Secondary buttons utilize the white glass effect with a Neon Blue stroke and text.
- **Cards:** White glass panels with a subtle backdrop blur. Headers within cards should use the Sora typeface in Slate (#1E293B).
- **Input Fields:** Soft gray backgrounds (#F1F5F9) with a 1px transparent border that turns Neon Blue on focus. Labels use Geist for a "tech-spec" appearance.
- **Chips/Status:** For active statuses, use a low-opacity Neon Blue background with high-opacity blue text. For inactive, use cool grays.
- **Progress Indicators:** Linear bars with a glowing Neon Blue head, suggesting motion and flow, consistent with the "Hydro" theme.
- **Specialty Components:** Include "Vehicle Status" cards that use subtle technical line-art or wireframe illustrations to emphasize the tech-forward nature of the service.