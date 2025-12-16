// Whisper transcription commands
// Handles both local Whisper (Python) and OpenAI Whisper API

use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::{AppHandle, Manager};
use reqwest::multipart;

/// Result of checking Whisper installation
#[derive(Debug, Serialize, Deserialize)]
pub struct WhisperInstallationStatus {
    pub installed: bool,
    pub model_downloaded: bool,
    pub python_version: Option<String>,
    pub whisper_version: Option<String>,
}

/// Result of transcription
#[derive(Debug, Serialize, Deserialize)]
pub struct TranscriptionResult {
    pub text: String,
    pub language: Option<String>,
    pub duration: Option<f64>,
}

/// Check if local Whisper (Python) is installed
#[tauri::command]
pub async fn check_whisper_installation() -> Result<WhisperInstallationStatus, String> {
    log::info!("Checking Whisper installation...");

    // Check Python version
    let python_version = Command::new("python")
        .args(["--version"])
        .output()
        .ok()
        .and_then(|output| {
            if output.status.success() {
                String::from_utf8(output.stdout).ok()
            } else {
                None
            }
        })
        .map(|v| v.trim().to_string());

    if python_version.is_none() {
        log::info!("Python not found");
        return Ok(WhisperInstallationStatus {
            installed: false,
            model_downloaded: false,
            python_version: None,
            whisper_version: None,
        });
    }

    // Check if whisper is installed
    let whisper_check = Command::new("python")
        .args(["-c", "import whisper; print(whisper.__version__)"])
        .output();

    let whisper_version = whisper_check
        .ok()
        .and_then(|output| {
            if output.status.success() {
                String::from_utf8(output.stdout).ok()
            } else {
                None
            }
        })
        .map(|v| v.trim().to_string());

    let installed = whisper_version.is_some();

    // Check if model is downloaded (try to load 'base' model)
    let model_downloaded = if installed {
        Command::new("python")
            .args(["-c", "import whisper; whisper.load_model('base')"])
            .output()
            .map(|output| output.status.success())
            .unwrap_or(false)
    } else {
        false
    };

    log::info!(
        "Whisper installation check: installed={}, model_downloaded={}, python={:?}, whisper={:?}",
        installed, model_downloaded, python_version, whisper_version
    );

    Ok(WhisperInstallationStatus {
        installed,
        model_downloaded,
        python_version,
        whisper_version,
    })
}

/// Install Whisper using pip
#[tauri::command]
pub async fn install_whisper(model: String) -> Result<(), String> {
    log::info!("Installing Whisper with model: {}", model);

    // Install whisper package
    let install_result = Command::new("pip")
        .args(["install", "-U", "openai-whisper"])
        .output()
        .map_err(|e| format!("Failed to run pip: {}", e))?;

    if !install_result.status.success() {
        let stderr = String::from_utf8_lossy(&install_result.stderr);
        return Err(format!("Failed to install whisper: {}", stderr));
    }

    // Download the model
    let download_script = format!(
        "import whisper; whisper.load_model('{}')",
        model
    );

    let download_result = Command::new("python")
        .args(["-c", &download_script])
        .output()
        .map_err(|e| format!("Failed to download model: {}", e))?;

    if !download_result.status.success() {
        let stderr = String::from_utf8_lossy(&download_result.stderr);
        return Err(format!("Failed to download model: {}", stderr));
    }

    log::info!("Whisper installed successfully");
    Ok(())
}

/// Transcribe audio using local Whisper
#[tauri::command]
pub async fn transcribe_local(
    app: AppHandle,
    audio_data: Vec<u8>,
    model: String,
) -> Result<TranscriptionResult, String> {
    log::info!("Transcribing audio locally with model: {}, data size: {} bytes", model, audio_data.len());

    // Debug: Log first and last bytes to verify data integrity
    if audio_data.len() >= 20 {
        let first_20: Vec<u8> = audio_data.iter().take(20).cloned().collect();
        let last_20: Vec<u8> = audio_data.iter().rev().take(20).rev().cloned().collect();
        log::info!("Audio data first 20 bytes: {:?}", first_20);
        log::info!("Audio data last 20 bytes: {:?}", last_20);
        // Check for webm magic bytes (EBML header: 0x1A 0x45 0xDF 0xA3)
        let is_webm = audio_data[0] == 0x1A && audio_data[1] == 0x45 && audio_data[2] == 0xDF && audio_data[3] == 0xA3;
        log::info!("Audio appears to be valid webm: {}", is_webm);
    } else {
        log::warn!("Audio data too short: {} bytes", audio_data.len());
    }

    // Save audio to temp file (could be webm or wav from frontend)
    let temp_dir = app.path().temp_dir()
        .map_err(|e| format!("Failed to get temp dir: {}", e))?;
    let input_path = temp_dir.join(format!("whisper_input_{}.webm", uuid::Uuid::new_v4()));
    let wav_path = temp_dir.join(format!("whisper_input_{}.wav", uuid::Uuid::new_v4()));

    std::fs::write(&input_path, &audio_data)
        .map_err(|e| format!("Failed to write temp audio file: {}", e))?;

    // Debug: Verify written file
    let written_size = std::fs::metadata(&input_path)
        .map(|m| m.len())
        .unwrap_or(0);
    log::info!("Written webm file size: {} bytes at {:?}", written_size, input_path);

    // Convert to WAV using FFmpeg for reliable Whisper compatibility
    log::info!("Converting audio to WAV using FFmpeg...");
    let ffmpeg_result = Command::new("ffmpeg")
        .args([
            "-y",                    // Overwrite output
            "-i", &input_path.to_string_lossy(),
            "-ar", "16000",          // 16kHz sample rate (Whisper preference)
            "-ac", "1",              // Mono
            "-c:a", "pcm_s16le",     // 16-bit PCM
            &wav_path.to_string_lossy().to_string(),
        ])
        .output()
        .map_err(|e| format!("Failed to run FFmpeg: {}", e))?;

    // Debug: Log FFmpeg output
    let ffmpeg_stdout = String::from_utf8_lossy(&ffmpeg_result.stdout);
    let ffmpeg_stderr = String::from_utf8_lossy(&ffmpeg_result.stderr);
    if !ffmpeg_stdout.is_empty() {
        log::info!("FFmpeg stdout: {}", ffmpeg_stdout);
    }
    log::info!("FFmpeg stderr: {}", ffmpeg_stderr);

    // Clean up input file
    let _ = std::fs::remove_file(&input_path);

    if !ffmpeg_result.status.success() {
        return Err(format!("FFmpeg conversion failed: {}", ffmpeg_stderr));
    }

    // Debug: Verify WAV file
    let wav_size = std::fs::metadata(&wav_path)
        .map(|m| m.len())
        .unwrap_or(0);
    log::info!("Converted WAV file size: {} bytes at {:?}", wav_size, wav_path);

    // Calculate expected audio duration (16kHz, 16-bit mono = 32000 bytes/sec)
    // WAV header is 44 bytes
    if wav_size > 44 {
        let audio_bytes = wav_size - 44;
        let duration_secs = audio_bytes as f64 / 32000.0;
        log::info!("Estimated audio duration: {:.2} seconds", duration_secs);
    }

    log::info!("Audio converted successfully, running Whisper...");

    // Create Python script for transcription
    let script = format!(
        r#"
import whisper
import json
import sys

model = whisper.load_model("{}")
result = model.transcribe("{}")

output = {{
    "text": result["text"].strip(),
    "language": result.get("language"),
    "duration": result.get("duration")
}}
print(json.dumps(output))
"#,
        model,
        wav_path.to_string_lossy().replace("\\", "\\\\")
    );

    // Run transcription
    let output = Command::new("python")
        .args(["-c", &script])
        .output()
        .map_err(|e| format!("Failed to run Whisper: {}", e))?;

    // Clean up wav file
    let _ = std::fs::remove_file(&wav_path);

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    // Debug: Log Whisper output
    log::info!("Whisper stdout: {}", stdout);
    if !stderr.is_empty() {
        log::info!("Whisper stderr: {}", stderr);
    }

    if !output.status.success() {
        return Err(format!("Whisper transcription failed: {}", stderr));
    }

    let result: TranscriptionResult = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse transcription result: {} - Output: {}", e, stdout))?;

    log::info!("Transcription complete: text='{}', language={:?}, duration={:?}",
        result.text, result.language, result.duration);
    Ok(result)
}

/// Transcribe audio using OpenAI Whisper API
#[tauri::command]
pub async fn transcribe_openai(
    audio_data: Vec<u8>,
    api_key: String,
) -> Result<TranscriptionResult, String> {
    log::info!("Transcribing audio with OpenAI API");

    // Create multipart form
    let part = multipart::Part::bytes(audio_data)
        .file_name("audio.webm")
        .mime_str("audio/webm")
        .map_err(|e| format!("Failed to create multipart: {}", e))?;

    let form = multipart::Form::new()
        .part("file", part)
        .text("model", "whisper-1");

    // Send request to OpenAI
    let client = reqwest::Client::new();
    let response = client
        .post("https://api.openai.com/v1/audio/transcriptions")
        .header("Authorization", format!("Bearer {}", api_key))
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Failed to send request to OpenAI: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("OpenAI API error: {}", error_text));
    }

    #[derive(Deserialize)]
    struct OpenAIResponse {
        text: String,
    }

    let result: OpenAIResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse OpenAI response: {}", e))?;

    log::info!("OpenAI transcription complete: {} chars", result.text.len());
    Ok(TranscriptionResult {
        text: result.text,
        language: None,
        duration: None,
    })
}
