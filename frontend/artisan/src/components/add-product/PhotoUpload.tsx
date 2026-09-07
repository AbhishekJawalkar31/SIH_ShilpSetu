"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Image as ImageIcon,
  Mic,
  MicOff,
  Sparkles,
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Volume2,
  FileText,
} from "lucide-react";
import { translations, Language } from "../../lib/i18n";
import { api, ApiError } from "../../services/apiClient";

interface PhotoUploadProps {
  lang: Language;
  initialImageFile?: File | Blob | null;
  initialImagePreview?: string | null;
  initialVoiceText?: string;
  onGenerate: (imageFile: File | Blob, voiceText: string) => void;
  onManualEntry?: (imageFile: File | Blob, voiceText: string) => void;
  isGenerating: boolean;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  lang,
  initialImageFile = null,
  initialImagePreview = null,
  initialVoiceText = "",
  onGenerate,
  onManualEntry,
  isGenerating,
}) => {
  const t = translations[lang];

  // Image state — starts null unless returning from a later step
  const [imageFile, setImageFile] = useState<File | Blob | null>(
    initialImageFile
  );
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialImagePreview
  );
  const [imageError, setImageError] = useState<string | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [voiceText, setVoiceText] = useState<string>(initialVoiceText);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup blob URLs and timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Handle image file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setImageError(
          lang === "hi"
            ? "कृपया एक मान्य छवि फ़ाइल (JPEG, PNG, WebP) चुनें।"
            : "Please select a valid image file (JPEG, PNG, WebP)."
        );
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setImageError(
          lang === "hi"
            ? "फ़ाइल का आकार 5MB से कम होना चाहिए।"
            : "Image file exceeds 5MB size limit."
        );
        return;
      }
      setImageError(null);
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  // Start real browser MediaRecorder
  const startRecording = async () => {
    setVoiceNotice(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setVoiceNotice(t.audioNotSupported);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let mimeType = "audio/webm";
      if (
        typeof MediaRecorder.isTypeSupported === "function" &&
        MediaRecorder.isTypeSupported("audio/webm")
      ) {
        mimeType = "audio/webm";
      } else if (
        typeof MediaRecorder.isTypeSupported === "function" &&
        MediaRecorder.isTypeSupported("audio/mp4")
      ) {
        mimeType = "audio/mp4";
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        // Stop all tracks to release mic hardware
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size > 0) {
          const audioUrl = URL.createObjectURL(audioBlob);
          setRecordedAudioUrl(audioUrl);
          await handleTranscribe(audioBlob);
        }
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn("Microphone access error:", err);
      setVoiceNotice(t.micDenied);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
  };

  // Transcribe audio using backend Sarvam Saaras API
  const handleTranscribe = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    setVoiceNotice(null);
    try {
      const res = await api.transcribeSpeech(audioBlob, lang);
      if (res && res.text) {
        setVoiceText((prev) =>
          prev ? `${prev} ${res.text}` : res.text
        );
      }
    } catch (err: any) {
      console.warn("Speech transcription non-blocking failure:", err);
      setVoiceNotice(t.transcriptionFailed);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Clear recorded audio and text
  const handleClearVoice = () => {
    setVoiceText("");
    setRecordedAudioUrl(null);
    setVoiceNotice(null);
  };

  // Clear image
  const handleClearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  // Submit flow
  const handleGenerate = () => {
    if (!imageFile) {
      setImageError(t.selectImageFirst);
      return;
    }
    setImageError(null);
    onGenerate(imageFile, voiceText);
  };

  const handleManual = () => {
    if (!imageFile) {
      setImageError(t.selectImageFirst);
      return;
    }
    setImageError(null);
    if (onManualEntry) {
      onManualEntry(imageFile, voiceText);
    } else {
      onGenerate(imageFile, voiceText);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp,image/heic"
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* SECTION 1: Product Photo Card */}
      <div className="bg-white rounded-3xl p-4 border border-warmcream-border shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-earthy-title">
              {t.uploadTitle} *
            </h3>
            <p className="text-[11px] text-earthy-muted mt-0.5">
              {t.uploadSubtitle}
            </p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-terracotta-50 text-terracotta border border-terracotta-200">
            {imageFile ? "1 Photo Selected" : "Photo Required"}
          </span>
        </div>

        {/* Image Preview Container */}
        {imagePreview ? (
          <div className="space-y-2">
            <div className="relative w-full h-56 rounded-2xl overflow-hidden bg-stone-100 border border-warmcream-border shadow-inner">
              <img
                src={imagePreview}
                alt="Product Preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={handleClearImage}
                className="absolute top-2 right-2 p-2 rounded-xl bg-black/60 text-white hover:bg-red-600 transition shadow-md active:scale-95"
                title="Remove photo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Replace Photo Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="py-2.5 px-3 rounded-xl bg-warmcream-muted hover:bg-stone-200 text-earthy-title text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 border border-warmcream-border"
              >
                <Camera className="w-4 h-4 text-terracotta" />
                <span>{t.cameraBtn}</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-2.5 px-3 rounded-xl bg-warmcream-muted hover:bg-stone-200 text-earthy-title text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 border border-warmcream-border"
              >
                <ImageIcon className="w-4 h-4 text-terracotta" />
                <span>{t.galleryBtn}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Empty Photo Selector Box */
          <div className="border-2 border-dashed border-terracotta/30 rounded-2xl p-6 text-center bg-warmcream/40 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-terracotta-50 text-terracotta flex items-center justify-center mx-auto border border-terracotta-200 shadow-xs">
              <Camera className="w-7 h-7 stroke-[1.8]" />
            </div>

            <div>
              <p className="text-xs font-bold text-earthy-title">
                {lang === "hi"
                  ? "उत्पाद की तस्वीर लें या गैलरी से चुनें"
                  : "Capture product photo or choose from gallery"}
              </p>
              <p className="text-[11px] text-earthy-muted mt-1">
                Supports JPEG, PNG, WebP (up to 5MB)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 max-w-xs mx-auto pt-1">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="py-3 px-3 rounded-xl bg-terracotta text-white font-bold text-xs shadow-md hover:bg-terracotta-700 active:scale-95 transition flex items-center justify-center gap-1.5"
              >
                <Camera className="w-4 h-4" />
                <span>{t.cameraBtn}</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-3 px-3 rounded-xl bg-white border border-stone-300 text-earthy-title font-bold text-xs hover:bg-stone-50 active:scale-95 transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <ImageIcon className="w-4 h-4 text-stone-600" />
                <span>{t.galleryBtn}</span>
              </button>
            </div>
          </div>
        )}

        {imageError && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <p>{imageError}</p>
          </div>
        )}
      </div>

      {/* SECTION 2: Voice Note & Description Card */}
      <div className="bg-white rounded-3xl p-4 border border-warmcream-border shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-earthy-title flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-terracotta" />
              <span>{t.voicePrompt}</span>
            </h3>
            <p className="text-[11px] text-earthy-muted mt-0.5">
              {t.voiceHint}
            </p>
          </div>
          <span className="text-[10px] text-stone-400 font-semibold">
            {lang === "hi" ? "वैकल्पिक" : "Optional"}
          </span>
        </div>

        {/* Audio Recording Controller */}
        <div className="p-3.5 rounded-2xl bg-warmcream/70 border border-warmcream-border space-y-3">
          <div className="flex items-center justify-between">
            {isRecording ? (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                <span className="text-xs font-bold text-red-600">
                  {t.recording} ({recordingSeconds}s)
                </span>
              </div>
            ) : isTranscribing ? (
              <div className="flex items-center gap-2 text-xs font-bold text-terracotta">
                <div className="w-3.5 h-3.5 border-2 border-terracotta/30 border-t-terracotta rounded-full animate-spin" />
                <span>{t.transcribing}</span>
              </div>
            ) : recordedAudioUrl ? (
              <div className="flex items-center gap-2 text-xs font-bold text-craftgreen">
                <CheckCircle2 className="w-4 h-4" />
                <span>{t.audioRecorded}</span>
              </div>
            ) : (
              <span className="text-xs text-earthy-muted">
                {lang === "hi"
                  ? "माइक बटन दबाएं और उत्पाद का विवरण बोलें"
                  : "Tap mic button and describe material, craft, or size"}
              </span>
            )}

            {/* Mic Action Buttons */}
            {isRecording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="py-2 px-4 rounded-xl bg-red-600 text-white text-xs font-bold shadow-md hover:bg-red-700 active:scale-95 transition flex items-center gap-1.5"
              >
                <MicOff className="w-3.5 h-3.5" />
                <span>{t.stopRecording}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                disabled={isTranscribing}
                className="py-2 px-3.5 rounded-xl bg-terracotta text-white text-xs font-bold shadow-sm hover:bg-terracotta-700 active:scale-95 transition flex items-center gap-1.5 disabled:opacity-60"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{recordedAudioUrl ? t.reRecord : t.tapToSpeak}</span>
              </button>
            )}
          </div>

          {/* Voice Notice if mic denied or failed */}
          {voiceNotice && (
            <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200 leading-snug">
              {voiceNotice}
            </p>
          )}

          {/* Transcribed / Manual Textarea */}
          <div>
            <label className="block text-[11px] font-semibold text-earthy-title mb-1">
              {t.typeInstead}
            </label>
            <textarea
              rows={3}
              value={voiceText}
              onChange={(e) => setVoiceText(e.target.value)}
              placeholder={
                lang === "hi"
                  ? "जैसे: प्राकृतिक मिट्टी से बना मटका, हस्तनिर्मित नक्काशी, पानी ठंडा रखने के लिए उपयुक्त..."
                  : "e.g. Handcrafted terracotta water vessel made from river clay, traditional geometric carving, keeps water cool..."
              }
              className="w-full text-xs text-earthy-body p-2.5 rounded-xl bg-white border border-warmcream-border focus:outline-none focus:ring-2 focus:ring-terracotta/30 resize-none leading-relaxed shadow-xs"
            />
          </div>

          {voiceText && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleClearVoice}
                className="text-[11px] text-stone-400 hover:text-red-600 font-medium"
              >
                {lang === "hi" ? "विवरण साफ़ करें" : "Clear notes"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="space-y-2 pt-1">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || !imageFile}
          className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-terracotta to-ochre text-white font-black text-sm shadow-floating hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>{t.generating}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>{t.generateCatalogueBtn}</span>
            </>
          )}
        </button>

        {/* Secondary Manual Entry Option */}
        <button
          type="button"
          onClick={handleManual}
          disabled={isGenerating || !imageFile}
          className="w-full py-2.5 px-3 text-xs font-bold text-earthy-muted hover:text-terracotta transition flex items-center justify-center gap-1 disabled:opacity-50"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{t.continueManuallyBtn}</span>
        </button>
      </div>
    </div>
  );
};
