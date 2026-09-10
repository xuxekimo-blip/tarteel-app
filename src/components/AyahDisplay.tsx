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
    <div className="rounded-2xl border border-[#E4E0D6] bg-[#FBFAF6] p-6">
      <div className="mb-3 text-sm text-[#8A8474]">
        Сура {surahNumber} · Аят {ayahNumber}
      </div>
      <p
        dir="rtl"
        className="text-right leading-loose text-3xl"
        style={{ fontFamily: "'Amiri', serif" }}
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
