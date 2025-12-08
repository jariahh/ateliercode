use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::Path;
use walkdir::WalkDir;
use serde_json::Value;

use crate::types::ProjectAnalysisResult;

/// Analyze a project directory to detect languages, frameworks, and other metadata
pub fn analyze_project(path: &str) -> Result<ProjectAnalysisResult, String> {
    let project_path = Path::new(path);

    // Validate path exists and is a directory
    if !project_path.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    if !project_path.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    log::info!("Analyzing project at: {}", path);

    // Extract folder name for suggested project name
    let suggested_name = project_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("my-project")
        .to_string();

    // Initialize collections
    let mut file_extensions = HashMap::new();
    let mut file_count = 0;
    let mut has_git = false;
    let mut config_files = HashSet::new();

    // Walk the directory tree
    for entry in WalkDir::new(project_path)
        .max_depth(5) // Limit depth to avoid performance issues
        .into_iter()
        .filter_entry(|e| {
            // Skip common ignore directories
            let file_name = e.file_name().to_str().unwrap_or("");
            !matches!(
                file_name,
                "node_modules" | "target" | "dist" | "build" | ".git" | "__pycache__" | ".venv" | "venv"
            )
        })
    {
        match entry {
            Ok(entry) => {
                let path = entry.path();

                // Check for .git directory at root level
                if entry.depth() == 1 && entry.file_name() == ".git" {
                    has_git = true;
                    continue;
                }

                if path.is_file() {
                    file_count += 1;

                    // Track file extensions
                    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                        *file_extensions.entry(ext.to_lowercase()).or_insert(0) += 1;
                    }

                    // Track important config files
                    if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                        match file_name {
                            "package.json" | "Cargo.toml" | "requirements.txt" | "pyproject.toml"
                            | "go.mod" | "go.sum" | "pom.xml" | "build.gradle" | "Gemfile"
                            | "composer.json" | "CMakeLists.txt" | "Makefile" => {
                                config_files.insert(file_name.to_string());
                            }
                            _ => {}
                        }
                    }
                }
            }
            Err(e) => {
                log::warn!("Error reading entry: {}", e);
            }
        }
    }

    log::info!(
        "Analysis complete: {} files, {} extensions detected",
        file_count,
        file_extensions.len()
    );

    // Detect languages based on file extensions
    let detected_languages = detect_languages(&file_extensions);

    // Detect frameworks based on config files and project structure
    let detected_frameworks = detect_frameworks(project_path, &config_files);

    // Generate description
    let suggested_description = generate_description(&detected_languages, &detected_frameworks, file_count);

    Ok(ProjectAnalysisResult {
        suggested_name,
        suggested_description,
        detected_languages,
        detected_frameworks,
        file_count,
        has_git,
    })
}

/// Detect programming languages from file extensions
fn detect_languages(extensions: &HashMap<String, usize>) -> Vec<String> {
    let mut languages = Vec::new();
    let mut lang_scores: HashMap<String, usize> = HashMap::new();

    // Map extensions to languages with scores
    for (ext, count) in extensions.iter() {
        let lang = match ext.as_str() {
            "rs" => Some("Rust"),
            "ts" | "tsx" => Some("TypeScript"),
            "js" | "jsx" => Some("JavaScript"),
            "py" => Some("Python"),
            "go" => Some("Go"),
            "java" => Some("Java"),
            "cpp" | "cc" | "cxx" => Some("C++"),
            "c" | "h" => Some("C"),
            "cs" => Some("C#"),
            "rb" => Some("Ruby"),
            "php" => Some("PHP"),
            "swift" => Some("Swift"),
            "kt" | "kts" => Some("Kotlin"),
            "dart" => Some("Dart"),
            "r" => Some("R"),
            "scala" => Some("Scala"),
            "clj" | "cljs" => Some("Clojure"),
            "ex" | "exs" => Some("Elixir"),
            "erl" => Some("Erlang"),
            "hs" => Some("Haskell"),
            "lua" => Some("Lua"),
            "pl" | "pm" => Some("Perl"),
            "sh" | "bash" => Some("Shell"),
            "html" | "htm" => Some("HTML"),
            "css" | "scss" | "sass" | "less" => Some("CSS"),
            "sql" => Some("SQL"),
            "md" | "markdown" => Some("Markdown"),
            "json" | "yaml" | "yml" | "toml" | "xml" => None, // Config files, not languages
            _ => None,
        };

        if let Some(language) = lang {
            *lang_scores.entry(language.to_string()).or_insert(0) += count;
        }
    }

    // Sort languages by file count and take top ones
    let mut scored_langs: Vec<(String, usize)> = lang_scores.into_iter().collect();
    scored_langs.sort_by(|a, b| b.1.cmp(&a.1));

    // Return top languages (limit to 5)
    for (lang, _) in scored_langs.iter().take(5) {
        languages.push(lang.clone());
    }

    // If no languages detected, add a generic one
    if languages.is_empty() {
        languages.push("Unknown".to_string());
    }

    languages
}

/// Detect frameworks and tools from config files and project structure
fn detect_frameworks(project_path: &Path, config_files: &HashSet<String>) -> Vec<String> {
    let mut frameworks = Vec::new();

    // Check package.json for JavaScript/TypeScript frameworks
    if config_files.contains("package.json") {
        if let Some(js_frameworks) = detect_js_frameworks(project_path) {
            frameworks.extend(js_frameworks);
        }
    }

    // Check Cargo.toml for Rust frameworks
    if config_files.contains("Cargo.toml") {
        if let Some(rust_frameworks) = detect_rust_frameworks(project_path) {
            frameworks.extend(rust_frameworks);
        }
    }

    // Python frameworks
    if config_files.contains("requirements.txt") || config_files.contains("pyproject.toml") {
        if let Some(py_frameworks) = detect_python_frameworks(project_path) {
            frameworks.extend(py_frameworks);
        }
    }

    // Go frameworks
    if config_files.contains("go.mod") {
        frameworks.push("Go Modules".to_string());
    }

    // Java/Kotlin frameworks
    if config_files.contains("pom.xml") {
        frameworks.push("Maven".to_string());
    }
    if config_files.contains("build.gradle") {
        frameworks.push("Gradle".to_string());
    }

    // Ruby
    if config_files.contains("Gemfile") {
        frameworks.push("Ruby on Rails".to_string());
    }

    // PHP
    if config_files.contains("composer.json") {
        frameworks.push("Composer".to_string());
    }

    frameworks
}

/// Detect JavaScript/TypeScript frameworks from package.json
fn detect_js_frameworks(project_path: &Path) -> Option<Vec<String>> {
    let package_json_path = project_path.join("package.json");
    let content = fs::read_to_string(package_json_path).ok()?;
    let json: Value = serde_json::from_str(&content).ok()?;

    let mut frameworks = Vec::new();

    // Check dependencies and devDependencies
    let deps = json.get("dependencies").and_then(|d| d.as_object());
    let dev_deps = json.get("devDependencies").and_then(|d| d.as_object());

    let all_deps: Vec<&str> = deps
        .iter()
        .chain(dev_deps.iter())
        .flat_map(|d| d.keys().map(|k| k.as_str()))
        .collect();

    // Detect frameworks
    if all_deps.iter().any(|&d| d == "react" || d == "react-dom") {
        frameworks.push("React".to_string());
    }
    if all_deps.iter().any(|&d| d == "vue" || d.starts_with("@vue/")) {
        frameworks.push("Vue".to_string());
    }
    if all_deps.iter().any(|&d| d.starts_with("@angular/")) {
        frameworks.push("Angular".to_string());
    }
    if all_deps.iter().any(|&d| d == "next") {
        frameworks.push("Next.js".to_string());
    }
    if all_deps.iter().any(|&d| d == "nuxt" || d == "nuxt3") {
        frameworks.push("Nuxt".to_string());
    }
    if all_deps.iter().any(|&d| d == "svelte") {
        frameworks.push("Svelte".to_string());
    }
    if all_deps.iter().any(|&d| d == "express") {
        frameworks.push("Express".to_string());
    }
    if all_deps.iter().any(|&d| d == "fastify") {
        frameworks.push("Fastify".to_string());
    }
    if all_deps.iter().any(|&d| d == "nest" || d.starts_with("@nestjs/")) {
        frameworks.push("NestJS".to_string());
    }
    if all_deps.iter().any(|&d| d == "vite") {
        frameworks.push("Vite".to_string());
    }
    if all_deps.iter().any(|&d| d == "webpack") {
        frameworks.push("Webpack".to_string());
    }
    if all_deps.iter().any(|&d| d == "tailwindcss") {
        frameworks.push("Tailwind CSS".to_string());
    }
    if all_deps.iter().any(|&d| d == "typescript") {
        frameworks.push("TypeScript".to_string());
    }

    Some(frameworks)
}

/// Detect Rust frameworks from Cargo.toml
fn detect_rust_frameworks(project_path: &Path) -> Option<Vec<String>> {
    let cargo_toml_path = project_path.join("Cargo.toml");
    let content = fs::read_to_string(cargo_toml_path).ok()?;

    let mut frameworks = Vec::new();

    // Simple string matching (could use a TOML parser for more accuracy)
    if content.contains("tauri") {
        frameworks.push("Tauri".to_string());
    }
    if content.contains("actix-web") {
        frameworks.push("Actix Web".to_string());
    }
    if content.contains("rocket") {
        frameworks.push("Rocket".to_string());
    }
    if content.contains("axum") {
        frameworks.push("Axum".to_string());
    }
    if content.contains("tokio") {
        frameworks.push("Tokio".to_string());
    }
    if content.contains("diesel") {
        frameworks.push("Diesel".to_string());
    }
    if content.contains("sqlx") {
        frameworks.push("SQLx".to_string());
    }
    if content.contains("serde") {
        frameworks.push("Serde".to_string());
    }

    Some(frameworks)
}

/// Detect Python frameworks from requirements.txt or pyproject.toml
fn detect_python_frameworks(project_path: &Path) -> Option<Vec<String>> {
    let mut frameworks = Vec::new();

    // Check requirements.txt
    let requirements_path = project_path.join("requirements.txt");
    if let Ok(content) = fs::read_to_string(requirements_path) {
        if content.contains("django") {
            frameworks.push("Django".to_string());
        }
        if content.contains("flask") {
            frameworks.push("Flask".to_string());
        }
        if content.contains("fastapi") {
            frameworks.push("FastAPI".to_string());
        }
        if content.contains("numpy") {
            frameworks.push("NumPy".to_string());
        }
        if content.contains("pandas") {
            frameworks.push("Pandas".to_string());
        }
        if content.contains("tensorflow") {
            frameworks.push("TensorFlow".to_string());
        }
        if content.contains("pytorch") || content.contains("torch") {
            frameworks.push("PyTorch".to_string());
        }
    }

    // Check pyproject.toml
    let pyproject_path = project_path.join("pyproject.toml");
    if let Ok(content) = fs::read_to_string(pyproject_path) {
        if content.contains("poetry") {
            frameworks.push("Poetry".to_string());
        }
        if content.contains("django") {
            frameworks.push("Django".to_string());
        }
        if content.contains("flask") {
            frameworks.push("Flask".to_string());
        }
        if content.contains("fastapi") {
            frameworks.push("FastAPI".to_string());
        }
    }

    if frameworks.is_empty() {
        None
    } else {
        Some(frameworks)
    }
}

/// Format a project name into proper title case
/// Handles kebab-case, snake_case, and camelCase
fn format_project_name(name: &str) -> String {
    // Split on common delimiters: -, _, space
    let words: Vec<String> = name
        .split(|c| c == '-' || c == '_' || c == ' ')
        .filter(|s| !s.is_empty())
        .map(|word| {
            // Capitalize first letter, lowercase the rest
            let mut chars = word.chars();
            match chars.next() {
                Some(first) => {
                    let rest: String = chars.as_str().to_lowercase();
                    format!("{}{}", first.to_uppercase(), rest)
                }
                None => String::new(),
            }
        })
        .collect();

    // Join with spaces
    words.join(" ")
}

/// Extract the actual project name from package.json, Cargo.toml, or other config files
pub fn extract_project_name(project_path: &Path) -> Option<String> {
    // Try package.json first
    let package_json_path = project_path.join("package.json");
    if let Ok(content) = fs::read_to_string(package_json_path) {
        if let Ok(json) = serde_json::from_str::<Value>(&content) {
            if let Some(name) = json.get("name").and_then(|n| n.as_str()) {
                // Format the name into title case
                return Some(format_project_name(name));
            }
        }
    }

    // Try Cargo.toml
    let cargo_toml_path = project_path.join("Cargo.toml");
    if let Ok(content) = fs::read_to_string(cargo_toml_path) {
        // Simple regex-like parsing for [package] name = "..."
        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("name") && trimmed.contains('=') {
                if let Some(name_part) = trimmed.split('=').nth(1) {
                    let name = name_part.trim().trim_matches('"').trim_matches('\'');
                    if !name.is_empty() {
                        return Some(format_project_name(name));
                    }
                }
            }
        }
    }

    // Try pyproject.toml
    let pyproject_path = project_path.join("pyproject.toml");
    if let Ok(content) = fs::read_to_string(pyproject_path) {
        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("name") && trimmed.contains('=') {
                if let Some(name_part) = trimmed.split('=').nth(1) {
                    let name = name_part.trim().trim_matches('"').trim_matches('\'');
                    if !name.is_empty() {
                        return Some(format_project_name(name));
                    }
                }
            }
        }
    }

    // Try composer.json for PHP
    let composer_json_path = project_path.join("composer.json");
    if let Ok(content) = fs::read_to_string(composer_json_path) {
        if let Ok(json) = serde_json::from_str::<Value>(&content) {
            if let Some(name) = json.get("name").and_then(|n| n.as_str()) {
                // composer names are usually "vendor/project", extract project part
                let project_name = name.split('/').last().unwrap_or(name);
                return Some(format_project_name(project_name));
            }
        }
    }

    None
}

/// Generate a project description based on detected languages and frameworks
fn generate_description(
    languages: &[String],
    frameworks: &[String],
    file_count: usize,
) -> String {
    let mut parts = Vec::new();

    // Primary language
    if !languages.is_empty() {
        let lang_str = if languages.len() == 1 {
            languages[0].clone()
        } else if languages.len() == 2 {
            format!("{} and {}", languages[0], languages[1])
        } else {
            format!(
                "{}, {}, and {}",
                languages[0],
                languages[1],
                if languages.len() > 3 {
                    "other languages"
                } else {
                    &languages[2]
                }
            )
        };
        parts.push(format!("A {} project", lang_str));
    } else {
        parts.push("A software project".to_string());
    }

    // Frameworks
    if !frameworks.is_empty() {
        let fw_str = if frameworks.len() == 1 {
            frameworks[0].clone()
        } else if frameworks.len() == 2 {
            format!("{} and {}", frameworks[0], frameworks[1])
        } else {
            format!("{}, {}, and more", frameworks[0], frameworks[1])
        };
        parts.push(format!("utilizing {}", fw_str));
    }

    // File count hint
    if file_count > 100 {
        parts.push(format!("with {} files", file_count));
    }

    // Combine parts
    let mut description = parts.join(" ");
    description.push_str(". Ready for AI-assisted development and collaboration.");

    description
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_languages() {
        let mut extensions = HashMap::new();
        extensions.insert("rs".to_string(), 50);
        extensions.insert("ts".to_string(), 30);
        extensions.insert("md".to_string(), 10);

        let languages = detect_languages(&extensions);
        assert!(languages.contains(&"Rust".to_string()));
        assert!(languages.contains(&"TypeScript".to_string()));
        assert!(!languages.contains(&"Markdown".to_string())); // Config file, not a language
    }
}
