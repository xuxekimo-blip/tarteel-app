"use client";

export type SessionEntry = {
  ayahNumber: number;
  score: number;
  correctWords: number;
  mismatchWords: number;
  missingWords: number;
};

export function SessionSummary({
  surahName,
  entries,
  onRestart,
  onHome,
}: {
  surahName: string;
  entries: SessionEntry[];
  onRestart: () => void;
  onHome: () => void;
}) {
  const avg =
    entries.length === 0
      ? 0
      : entries.reduce((sum, e) => sum + e.score, 0) / entries.length;

  const totalCorrect = entries.reduce(
    (sum, e) => sum + e.correctWords,
    0
  );

  const totalMismatch = entries.reduce(
    (sum, e) => sum + e.mismatchWords,
    0
  );

  const totalMissing = entries.reduce(
    (sum, e) => sum + e.missingWords,
    0
  );

  const worst = [...entries]
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  function getScoreLabel(score: number) {
    if (score >= 0.9) return "Отлично";
    if (score >= 0.75) return "Хорошо";
    if (score >= 0.5) return "Нужно повторить";
    return "Стоит хорошо повторить";
  }

  return (
    <div className="space-y-5">
      <button
        onClick={onHome}
        className="text-sm text-[#777777]"
      >
        ← На главную
      </button>

      <div className="rounded-3xl border border-[#E4E0D6] bg-[#FBFAF6] p-7 text-center shadow-sm">
        <div className="text-sm text-[#8A8474]">
          {surahName}
        </div>

        <div className="mt-4 text-5xl font-semibold text-[#2F6F4E]">
          {Math.round(avg * 100)}%
        </div>

        <div className="mt-2 text-sm font-medium text-[#111111]">
          {getScoreLabel(avg)}
        </div>

        <div className="mt-1 text-sm text-[#777777]">
          Пройдено аятов: {entries.length}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-[#E4E0D6] bg-[#FBFAF6] p-4 text-center">
          <div className="text-xl font-semibold text-[#2F6F4E]">
            {totalCorrect}
          </div>
          <div className="mt-1 text-xs text-[#777777]">
            Правильно
          </div>
        </div>

        <div className="rounded-2xl border border-[#E4E0D6] bg-[#FBFAF6] p-4 text-center">
          <div className="text-xl font-semibold text-[#B5502B]">
            {totalMismatch}
          </div>
          <div className="mt-1 text-xs text-[#777777]">
            Ошибки
          </div>
        </div>

        <div className="rounded-2xl border border-[#E4E0D6] bg-[#FBFAF6] p-4 text-center">
          <div className="text-xl font-semibold text-[#A3A3A3]">
            {totalMissing}
          </div>
          <div className="mt-1 text-xs text-[#777777]">
            Пропущено
          </div>
        </div>
      </div>

      {worst.length > 0 && (
        <div className="space-y-2">
          <div className="px-1 text-sm font-medium text-[#111111]">
            Стоит повторить
          </div>

          <div className="space-y-2">
            {worst.map((e) => (
              <div
                key={e.ayahNumber}
                className="flex items-center justify-between rounded-2xl border border-[#E4E0D6] bg-[#FBFAF6] px-4 py-3"
              >
                <div>
                  <div className="text-sm text-[#111111]">
                    Аят {e.ayahNumber}
                  </div>

                  <div className="mt-1 text-xs text-[#777777]">
                    {e.correctWords} правильно ·{" "}
                    {e.mismatchWords} ошибок ·{" "}
                    {e.missingWords} пропущено
                  </div>
                </div>

                <span
                  className={`text-sm font-medium ${
                    e.score >= 0.75
                      ? "text-[#2F6F4E]"
                      : "text-[#B5502B]"
                  }`}
                >
                  {Math.round(e.score * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3 pt-1">
        <button
          onClick={onRestart}
          className="w-full rounded-2xl bg-[#2F6F4E] py-3.5 text-center text-sm font-medium text-white"
        >
          Повторить суру
        </button>

        <button
          onClick={onHome}
          className="w-full rounded-2xl border border-[#E4E0D6] bg-[#FBFAF6] py-3.5 text-center text-sm font-medium text-[#111111]"
        >
          На главную
        </button>
      </div>
    </div>
  );
}
