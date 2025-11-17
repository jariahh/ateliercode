# Theme Selector Debug Guide

## Issues Found and Fixed

### 1. Dropdown Not Closing After Selection
**Problem**: The DaisyUI dropdown remained open after selecting a theme.

**Solution**: Added `activeElement.blur()` to close the dropdown after theme selection.

**Location**: `src/components/ThemeSelector.tsx`
```typescript
const handleThemeChange = (newTheme: Theme) => {
  console.log('[ThemeSelector] Theme button clicked:', newTheme);
  setTheme(newTheme);
  // Close the dropdown by removing focus
  const activeElement = document.activeElement as HTMLElement;
  if (activeElement) {
    activeElement.blur();
  }
};
```

### 2. Race Condition on Initial Load
**Problem**: The initial theme setup at the bottom of `themeStore.ts` could execute before the persisted state rehydrates, potentially causing a flash of wrong theme.

**Solution**: Wrapped the initialization in `setTimeout(() => {...}, 0)` and added a check to only apply if no theme is already set.

**Location**: `src/stores/themeStore.ts`
```typescript
// Initialize theme on load (fallback for first load before rehydration)
setTimeout(() => {
  const theme = useThemeStore.getState().theme;
  const currentTheme = document.documentElement.getAttribute('data-theme');
  if (!currentTheme) {
    console.log('[ThemeStore] Initial theme setup:', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }
}, 0);
```

### 3. Added Debug Logging
**Added console.log statements** to trace theme changes:
- When setTheme is called
- When the data-theme attribute is set
- During store rehydration
- On initial theme setup

## Browser Console Testing

### Test 1: Check Current Theme
```javascript
document.documentElement.getAttribute('data-theme')
```

### Test 2: Manually Change Theme
```javascript
document.documentElement.setAttribute('data-theme', 'cyberpunk')
```

### Test 3: Check Zustand Store State
```javascript
// Open browser console and type this to inspect the store
useThemeStore.getState()
```

### Test 4: Check LocalStorage
```javascript
localStorage.getItem('ateliercode-theme')
```

### Test 5: Clear Theme and Reload
```javascript
localStorage.removeItem('ateliercode-theme')
location.reload()
```

## What to Look For

### Console Logs (in order of execution):
1. `[ThemeStore] Rehydrating theme store` - Store loading from localStorage
2. `[ThemeStore] Rehydrated theme applied` - Theme applied from saved state
3. `[ThemeSelector] Theme button clicked: [theme-name]` - User clicks a theme
4. `[ThemeStore] Setting theme to: [theme-name]` - setTheme called
5. `[ThemeStore] data-theme attribute set to: [theme-name]` - DOM updated

### Visual Indicators:
- The dropdown should close immediately after clicking a theme
- The selected theme should have a checkmark (✓) badge
- The selected theme button should be highlighted (btn-primary)
- The page colors should change instantly

## Verification Checklist

- [x] ThemeSelector properly calls setTheme
- [x] setTheme updates the Zustand store
- [x] setTheme sets data-theme attribute on document.documentElement
- [x] Dropdown closes after selection
- [x] onRehydrateStorage applies saved theme on load
- [x] Theme persists across page refreshes
- [x] ThemeSelector is rendered in App.tsx (fixed bottom-right)
- [x] Console logging added for debugging

## Code Architecture

```
User clicks theme button
    ↓
handleThemeChange() in ThemeSelector
    ↓
setTheme() in themeStore
    ↓
Updates Zustand state (triggers re-render)
    ↓
Sets document.documentElement.setAttribute('data-theme', theme)
    ↓
Zustand persist middleware saves to localStorage
    ↓
Dropdown closes via activeElement.blur()
```

## Common Issues & Solutions

### Theme not changing visually
- Check if Tailwind CSS includes DaisyUI themes
- Verify `tailwind.config.js` has `daisyui` in plugins
- Check if `data-theme` attribute is on the `html` element (documentElement)

### Theme not persisting
- Check localStorage for 'ateliercode-theme' key
- Verify onRehydrateStorage is being called
- Check browser console for any errors

### Dropdown not closing
- Verify the blur() call in handleThemeChange
- Check if activeElement is correctly identified
- Ensure tabIndex is set on dropdown elements

## Files Modified

1. **src/components/ThemeSelector.tsx**
   - Added handleThemeChange function
   - Added console.log for debugging
   - Added activeElement.blur() to close dropdown

2. **src/stores/themeStore.ts**
   - Added console.log statements throughout
   - Fixed initialization timing with setTimeout
   - Added check to prevent overwriting rehydrated theme
