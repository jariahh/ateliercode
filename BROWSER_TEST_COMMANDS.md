# Browser Console Test Commands

## Quick Tests for Theme Selector

### 1. Check Current Theme
```javascript
document.documentElement.getAttribute('data-theme')
```
**Expected Output**: Current theme name (e.g., `"dark"`, `"cyberpunk"`)

---

### 2. Check HTML Element
```javascript
document.documentElement
```
**What to look for**: The `<html>` element should have `data-theme="..."` attribute

---

### 3. Check LocalStorage
```javascript
localStorage.getItem('ateliercode-theme')
```
**Expected Output**: JSON string like `{"state":{"theme":"dark"},"version":0}`

---

### 4. Parse LocalStorage Value
```javascript
JSON.parse(localStorage.getItem('ateliercode-theme'))
```
**Expected Output**: Object with theme state
```javascript
{
  state: { theme: "dark" },
  version: 0
}
```

---

### 5. Manually Set Theme (Test)
```javascript
document.documentElement.setAttribute('data-theme', 'cyberpunk')
```
**Expected Result**: Page colors should change immediately to cyberpunk theme

---

### 6. Test All Themes Quickly
```javascript
const themes = ['light', 'dark', 'cupcake', 'cyberpunk', 'synthwave', 'forest', 'lofi', 'dracula', 'bumblebee', 'emerald', 'corporate', 'retro', 'valentine', 'aqua', 'night', 'coffee'];
let i = 0;
setInterval(() => {
  document.documentElement.setAttribute('data-theme', themes[i % themes.length]);
  console.log('Theme:', themes[i % themes.length]);
  i++;
}, 2000);
```
**Expected Result**: Theme should change every 2 seconds, cycling through all 16 themes

---

### 7. Clear Theme and Reload
```javascript
localStorage.removeItem('ateliercode-theme');
location.reload();
```
**Expected Result**: App reloads with default 'dark' theme

---

### 8. Watch for Theme Changes (Advanced)
```javascript
// Set up a mutation observer to watch for theme changes
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
      console.log('Theme changed to:', document.documentElement.getAttribute('data-theme'));
    }
  });
});

observer.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['data-theme']
});

console.log('Theme observer active. Click theme buttons to see changes.');
```
**Expected Result**: Console logs every time the theme changes

---

### 9. Check if Zustand Store Exists (React DevTools)
```javascript
// This will only work if you expose the store or use React DevTools
// In production, you may need to add a temporary window.useThemeStore = useThemeStore
// For now, check localStorage instead
console.log('Current theme from localStorage:',
  JSON.parse(localStorage.getItem('ateliercode-theme') || '{}').state?.theme
);
```

---

### 10. Verify DaisyUI is Working
```javascript
// Check if DaisyUI CSS variables exist
const computed = getComputedStyle(document.documentElement);
console.log('Primary color:', computed.getPropertyValue('--p'));
console.log('Secondary color:', computed.getPropertyValue('--s'));
console.log('Accent color:', computed.getPropertyValue('--a'));
```
**Expected Output**: HSL color values (e.g., `"259 94% 51%"`)

---

## Expected Console Log Output

### On Page Load:
```
[ThemeStore] Rehydrating theme store, state: {theme: 'dark'}
[ThemeStore] Rehydrated theme applied: dark
```

### When Clicking a Theme Button:
```
[ThemeSelector] Theme button clicked: cyberpunk
[ThemeStore] Setting theme to: cyberpunk
[ThemeStore] data-theme attribute set to: cyberpunk
```

### First Load (No Saved Theme):
```
[ThemeStore] Initial theme setup: dark
```

---

## Troubleshooting Commands

### Issue: Theme not changing visually

1. **Check if DaisyUI is loaded:**
```javascript
document.querySelector('html').classList
// Should show DaisyUI classes if loaded
```

2. **Check CSS:**
```javascript
Array.from(document.styleSheets).some(sheet => {
  try {
    return Array.from(sheet.cssRules).some(rule =>
      rule.cssText.includes('data-theme')
    );
  } catch(e) { return false; }
})
// Should return true
```

### Issue: Theme not persisting

1. **Check localStorage permissions:**
```javascript
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
  console.log('localStorage is working');
} catch(e) {
  console.error('localStorage is blocked:', e);
}
```

2. **Check Zustand persist middleware:**
```javascript
// The 'ateliercode-theme' key should exist after changing theme
Object.keys(localStorage).filter(key => key.includes('theme'))
// Should return ['ateliercode-theme']
```

### Issue: Dropdown not closing

1. **Check active element:**
```javascript
console.log('Active element:', document.activeElement);
// After clicking theme, should NOT be the dropdown
```

2. **Manual close test:**
```javascript
document.activeElement.blur();
// Should close any open dropdown
```

---

## Performance Tests

### Measure Theme Switch Speed
```javascript
console.time('theme-switch');
document.documentElement.setAttribute('data-theme', 'cyberpunk');
console.timeEnd('theme-switch');
```
**Expected**: < 5ms

### Check Re-render Count (React DevTools Profiler)
1. Open React DevTools
2. Go to Profiler tab
3. Click Record
4. Change theme
5. Stop recording
6. Check ThemeSelector render count (should be 1-2)

---

## Automated Test Suite

```javascript
// Run this in browser console for automated testing
async function testThemeSelector() {
  console.log('=== Theme Selector Test Suite ===\n');

  // Test 1: Check initial state
  console.log('Test 1: Initial State');
  const initialTheme = document.documentElement.getAttribute('data-theme');
  console.log('✓ Initial theme:', initialTheme);

  // Test 2: Change theme
  console.log('\nTest 2: Change Theme');
  document.documentElement.setAttribute('data-theme', 'synthwave');
  await new Promise(r => setTimeout(r, 100));
  const newTheme = document.documentElement.getAttribute('data-theme');
  console.log(newTheme === 'synthwave' ? '✓' : '✗', 'Theme changed to:', newTheme);

  // Test 3: Check localStorage
  console.log('\nTest 3: LocalStorage');
  const stored = localStorage.getItem('ateliercode-theme');
  console.log('✓ Stored value:', stored);

  // Test 4: Restore original
  console.log('\nTest 4: Restore Original');
  document.documentElement.setAttribute('data-theme', initialTheme);
  await new Promise(r => setTimeout(r, 100));
  console.log('✓ Restored to:', document.documentElement.getAttribute('data-theme'));

  console.log('\n=== All Tests Complete ===');
}

// Run the tests
testThemeSelector();
```

---

## Production Checklist

Before deploying, verify:

- [ ] Theme changes instantly when clicked
- [ ] Dropdown closes after selection
- [ ] Theme persists after page refresh
- [ ] Theme persists after browser restart
- [ ] All 16 themes work correctly
- [ ] No console errors
- [ ] Console logs removed (or disabled in production)
- [ ] localStorage is accessible
- [ ] No FOUC (Flash of Unstyled Content)
- [ ] Theme button is visible and clickable
- [ ] Mobile responsive (theme button visible on mobile)

---

**Created**: 2025-11-17
**Purpose**: Browser console testing for theme selector functionality
