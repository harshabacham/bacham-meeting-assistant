---
name: Premium UI/UX Design
description: Rules and guidelines for building standout, premium user interfaces with modern React, Tailwind, Framer Motion, and Glassmorphism.
---

# Premium UI/UX Design Standards

When building or refactoring UI for this project, you MUST adhere to the following premium design principles to ensure the application stands out.

## 1. Spatial UI & Glassmorphism 2.0
- **Depth & Hierarchy**: Do not use flat, solid backgrounds for cards. Use subtle glassmorphism (translucency + background blur).
- **Subtle Borders**: All cards and panels should have a 1px border with very low opacity (e.g., `border-white/10` or `border-border/50`).
- **Gradients over Solids**: When highlighting elements, prefer soft mesh gradients or radial glows over solid block colors.

## 2. Motion & Micro-interactions (Framer Motion)
- **Physics over Easing**: Use spring animations instead of linear easing. Interfaces should feel physical and reactive.
- **Hover States**: Every interactive element MUST have a hover state. Use scaling (`whileHover={{ scale: 1.02 }}`) and opacity shifts.
- **Mount Animations**: Components should never just "appear". They should fade in and slide up slightly (`initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}`).
- **Layout Transitions**: Use `layout` prop on motion elements for smooth list reordering or resizing.

## 3. Typography & Spacing
- **Contrast**: Avoid pure white text on pure black backgrounds (`#FFFFFF` on `#000000`). Use off-whites (`text-foreground` / `#EAEAEA`) on deep grays/blacks (`#111111` or `#09090B`).
- **Font Weights**: Use contrasting font weights to establish hierarchy (e.g., extremely light headers vs bold metrics).
- **Breathing Room**: Be generous with padding (`p-6`, `p-8`) to prevent cluttered layouts. 

## 4. Layouts (Bento Grids)
- When presenting dashboards or multiple statistics, utilize **Bento Grids** (asymmetric, dense card layouts) instead of basic rows and columns.
- Use `backdrop-blur` and translucent backgrounds for bento items to give them a premium feel.

## Example Component Scaffold
```tsx
import { motion } from "framer-motion";

export const PremiumCard = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -2 }}
    transition={{ type: "spring", stiffness: 300, damping: 20 }}
    className="relative overflow-hidden rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 shadow-2xl"
  >
    {/* Subtle inner glow */}
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
    
    <div className="relative z-10">
      {children}
    </div>
  </motion.div>
);
```
