from faster_whisper import WhisperModel

class AudioProcessor:
    _instance = None
    _model = None

    def __new__(cls, model_size="tiny", device="cpu", compute_type="int8"):
        if cls._instance is None:
            cls._instance = super(AudioProcessor, cls).__new__(cls)
            cls._instance._load_model(model_size, device, compute_type)
        return cls._instance

    def _load_model(self, model_size, device, compute_type):
        print(f"Loading faster-whisper model: {model_size}...")
        try:
            self._model = WhisperModel(model_size, device=device, compute_type=compute_type)
            print("Model loaded successfully.")
        except Exception as e:
            print(f"Error loading model: {e}")
            self._model = None

    def transcribe(self, audio_file):
        if not self._model:
            return {"text": "", "segments": []} # Or handle error appropriately

        try:
            # Force English language, use VAD to ignore silence, and increase beam size for accuracy
            segments, info = self._model.transcribe(
                audio_file, 
                beam_size=5, 
                language="en",          # Force English
                vad_filter=True,        # Use Voice Activity Detection to skip silence
                vad_parameters=dict(min_silence_duration_ms=500),
                condition_on_previous_text=False # Prevent hallucinations from previous context
            )
            transcript_text = ""
            segment_list = []
            
            for segment in segments:
                transcript_text += segment.text + " "
                segment_list.append({
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment.text
                })
            
            return {
                "text": transcript_text.strip(),
                "segments": segment_list,
                "language": "en", # We forced it
                "language_probability": 1.0
            }
        except Exception as e:
            print(f"Transcription error: {e}")
            return {"error": str(e)}

# Singleton usage
audio_processor = AudioProcessor()
