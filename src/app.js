import {
  createInitialGameState,
  createRoundState,
  recordCompletedGame,
  recordValidGuess,
  submitGuess,
} from "./game.js";
import { loadStats, saveStats } from "./storage.js";
import { createParticleLayer } from "./particles.js";

const KEYPAD_SIZES = ["small", "medium", "large"];
const KEYPAD_SIZE_LABELS = { small: "小", medium: "中", large: "大" };
const REPEAT_DELAY = 360;
const REPEAT_INTERVAL = 90;

const dom = {
  appShell: document.querySelector(".app-shell"),
  homeScreen: document.querySelector('[data-screen="home"]'),
  gameScreen: document.querySelector('[data-screen="game"]'),
  startGameButton: document.querySelector("#start-game"),
  statsToggle: document.querySelector("#stats-toggle"),
  statsPanel: document.querySelector("#stats-panel"),
  statCompleted: document.querySelector('[data-stat="completed"]'),
  statGuesses: document.querySelector('[data-stat="guesses"]'),
  statBest: document.querySelector('[data-stat="best"]'),
  backHomeButton: document.querySelector("#back-home"),
  guessDisplay: document.querySelector(".guess-display"),
  guessInput: document.querySelector("#guess-input"),
  feedback: document.querySelector("#feedback"),
  feedbackIcon: document.querySelector(".feedback__icon"),
  feedbackMessage: document.querySelector("#feedback-message"),
  guessCount: document.querySelector("#guess-count"),
  keypad: document.querySelector("#keypad"),
  keypadButtons: document.querySelectorAll("[data-key]"),
  keypadSmaller: document.querySelector("#keypad-smaller"),
  keypadLarger: document.querySelector("#keypad-larger"),
  keypadSizeLabel: document.querySelector("#keypad-size-label"),
  leaveDialog: document.querySelector("#leave-dialog"),
  continueGameButton: document.querySelector("#continue-game"),
  confirmLeaveButton: document.querySelector("#confirm-leave"),
  successDialog: document.querySelector("#success-dialog"),
  successAnswer: document.querySelector("#success-answer"),
  successGuessCount: document.querySelector("#success-guess-count"),
  playAgainButton: document.querySelector("#play-again"),
};

const appState = createInitialGameState(loadStats());
const particleLayer = createParticleLayer(document.querySelector("#particle-canvas"));
const repeatState = {
  action: null,
  delayId: null,
  intervalId: null,
  pointerStarted: false,
};
let isViewTransitioning = false;
let lastFocusedElement = null;
let statsCloseHandler = null;
let statsCloseTimeout = null;
let statsTransitionToken = 0;
let homeTransitionFrame = null;
let homeTransitionAnimation = null;
let inputAnimationFrame = null;
let shakeAnimationFrame = null;

function setView(view) {
  appState.view = view;
  const isGameView = view === "game";

  dom.appShell.dataset.view = view;
  dom.homeScreen.hidden = isGameView;
  dom.gameScreen.hidden = !isGameView;

  if (isGameView) {
    dom.gameScreen.classList.remove("screen--enter");
    requestAnimationFrame(() => dom.gameScreen.classList.add("screen--enter"));
    dom.guessInput.focus();
  } else {
    dom.startGameButton.focus();
  }
}

function startNewRound({ transitionFromHome = false } = {}) {
  if (transitionFromHome && isViewTransitioning) {
    return;
  }

  stopRepeating();
  particleLayer.clear();
  appState.view = "game";
  appState.round = createRoundState();
  dom.leaveDialog.hidden = true;
  dom.successDialog.hidden = true;
  dom.gameScreen.inert = false;
  dom.gameScreen.removeAttribute("inert");
  dom.guessInput.disabled = false;
  clearSuccessDisplay();
  setInput("");
  updateRoundDisplay();
  setFeedback("等待你的第一次猜測", "neutral", "◈");

  if (transitionFromHome) {
    isViewTransitioning = true;
    dom.startGameButton.disabled = true;
    dom.homeScreen.classList.add("screen--exit");
    dom.homeScreen.addEventListener("animationend", finishHomeTransition);
    dom.homeScreen.addEventListener("animationcancel", finishHomeTransition);

    const animations = typeof dom.homeScreen.getAnimations === "function"
      ? dom.homeScreen.getAnimations().filter((animation) => animation.animationName === "home-exit")
      : [];

    if (animations.length > 0) {
      homeTransitionAnimation = animations[0];
      homeTransitionAnimation.finished.then(() => finishHomeTransition()).catch(() => finishHomeTransition());
    } else {
      homeTransitionFrame = requestAnimationFrame(() => {
        homeTransitionFrame = null;
        finishHomeTransition();
      });
    }
    return;
  }

  setView("game");
}

function finishHomeTransition(event) {
  if (event?.animationName && event.animationName !== "home-exit") {
    return;
  }

  if (!isViewTransitioning) {
    return;
  }

  dom.homeScreen.removeEventListener("animationend", finishHomeTransition);
  dom.homeScreen.removeEventListener("animationcancel", finishHomeTransition);
  if (homeTransitionFrame !== null) {
    cancelAnimationFrame(homeTransitionFrame);
    homeTransitionFrame = null;
  }
  homeTransitionAnimation = null;
  dom.homeScreen.classList.remove("screen--exit");
  dom.startGameButton.disabled = false;
  isViewTransitioning = false;
  setView("game");
}

function returnToHome() {
  stopRepeating();
  particleLayer.clear();
  appState.round = null;
  dom.leaveDialog.hidden = true;
  dom.successDialog.hidden = true;
  dom.gameScreen.inert = false;
  dom.gameScreen.removeAttribute("inert");
  dom.guessInput.disabled = false;
  clearSuccessDisplay();
  updateStatsDisplay();
  setView("home");
}

function toggleStats() {
  const isExpanded = dom.statsToggle.getAttribute("aria-expanded") === "true";
  dom.statsToggle.setAttribute("aria-expanded", String(!isExpanded));

  if (isExpanded) {
    closeStatsPanel();
  } else {
    openStatsPanel();
  }
}

function openStatsPanel() {
  statsTransitionToken += 1;
  const transitionToken = statsTransitionToken;

  if (statsCloseHandler !== null) {
    dom.statsPanel.removeEventListener("transitionend", statsCloseHandler);
    statsCloseHandler = null;
  }

  if (statsCloseTimeout !== null) {
    window.clearTimeout(statsCloseTimeout);
    statsCloseTimeout = null;
  }

  dom.statsPanel.hidden = false;
  dom.statsPanel.inert = false;
  dom.statsPanel.removeAttribute("inert");
  dom.statsPanel.setAttribute("aria-hidden", "false");
  void dom.statsPanel.offsetHeight;
  if (transitionToken === statsTransitionToken && dom.statsToggle.getAttribute("aria-expanded") === "true") {
    dom.statsPanel.classList.add("stats-panel--open");
  }
}

function closeStatsPanel() {
  statsTransitionToken += 1;
  const transitionToken = statsTransitionToken;

  if (statsCloseHandler !== null) {
    dom.statsPanel.removeEventListener("transitionend", statsCloseHandler);
    statsCloseHandler = null;
  }

  if (statsCloseTimeout !== null) {
    window.clearTimeout(statsCloseTimeout);
    statsCloseTimeout = null;
  }

  dom.statsPanel.classList.remove("stats-panel--open");
  dom.statsPanel.inert = true;
  dom.statsPanel.setAttribute("inert", "");
  dom.statsPanel.setAttribute("aria-hidden", "true");

  const finishClosing = (event) => {
    if (transitionToken !== statsTransitionToken
      || (event && event.propertyName !== "max-height")
      || dom.statsToggle.getAttribute("aria-expanded") === "true") {
      return;
    }

    dom.statsPanel.removeEventListener("transitionend", finishClosing);
    statsCloseHandler = null;
    if (statsCloseTimeout !== null) {
      window.clearTimeout(statsCloseTimeout);
      statsCloseTimeout = null;
    }
    dom.statsPanel.hidden = true;
  };

  statsCloseHandler = finishClosing;
  dom.statsPanel.addEventListener("transitionend", finishClosing);

  const transitionDurations = getComputedStyle(dom.statsPanel).transitionDuration
    .split(",")
    .map((duration) => Number.parseFloat(duration) || 0);
  const longestTransition = Math.max(...transitionDurations, 0);
  statsCloseTimeout = window.setTimeout(
    () => finishClosing(),
    Math.max(50, Math.ceil(longestTransition * 1000) + 80),
  );
}

function setInput(value) {
  if (!appState.round) {
    return;
  }

  appState.round.input = value;
  dom.guessInput.value = value;
  dom.guessDisplay.classList.remove("guess-updated");
  if (inputAnimationFrame !== null) {
    cancelAnimationFrame(inputAnimationFrame);
  }
  inputAnimationFrame = requestAnimationFrame(() => {
    inputAnimationFrame = null;
    dom.guessDisplay.classList.add("guess-updated");
  });
}

function appendDigit(digit) {
  if (!canInteractWithRound() || appState.round.input.length >= 3) {
    return;
  }

  const nextInput = `${appState.round.input}${digit}`;
  if (Number(nextInput) > 100) {
    shakeInput();
    setFeedback("最多只能輸入 100", "error", "!");
    return;
  }

  setInput(nextInput);
}

function removeLastDigit() {
  if (!canInteractWithRound()) {
    return;
  }

  setInput(appState.round.input.slice(0, -1));
}

function clearInput() {
  if (!canInteractWithRound()) {
    return;
  }

  setInput("");
}

function adjustInput(direction) {
  if (!canInteractWithRound()) {
    return;
  }

  const current = appState.round.input === ""
    ? direction > 0 ? 0 : 101
    : Number(appState.round.input);
  const next = Math.min(100, Math.max(1, current + direction));
  setInput(String(next));
}

function submitCurrentGuess() {
  if (!canInteractWithRound()) {
    return;
  }

  const outcome = submitGuess(appState.round, appState.round.input);

  if (!outcome.didCount) {
    setFeedback(outcome.validation.message, "error", "!");
    shakeInput();
    dom.guessInput.focus();
    return;
  }

  appState.round = outcome.round;
  appState.stats = saveStats(recordValidGuess(appState.stats));
  updateRoundDisplay();

  if (outcome.result === "correct") {
    appState.stats = saveStats(recordCompletedGame(appState.stats, appState.round.guessCount));
    showSuccessDialog();
    particleLayer.burst();
    return;
  }

  if (outcome.result === "tooSmall") {
    setFeedback("太小", "too-small", "↓");
  } else {
    setFeedback("太大", "too-large", "↑");
  }

  dom.guessInput.focus();
}

function canInteractWithRound() {
  return appState.view === "game"
    && !isViewTransitioning
    && appState.round?.status === "playing"
    && !isModalOpen();
}

function isModalOpen() {
  return !dom.leaveDialog.hidden || !dom.successDialog.hidden;
}

function setFeedback(message, state, icon) {
  dom.feedback.className = `feedback feedback--${state}`;
  dom.feedbackIcon.textContent = icon;
  dom.feedbackMessage.textContent = message;
  void dom.feedback.offsetWidth;
  dom.feedback.classList.add("feedback--pulse");
}

function updateRoundDisplay() {
  if (!appState.round) {
    return;
  }

  dom.guessInput.value = appState.round.input;
  dom.guessCount.textContent = String(appState.round.guessCount);
}

function updateStatsDisplay() {
  dom.statCompleted.textContent = String(appState.stats.completedGames);
  dom.statGuesses.textContent = String(appState.stats.totalGuesses);
  dom.statBest.textContent = appState.stats.bestScore === null ? "—" : String(appState.stats.bestScore);
}

function setKeypadSize(size) {
  appState.keypadSize = size;
  dom.keypad.classList.remove("keypad--small", "keypad--medium", "keypad--large");
  dom.keypad.classList.add(`keypad--${size}`);
  dom.keypadSizeLabel.textContent = KEYPAD_SIZE_LABELS[size];
  dom.keypadSmaller.disabled = size === KEYPAD_SIZES[0];
  dom.keypadLarger.disabled = size === KEYPAD_SIZES[KEYPAD_SIZES.length - 1];
}

function changeKeypadSize(direction) {
  const currentIndex = KEYPAD_SIZES.indexOf(appState.keypadSize);
  const nextIndex = Math.min(KEYPAD_SIZES.length - 1, Math.max(0, currentIndex + direction));
  setKeypadSize(KEYPAD_SIZES[nextIndex]);
}

function openLeaveDialog() {
  if (appState.round?.status === "completed") {
    returnToHome();
    return;
  }

  if (appState.round?.status !== "playing") {
    returnToHome();
    return;
  }

  lastFocusedElement = document.activeElement;
  dom.leaveDialog.hidden = false;
  dom.continueGameButton.focus();
}

function closeLeaveDialog() {
  dom.leaveDialog.hidden = true;
  const focusTarget = lastFocusedElement instanceof HTMLElement ? lastFocusedElement : dom.backHomeButton;
  lastFocusedElement = null;
  focusTarget.focus();
}

function showSuccessDialog() {
  stopRepeating();
  dom.gameScreen.inert = true;
  dom.gameScreen.setAttribute("inert", "");
  dom.guessInput.disabled = true;
  setFeedback("猜中了", "correct", "✓");
  dom.successAnswer.textContent = String(appState.round.answer);
  dom.successGuessCount.textContent = String(appState.round.guessCount);
  dom.successDialog.hidden = false;
  dom.playAgainButton.focus();
}

function clearSuccessDisplay() {
  dom.successAnswer.textContent = "—";
  dom.successGuessCount.textContent = "0";
}

function handleModalKeyboard(event) {
  if (!isModalOpen()) {
    return;
  }

  const activeDialog = !dom.leaveDialog.hidden
    ? dom.leaveDialog.querySelector('[role="dialog"]')
    : dom.successDialog.querySelector('[role="dialog"]');
  const focusableElements = [...activeDialog.querySelectorAll("button:not(:disabled), [href], input, [tabindex]:not([tabindex='-1'])")];

  if (event.key === "Escape" && !dom.leaveDialog.hidden) {
    event.preventDefault();
    event.stopImmediatePropagation();
    closeLeaveDialog();
    return;
  }

  if (event.key !== "Tab" || focusableElements.length === 0) {
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

function handleKeypadClick(event) {
  const key = event.currentTarget.dataset.key;

  if (key >= "0" && key <= "9") {
    appendDigit(key);
  } else if (key === "clear") {
    clearInput();
  } else if (key === "backspace") {
    removeLastDigit();
  } else if (key === "submit") {
    submitCurrentGuess();
  } else if (key === "increase") {
    handleRepeatClick(() => adjustInput(1));
  } else if (key === "decrease") {
    handleRepeatClick(() => adjustInput(-1));
  }
}

function handleKeyboard(event) {
  if (event.target instanceof HTMLButtonElement && ["Enter", " "].includes(event.key)) {
    return;
  }

  if (event.isComposing || isModalOpen() || isViewTransitioning || appState.view !== "game") {
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    if (!event.repeat) {
      submitCurrentGuess();
    }
    return;
  }

  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    event.preventDefault();
    adjustInput(event.key === "ArrowUp" ? 1 : -1);
    return;
  }

  if (/^\d$/.test(event.key)) {
    event.preventDefault();
    appendDigit(event.key);
    return;
  }

  if (event.key === "Backspace") {
    event.preventDefault();
    removeLastDigit();
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    clearInput();
  }
}

function startRepeating(action) {
  stopRepeating();
  repeatState.action = action;
  repeatState.pointerStarted = true;
  action();
  repeatState.delayId = window.setTimeout(() => {
    repeatState.intervalId = window.setInterval(action, REPEAT_INTERVAL);
  }, REPEAT_DELAY);
}

function stopRepeating({ preservePointer = false } = {}) {
  if (repeatState.delayId !== null) {
    window.clearTimeout(repeatState.delayId);
  }
  if (repeatState.intervalId !== null) {
    window.clearInterval(repeatState.intervalId);
  }

  repeatState.action = null;
  repeatState.delayId = null;
  repeatState.intervalId = null;
  if (!preservePointer) {
    repeatState.pointerStarted = false;
  }
}

function handleRepeatClick(action) {
  if (repeatState.pointerStarted) {
    repeatState.pointerStarted = false;
    return;
  }

  action();
}

function handleRepeatPointerDown(event) {
  if (event.button !== 0 && event.pointerType === "mouse") {
    return;
  }

  event.preventDefault();
  const direction = event.currentTarget.dataset.key === "increase" ? 1 : -1;
  startRepeating(() => adjustInput(direction));
}

function handleRepeatPointerUp() {
  stopRepeating({ preservePointer: true });
}

function handleRepeatPointerLeave() {
  stopRepeating();
}

function shakeInput() {
  dom.guessDisplay.classList.remove("input-shake");
  if (shakeAnimationFrame !== null) {
    cancelAnimationFrame(shakeAnimationFrame);
  }
  shakeAnimationFrame = requestAnimationFrame(() => {
    shakeAnimationFrame = null;
    dom.guessDisplay.classList.add("input-shake");
  });
}

dom.startGameButton.addEventListener("click", () => startNewRound({ transitionFromHome: true }));
dom.statsToggle.addEventListener("click", toggleStats);
dom.backHomeButton.addEventListener("click", openLeaveDialog);
dom.continueGameButton.addEventListener("click", closeLeaveDialog);
dom.confirmLeaveButton.addEventListener("click", returnToHome);
dom.playAgainButton.addEventListener("click", () => startNewRound());
dom.keypadButtons.forEach((button) => button.addEventListener("click", handleKeypadClick));
dom.keypadSmaller.addEventListener("click", () => changeKeypadSize(-1));
dom.keypadLarger.addEventListener("click", () => changeKeypadSize(1));
document.addEventListener("keydown", handleModalKeyboard);
document.addEventListener("keydown", handleKeyboard);

const repeatButtons = [
  dom.keypadSmaller,
  dom.keypadLarger,
  ...[...dom.keypadButtons].filter((button) => ["increase", "decrease"].includes(button.dataset.key)),
];

repeatButtons.slice(2).forEach((button) => {
  button.addEventListener("pointerdown", handleRepeatPointerDown);
  button.addEventListener("pointerup", handleRepeatPointerUp);
  button.addEventListener("pointerleave", handleRepeatPointerLeave);
  button.addEventListener("pointercancel", handleRepeatPointerLeave);
});

window.addEventListener("blur", () => stopRepeating());
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopRepeating();
  }
});

dom.guessDisplay.addEventListener("animationend", () => {
  dom.guessDisplay.classList.remove("input-shake");
  dom.guessDisplay.classList.remove("guess-updated");
});

dom.gameScreen.addEventListener("animationend", (event) => {
  if (event.animationName === "game-enter") {
    dom.gameScreen.classList.remove("screen--enter");
  }
});

dom.statsPanel.inert = true;
dom.statsPanel.setAttribute("inert", "");
dom.statsPanel.setAttribute("aria-hidden", "true");
updateStatsDisplay();
setKeypadSize(appState.keypadSize);
setView(appState.view);
