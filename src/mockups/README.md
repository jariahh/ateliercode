# AtelierCode UI Mockups

This folder contains 4 different UI mockup options for the AtelierCode workspace. Each mockup demonstrates a different design philosophy and can be tested with multiple DaisyUI themes.

## Mockups Overview

### Mockup 1: Linear Style
**File:** `mockup-1/Workspace.tsx`
**Theme:** Light (default)
**Inspiration:** Linear's clean, modern interface

**Features:**
- Left sidebar navigation
- Card-based content layout
- Clean stats display
- Progress indicators
- Activity stream

**Best for:** Users who prefer clean, minimalist interfaces with clear visual hierarchy

---

### Mockup 2: VS Code Dark
**File:** `mockup-2/Workspace.tsx`
**Theme:** Dark (default)
**Inspiration:** VS Code's developer-focused layout

**Features:**
- Activity bar (far left)
- Collapsible file explorer
- Multi-panel layout (editor + side panel + bottom panel)
- Tab-based navigation
- Syntax-highlighted code display
- Terminal integration

**Best for:** Developers who want a familiar IDE-like experience

---

### Mockup 3: Notion Clean
**File:** `mockup-3/Workspace.tsx`
**Theme:** Cupcake (default)
**Inspiration:** Notion's content-first design

**Features:**
- Spacious, readable layout
- Large typography
- Content-focused design
- Breadcrumb navigation
- Timeline-style activity feed
- Icon-based quick actions

**Best for:** Users who prefer reading and understanding information over dense data display

---

### Mockup 4: Cyberpunk Edge
**File:** `mockup-4/Workspace.tsx`
**Theme:** Cyberpunk (default)
**Inspiration:** Bold, futuristic aesthetics

**Features:**
- Gradient top bar
- Monospace fonts everywhere
- Bold borders and shadows
- All-caps labels
- Terminal-style formatting
- Neon color accents

**Best for:** Users who want a unique, bold aesthetic that stands out

---

## How to Use

1. **Run the app:**
   ```bash
   npm run dev
   ```

2. **Select a mockup** from the home screen

3. **Try different themes** using the theme selector dropdown

4. **Test different DaisyUI themes:**
   - Light
   - Dark
   - Cupcake
   - Cyberpunk
   - Synthwave
   - Forest
   - Lofi
   - Dracula

---

## Adding New Mockups

To add a new mockup:

1. Create a new folder: `mockup-N/`
2. Create `Workspace.tsx` in that folder
3. Add the mockup to `MockupSelector.tsx`:
   ```tsx
   import MockupN from "./mockup-N/Workspace";

   const mockups = [
     // ... existing mockups
     { id: N, name: "Your Style", component: MockupN, theme: "dark" },
   ];
   ```

---

## Design Decisions

Each mockup demonstrates different UI patterns for:
- **Navigation:** Sidebar vs tabs vs breadcrumbs
- **Content density:** Compact vs spacious
- **Information hierarchy:** What's emphasized
- **Visual style:** Clean vs bold, light vs dark
- **Developer UX:** IDE-like vs app-like

---

## Next Steps

After reviewing mockups, we will:
1. Choose the preferred layout style
2. Refine the chosen design
3. Build reusable components
4. Implement the actual workspace

---

**Remember:** These are exploratory mockups. Mix and match elements from different mockups to create the ideal design!
