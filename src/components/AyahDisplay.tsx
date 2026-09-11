"use client";

import type { WordResult } from "@/lib/compare-recitation";

export function AyahDisplay({
  surahNumber,
  ayahNumber,
  arabicText,
  results,
}: {
  surahNumber: number;
  ayahNumber: number;
  arabicText: string;
  results?: WordResult[];
}) {
  const words = arabicText.split(" ");

  return (
    <div className="rounded-2xl border border-[#E4E0D6] bg-[#FBFAF6] p-6 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[#8A8474]">
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#D9D2BE] text-[10px]">
          {ayahNumber}
        </span>
        Сура {surahNumber}
      </div>
      <p
        dir="rtl"
        style={{ fontFamily: "'Amiri', serif" }}
        className="text-right text-3xl leading-loose break-words whitespace-normal"
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
    </div>
  );
}
