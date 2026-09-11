// Нормализация арабского текста.
// Убираем огласовки и приводим некоторые формы букв к единому виду,
// чтобы проверка не зависела от того, какие диакритические знаки
// распознал или не распознал ASR.
function normalizeArabic(text: string): string {
  return text
    .normalize("NFKD")
    .replace(
      /[\u0610-\u061A\u064B-\u065F\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g,
      ""
    )
    .replace(/[\u0622\u0623\u0625]/g, "\u0627")
    .replace(/\u0629/g, "\u0647")
    .replace(/\u0649/g, "\u064A")
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

type AlignmentStep = {
  refIdx: number | null;
  heardIdx: number | null;
  operation: "match" | "substitute" | "delete" | "insert";
};

/**
 * Сравнивает эталонный аят с распознанной речью.
 *
 * Особенности:
 * - сравнение выполняется по словам;
 * - правильные слова -> ok;
 * - неправильные слова -> mismatch;
 * - пропущенные слова -> missing;
 * - лишние слова из речи не засчитываются как правильные;
 * - при одинаковой стоимости вариантов алгоритм старается
 *   сохранить последующие правильные совпадения.
 */
export function compareRecitation(
  referenceText: string,
  transcript: string
) {
  const ref = normalizeArabic(referenceText)
    .split(" ")
    .filter(Boolean);

  const heard = normalizeArabic(transcript)
    .split(" ")
    .filter(Boolean);

  const n = ref.length;
  const m = heard.length;

  const dp: number[][] = Array.from(
    { length: n + 1 },
    () => new Array(m + 1).fill(0)
  );

  for (let i = 0; i <= n; i++) {
    dp[i][0] = i;
  }

  for (let j = 0; j <= m; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const substitutionCost =
        ref[i - 1] === heard[j - 1] ? 0 : 1;

      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // пропущено слово из эталона
        dp[i][j - 1] + 1, // лишнее слово в записи
        dp[i - 1][j - 1] + substitutionCost // совпадение/замена
      );
    }
  }

  /*
   * Восстанавливаем оптимальный путь.
   *
   * При равной стоимости предпочитаем:
   * 1. точное совпадение;
   * 2. пропуск слова эталона, если это позволяет сохранить
   *    последующие совпадения;
   * 3. лишнее слово;
   * 4. замену.
   */
  const path: AlignmentStep[] = [];

  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    // 1. Точное совпадение
    if (
      i > 0 &&
      j > 0 &&
      ref[i - 1] === heard[j - 1] &&
      dp[i][j] === dp[i - 1][j - 1]
    ) {
      path.unshift({
        refIdx: i - 1,
        heardIdx: j - 1,
        operation: "match",
      });

      i--;
      j--;
      continue;
    }

    // 2. Пропуск слова из эталона
    if (
      i > 0 &&
      dp[i][j] === dp[i - 1][j] + 1
    ) {
      path.unshift({
        refIdx: i - 1,
        heardIdx: null,
        operation: "delete",
      });

      i--;
      continue;
    }

    // 3. Лишнее слово в записи
    if (
      j > 0 &&
      dp[i][j] === dp[i][j - 1] + 1
    ) {
      path.unshift({
        refIdx: null,
        heardIdx: j - 1,
        operation: "insert",
      });

      j--;
      continue;
    }

    // 4. Неправильное слово
    if (
      i > 0 &&
      j > 0 &&
      dp[i][j] === dp[i - 1][j - 1] + 1
    ) {
      path.unshift({
        refIdx: i - 1,
        heardIdx: j - 1,
        operation: "substitute",
      });

      i--;
      j--;
      continue;
    }

    // Защита от неожиданного состояния DP
    break;
  }

  const results: WordResult[] = [];

  for (const step of path) {
    if (step.refIdx === null) {
      // Лишние слова не показываем среди слов аята.
      continue;
    }

    const refWord = ref[step.refIdx];

    if (step.operation === "match") {
      results.push({
        index: step.refIdx,
        word: refWord,
        status: "ok",
        heard: heard[step.heardIdx!],
      });

      continue;
    }

    if (step.operation === "delete") {
      results.push({
        index: step.refIdx,
        word: refWord,
        status: "missing",
      });

      continue;
    }

    results.push({
      index: step.refIdx,
      word: refWord,
      status: "mismatch",
      heard:
        step.heardIdx !== null
          ? heard[step.heardIdx]
          : undefined,
    });
  }

  /*
   * Процент считается от количества слов самого аята.
   *
   * Это важно: лишние слова, которые Whisper случайно услышал,
   * не должны увеличивать или уменьшать количество слов эталона.
   */
  const correctWords = results.filter(
    (r) => r.status === "ok"
  ).length;

  const score = n > 0 ? correctWords / n : 0;

  return {
    results,
    score,
  };
}
