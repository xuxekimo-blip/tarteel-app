"use client";

import { useEffect, useState } from "react";
import { AyahDisplay } from "@/components/AyahDisplay";
import { RecitationRecorder } from "@/components/RecitationRecorder";
import { SessionSummary, type SessionEntry } from "@/components/SessionSummary";
import type { WordResult } from "@/lib/compare-recitation";

type Surah = {
  number: number;
  name: string;
  englishName: string;
  numberOfAyahs: number;
};

type AyahPreview = { id: number; ayah_number: number; text_simple: string };

type Ayah = {
  id: number;
  surah_number: number;
  ayah_number: number;
  text_uthmani: string;
  text_simple: string;
};

type Step = "home" | "surah" | "recite" | "summary";

export default function Page() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>("home");
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [surahsError, setSurahsError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [ayahList, setAyahList] = useState<AyahPreview[]>([]);
  const [ayahListLoading, setAyahListLoading] = useState(false);

  const [ayah, setAyah] = useState<Ayah | null>(null);
  const [results, setResults] = useState<WordResult[] | undefined>();
  const [score, setScore] = useState<number | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [hifzMode, setHifzMode] = useState(true);

  const [session, setSession] = useState<SessionEntry[]>([]);

  useEffect(() => {
    const tg = (window as any)?.Telegram?.WebApp;
    tg?.ready();
    const initData = tg?.initData;
    if (!initData) {
      setAuthError("Открой приложение из Telegram, а не из обычного браузера.");
      return;
    }
    fetch("/api/auth/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData }),
    })
      .then((r) => r.json())
      .then((data) => setUserId(data.userId))
      .catch(() => setAuthError("Не удалось авторизоваться."));
  }, []);

  useEffect(() => {
    fetch("/api/surahs")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
        return data;
      })
      .then((data) => setSurahs(data.surahs ?? []))
      .catch((err) => setSurahsError(String(err.message ?? err)));
  }, []);

  async function openSurah(s: Surah) {
    setSelectedSurah(s);
    setSession([]);
    setStep("surah");
    setAyahListLoading(true);
    const res = await fetch(`/api/ayahs?surah=${s.number}`);
    const data = await res.json();
    setAyahList(data.ayahs ?? []);
    setAyahListLoading(false);
  }

  async function openAyah(ayahNumber: number) {
    if (!selectedSurah) return;
    setResults(undefined);
    setScore(null);
    setCheckError(null);
    const res = await fetch(`/api/ayahs?surah=${selectedSurah.number}&ayah=${ayahNumber}`);
    const data = await res.json();
    if (!res.ok) return;
    setAyah(data.ayah);
    setStep("recite");
  }

  function nextAyahNumber(): number | null {
    if (!ayah || !selectedSurah) return null;
    const next = ayah.ayah_number + 1;
    return next <= selectedSurah.numberOfAyahs ? next : null;
  }

  async function handleRecording(blob: Blob) {
    if (!userId || !ayah) return;
    setChecking(true);
    const form = new FormData();
    form.append("audio", blob);
    form.append("userId", userId);
    form.append("ayahId", String(ayah.id));

    const res = await fetch("/api/recite/check", { method: "POST", body: form });
    const data = await res.json();
    setChecking(false);
    if (!res.ok) {
      setCheckError(`Ошибка проверки: ${data.error ?? "неизвестная"}`);
      return;
    }
    setCheckError(null);
    setResults(data.results);
    setScore(data.score);
    setSession((prev) => {
  const withoutThis = prev.filter(
    (e) => e.ayahNumber !== ayah.ayah_number
  );

  const correctWords = (data.results ?? []).filter(
    (r: WordResult) => r.status === "ok"
  ).length;

  const mismatchWords = (data.results ?? []).filter(
    (r: WordResult) => r.status === "mismatch"
  ).length;

  const missingWords = (data.results ?? []).filter(
    (r: WordResult) => r.status === "missing"
  ).length;

  return [
    ...withoutThis,
    {
      ayahNumber: ayah.ayah_number,
      score: data.score,
      correctWords,
      mismatchWords,
      missingWords,
    },
  ];
});
  }

  const filteredSurahs = surahs.filter(
    (s) =>
      s.englishName.toLowerCase().includes(search.toLowerCase()) ||
      String(s.number).includes(search)
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col p-6">
      {authError && (
        <p className="mb-4 text-center text-sm text-[#B5502B]">{authError}</p>
      )}

      {step === "home" && (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-semibold text-[#111111]">Hifzly</h1>
            <p className="mt-1 text-sm text-[#777777]">Читай, а система проверит за тебя</p>
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Найти суру..."
            className="w-full rounded-xl border border-[#E4E0D6] bg-[#FBFAF6] px-4 py-3 text-sm outline-none"
          />

          <div className="space-y-1">
            {filteredSurahs.map((s) => (
              <button
                key={s.number}
                onClick={() => openSurah(s)}
                className="flex w-full items-center gap-3 rounded-xl border border-[#E4E0D6] bg-[#FBFAF6] px-4 py-3 text-left"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EFEBDD] text-xs text-[#777777]">
                  {s.number}
                </span>
                <span className="flex-1 text-sm text-[#111111]">{s.englishName}</span>
                <span className="text-xs text-[#8A8474]">{s.numberOfAyahs} аятов</span>
              </button>
            ))}
            {surahs.length === 0 && !surahsError && (
              <p className="text-center text-sm text-[#777777]">Загружаю список сур...</p>
            )}
            {surahsError && (
              <p className="text-center text-sm text-[#B5502B]">
                Не удалось загрузить список: {surahsError}
              </p>
            )}
          </div>
        </div>
      )}

      {step === "surah" && selectedSurah && (
        <div className="space-y-4">
          <button onClick={() => setStep("home")} className="text-sm text-[#777777]">
            ← Все суры
          </button>
          <h1 className="text-xl font-semibold text-[#111111]">{selectedSurah.englishName}</h1>

          <div className="space-y-2">
            {ayahList.map((a) => {
              const done = session.find((e) => e.ayahNumber === a.ayah_number);
              return (
                <button
                  key={a.id}
                  onClick={() => openAyah(a.ayah_number)}
                  className="flex w-full items-start gap-3 rounded-xl border border-[#E4E0D6] bg-[#FBFAF6] px-4 py-3 text-left"
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs"
                    style={{
                      background: done ? "#2F6F4E" : "#EFEBDD",
                      color: done ? "white" : "#777777",
                    }}
                  >
                    {a.ayah_number}
                  </span>
                  <span
                    dir="rtl"
                    style={{ fontFamily: "'Amiri', serif" }}
                    className="flex-1 truncate text-right text-lg"
                  >
                    {a.text_simple}
                  </span>
                </button>
              );
            })}
            {ayahListLoading && (
              <p className="text-center text-sm text-[#777777]">Загружаю аяты...</p>
            )}
          </div>

          {session.length > 0 && (
            <button
              onClick={() => setStep("summary")}
              className="w-full rounded-xl bg-[#2F6F4E] py-3 text-center text-sm text-white"
            >
              Завершить сессию ({session.length})
            </button>
          )}
        </div>
      )}

      {step === "recite" && ayah && selectedSurah && (
        <div className="flex flex-1 flex-col justify-between space-y-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between rounded-2xl border border-[#E4E0D6] bg-[#FBFAF6] px-4 py-3">
  <div>
    <div className="text-sm font-medium text-[#111111]">
      Режим запоминания
    </div>
    <div className="mt-1 text-xs text-[#777777]">
      {hifzMode
        ? "Текст скрыт — читайте по памяти"
        : "Текст аята отображается"}
    </div>
  </div>

  <button
    onClick={() => setHifzMode((prev) => !prev)}
    className={`relative h-7 w-12 rounded-full transition-colors ${
      hifzMode ? "bg-[#2F6F4E]" : "bg-[#D9D2BE]"
    }`}
    aria-label="Переключить режим запоминания"
  >
    <span
      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
        hifzMode ? "translate-x-6" : "translate-x-1"
      }`}
    />
  </button>
</div>
            <button onClick={() => setStep("surah")} className="text-sm text-[#777777]">
              ← К списку аятов
            </button>
            <AyahDisplay
             surahNumber={ayah.surah_number}
             surahName={selectedSurah.englishName}
             ayahNumber={ayah.ayah_number}
             arabicText={ayah.text_simple}
             results={results}
             hidden={hifzMode && results === undefined}
            />
            {checking && (
              <p className="text-center text-sm text-[#777777]">Проверяю...</p>
            )}
            {score !== null && !checking && (
              <p className="text-center text-sm text-[#777777]">
                Точность: {Math.round(score * 100)}%
              </p>
            )}
            {checkError && (
              <p className="text-center text-sm text-[#B5502B]">{checkError}</p>
            )}
          </div>

          <div className="space-y-4 pb-8">
            <RecitationRecorder onResult={handleRecording} />
            {score !== null && !checking && (
              <div className="flex gap-3">
                {nextAyahNumber() !== null ? (
                  <button
                    onClick={() => openAyah(nextAyahNumber()!)}
                    className="flex-1 rounded-xl bg-[#2F6F4E] py-3 text-center text-sm text-white"
                  >
                    Следующий аят →
                  </button>
                ) : (
                  <button
                    onClick={() => setStep("summary")}
                    className="flex-1 rounded-xl bg-[#2F6F4E] py-3 text-center text-sm text-white"
                  >
                    Завершить суру
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {step === "summary" && selectedSurah && (
        <SessionSummary
          surahName={selectedSurah.englishName}
          entries={session}
          onRestart={() => openSurah(selectedSurah)}
          onHome={() => setStep("home")}
        />
      )}
    </main>
  );
}
