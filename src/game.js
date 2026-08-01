const MIN_NUMBER = 1;
const MAX_NUMBER = 100;
const STATS_VERSION = 1;

export const GAME_RULES = Object.freeze({
  minNumber: MIN_NUMBER,
  maxNumber: MAX_NUMBER,
});

export const ROUND_STATUSES = Object.freeze({
  ready: "ready",
  playing: "playing",
  completed: "completed",
});

export function createDefaultStats() {
  return {
    version: STATS_VERSION,
    completedGames: 0,
    totalGuesses: 0,
    bestScore: null,
  };
}

export function createInitialGameState(stats = createDefaultStats()) {
  return {
    view: "home",
    round: null,
    keypadSize: "medium",
    stats,
  };
}

export function createRoundState(random = Math.random) {
  const answer = generateRandomInteger(random);

  return {
    answer,
    input: "",
    guessCount: 0,
    guessedNumbers: new Set(),
    status: ROUND_STATUSES.playing,
    lastResult: null,
    possibleRange: createPossibleRange(),
  };
}

export function createPossibleRange() {
  return {
    min: MIN_NUMBER,
    max: MAX_NUMBER,
  };
}

export function narrowPossibleRange(range, guess, result) {
  const currentRange = range ?? createPossibleRange();

  if (result === "tooSmall") {
    return {
      min: Math.max(currentRange.min, guess + 1),
      max: currentRange.max,
    };
  }

  if (result === "tooLarge") {
    return {
      min: currentRange.min,
      max: Math.min(currentRange.max, guess - 1),
    };
  }

  if (result === "correct") {
    return { min: guess, max: guess };
  }

  return { ...currentRange };
}

export function createGameStateWithRound(stats = createDefaultStats(), random = Math.random) {
  return {
    view: "game",
    round: createRoundState(random),
    keypadSize: "medium",
    stats,
  };
}

export function generateRandomInteger(random = Math.random) {
  const randomValue = Number(random());
  const boundedValue = Number.isFinite(randomValue)
    ? Math.min(1 - Number.EPSILON, Math.max(0, randomValue))
    : 0;

  return Math.floor(boundedValue * (MAX_NUMBER - MIN_NUMBER + 1)) + MIN_NUMBER;
}

export function validateGuess(input, round) {
  if (!round || round.status !== ROUND_STATUSES.playing) {
    return { valid: false, reason: "notPlaying", message: "目前沒有進行中的遊戲" };
  }

  if (typeof input !== "string" || input.trim() === "") {
    return { valid: false, reason: "empty", message: "請先輸入一個數字" };
  }

  if (!/^\d+$/.test(input)) {
    return { valid: false, reason: "notInteger", message: "請輸入整數" };
  }

  const guess = Number(input);

  if (!Number.isSafeInteger(guess) || guess < MIN_NUMBER || guess > MAX_NUMBER) {
    return { valid: false, reason: "outOfRange", message: "請輸入 1 到 100 之間的數字" };
  }

  if (round.guessedNumbers.has(guess)) {
    return { valid: false, reason: "duplicate", message: "這個數字已經猜過了" };
  }

  return { valid: true, guess };
}

export function compareGuess(guess, answer) {
  if (guess === answer) {
    return "correct";
  }

  return guess < answer ? "tooSmall" : "tooLarge";
}

export function submitGuess(round, input) {
  const validation = validateGuess(input, round);

  if (!validation.valid) {
    return {
      round,
      validation,
      result: null,
      didCount: false,
    };
  }

  const result = compareGuess(validation.guess, round.answer);
  const guessedNumbers = new Set(round.guessedNumbers);
  guessedNumbers.add(validation.guess);
  const possibleRange = narrowPossibleRange(round.possibleRange, validation.guess, result);

  return {
    round: {
      ...round,
      input: "",
      guessCount: round.guessCount + 1,
      guessedNumbers,
      status: result === "correct" ? ROUND_STATUSES.completed : ROUND_STATUSES.playing,
      lastResult: result,
      possibleRange,
    },
    validation,
    result,
    didCount: true,
  };
}

export function normalizeStats(value) {
  const defaults = createDefaultStats();

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaults;
  }

  if (Object.prototype.hasOwnProperty.call(value, "version") && value.version !== STATS_VERSION) {
    return defaults;
  }

  const completedGames = normalizeNonNegativeInteger(value.completedGames, defaults.completedGames);
  const totalGuesses = normalizeNonNegativeInteger(value.totalGuesses, defaults.totalGuesses);
  const bestScore = normalizeBestScore(value.bestScore);

  return {
    version: STATS_VERSION,
    completedGames,
    totalGuesses,
    bestScore,
  };
}

export function recordValidGuess(stats) {
  const normalized = normalizeStats(stats);

  return {
    ...normalized,
    totalGuesses: normalized.totalGuesses + 1,
  };
}

export function updateBestScore(currentBest, candidate) {
  if (!Number.isSafeInteger(candidate) || candidate < 1) {
    return normalizeBestScore(currentBest);
  }

  if (!Number.isSafeInteger(currentBest) || currentBest < 1) {
    return candidate;
  }

  return Math.min(currentBest, candidate);
}

export function recordCompletedGame(stats, guessCount) {
  const normalized = normalizeStats(stats);

  return {
    ...normalized,
    completedGames: normalized.completedGames + 1,
    bestScore: updateBestScore(normalized.bestScore, guessCount),
  };
}

function normalizeNonNegativeInteger(value, fallback) {
  return Number.isSafeInteger(value) && value >= 0 ? value : fallback;
}

function normalizeBestScore(value) {
  return Number.isSafeInteger(value) && value >= 1 ? value : null;
}
