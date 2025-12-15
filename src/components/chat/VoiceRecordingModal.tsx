import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, X, Send, Loader2 } from 'lucide-react';

interface VoiceRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (audioBlob: Blob) => void;
  isTranscribing?: boolean;
}

export default function VoiceRecordingModal({
  isOpen,
  onClose,
  onSubmit,
  isTranscribing = false,
}: VoiceRecordingModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Format duration as mm:ss
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start recording when modal opens
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      audioChunksRef.current = [];

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      streamRef.current = stream;

      // Set up audio analyser for visualizing audio level
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Start level monitoring
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average / 255); // Normalize to 0-1
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        }
      };
      updateLevel();

      // Create MediaRecorder - try different formats for compatibility
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }
      console.log('[VoiceRecordingModal] Using mimeType:', mimeType);

      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorder.ondataavailable = (event) => {
        console.log('[VoiceRecordingModal] Data available, size:', event.data.size);
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Don't use timeslice - let it collect all data until stop
      // This produces a proper file with headers
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      // Start duration counter
      setDuration(0);
      durationIntervalRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);

    } catch (err) {
      console.error('Failed to start recording:', err);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.');
      } else {
        setError('Failed to start recording. Please try again.');
      }
    }
  }, []);

  // Stop recording and clean up
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    analyserRef.current = null;
    setIsRecording(false);
    setAudioLevel(0);
  }, []);

  // Handle submit - stop recording and send audio
  const handleSubmit = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      const recorder = mediaRecorderRef.current;
      const mimeType = recorder.mimeType;

      recorder.onstop = () => {
        // Send audio directly - FFmpeg on backend will convert to WAV
        console.log('[VoiceRecordingModal] Chunks collected:', audioChunksRef.current.length);
        console.log('[VoiceRecordingModal] MimeType:', mimeType);
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log('[VoiceRecordingModal] Sending audio blob, size:', audioBlob.size, 'bytes');
        onSubmit(audioBlob);
      };

      // Stop the recorder - this will trigger ondataavailable with all data, then onstop
      stopRecording();
    }
  }, [onSubmit, stopRecording]);

  // Handle cancel - stop recording and close
  const handleCancel = useCallback(() => {
    stopRecording();
    onClose();
  }, [stopRecording, onClose]);

  // Start recording when modal opens
  useEffect(() => {
    if (isOpen && !isRecording && !isTranscribing) {
      startRecording();
    }
  }, [isOpen, isRecording, isTranscribing, startRecording]);

  // Clean up on unmount or close
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isTranscribing) {
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isTranscribing, handleCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={!isTranscribing ? handleCancel : undefined}
      />

      {/* Modal */}
      <div className="relative bg-base-200 rounded-2xl shadow-2xl p-6 min-w-[320px] max-w-md mx-4 border border-base-300">
        {/* Header */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold">
            {isTranscribing ? 'Transcribing...' : 'Recording'}
          </h3>
          <p className="text-sm text-base-content/60 mt-1">
            {isTranscribing
              ? 'Converting your voice to text'
              : 'Speak clearly into your microphone'}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="alert alert-error mb-4">
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Recording visualization */}
        <div className="flex flex-col items-center mb-6">
          {/* Animated mic icon with audio level */}
          <div className="relative">
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-150 ${
                isTranscribing
                  ? 'bg-primary/20'
                  : isRecording
                  ? 'bg-error/20'
                  : 'bg-base-300'
              }`}
              style={{
                transform: isRecording ? `scale(${1 + audioLevel * 0.3})` : 'scale(1)',
              }}
            >
              {isTranscribing ? (
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              ) : (
                <Mic
                  className={`w-10 h-10 ${
                    isRecording ? 'text-error animate-pulse' : 'text-base-content/40'
                  }`}
                />
              )}
            </div>

            {/* Pulsing ring animation when recording */}
            {isRecording && !isTranscribing && (
              <>
                <div className="absolute inset-0 rounded-full bg-error/30 animate-ping" />
                <div
                  className="absolute inset-0 rounded-full border-2 border-error/50 animate-pulse"
                  style={{
                    transform: `scale(${1.2 + audioLevel * 0.4})`,
                  }}
                />
              </>
            )}
          </div>

          {/* Duration */}
          <div className="mt-4 text-2xl font-mono font-semibold tabular-nums">
            {formatDuration(duration)}
          </div>

          {/* Audio level bar */}
          {isRecording && !isTranscribing && (
            <div className="w-full max-w-[200px] h-2 bg-base-300 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-error transition-all duration-75 rounded-full"
                style={{ width: `${Math.min(audioLevel * 100, 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            disabled={isTranscribing}
            className="btn btn-outline flex-1 gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isRecording || duration < 1 || isTranscribing}
            className="btn btn-primary flex-1 gap-2"
          >
            {isTranscribing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send
              </>
            )}
          </button>
        </div>

        {/* Keyboard hint */}
        {!isTranscribing && (
          <p className="text-xs text-base-content/40 text-center mt-4">
            Press <kbd className="kbd kbd-xs">Esc</kbd> to cancel
          </p>
        )}
      </div>
    </div>
  );
}
