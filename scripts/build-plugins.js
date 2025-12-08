// Build and install plugins for development
// Run with: node scripts/build-plugins.js

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Plugin configurations
const plugins = [
  {
    name: 'claude-code',
    repoPath: path.join(__dirname, '../../ateliercode-plugin-claude'),
    libraryName: getLibraryName('ateliercode_plugin_claude'),
  },
  {
    name: 'gemini',
    repoPath: path.join(__dirname, '../../ateliercode-plugin-gemini'),
    libraryName: getLibraryName('ateliercode_plugin_gemini'),
  },
];

// Get platform-specific library filename
function getLibraryName(baseName) {
  switch (os.platform()) {
    case 'win32':
      return `${baseName}.dll`;
    case 'darwin':
      return `lib${baseName}.dylib`;
    case 'linux':
      return `lib${baseName}.so`;
    default:
      return `lib${baseName}.so`;
  }
}

// Get plugins directory based on platform
function getPluginsDir() {
  switch (os.platform()) {
    case 'win32':
      return path.join(process.env.APPDATA, 'AtelierCode', 'plugins');
    case 'darwin':
      return path.join(os.homedir(), 'Library', 'Application Support', 'AtelierCode', 'plugins');
    case 'linux':
      return path.join(os.homedir(), '.config', 'ateliercode', 'plugins');
    default:
      return path.join(os.homedir(), '.ateliercode', 'plugins');
  }
}

// Build a plugin
function buildPlugin(plugin) {
  console.log(`\n📦 Building plugin: ${plugin.name}`);
  console.log(`   Repo: ${plugin.repoPath}`);

  // Check if repo exists
  if (!fs.existsSync(plugin.repoPath)) {
    console.log(`   ⚠️  Plugin repository not found at ${plugin.repoPath}`);
    console.log(`   Skipping...`);
    return false;
  }

  // Check if Cargo.toml exists
  const cargoToml = path.join(plugin.repoPath, 'Cargo.toml');
  if (!fs.existsSync(cargoToml)) {
    console.log(`   ⚠️  Cargo.toml not found in ${plugin.repoPath}`);
    console.log(`   Skipping...`);
    return false;
  }

  try {
    // Build the plugin
    console.log(`   🔨 Building with cargo...`);

    // Add cargo to PATH on Windows if needed
    const env = { ...process.env };
    if (os.platform() === 'win32') {
      const cargoPath = path.join(os.homedir(), '.cargo', 'bin');
      if (fs.existsSync(cargoPath)) {
        env.PATH = `${cargoPath};${env.PATH}`;
      }
    }

    execSync('cargo build --release', {
      cwd: plugin.repoPath,
      stdio: 'inherit',
      env,
    });

    console.log(`   ✅ Build successful`);
    return true;
  } catch (error) {
    console.error(`   ❌ Build failed:`, error.message);
    return false;
  }
}

// Install a plugin
function installPlugin(plugin) {
  console.log(`\n📥 Installing plugin: ${plugin.name}`);

  const pluginsDir = getPluginsDir();
  const pluginDir = path.join(pluginsDir, plugin.name);

  // Create plugins directory if it doesn't exist
  if (!fs.existsSync(pluginsDir)) {
    console.log(`   📁 Creating plugins directory: ${pluginsDir}`);
    fs.mkdirSync(pluginsDir, { recursive: true });
  }

  // Create plugin-specific directory
  if (!fs.existsSync(pluginDir)) {
    console.log(`   📁 Creating plugin directory: ${pluginDir}`);
    fs.mkdirSync(pluginDir, { recursive: true });
  }

  // Copy library file
  const sourceLib = path.join(plugin.repoPath, 'target', 'release', plugin.libraryName);
  const destLib = path.join(pluginDir, plugin.libraryName);

  if (!fs.existsSync(sourceLib)) {
    console.error(`   ❌ Library not found: ${sourceLib}`);
    return false;
  }

  console.log(`   📋 Copying library...`);
  console.log(`      From: ${sourceLib}`);
  console.log(`      To:   ${destLib}`);
  try {
    fs.copyFileSync(sourceLib, destLib);
  } catch (err) {
    if (err.code === 'EBUSY') {
      console.log(`   ⚠️  Library is locked (app running?). Using existing file.`);
    } else {
      throw err;
    }
  }

  // Copy plugin.toml
  const sourceToml = path.join(plugin.repoPath, 'plugin.toml');
  const destToml = path.join(pluginDir, 'plugin.toml');

  if (fs.existsSync(sourceToml)) {
    console.log(`   📋 Copying plugin.toml...`);
    fs.copyFileSync(sourceToml, destToml);
  } else {
    console.log(`   ⚠️  plugin.toml not found, skipping...`);
  }

  console.log(`   ✅ Installation complete`);
  console.log(`   📍 Installed to: ${pluginDir}`);
  return true;
}

// Main execution
function main() {
  console.log('🚀 AtelierCode Plugin Builder\n');
  console.log(`Platform: ${os.platform()}`);
  console.log(`Plugins directory: ${getPluginsDir()}\n`);

  let successCount = 0;
  let totalCount = plugins.length;

  for (const plugin of plugins) {
    const built = buildPlugin(plugin);
    if (built) {
      const installed = installPlugin(plugin);
      if (installed) {
        successCount++;
      }
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✨ Plugin build complete: ${successCount}/${totalCount} successful`);
  console.log(`${'='.repeat(60)}\n`);

  if (successCount < totalCount) {
    console.log('⚠️  Some plugins failed to build or install.');
    console.log('   Check the output above for details.\n');
    process.exit(1);
  }

  console.log('✅ All plugins built and installed successfully!');
  console.log('   Restart AtelierCode to load the plugins.\n');
}

// Run if called directly
// In ES modules, check if this file is the entry point
const isMainModule = import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` ||
                      import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMainModule) {
  main();
}

export { buildPlugin, installPlugin, getPluginsDir };
