# Flora Design Philosophy

## Goals

Flora should feel like a professional broadcast graphics package rather than a traditional browser widget.

The UI should enhance the stream without distracting from the content.

---

## Design Principles

### Readability First

- Large typography
- High contrast
- Minimal visual clutter
- Easy to read at 1080p and 4K

---

### Minimal Motion

Animation should communicate information.

Animations should never exist simply because they look cool.

Motion should be:

- smooth
- slow
- interruptible

---

### Colour

Primary accent:

- Cyan

Supporting colours:

- White
- Silver
- Gold
- Bronze

Avoid highly saturated rainbow colours.

---

### Glassmorphism

Panels should resemble frosted glass.

Use:

- translucent backgrounds
- subtle blur
- soft borders
- gentle glows

Avoid opaque boxes.

---

### Layout

Information should be aligned to an invisible grid.

Spacing should be generous.

Nothing should feel cramped.

---

### Typography

Headers should feel bold.

Numbers should stand out.

Names should remain readable.

---

### Broadcast Safe

Panels should never obscure important gameplay.

Browser sources should work at:

- 1080p
- 1440p
- 4K

---

### Themes

Every theme should keep the same layout.

Only colours, lighting and decoration should change.

---

### Performance

Animations should remain smooth on low-end systems.

Avoid unnecessary DOM updates.

Avoid unnecessary repainting.

---

### Architecture

Renderer code should remain generic.

Configuration should drive behaviour.

Panels should be data-driven.

No feature should require hardcoding a specific leaderboard.

## Panel Engine Direction

Flora should treat leaderboards as one type of panel, not as the core abstraction. Renderer code should resolve a configured panel, inspect its panel type, and delegate rendering to a focused renderer implementation.

The current table renderer is the first concrete panel renderer. Future panel types should be added through the same dispatch boundary rather than by adding panel-specific branches throughout the main render loop.
