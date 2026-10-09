'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Mic, RotateCcw, Send, Square, X } from 'lucide-react';
import AdaptiveButton from '@/components/AdaptiveButton';
import { SPEECH_LANG, speak, stopSpeaking } from '@/lib/i18n';
import { useT, useUIModeStore } from '@/store/useUIModeStore';

export interface VoiceResult {
  audioUrl: string;
  transcript: string;
  durationSec: number;
}

interface VoiceRecordModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (result: VoiceResult) => void | Promise<void>;
}

type Status = 'idle' | 'recording' | 'recorded' | 'error';

/* Minimal typings for the (prefixed) Web Speech API. */
interface SpeechAlternativeLike {
  transcript: string;
}
interface SpeechResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechAlternativeLike;
}
interface SpeechEventLike {
  results: { length: number; [index: number]: SpeechResultLike };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
interface SpeechWindow {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
}

const formatClock = (total: number) => {
  const m = Math.floor(total / 60)
    .toString()
    .padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export default function VoiceRecordModal({ open, onClose, onSubmit }: VoiceRecordModalProps) {
  const mode = useUIModeStore((s) => s.mode);
  const language = useUIModeStore((s) => s.language);
  const t = useT();

  const [status, setStatus] = useState<Status>('idle');
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const durationRef = useRef(0);

  const senior = mode === 'senior';

  const releaseHardware = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      recognitionRef.current?.stop();
    } catch {
      /* recognition already stopped */
    }
    recognitionRef.current = null;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null;
      recorder.stop();
    }
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const resetAll = useCallback(() => {
    releaseHardware();
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setSeconds(0);
    setTranscript('');
    setErrorKey(null);
    setStatus('idle');
  }, [releaseHardware]);

  // Voice prompt for seniors, Escape-to-close, and cleanup.
  useEffect(() => {
    if (!open) return;
    if (senior) speak(t('voice.speakNowPrompt'), language);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        resetAll();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      stopSpeaking();
    };
  }, [open, senior, language, t, resetAll, onClose]);

  // Release the microphone if the component unmounts mid-recording.
  useEffect(() => releaseHardware, [releaseHardware]);

  const startRecognition = () => {
    const w = window as unknown as SpeechWindow;
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    try {
      const recognition = new Ctor();
      recognition.lang = SPEECH_LANG[language];
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        let text = '';
        for (let i = 0; i < event.results.length; i += 1) {
          text += event.results[i][0].transcript;
        }
        setTranscript(text.trim());
      };
      recognition.onerror = () => undefined;
      recognition.onend = () => undefined;
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      recognitionRef.current = null;
    }
  };

  const startRecording = async () => {
    stopSpeaking();
    setErrorKey(null);
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setErrorKey('voice.unsupported');
      setStatus('error');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setAudioUrl(URL.createObjectURL(blob));
        setStatus('recorded');
      };
      recorderRef.current = recorder;
      recorder.start();

      startedAtRef.current = Date.now();
      setSeconds(0);
      timerRef.current = window.setInterval(() => {
        setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 250);

      startRecognition();
      setStatus('recording');
    } catch {
      releaseHardware();
      setErrorKey('voice.permissionDenied');
      setStatus('error');
    }
  };

  const stopRecording = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    durationRef.current = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
    setSeconds(durationRef.current);
    try {
      recognitionRef.current?.stop();
    } catch {
      /* recognition already stopped */
    }
    recognitionRef.current = null;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop(); // triggers onstop → 'recorded'
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  const handleSubmit = async () => {
    if (!audioUrl || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({
        audioUrl,
        transcript: transcript.trim(),
        durationSec: durationRef.current,
      });
      setAudioUrl(null); // ownership of the blob URL moved to the message; do not revoke it
      resetAll();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const micSize = senior ? 'h-28 w-28' : 'h-20 w-20';
  const statusText =
    status === 'recording'
      ? t('voice.recording')
      : status === 'recorded'
        ? t('voice.recorded')
        : t('voice.tapToStart');

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t('voice.title')}
            onClick={(event) => event.stopPropagation()}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 24, stiffness: 260 }}
            className={
              senior
                ? 'w-full max-w-xl rounded-3xl border-4 border-hearth-bark bg-hearth-cream p-8 text-hearth-ink'
                : mode === 'junior'
                  ? 'w-full max-w-lg rounded-[2rem] bg-gradient-to-br from-pink-50 via-purple-50 to-sky-50 p-6 text-purple-950 shadow-2xl'
                  : 'w-full max-w-lg rounded-xl bg-white p-6 text-slate-900 shadow-2xl'
            }
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className={senior ? 'text-3xl font-extrabold' : 'text-xl font-bold'}>
                {t('voice.title')}
              </h2>
              <button
                type="button"
                onClick={handleClose}
                aria-label={t('common.close')}
                className={
                  senior
                    ? 'grid h-14 w-14 place-items-center rounded-2xl border-4 border-hearth-bark'
                    : 'grid h-10 w-10 place-items-center rounded-full hover:bg-black/5'
                }
              >
                <X className={senior ? 'h-8 w-8' : 'h-5 w-5'} aria-hidden="true" />
              </button>
            </div>

            <div className="mt-6 flex flex-col items-center gap-4 text-center">
              <div className="relative">
                {status === 'recording' && (
                  <motion.span
                    className="absolute inset-0 rounded-full bg-red-400/50"
                    animate={{ scale: [1, 1.5], opacity: [0.7, 0] }}
                    transition={{ repeat: Infinity, duration: 1.3 }}
                    aria-hidden="true"
                  />
                )}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  disabled={status === 'recorded'}
                  onClick={status === 'recording' ? stopRecording : startRecording}
                  aria-label={status === 'recording' ? t('voice.tapToStop') : t('voice.tapToStart')}
                  className={[
                    'relative grid place-items-center rounded-full text-white disabled:opacity-40',
                    micSize,
                    status === 'recording'
                      ? 'bg-red-600'
                      : senior
                        ? 'border-4 border-hearth-bark bg-hearth-ember'
                        : 'bg-indigo-600',
                  ].join(' ')}
                >
                  {status === 'recording' ? (
                    <Square className={senior ? 'h-12 w-12' : 'h-8 w-8'} aria-hidden="true" />
                  ) : (
                    <Mic className={senior ? 'h-14 w-14' : 'h-9 w-9'} aria-hidden="true" />
                  )}
                </motion.button>
              </div>

              <p className="font-mono text-3xl font-bold tabular-nums" aria-live="polite">
                {formatClock(seconds)}
              </p>
              <p className={senior ? 'text-xl font-semibold' : 'text-sm'} aria-live="polite">
                {statusText}
              </p>

              {status === 'error' && errorKey && (
                <div role="alert" className="space-y-3">
                  <p className={senior ? 'text-xl font-semibold text-red-900' : 'text-sm text-red-700'}>
                    {t(errorKey)}
                  </p>
                  <AdaptiveButton variant="secondary" icon={<RotateCcw className="h-5 w-5" />} onClick={resetAll}>
                    {t('voice.retry')}
                  </AdaptiveButton>
                </div>
              )}
            </div>

            {status === 'recorded' && audioUrl && (
              <div className="mt-6 space-y-4">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <audio controls src={audioUrl} className="w-full" />
                <div>
                  <label
                    htmlFor="voice-transcript"
                    className={senior ? 'mb-2 block text-lg font-bold' : 'mb-1 block text-sm font-medium'}
                  >
                    {t('voice.transcriptLabel')}
                  </label>
                  <textarea
                    id="voice-transcript"
                    rows={3}
                    value={transcript}
                    onChange={(event) => setTranscript(event.target.value)}
                    placeholder={t('voice.transcriptPlaceholder')}
                    className={
                      senior
                        ? 'w-full rounded-2xl border-4 border-hearth-bark bg-white p-4 text-xl'
                        : 'w-full rounded-lg border border-slate-300 bg-white p-3 text-sm'
                    }
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <AdaptiveButton
                    icon={<Send className="h-5 w-5" />}
                    loading={submitting}
                    onClick={handleSubmit}
                  >
                    {t('voice.send')}
                  </AdaptiveButton>
                  <AdaptiveButton
                    variant="secondary"
                    icon={<RotateCcw className="h-5 w-5" />}
                    onClick={resetAll}
                    disabled={submitting}
                  >
                    {t('voice.retake')}
                  </AdaptiveButton>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}