# Development Scripts

This directory contains helper scripts for AtelierCode development.

## build-plugins.js

Automatically builds and installs plugins for development/testing.

### What it does:

1. Builds plugins from source (runs `cargo build --release`)
2. Copies compiled libraries to the plugins directory
3. Copies `plugin.toml` manifests
4. Creates necessary directories if they don't exist

### Usage:

```bash
# Build all plugins
npm run build:plugins

# Or run directly
node scripts/build-plugins.js

# Run dev with plugins (recommended)
npm run tauri:dev
```

### Plugin Configuration:

Edit the `plugins` array in `build-plugins.js` to add more plugins:

```javascript
const plugins = [
  {
    name: 'claude-code',
    repoPath: path.join(__dirname, '../../ateliercode-plugin-claude'),
    libraryName: getLibraryName('ateliercode_plugin_claude'),
  },
  // Add more plugins here...
];
```

### Plugin Locations:

- **Windows**: `%APPDATA%\AtelierCode\plugins\`
- **macOS**: `~/Library/Application Support/AtelierCode/plugins/`
- **Linux**: `~/.config/ateliercode/plugins/`

### Prerequisites:

- Plugin repos must be in sibling directories (e.g., `../ateliercode-plugin-claude`)
- Rust toolchain must be installed (the script automatically adds `~/.cargo/bin` to PATH on Windows)

### Troubleshooting:

**Plugin repo not found:**
```
⚠️  Plugin repository not found at C:\projects\ateliercode-plugin-claude
```
Solution: Clone the plugin repo to the expected location or update the `repoPath`.

**Build failed:**
```
❌ Build failed: Command failed...
```
Solution: Check that the plugin compiles correctly with `cargo build --release` in the plugin directory.

**Library not found:**
```
❌ Library not found: target/release/ateliercode_plugin_claude.dll
```
Solution: Ensure the build succeeded and the library filename matches your platform.

## Future Scripts:

- `test-plugins.js` - Run plugin tests
- `package-plugins.js` - Package plugins for distribution
- `publish-plugins.js` - Publish to plugin registry
