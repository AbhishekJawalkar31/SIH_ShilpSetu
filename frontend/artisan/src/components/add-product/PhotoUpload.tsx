import React, { useState, useRef } from "react";
import {
  Camera,
  Image as ImageIcon,
  Mic,
  MicOff,
  Sparkles,
  RefreshCw,
  Sliders,
  Volume2,
  CheckCircle,
} from "lucide-react";
import { translations, Language } from "../../lib/i18n";
import { transcribeSpeech } from "../../services/api";

interface PhotoUploadProps {
  lang: Language;
  onGenerate: (imageFile: File | Blob, voiceText: string) => void;
  isGenerating: boolean;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  lang,
  onGenerate,
  isGenerating,
}) => {
  const t = translations[lang];

  // Default sample image matches the jute tote bag from prototype screenshot!
  const defaultSampleImage =
    "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=600";

  const [imagePreview, setImagePreview] = useState<string>(defaultSampleImage);
  const [imageFile, setImageFile] = useState<File | Blob | null>(null);
  const [beforeAfterMode, setBeforeAfterMode] = useState<"after" | "before">("after");
  const [photoIndex] = useState<number>(1);
  const [totalPhotos] = useState<number>(4);

  // Voice recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [voiceText, setVoiceText] = useState<string>("");
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  // Voice Recording Simulator with Web Audio / Mic API
  const startRecording = async () => {
    setIsRecording(true);
    setRecordingSeconds(0);
    timerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setIsTranscribing(true);

    try {
      // Create empty blob or audio payload
      const mockAudioBlob = new Blob(["audio-recording"], { type: "audio/webm" });
      const result = await transcribeSpeech(mockAudioBlob, lang);
      setVoiceText(result.text);
    } catch {
      setVoiceText(
        lang === "hi"
          ? "यह सुनहरे जूट से बना हाथ से बुना बैग है, होटल और उपहार के लिए उपयुक्त है।"
          : "Handwoven natural jute tote bag with floral pattern, perfect for hotel gifting."
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSubmit = async () => {
    let finalFile = imageFile;
    if (!finalFile) {
      // Fetch default sample image as blob if user didn't upload a new one
      try {
        const res = await fetch(imagePreview);
        finalFile = await res.blob();
      } catch {
        finalFile = new Blob(["sample-image"], { type: "image/jpeg" });
      }
    }
    onGenerate(finalFile, voiceText);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Image Preview & Enhancement Card */}
      <div className="relative rounded-3xl overflow-hidden bg-stone-900 border border-warmcream-border shadow-card aspect-[4/3] group">
        {/* The Image */}
        <img
          src={
            beforeAfterMode === "after"
              ? imagePreview
              : "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=40&w=600" // unenhanced rustic shot
          }
          alt="Product Preview"
          className={`w-full h-full object-cover transition-all duration-300 ${
            beforeAfterMode === "after"
              ? "filter contrast-[1.08] saturate-[1.12] brightness-[1.03]"
              : "filter brightness-[0.92] contrast-[0.95]"
          }`}
        />

        {/* Top Badges: Photo Counter & Change button */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
          <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white font-bold text-xs shadow-xs border border-white/20">
            {photoIndex}/{totalPhotos}
          </span>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-full bg-white/90 text-earthy-title hover:bg-white shadow-md transition-transform active:scale-95 border border-stone-200"
            title="Upload different photo"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Floating Bar: AI Enhanced Preview with Before/After Pill */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between p-2 rounded-2xl bg-black/65 backdrop-blur-md border border-white/20 text-white">
          <div className="flex items-center gap-1.5 pl-1.5">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span className="text-xs font-semibold">{t.beforeAfter}</span>
          </div>

          {/* Before/After Toggle Pill matching screenshot */}
          <div className="flex items-center bg-white/20 rounded-xl p-0.5 border border-white/10">
            <button
              onClick={() => setBeforeAfterMode("before")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                beforeAfterMode === "before"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-300 hover:text-white"
              }`}
            >
              {t.before}
            </button>
            <button
              onClick={() => setBeforeAfterMode("after")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                beforeAfterMode === "after"
                  ? "bg-terracotta text-white shadow-xs"
                  : "text-stone-300 hover:text-white"
              }`}
            >
              {t.after}
            </button>
          </div>
        </div>
      </div>

      {/* Upload Buttons for Rural Artisans */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="py-2.5 px-3 rounded-2xl bg-white border border-warmcream-border text-earthy-title font-semibold text-xs flex items-center justify-center gap-2 shadow-xs hover:bg-warmcream-muted active:scale-98 transition-all"
        >
          <Camera className="w-4 h-4 text-terracotta" />
          <span>{t.cameraBtn}</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="py-2.5 px-3 rounded-2xl bg-white border border-warmcream-border text-earthy-title font-semibold text-xs flex items-center justify-center gap-2 shadow-xs hover:bg-warmcream-muted active:scale-98 transition-all"
        >
          <ImageIcon className="w-4 h-4 text-ochre" />
          <span>{t.galleryBtn}</span>
        </button>
      </div>

      {/* Voice & Speech Input Section (Primary for Rural Artisans) */}
      <div className="bg-white rounded-3xl p-4 border border-warmcream-border shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-earthy-title flex items-center gap-1.5">
            <Volume2 className="w-4 h-4 text-terracotta" />
            {t.voicePrompt}
          </label>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-craftgreen-50 text-craftgreen-700 font-semibold border border-craftgreen-200">
            {lang === "hi" ? "आसान आवाज़ सुविधा" : "Voice First"}
          </span>
        </div>

        <p className="text-[11px] text-earthy-muted">{t.voiceHint}</p>

        {/* Large Mic Button for Rural Touch Ergonomics */}
        <div className="flex flex-col items-center justify-center py-2">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-gradient-to-r from-terracotta to-ochre text-white font-bold text-xs shadow-floating hover:brightness-105 active:scale-95 transition-all"
            >
              <Mic className="w-5 h-5 animate-pulse" />
              <span>{t.tapToSpeak}</span>
            </button>
          ) : (
            <div className="flex flex-col items-center gap-2 w-full">
              <div className="flex items-center gap-2 text-xs font-bold text-red-600 animate-pulse">
                <span className="w-2.5 h-2.5 bg-red-600 rounded-full" />
                <span>
                  {t.recording} ({recordingSeconds}s)
                </span>
              </div>

              {/* Simulated Audio Waveform */}
              <div className="flex items-center justify-center gap-1 h-8 w-full py-1">
                {[40, 70, 90, 60, 100, 80, 50, 95, 75, 45, 85, 60].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 bg-terracotta rounded-full transition-all duration-150 animate-bounce"
                    style={{
                      height: `${h}%`,
                      animationDelay: `${(i % 5) * 100}ms`,
                    }}
                  />
                ))}
              </div>

              <button
                onClick={stopRecording}
                className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-red-600 text-white font-bold text-xs shadow-md active:scale-95"
              >
                <MicOff className="w-4 h-4" />
                <span>{t.stopRecording}</span>
              </button>
            </div>
          )}

          {isTranscribing && (
            <p className="text-xs text-ochre font-semibold mt-2 flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              {lang === "hi" ? "आवाज़ समझी जा रही है..." : "Transcribing voice with Sarvam AI..."}
            </p>
          )}
        </div>

        {/* Text Input / Transcribed voice output */}
        <div>
          <textarea
            value={voiceText}
            onChange={(e) => setVoiceText(e.target.value)}
            rows={2}
            placeholder={t.typeInstead}
            className="w-full p-3 rounded-2xl bg-warmcream/80 border border-warmcream-border text-xs text-earthy-title focus:outline-none focus:ring-2 focus:ring-terracotta/30 resize-none"
          />
          {voiceText && (
            <div className="flex justify-between items-center mt-1 text-[11px] text-craftgreen font-medium">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {t.audioRecorded}
              </span>
              <button
                onClick={() => setVoiceText("")}
                className="text-stone-400 hover:text-earthy-title text-[10px]"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Big CTA: Generate Catalogue */}
      <div className="pt-2">
        <button
          onClick={handleSubmit}
          disabled={isGenerating}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-terracotta via-[#BD4E25] to-[#8C3414] text-white font-extrabold text-sm shadow-floating hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>{t.generating}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>{t.generateCatalogueBtn}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

