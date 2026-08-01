import assert from "node:assert/strict";
import test from "node:test";
import {
  compareGuess,
  createDefaultStats,
  createInitialGameState,
  createPossibleRange,
  createRoundState,
  generateRandomInteger,
  normalizeStats,
  narrowPossibleRange,
  recordCompletedGame,
  recordValidGuess,
  submitGuess,
  updateBestScore,
  validateGuess,
} from "../src/game.js";
import { loadStats, saveStats, STATS_STORAGE_KEY } from "../src/storage.js";

test("random answers are always integers from 1 through 100", () => {
  const generated = Array.from({ length: 1000 }, (_, index) => generateRandomInteger(() => index / 1000));

  assert.equal(generateRandomInteger(() => 0), 1);
  assert.equal(generateRandomInteger(() => 0.999999999), 100);
  assert.equal(generateRandomInteger(() => 1), 100);
  assert.equal(generateRandomInteger(() => -1), 1);
  assert.equal(generateRandomInteger(() => Number.NaN), 1);
  assert.equal(generated.every((value) => Number.isInteger(value)), true);
  assert.equal(generated.every((value) => value >= 1 && value <= 100), true);
});

test("new round starts with a clean playing state", () => {
  const round = createRoundState(() => 0.5);

  assert.equal(round.answer, 51);
  assert.equal(round.input, "");
  assert.equal(round.guessCount, 0);
  assert.deepEqual([...round.guessedNumbers], []);
  assert.equal(round.status, "playing");
  assert.equal(round.lastResult, null);
  assert.deepEqual(round.possibleRange, createPossibleRange());
});

test("possible range narrows after each valid directional guess", () => {
  const round = createRoundState(() => 0.5);
  const tooSmall = submitGuess(round, "40");
  const tooLarge = submitGuess(tooSmall.round, "80");
  const winning = submitGuess(tooLarge.round, "51");

  assert.deepEqual(tooSmall.round.possibleRange, { min: 41, max: 100 });
  assert.deepEqual(tooLarge.round.possibleRange, { min: 41, max: 79 });
  assert.deepEqual(winning.round.possibleRange, { min: 51, max: 51 });
  assert.deepEqual(narrowPossibleRange(undefined, 40, "tooSmall"), { min: 41, max: 100 });
});

test("initial game state starts on the home view with medium keypad", () => {
  const state = createInitialGameState();

  assert.equal(state.view, "home");
  assert.equal(state.round, null);
  assert.equal(state.keypadSize, "medium");
  assert.deepEqual(state.stats, createDefaultStats());
});

test("input validation handles the complete invalid and valid matrix", () => {
  const round = createRoundState(() => 0.5);
  const cases = [
    ["", "empty"],
    ["   ", "empty"],
    ["0", "outOfRange"],
    ["1", true],
    ["100", true],
    ["101", "outOfRange"],
    ["-1", "notInteger"],
    ["1.5", "notInteger"],
    ["abc", "notInteger"],
    ["12abc", "notInteger"],
  ];

  for (const [input, expected] of cases) {
    const result = validateGuess(input, round);
    if (expected === true) {
      assert.equal(result.valid, true, `expected ${input} to be valid`);
    } else {
      assert.equal(result.reason, expected, `expected ${input} to be ${expected}`);
    }
  }
});

test("duplicate guesses are invalid and preserve the round", () => {
  const round = createRoundState(() => 0.5);
  const first = submitGuess(round, "12");
  const duplicate = submitGuess(first.round, "12");

  assert.equal(first.didCount, true);
  assert.equal(duplicate.didCount, false);
  assert.equal(duplicate.validation.reason, "duplicate");
  assert.equal(duplicate.round, first.round);
  assert.equal(duplicate.round.guessCount, 1);
});

test("invalid submissions do not mutate the round or count", () => {
  const round = createRoundState(() => 0.5);

  for (const input of ["", "0", "101", "1.5", "letters"]) {
    const outcome = submitGuess(round, input);

    assert.equal(outcome.didCount, false);
    assert.equal(outcome.round, round);
    assert.equal(round.guessCount, 0);
    assert.deepEqual([...round.guessedNumbers], []);
  }
});

test("comparison returns too small, too large, or correct", () => {
  assert.equal(compareGuess(10, 50), "tooSmall");
  assert.equal(compareGuess(90, 50), "tooLarge");
  assert.equal(compareGuess(50, 50), "correct");
});

test("the 1 and 100 answer boundaries can both be solved", () => {
  const lowRound = createRoundState(() => 0);
  const highRound = createRoundState(() => 0.999999999);

  assert.equal(lowRound.answer, 1);
  assert.equal(submitGuess(lowRound, "1").result, "correct");
  assert.equal(highRound.answer, 100);
  assert.equal(submitGuess(highRound, "100").result, "correct");
});

test("valid submissions count and record the final correct guess", () => {
  const round = createRoundState(() => 0.49);
  const first = submitGuess(round, "40");
  const winning = submitGuess(first.round, "50");

  assert.equal(first.didCount, true);
  assert.equal(first.result, "tooSmall");
  assert.equal(winning.didCount, true);
  assert.equal(winning.result, "correct");
  assert.equal(winning.round.guessCount, 2);
  assert.deepEqual([...winning.round.guessedNumbers], [40, 50]);
});

test("completed rounds reject a second submission", () => {
  const round = createRoundState(() => 0.49);
  const winning = submitGuess(round, "50");
  const repeated = submitGuess(winning.round, "50");

  assert.equal(winning.round.status, "completed");
  assert.equal(repeated.didCount, false);
  assert.equal(repeated.validation.reason, "notPlaying");
});

test("completion is settled once even when a repeated submit is attempted", () => {
  const round = createRoundState(() => 0.49);
  const firstOutcome = submitGuess(round, "50");
  let stats = recordValidGuess(createDefaultStats());

  if (firstOutcome.result === "correct") {
    stats = recordCompletedGame(stats, firstOutcome.round.guessCount);
  }

  const repeatedOutcome = submitGuess(firstOutcome.round, "50");
  if (repeatedOutcome.didCount) {
    stats = recordCompletedGame(recordValidGuess(stats), repeatedOutcome.round.guessCount);
  }

  assert.equal(repeatedOutcome.didCount, false);
  assert.equal(stats.completedGames, 1);
  assert.equal(stats.totalGuesses, 1);
  assert.equal(stats.bestScore, 1);
});

test("best score is created, lowered, and preserved correctly", () => {
  assert.equal(updateBestScore(null, 4), 4);
  assert.equal(updateBestScore(4, 2), 2);
  assert.equal(updateBestScore(2, 2), 2);
  assert.equal(updateBestScore(2, 7), 2);
  assert.equal(updateBestScore("invalid", 3), 3);
  assert.equal(updateBestScore(2, 0), 2);
});

test("stats record valid guesses and completion independently", () => {
  const afterGuess = recordValidGuess(createDefaultStats());
  const afterWin = recordCompletedGame(afterGuess, 3);

  assert.deepEqual(afterWin, {
    version: 1,
    completedGames: 1,
    totalGuesses: 1,
    bestScore: 3,
  });
});

test("three completed rounds and one abandoned round preserve exact statistics", () => {
  let stats = createDefaultStats();

  const playRound = (answer, guesses) => {
    let round = createRoundState(() => (answer - 1) / 100);

    for (const guess of guesses) {
      const outcome = submitGuess(round, String(guess));
      assert.equal(outcome.didCount, true);
      stats = recordValidGuess(stats);
      round = outcome.round;
    }

    assert.equal(round.status, "completed");
    stats = recordCompletedGame(stats, round.guessCount);
  };

  playRound(50, [1, 2, 3, 4, 50]);
  playRound(50, [1, 2, 3, 4, 5, 6, 7, 50]);
  playRound(50, [1, 2, 50]);

  let abandonedRound = createRoundState(() => 0.49);
  const abandonedGuess = submitGuess(abandonedRound, "1");
  assert.equal(abandonedGuess.didCount, true);
  stats = recordValidGuess(stats);
  abandonedRound = abandonedGuess.round;
  assert.equal(submitGuess(abandonedRound, "1").didCount, false);

  assert.deepEqual(stats, {
    version: 1,
    completedGames: 3,
    totalGuesses: 17,
    bestScore: 3,
  });
});

test("stats normalization handles normal, missing, invalid, and unknown data", () => {
  assert.deepEqual(normalizeStats({
    version: 1,
    completedGames: 2,
    totalGuesses: 9,
    bestScore: 4,
  }), { version: 1, completedGames: 2, totalGuesses: 9, bestScore: 4 });

  assert.deepEqual(normalizeStats({ version: 1, completedGames: 2 }), {
    version: 1,
    completedGames: 2,
    totalGuesses: 0,
    bestScore: null,
  });

  assert.deepEqual(normalizeStats({
    version: 1,
    completedGames: -1,
    totalGuesses: Number.NaN,
    bestScore: "fast",
  }), createDefaultStats());

  assert.deepEqual(normalizeStats({ version: 0, completedGames: 99, totalGuesses: 99, bestScore: 1 }), createDefaultStats());
  assert.deepEqual(normalizeStats({ version: 999, completedGames: 99, totalGuesses: 99, bestScore: 1 }), createDefaultStats());
  assert.deepEqual(normalizeStats(null), createDefaultStats());
});

test("storage handles no data, normal data, malformed JSON, and unavailable storage", () => {
  const emptyStorage = {
    getItem() {
      return null;
    },
  };
  const malformedStorage = {
    getItem() {
      return "{not-json";
    },
  };
  const throwingStorage = {
    getItem() {
      throw new Error("storage unavailable");
    },
    setItem() {
      throw new Error("storage unavailable");
    },
  };
  const memoryStorage = new Map([[STATS_STORAGE_KEY, JSON.stringify({
    version: 1,
    completedGames: 3,
    totalGuesses: 14,
    bestScore: 4,
  })]]);
  const workingStorage = {
    getItem(key) {
      return memoryStorage.get(key) ?? null;
    },
    setItem(key, value) {
      memoryStorage.set(key, value);
    },
  };

  assert.deepEqual(loadStats(emptyStorage), createDefaultStats());
  assert.deepEqual(loadStats(malformedStorage), createDefaultStats());
  assert.deepEqual(loadStats(throwingStorage), createDefaultStats());
  assert.deepEqual(loadStats(workingStorage), { version: 1, completedGames: 3, totalGuesses: 14, bestScore: 4 });

  const saved = saveStats({ completedGames: 2, totalGuesses: 5, bestScore: 3 }, workingStorage);
  assert.deepEqual(saved, { version: 1, completedGames: 2, totalGuesses: 5, bestScore: 3 });
  assert.match(memoryStorage.get(STATS_STORAGE_KEY), /"version":1/);
  assert.deepEqual(saveStats({ completedGames: 1 }, throwingStorage), {
    version: 1,
    completedGames: 1,
    totalGuesses: 0,
    bestScore: null,
  });
});
