"use client";

import { useRef, useState } from "react";

export function RecitationRecorder({
  onResult,
}: {
  onResult: (audioBlob: Blob) => Promise<void>;
}) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.onstop = async () => {
      setBusy(true);
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      await onResult(blob);
      setBusy(false);
      stream.getTracks().forEach((t) => t.stop());
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setRecording(true);
  }

  function stop() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <button
      onClick={recording ? stop : start}
      disabled={busy}
      className="mx-auto flex h-20 w-20 items-center justify-center rounded-full transition-colors"
      style={{
        background: recording ? "#B5502B" : "#2F6F4E",
        opacity: busy ? 0.6 : 1,
      }}
      aria-label={recording ? "Остановить запись" : "Начать чтение"}
    >
      <span className="text-white text-sm">
        {busy ? "…" : recording ? "стоп" : "читать"}
      </span>
    </button>
  );
}
