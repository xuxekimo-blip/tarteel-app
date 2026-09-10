// Нормализация арабского текста: убираем огласовки, унифицируем формы букв,
// чтобы сверка не спотыкалась на диакритике, которую ASR обычно не даёт стабильно.
function normalizeArabic(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, "") // огласовки
    .replace(/[\u0622\u0623\u0625]/g, "\u0627") // алифы с хамзой -> обычный алиф
    .replace(/\u0629/g, "\u0647") // та-марбута -> ха (мягкая сверка)
    .replace(/\u0649/g, "\u064A") // алиф-максура -> я
    .replace(/[^\u0600-\u06FF\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type WordResult = {
  index: number;
  word: string;
  status: "ok" | "mismatch" | "missing";
  heard?: string;
};

/**
 * Сверяет распознанный текст со словами эталонного аята.
 * Это классический word-level alignment (вариант расстояния Левенштейна
 * на уровне слов), не LLM — быстрее, дешевле, детерминированно.
 * Порог совпадения слова через сверку нормализованных строк — при желании
 * можно заменить на расстояние Дамерау-Левенштейна для мягкого допуска опечаток ASR.
 */
export function compareRecitation(referenceText: string, transcript: string) {
  const ref = normalizeArabic(referenceText).split(" ").filter(Boolean);
  const heard = normalizeArabic(transcript).split(" ").filter(Boolean);

  const n = ref.length;
  const m = heard.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = ref[i - 1] === heard[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  // Восстанавливаем путь, чтобы понять, какое слово эталона к какому слову
  // начитки относится (ok/mismatch/missing).
  const results: WordResult[] = [];
  let i = n, j = m;
  const path: { refIdx: number | null; heardIdx: number | null }[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && ref[i - 1] === heard[j - 1] && dp[i][j] === dp[i - 1][j - 1]) {
      path.unshift({ refIdx: i - 1, heardIdx: j - 1 });
      i--; j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      path.unshift({ refIdx: i - 1, heardIdx: j - 1 });
      i--; j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      path.unshift({ refIdx: i - 1, heardIdx: null });
      i--;
    } else {
      path.unshift({ refIdx: null, heardIdx: j - 1 });
      j--;
    }
  }

  for (const step of path) {
    if (step.refIdx === null) continue; // лишнее слово в начитке — пропускаем в отчёте
    const refWord = ref[step.refIdx];
    const heardWord = step.heardIdx !== null ? heard[step.heardIdx] : undefined;
    results.push({
      index: step.refIdx,
      word: refWord,
      status: heardWord === undefined ? "missing" : heardWord === refWord ? "ok" : "mismatch",
      heard: heardWord,
    });
  }

  const score = results.filter((r) => r.status === "ok").length / (results.length || 1);
  return { results, score };
}
