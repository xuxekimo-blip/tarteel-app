"use client";

import { useEffect, useState } from "react";
import { AyahDisplay } from "@/components/AyahDisplay";
import { RecitationRecorder } from "@/components/RecitationRecorder";
import type { WordResult } from "@/lib/compare-recitation";

// Демонстрационный аят (Al-Fatiha, 1:1) — в реальном приложении
// список аятов приходит из таблицы `ayahs` через отдельный API route.
const DEMO_AYAH = {
  id: 1,
  surahNumber: 1,
  ayahNumber: 1,
  text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
};

export default function Page() {
  const [userId, setUserId] = useState<string | null>(null);
  const [results, setResults] = useState<WordResult[] | undefined>();
  const [score, setScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tg = (window as any)?.Telegram?.WebApp;
    tg?.ready();
    const initData = tg?.initData;
    if (!initData) {
      setError("Открой приложение из Telegram, а не из обычного браузера.");
      return;
    }
    fetch("/api/auth/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData }),
    })
      .then((r) => r.json())
      .then((data) => setUserId(data.userId))
      .catch(() => setError("Не удалось авторизоваться."));
  }, []);

  async function handleRecording(blob: Blob) {
    if (!userId) return;
    const form = new FormData();
    form.append("audio", blob);
    form.append("userId", userId);
    form.append("ayahId", String(DEMO_AYAH.id));

    const res = await fetch("/api/recite/check", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) {
      setError(`Ошибка проверки: ${data.error ?? "неизвестная"}`);
      return;
    }
    setError(null);
    setResults(data.results);
    setScore(data.score);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-between p-6">
      <div className="space-y-6">
        <h1 className="text-center text-lg text-[#777777]">Проверь начитку</h1>
        <AyahDisplay
          surahNumber={DEMO_AYAH.surahNumber}
          ayahNumber={DEMO_AYAH.ayahNumber}
          arabicText={DEMO_AYAH.text}
          results={results}
        />
        {score !== null && (
          <p className="text-center text-sm text-[#777777]">
            Точность: {Math.round(score * 100)}%
          </p>
        )}
        {error && <p className="text-center text-sm text-[#B5502B]">{error}</p>}
      </div>

      <div className="pb-8">
        <RecitationRecorder onResult={handleRecording} />
      </div>
    </main>
  );
}
