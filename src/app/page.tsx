"use client";

import { useEffect, useState } from "react";
import { AyahDisplay } from "@/components/AyahDisplay";
import { RecitationRecorder } from "@/components/RecitationRecorder";
import {
  SessionSummary,
  type SessionEntry,
} from "@/components/SessionSummary";
import type { WordResult } from "@/lib/compare-recitation";

type Surah = {
  number: number;
  name: string;
  englishName: string;
  numberOfAyahs: number;
};

type AyahPreview = {
  id: number;
  ayah_number: number;
  text_simple: string;
};

type Ayah = {
  id: number;
  surah_number: number;
  ayah_number: number;
  text_uthmani: string;
  text_simple: string;
};

type Progress = {
  ayahsChecked: number;
  totalAttempts: number;
  averageScore: number;
  bestScore: number;
};

type Step = "home" | "surah" | "recite" | "summary";

export default function Page() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [progress, setProgress] = useState<Progress | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);

  const [step, setStep] = useState<Step>("home");
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [surahsError, setSurahsError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [selectedSurah, setSelectedSurah] =
    useState<Surah | null>(null);

  const [ayahList, setAyahList] = useState<AyahPreview[]>([]);
  const [ayahListLoading, setAyahListLoading] = useState(false);

  const [ayah, setAyah] = useState<Ayah | null>(null);
  const [results, setResults] =
    useState<WordResult[] | undefined>();
  const [score, setScore] = useState<number | null>(null);
  const [checkError, setCheckError] =
    useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const [hifzMode, setHifzMode] = useState(true);

  const [hifzFrom, setHifzFrom] = useState(1);
  const [hifzTo, setHifzTo] = useState(5);

  const [hifzRange, setHifzRange] = useState<{
    from: number;
    to: number;
  } | null>(null);

  const [repeatQueue, setRepeatQueue] =
    useState<number[]>([]);
  const [repeatIndex, setRepeatIndex] = useState(0);

  const [session, setSession] = useState<SessionEntry[]>([]);

  // Telegram авторизация
  useEffect(() => {
    const tg = (window as any)?.Telegram?.WebApp;

    tg?.ready();

    const initData = tg?.initData;

    if (!initData) {
      setAuthError(
        "Открой приложение из Telegram, а не из обычного браузера."
      );
      return;
    }

    fetch("/api/auth/telegram", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        initData,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.userId) {
          throw new Error("user_id_missing");
        }

        setUserId(data.userId);
      })
      .catch(() => {
        setAuthError("Не удалось авторизоваться.");
      });
  }, []);

  // Загрузка прогресса
  useEffect(() => {
    if (!userId) return;

    setProgressLoading(true);

    fetch(
      `/api/progress?userId=${encodeURIComponent(userId)}`
    )
      .then(async (r) => {
        const data = await r.json();

        if (!r.ok) {
          throw new Error(
            data.error ?? `HTTP ${r.status}`
          );
        }

        return data;
      })
      .then((data) => {
        setProgress({
          ayahsChecked: Number(
            data.ayahsChecked ?? 0
          ),
          totalAttempts: Number(
            data.totalAttempts ?? 0
          ),
          averageScore: Number(
            data.averageScore ?? 0
          ),
          bestScore: Number(
            data.bestScore ?? 0
          ),
        });
      })
      .catch((err) => {
        console.error("Progress error:", err);
      })
      .finally(() => {
        setProgressLoading(false);
      });
  }, [userId]);

  // Загрузка сур
  useEffect(() => {
    fetch("/api/surahs")
      .then(async (r) => {
        const data = await r.json();

        if (!r.ok) {
          throw new Error(
            data.error ?? `HTTP ${r.status}`
          );
        }

        return data;
      })
      .then((data) => {
        setSurahs(data.surahs ?? []);
      })
      .catch((err) => {
        setSurahsError(
          String(err.message ?? err)
        );
      });
  }, []);

  // Открыть суру
  async function openSurah(s: Surah) {
    setSelectedSurah(s);
    setSession([]);

    setHifzMode(true);
    setHifzRange(null);

    setHifzFrom(1);
    setHifzTo(
      Math.min(5, s.numberOfAyahs)
    );

    setRepeatQueue([]);
    setRepeatIndex(0);

    setStep("surah");
    setAyahListLoading(true);

    const res = await fetch(
      `/api/ayahs?surah=${s.number}`
    );

    const data = await res.json();

    setAyahList(data.ayahs ?? []);
    setAyahListLoading(false);
  }

  // Открыть аят
  async function openAyah(ayahNumber: number) {
    if (!selectedSurah) return;

    setResults(undefined);
    setScore(null);
    setCheckError(null);

    const res = await fetch(
      `/api/ayahs?surah=${selectedSurah.number}&ayah=${ayahNumber}`
    );

    const data = await res.json();

    if (!res.ok) return;

    setAyah(data.ayah);
    setStep("recite");
  }

  // Начать Хифз
  function startHifz() {
    if (!selectedSurah) return;

    const from = Math.max(
      1,
      Math.min(
        hifzFrom,
        selectedSurah.numberOfAyahs
      )
    );

    const to = Math.max(
      from,
      Math.min(
        hifzTo,
        selectedSurah.numberOfAyahs
      )
    );

    setHifzFrom(from);
    setHifzTo(to);

    setHifzRange({
      from,
      to,
    });

    setRepeatQueue([]);
    setRepeatIndex(0);

    setHifzMode(true);
    setSession([]);

    openAyah(from);
  }

  // Повторить ошибки
  function startErrorReview(
    ayahNumbers: number[]
  ) {
    if (ayahNumbers.length === 0) return;

    const queue = [
      ...new Set(ayahNumbers),
    ].sort((a, b) => a - b);

    setRepeatQueue(queue);
    setRepeatIndex(0);

    setHifzRange(null);
    setHifzMode(true);
    setSession([]);

    openAyah(queue[0]);
  }

  // Следующий аят
  function nextAyahNumber(): number | null {
    if (!ayah || !selectedSurah) {
      return null;
    }

    if (repeatQueue.length > 0) {
      const nextIndex =
        repeatIndex + 1;

      if (
        nextIndex <
        repeatQueue.length
      ) {
        return repeatQueue[nextIndex];
      }

      return null;
    }

    const next =
      ayah.ayah_number + 1;

    if (hifzRange) {
      return next <= hifzRange.to
        ? next
        : null;
    }

    return next <=
      selectedSurah.numberOfAyahs
      ? next
      : null;
  }

  // Перейти к следующему аяту
  async function handleNextAyah() {
    const next =
      nextAyahNumber();

    if (next === null) {
      setStep("summary");
      return;
    }

    if (repeatQueue.length > 0) {
      setRepeatIndex(
        (prev) => prev + 1
      );
    }

    await openAyah(next);
  }

  // Проверка чтения
  async function handleRecording(
    blob: Blob
  ) {
    if (!userId || !ayah) return;

    setChecking(true);

    const form = new FormData();

    form.append("audio", blob);
    form.append("userId", userId);
    form.append(
      "ayahId",
      String(ayah.id)
    );

    const res = await fetch(
      "/api/recite/check",
      {
        method: "POST",
        body: form,
      }
    );

    const data = await res.json();

    setChecking(false);

    if (!res.ok) {
      setCheckError(
        `Ошибка проверки: ${
          data.error ??
          "неизвестная"
        }`
      );
      return;
    }

    setCheckError(null);
    setResults(data.results);
    setScore(data.score);

    setSession((prev) => {
      const withoutThis =
        prev.filter(
          (e) =>
            e.ayahNumber !==
            ayah.ayah_number
        );

      const correctWords =
        (data.results ?? []).filter(
          (r: WordResult) =>
            r.status === "ok"
        ).length;

      const mismatchWords =
        (data.results ?? []).filter(
          (r: WordResult) =>
            r.status === "mismatch"
        ).length;

      const missingWords =
        (data.results ?? []).filter(
          (r: WordResult) =>
            r.status === "missing"
        ).length;

      return [
        ...withoutThis,
        {
          ayahNumber:
            ayah.ayah_number,
          score: data.score,
          correctWords,
          mismatchWords,
          missingWords,
        },
      ];
    });

    // Обновить карточку прогресса
    fetch(
      `/api/progress?userId=${encodeURIComponent(
        userId
      )}`
    )
      .then((r) => r.json())
      .then((progressData) => {
        setProgress({
          ayahsChecked: Number(
            progressData.ayahsChecked ?? 0
          ),
          totalAttempts: Number(
            progressData.totalAttempts ?? 0
          ),
          averageScore: Number(
            progressData.averageScore ?? 0
          ),
          bestScore: Number(
            progressData.bestScore ?? 0
          ),
        });
      })
      .catch((err) => {
        console.error(
          "Progress refresh error:",
          err
        );
      });
  }

  const filteredSurahs =
    surahs.filter(
      (s) =>
        s.englishName
          .toLowerCase()
          .includes(
            search.toLowerCase()
          ) ||
        String(s.number).includes(
          search
        )
    );

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col p-6">

      {authError && (
        <p className="mb-4 text-center text-sm text-[#B5502B]">
          {authError}
        </p>
      )}

      {/* HOME */}

      {step === "home" && (
        <div className="space-y-5">

          <div>
            <h1 className="text-2xl font-semibold text-[#111111]">
              Hifzly
            </h1>

            <p className="mt-1 text-sm text-[#777777]">
              Читай, а система проверит за тебя
            </p>
          </div>

          {/* PROGRESS */}

          {progressLoading ? (
            <div className="rounded-2xl border border-[#E4E0D6] bg-[#FBFAF6] p-5">
              <div className="text-sm text-[#777777]">
                Загружаю твой прогресс...
              </div>
            </div>
          ) : progress ? (
            <div className="rounded-2xl border border-[#E4E0D6] bg-[#FBFAF6] p-5 shadow-sm">

              <div className="flex items-center justify-between">

                <div>
                  <div className="text-sm font-medium text-[#111111]">
                    Мой прогресс
                  </div>

                  <div className="mt-1 text-xs text-[#777777]">
                    По результатам проверок
                  </div>
                </div>

                <div className="text-2xl font-semibold text-[#2F6F4E]">
                  {Math.round(
                    progress.averageScore * 100
                  )}
                  %
                </div>

              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">

                <div className="rounded-xl bg-[#EFEBDD] p-3 text-center">
                  <div className="text-lg font-semibold text-[#111111]">
                    {progress.ayahsChecked}
                  </div>

                  <div className="mt-1 text-[10px] text-[#777777]">
                    Аятов
                  </div>
                </div>

                <div className="rounded-xl bg-[#EFEBDD] p-3 text-center">
                  <div className="text-lg font-semibold text-[#111111]">
                    {progress.totalAttempts}
                  </div>

                  <div className="mt-1 text-[10px] text-[#777777]">
                    Проверок
                  </div>
                </div>

                <div className="rounded-xl bg-[#EFEBDD] p-3 text-center">
                  <div className="text-lg font-semibold text-[#111111]">
                    {Math.round(
                      progress.bestScore * 100
                    )}
                    %
                  </div>

                  <div className="mt-1 text-[10px] text-[#777777]">
                    Лучший
                  </div>
                </div>

              </div>
            </div>
          ) : null}

          {/* SEARCH */}

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Найти суру..."
            className="w-full rounded-xl border border-[#E4E0D6] bg-white px-3 py-2.5 text-sm outline-none"
                  >
                    {Array.from(
                      {
                        length:
                          selectedSurah.numberOfAyahs -
                          hifzFrom +
                          1,
                      },
                      (_, i) => hifzFrom + i
                    ).map(
                      (number) => (
                        <option
                          key={number}
                          value={number}
                        >
                          Аят {number}
                        </option>
                      )
                    )}
                  </select>

                </div>

              </div>

              <button
                onClick={startHifz}
                className="mt-4 w-full rounded-xl bg-[#2F6F4E] py-3 text-center text-sm font-medium text-white"
              >
                Начать запоминание
              </button>

            </div>

            {/* AYAH LIST */}

            <div className="space-y-2">

              {ayahList.map(
                (a) => {
                  const done =
                    session.find(
                      (e) =>
                        e.ayahNumber ===
                        a.ayah_number
                    );

                  return (
                    <button
                      key={a.id}
                      onClick={() =>
                        openAyah(
                          a.ayah_number
                        )
                      }
                      className="flex w-full items-start gap-3 rounded-xl border border-[#E4E0D6] bg-[#FBFAF6] px-4 py-3 text-left"
                    >

                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs"
                        style={{
                          background:
                            done
                              ? "#2F6F4E"
                              : "#EFEBDD",

                          color:
                            done
                              ? "white"
                              : "#777777",
                        }}
                      >
                        {
                          a.ayah_number
                        }
                      </span>

                      <span
                        dir="rtl"
                        style={{
                          fontFamily:
                            "'Amiri', serif",
                        }}
                        className="flex-1 truncate text-right text-lg"
                      >
                        {
                          a.text_simple
                        }
                      </span>

                    </button>
                  );
                }
              )}

              {ayahListLoading && (
                <p className="text-center text-sm text-[#777777]">
                  Загружаю аяты...
                </p>
              )}

            </div>

            {session.length >
              0 && (
              <button
                onClick={() =>
                  setStep(
                    "summary"
                  )
                }
                className="w-full rounded-xl bg-[#2F6F4E] py-3 text-center text-sm text-white"
              >
                Завершить сессию (
                {session.length})
              </button>
            )}

          </div>
        )}

      {/* =========================
          RECITE
      ========================= */}

      {step === "recite" &&
        ayah &&
        selectedSurah && (
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
                  onClick={() =>
                    setHifzMode(
                      (prev) =>
                        !prev
                    )
                  }
                  className={`relative h-7 w-12 rounded-full transition-colors ${
                    hifzMode
                      ? "bg-[#2F6F4E]"
                      : "bg-[#D9D2BE]"
                  }`}
                  aria-label="Переключить режим запоминания"
                >

                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      hifzMode
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />

                </button>

              </div>

              <button
                onClick={() =>
                  setStep("surah")
                }
                className="text-sm text-[#777777]"
              >
                ← К списку аятов
              </button>

              <AyahDisplay
                surahNumber={
                  ayah.surah_number
                }
                surahName={
                  selectedSurah.englishName
                }
                ayahNumber={
                  ayah.ayah_number
                }
                arabicText={
                  ayah.text_simple
                }
                results={
                  results
                }
                hidden={
                  hifzMode &&
                  results ===
                    undefined
                }
              />

              {checking && (
                <p className="text-center text-sm text-[#777777]">
                  Проверяю...
                </p>
              )}

              {score !== null &&
                !checking && (
                  <p className="text-center text-sm text-[#777777]">
                    Точность:{" "}
                    {Math.round(
                      score * 100
                    )}
                    %
                  </p>
                )}

              {checkError && (
                <p className="text-center text-sm text-[#B5502B]">
                  {checkError}
                </p>
              )}

            </div>

            <div className="space-y-4 pb-8">

              <RecitationRecorder
                onResult={
                  handleRecording
                }
              />

              {score !== null &&
                !checking && (
                  <div className="flex gap-3">

                    {nextAyahNumber() !==
                    null ? (
                      <button
                        onClick={
                          handleNextAyah
                        }
                        className="flex-1 rounded-xl bg-[#2F6F4E] py-3 text-center text-sm text-white"
                      >
                        Следующий аят →
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          setStep(
                            "summary"
                          )
                        }
                        className="flex-1 rounded-xl bg-[#2F6F4E] py-3 text-center text-sm text-white"
                      >
                        Завершить
                      </button>
                    )}

                  </div>
                )}

            </div>

          </div>
        )}

      {/* =========================
          SUMMARY
      ========================= */}

      {step === "summary" &&
        selectedSurah && (
          <SessionSummary
            surahName={
              selectedSurah.englishName
            }
            entries={
              session
            }
            onRestart={() =>
              openSurah(
                selectedSurah
              )
            }
            onHome={() =>
              setStep("home")
            }
            onRepeatErrors={(
              ayahNumbers
            ) =>
              startErrorReview(
                ayahNumbers
              )
            }
          />
        )}

    </main>
  );
}
