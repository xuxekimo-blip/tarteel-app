"use client";

import type { WordResult } from "@/lib/compare-recitation";

export function AyahDisplay({
  surahNumber,
  surahName,
  ayahNumber,
  arabicText,
  results,
  hidden = false,
}: {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  arabicText: string;
  results?: WordResult[];
  hidden?: boolean;
}) {
  const words = arabicText.split(" ");

  return (
    <div className="rounded-2xl border border-[#E4E0D6] bg-[#FBFAF6] p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-2 text-xs font-medium tracking-wide text-[#8A8474]">
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#D9D2BE] text-[10px]">
          {ayahNumber}
        </span>

        <span>
          {surahName} • Аят {ayahNumber}
        </span>
      </div>

      {hidden ? (
        <div className="flex min-h-[180px] flex-col items-center justify-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EFEBDD]">
            <span className="text-2xl text-[#8A8474]">?</span>
          </div>

          <div className="mt-4 text-sm font-medium text-[#111111]">
            Текст скрыт
          </div>

          <div className="mt-1 text-xs text-[#777777]">
            Прочитайте аят по памяти
          </div>
        </div>
      ) : (
        <p
          dir="rtl"
          style={{ fontFamily: "'Amiri', serif" }}
          className="break-words whitespace-normal text-right text-3xl leading-loose"
        >
          {words.map((w, i) => {
            const r = results?.find((res) => res.index === i);

            const color =
              r?.status === "ok"
                ? "#2F6F4E"
                : r?.status === "mismatch"
                ? "#B5502B"
                : r?.status === "missing"
                ? "#A3A3A3"
                : "inherit";

            return (
              <span key={i} style={{ color }} className="mx-1">
                {w}
              </span>
            );
          })}
        </p>
      )}
    </div>
  );
}
