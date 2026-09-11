"use client";

export type SessionEntry = { ayahNumber: number; score: number };

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

  const worst = [...entries].sort((a, b) => a.score - b.score).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#E4E0D6] bg-[#FBFAF6] p-6 text-center">
        <div className="text-sm text-[#8A8474]">{surahName}</div>
        <div className="mt-2 text-4xl font-semibold text-[#2F6F4E]">
          {Math.round(avg * 100)}%
        </div>
        <div className="mt-1 text-sm text-[#777777]">
          Пройдено аятов: {entries.length}
        </div>
      </div>

      {worst.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm text-[#8A8474]">Стоит повторить</div>
          {worst.map((e) => (
            <div
              key={e.ayahNumber}
              className="flex items-center justify-between rounded-xl border border-[#E4E0D6] bg-[#FBFAF6] px-4 py-3"
            >
              <span className="text-sm">Аят {e.ayahNumber}</span>
              <span className="text-sm text-[#8A8474]">{Math.round(e.score * 100)}%</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onRestart}
          className="flex-1 rounded-xl bg-[#2F6F4E] py-3 text-center text-sm text-white"
        >
          Повторить суру
        </button>
        <button
          onClick={onHome}
          className="flex-1 rounded-xl border border-[#E4E0D6] bg-[#FBFAF6] py-3 text-center text-sm text-[#111111]"
        >
          На главную
        </button>
      </div>
    </div>
  );
}
