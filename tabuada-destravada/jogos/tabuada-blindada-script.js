/* ==============================================================
   TABUADA BLINDADA INTERATIVA - SISTEMA COMPLETO
   ==============================================================
   JavaScript ES6+ modular com:
   - Sistema de áudio via Web Audio API
   - Mecânica de jogo com repetição espaçada
   - Gamificação (XP, moedas, estrelas, níveis, conquistas)
   - Estatísticas e ranking local
   - Gerenciamento de temas e acessibilidade
   - Confetes animados
   - Persistência via localStorage
   ============================================================== */

/* ==============================================================
   MODO ESTRITO - Boas práticas ES6+
   ============================================================== */
'use strict';

/* ==============================================================
   CONSTANTES GLOBAIS
   ============================================================== */
const STORAGE_KEY = 'tabuada-blindada-data';
const SOUND_PREF_KEY = 'tabuada-blindada-sound';
const THEME_KEY = 'tabuada-blindada-theme';
const FONT_KEY = 'tabuada-blindada-font';
const SESSION_QUESTIONS = 10;  // Perguntas por sessão
const XP_PER_CORRECT = 10;
const COINS_PER_CORRECT = 5;
const STREAK_BONUS_MULTIPLIER = 2;
const LEVEL_BASE_XP = 100;
const LEVEL_XP_INCREASE = 50;

/* ==============================================================
   NOMES DAS OPERAÇÕES E SEUS SÍMBOLOS
   ============================================================== */
const OPERATIONS = {
  multiplicacao: { simbolo: '×', nome: 'Multiplicação' },
  divisao:       { simbolo: '÷', nome: 'Divisão' },
  soma:          { simbolo: '+', nome: 'Adição' },
  subtracao:     { simbolo: '−', nome: 'Subtração' }
};

/* ==============================================================
   CONFIGURAÇÕES DE DIFICULDADE
   ============================================================== */
const DIFFICULTY = {
  facil:  { label: 'Fácil',   maxNum: 5,  timeBonus: 30 },
  medio:  { label: 'Médio',   maxNum: 10, timeBonus: 20 },
  dificil:{ label: 'Difícil', maxNum: 15, timeBonus: 15 }
};

/* ==============================================================
   DEFINIÇÕES DAS CONQUISTAS
   ============================================================== */
const ACHIEVEMENTS = [
  { id: 'first_correct',  icon: '🎯', name: 'Primeiro Acerto!',      desc: 'Acertar a primeira pergunta',            check: s => s.totalCorrect >= 1 },
  { id: 'ten_correct',    icon: '⭐', name: 'Aprendiz',               desc: 'Acertar 10 perguntas',                    check: s => s.totalCorrect >= 10 },
  { id: 'fifty_correct',  icon: '🌟', name: 'Matemático',             desc: 'Acertar 50 perguntas',                    check: s => s.totalCorrect >= 50 },
  { id: 'hundred_correct',icon: '💫', name: 'Gênio',                  desc: 'Acertar 100 perguntas',                   check: s => s.totalCorrect >= 100 },
  { id: 'streak_3',       icon: '🔥', name: 'Sequência 3',            desc: 'Acertar 3 seguidas',                      check: s => s.bestStreak >= 3 },
  { id: 'streak_7',       icon: '🔥', name: 'Sequência 7',            desc: 'Acertar 7 seguidas',                      check: s => s.bestStreak >= 7 },
  { id: 'streak_15',      icon: '🔥', name: 'Imparável',              desc: 'Acertar 15 seguidas',                     check: s => s.bestStreak >= 15 },
  { id: 'level_5',        icon: '🏅', name: 'Dedicado',               desc: 'Alcançar o nível 5',                      check: s => s.level >= 5 },
  { id: 'level_10',       icon: '🏆', name: 'Mestre',                 desc: 'Alcançar o nível 10',                     check: s => s.level >= 10 },
  { id: 'all_operations', icon: '🌈', name: 'Versátil',               desc: 'Praticar todas as 4 operações',           check: s => Object.keys(s.operationsPlayed || {}).length >= 4 },
  { id: 'perfect_session',icon: '💎', name: 'Sessão Perfeita',        desc: '100% de acerto em uma sessão de 10',      check: s => s.perfectSessions >= 1 },
  { id: 'coins_100',      icon: '🪙', name: 'Colecionador',           desc: 'Acumular 100 moedas',                     check: s => s.totalCoins >= 100 },
  { id: 'master_mult',    icon: '✅', name: 'Mestre da Multiplicação',desc: '90%+ em multiplicação (50 perguntas)',     check: s => (s.opsStats?.multiplicacao?.total || 0) >= 50 && (s.opsStats?.multiplicacao?.rate || 0) >= 90 },
  { id: 'daily_7',        icon: '📅', name: 'Compromisso',            desc: 'Treinar por 7 dias seguidos',             check: s => s.dailyStreak >= 7 },
];

/* ==============================================================
   ESTADO GLOBAL DA APLICAÇÃO
   ============================================================== */
const state = {
  // --- Config do jogador ---
  operation: 'multiplicacao',
  difficulty: 'facil',

  // --- Estatísticas do jogador (persistidas) ---
  xp: 0,
  level: 1,
  coins: 0,
  totalCorrect: 0,
  totalWrong: 0,
  currentStreak: 0,
  bestStreak: 0,
  dailyStreak: 0,
  perfectSessions: 0,
  totalCoins: 0,
  lastPlayedDate: null,
  // Estatísticas por operação
  opsStats: {
    multiplicacao: { correct: 0, wrong: 0, total: 0, rate: 0 },
    divisao:       { correct: 0, wrong: 0, total: 0, rate: 0 },
    soma:          { correct: 0, wrong: 0, total: 0, rate: 0 },
    subtracao:     { correct: 0, wrong: 0, total: 0, rate: 0 }
  },
  operationsPlayed: {},
  // Conquistas
  achievements: {},
  // Ranking das operações dominadas
  operationsMastered: [],

  // --- Estado da sessão atual ---
  sessionQuestions: [],
  sessionIndex: 0,
  sessionCorrect: 0,
  sessionWrong: 0,
  sessionStartTime: null,
  sessionTotalTime: 0,
  sessionXP: 0,
  sessionCoins: 0,
  consecutiveCorrect: 0,
  showingFeedback: false,
  isAnswered: false,

  // --- Repetição Espaçada (Spaced Repetition) ---
  // Cada item: { a, b, op, box (1-5), nextReview (timestamp) }
  srItems: [],

  // --- Config ---
  volume: 0.7,
  soundEnabled: true,
  ambientEnabled: false,
  timerEnabled: true,
  animationsEnabled: true,
  reducedMotion: false,

  // --- Temporizador ---
  timerInterval: null,
  timerSeconds: 0
};

/* ==============================================================
   DOM REFERENCES - Armazena referências aos elementos da UI
   ============================================================== */
const DOM = {};

/* ==============================================================
   INICIALIZAÇÃO - PONTO DE ENTRADA
   ============================================================== */
document.addEventListener('DOMContentLoaded', () => {
  cacheDOM();
  loadPreferences();
  loadState();
  updateDailyStreak();
  setupEventListeners();
  showSplashAndStart();
});

/* ==============================================================
   CACHE DE ELEMENTOS DOM
   ============================================================== */
function cacheDOM() {
  DOM.splash = document.getElementById('splash-screen');
  DOM.splashBar = document.getElementById('splash-progress-bar');
  DOM.confettiCanvas = document.getElementById('confetti-canvas');
  DOM.mainContent = document.getElementById('main-content');

  // Telas
  DOM.screenHome = document.getElementById('screen-home');
  DOM.screenGame = document.getElementById('screen-game');
  DOM.screenResults = document.getElementById('screen-results');
  DOM.screenAchievements = document.getElementById('screen-achievements');

  // Home
  DOM.operationCards = document.querySelectorAll('.op-card');
  DOM.difficultyRadios = document.querySelectorAll('input[name="difficulty"]');
  DOM.btnStart = document.getElementById('btn-start');

  // Game
  DOM.btnBackGame = document.getElementById('btn-back-game');
  DOM.questionNumber = document.getElementById('question-number');
  DOM.qNum1 = document.getElementById('q-num1');
  DOM.qOperator = document.getElementById('q-operator');
  DOM.qNum2 = document.getElementById('q-num2');
  DOM.qAnswer = document.getElementById('q-answer');
  DOM.answerInput = document.getElementById('answer-input');
  DOM.btnSubmit = document.getElementById('btn-submit');
  DOM.btnHint = document.getElementById('btn-hint');
  DOM.feedbackArea = document.getElementById('feedback-area');
  DOM.feedbackCorrect = document.getElementById('feedback-correct');
  DOM.feedbackWrong = document.getElementById('feedback-wrong');
  DOM.feedbackCorrectDetail = document.getElementById('feedback-correct-detail');
  DOM.feedbackWrongDetail = document.getElementById('feedback-wrong-detail');
  DOM.correctAnswerDisplay = document.getElementById('correct-answer-display');
  DOM.explanationText = document.getElementById('explanation-text');
  DOM.correctXp = document.getElementById('correct-xp');
  DOM.btnNext = document.getElementById('btn-next');
  DOM.sessionProgressBar = document.getElementById('session-progress-bar');
  DOM.sessionProgressText = document.getElementById('session-progress-text');
  DOM.gameOperation = document.getElementById('game-operation');
  DOM.gameDifficulty = document.getElementById('game-difficulty');
  DOM.gameTimer = document.getElementById('game-timer');
  DOM.timerDisplay = document.getElementById('timer-display');

  // Header
  DOM.xpValue = document.getElementById('xp-value');
  DOM.coinsValue = document.getElementById('coins-value');
  DOM.streakValue = document.getElementById('streak-value');
  DOM.levelBadge = document.getElementById('level-badge');
  DOM.xpBar = document.getElementById('xp-bar');
  DOM.xpText = document.getElementById('xp-text');

  // Sound
  DOM.soundDown = document.getElementById('sound-down');
  DOM.soundToggle = document.getElementById('sound-toggle');
  DOM.soundUp = document.getElementById('sound-up');

  // Settings
  DOM.settingsBtn = document.getElementById('settings-btn');
  DOM.settingsPanel = document.getElementById('settings-panel');
  DOM.settingsOverlay = document.getElementById('settings-overlay');
  DOM.settingsClose = document.getElementById('settings-close');
  DOM.volumeSlider = document.getElementById('volume-slider');
  DOM.ambientToggle = document.getElementById('ambient-toggle');
  DOM.timerToggle = document.getElementById('timer-toggle');
  DOM.animationsToggle = document.getElementById('animations-toggle');
  DOM.reducedMotionToggle = document.getElementById('reduced-motion');
  DOM.themeRadios = document.querySelectorAll('input[name="theme"]');
  DOM.fontDecrease = document.getElementById('font-decrease');
  DOM.fontIncrease = document.getElementById('font-increase');
  DOM.fontCurrent = document.getElementById('font-current');
  DOM.btnResetData = document.getElementById('btn-reset-data');

  // Results
  DOM.resultsIcon = document.getElementById('results-icon');
  DOM.resultsTitle = document.getElementById('results-title');
  DOM.resultsXpGained = document.getElementById('results-xp-gained');
  DOM.resultAcertos = document.getElementById('result-acertos');
  DOM.resultTempo = document.getElementById('result-tempo');
  DOM.resultEstrelas = document.getElementById('result-estrelas');
  DOM.resultMoedas = document.getElementById('result-moedas');
  DOM.resultsTableBody = document.getElementById('results-table-body');
  DOM.btnAgain = document.getElementById('btn-again');
  DOM.btnHomeResults = document.getElementById('btn-home-results');

  // Achievements
  DOM.achievementsGrid = document.getElementById('achievements-grid');
  DOM.rankingList = document.getElementById('ranking-list');
  DOM.btnBackAchievements = document.getElementById('btn-back-achievements');

  // Game header info
  DOM.gameTimer = document.getElementById('game-timer');
}

/* ==============================================================
   FUNÇÕES DE CARREGAMENTO INICIAL
   ============================================================== */

/**
 * Carrega as preferências salvas (som, tema, fonte)
 */
function loadPreferences() {
  try {
    // Preferências de som
    const soundPref = JSON.parse(localStorage.getItem(SOUND_PREF_KEY));
    if (soundPref) {
      state.volume = soundPref.volume ?? 0.7;
      state.soundEnabled = soundPref.soundEnabled ?? true;
      state.ambientEnabled = soundPref.ambientEnabled ?? false;
    }

    // Tema
    const theme = localStorage.getItem(THEME_KEY) || 'claro';
    applyTheme(theme);
    document.querySelector(`input[name="theme"][value="${theme}"]`)?.click();

    // Fonte
    const fontMultiplier = parseFloat(localStorage.getItem(FONT_KEY)) || 1;
    applyFontSize(fontMultiplier);

    // Sincronizar controles
    DOM.volumeSlider.value = state.volume * 100;
    DOM.ambientToggle.checked = state.ambientEnabled;
  } catch (e) {
    console.warn('Erro ao carregar preferências:', e);
  }
}

/**
 * Carrega o estado do jogador do localStorage
 */
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) {
      state.xp = saved.xp || 0;
      state.level = saved.level || 1;
      state.coins = saved.coins || 0;
      state.totalCorrect = saved.totalCorrect || 0;
      state.totalWrong = saved.totalWrong || 0;
      state.currentStreak = saved.currentStreak || 0;
      state.bestStreak = saved.bestStreak || 0;
      state.dailyStreak = saved.dailyStreak || 0;
      state.perfectSessions = saved.perfectSessions || 0;
      state.totalCoins = saved.totalCoins || 0;
      state.lastPlayedDate = saved.lastPlayedDate || null;
      state.opsStats = saved.opsStats || { ...state.opsStats };
      state.operationsPlayed = saved.operationsPlayed || {};
      state.achievements = saved.achievements || {};
      state.operationsMastered = saved.operationsMastered || [];
      state.srItems = saved.srItems || [];
    }
    updateHeaderUI();
  } catch (e) {
    console.warn('Erro ao carregar estado:', e);
  }
}

/**
 * Salva todo o estado no localStorage
 */
function saveState() {
  try {
    const data = {
      xp: state.xp,
      level: state.level,
      coins: state.coins,
      totalCorrect: state.totalCorrect,
      totalWrong: state.totalWrong,
      currentStreak: state.currentStreak,
      bestStreak: state.bestStreak,
      dailyStreak: state.dailyStreak,
      perfectSessions: state.perfectSessions,
      totalCoins: state.totalCoins,
      lastPlayedDate: state.lastPlayedDate,
      opsStats: state.opsStats,
      operationsPlayed: state.operationsPlayed,
      achievements: state.achievements,
      operationsMastered: state.operationsMastered,
      srItems: state.srItems
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Erro ao salvar estado:', e);
  }
}

/**
 * Salva preferências de som
 */
function saveSoundPreferences() {
  try {
    localStorage.setItem(SOUND_PREF_KEY, JSON.stringify({
      volume: state.volume,
      soundEnabled: state.soundEnabled,
      ambientEnabled: state.ambientEnabled
    }));
  } catch (e) {
    console.warn('Erro ao salvar som:', e);
  }
}

/**
 * Atualiza sequência diária
 */
function updateDailyStreak() {
  const today = new Date().toDateString();
  if (state.lastPlayedDate) {
    const last = new Date(state.lastPlayedDate);
    const diff = Math.round((new Date() - last) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      state.dailyStreak++;
    } else if (diff > 1) {
      state.dailyStreak = 0;
    }
    // Se diff === 0 (mesmo dia), mantém
  }
  state.lastPlayedDate = today;
  saveState();
}

/* ==============================================================
   TELA DE SPLASH
   ============================================================== */
function showSplashAndStart() {
  // Anima a barra de progresso
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 15 + 5;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      DOM.splashBar.style.width = '100%';
      setTimeout(() => {
        DOM.splash.classList.add('hidden');
        DOM.splash.setAttribute('hidden', '');
        initAudio();
        renderAchievements();
        renderRanking();
      }, 400);
    }
    DOM.splashBar.style.width = progress + '%';
  }, 150);
}

/* ==============================================================
   SISTEMA DE ÁUDIO (Web Audio API)
   ==============================================================
   Gera todos os sons dinamicamente sem arquivos externos.
   ============================================================== */

let audioCtx = null;
let masterGain = null;
let ambientGain = null;
let ambientOsc = null;
let audioInitialized = false;

/**
 * Inicializa o contexto de áudio (precisa de interação do usuário)
 */
function initAudio() {
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = state.volume;
    masterGain.connect(audioCtx.destination);

    ambientGain = audioCtx.createGain();
    ambientGain.gain.value = 0;
    ambientGain.connect(masterGain);

    audioInitialized = true;
  } catch (e) {
    console.warn('Web Audio API não disponível');
  }
}

/**
 * Retoma o contexto de áudio (necessário em alguns navegadores)
 */
function resumeAudio() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

/**
 * Toca um tom simples
 * @param {number} freq - Frequência em Hz
 * @param {number} duration - Duração em segundos
 * @param {string} type - Tipo de onda (sine, square, sawtooth, triangle)
 * @param {number} volume - Volume relativo (0-1)
 */
function playTone(freq, duration, type = 'sine', volume = 0.3) {
  if (!audioInitialized || !state.soundEnabled || !masterGain) return;
  resumeAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

/**
 * Toca sequência de tons (melodia)
 */
function playSequence(notes, type = 'sine', volume = 0.25) {
  notes.forEach((note, i) => {
    setTimeout(() => playTone(note.freq, note.dur, type, volume), note.start * 1000);
  });
}

/** Som de clique */
function playClickSound() {
  playTone(800, 0.05, 'sine', 0.15);
}

/** Som de acerto - tom ascendente */
function playCorrectSound() {
  playSequence([
    { freq: 523, dur: 0.15, start: 0 },
    { freq: 659, dur: 0.15, start: 0.15 },
    { freq: 784, dur: 0.25, start: 0.3 }
  ], 'sine', 0.25);
}

/** Som de erro - buzz descendente */
function playWrongSound() {
  playTone(300, 0.15, 'sawtooth', 0.2);
  setTimeout(() => playTone(200, 0.3, 'sawtooth', 0.2), 150);
}

/** Som de recompensa - fanfarra */
function playRewardSound() {
  playSequence([
    { freq: 523, dur: 0.12, start: 0 },
    { freq: 659, dur: 0.12, start: 0.12 },
    { freq: 784, dur: 0.12, start: 0.24 },
    { freq: 1047, dur: 0.4, start: 0.36 }
  ], 'sine', 0.3);
}

/** Som de conclusão */
function playCompleteSound() {
  playSequence([
    { freq: 523, dur: 0.15, start: 0 },
    { freq: 587, dur: 0.15, start: 0.15 },
    { freq: 659, dur: 0.15, start: 0.3 },
    { freq: 784, dur: 0.15, start: 0.45 },
    { freq: 1047, dur: 0.5, start: 0.6 }
  ], 'sine', 0.3);
}

/** Inicia música ambiente */
function startAmbientMusic() {
  if (!audioInitialized || ambientOsc) return;
  resumeAudio();
  ambientOsc = audioCtx.createOscillator();
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();

  ambientOsc.type = 'sine';
  ambientOsc.frequency.value = 220;
  lfo.type = 'sine';
  lfo.frequency.value = 0.5;
  lfoGain.gain.value = 30;
  lfo.connect(lfoGain);
  lfoGain.connect(ambientOsc.frequency);
  ambientOsc.connect(ambientGain);
  ambientGain.gain.value = state.ambientEnabled ? 0.08 : 0;
  ambientOsc.start();
  lfo.start();
}

/** Para música ambiente */
function stopAmbientMusic() {
  if (ambientOsc) {
    ambientOsc.stop();
    ambientOsc.disconnect();
    ambientOsc = null;
  }
}

/** Alterna música ambiente */
function toggleAmbient(enable) {
  state.ambientEnabled = enable;
  if (enable && audioInitialized) {
    startAmbientMusic();
    if (ambientGain) ambientGain.gain.value = 0.08;
  } else {
    if (ambientGain) ambientGain.gain.value = 0;
    // Não para o oscilador, apenas silencia - retoma rápido se ativar
  }
  saveSoundPreferences();
}

/** Atualiza o volume mestre */
function updateVolume(value) {
  state.volume = Math.max(0, Math.min(1, value));
  if (masterGain) masterGain.gain.value = state.volume;
  saveSoundPreferences();
}

/** Alterna som ligado/desligado */
function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  saveSoundPreferences();
  updateSoundButtonUI();
  if (state.soundEnabled) playClickSound();
}

/* ==============================================================
   SISTEMA DE CONFETES
   ============================================================== */
let confettiPieces = [];
let confettiAnimId = null;

/**
 * Dispara confetes na tela
 * @param {number} count - Número de partículas
 */
function fireConfetti(count = 80) {
  if (!state.animationsEnabled || state.reducedMotion) return;

  const canvas = DOM.confettiCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Ajusta tamanho do canvas
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Cores vibrantes
  const colors = ['#6C5CE7', '#00CEC9', '#FDCB6E', '#FF7675', '#55EFC4', '#FD79A8', '#74B9FF', '#A29BFE'];

  for (let i = 0; i < count; i++) {
    confettiPieces.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 100,
      w: 6 + Math.random() * 8,
      h: 4 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 3,
      rot: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
      opacity: 1,
      life: 1
    });
  }

  if (!confettiAnimId) animateConfetti(ctx);
}

/** Loop de animação dos confetes */
function animateConfetti(ctx) {
  const canvas = DOM.confettiCanvas;
  if (!canvas) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  confettiPieces = confettiPieces.filter(p => p.life > 0);

  confettiPieces.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05; // gravidade
    p.rot += p.rotSpeed;
    p.life -= 0.005;
    p.opacity = Math.max(0, p.life);

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot * Math.PI / 180);
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  });

  if (confettiPieces.length > 0) {
    confettiAnimId = requestAnimationFrame(() => animateConfetti(ctx));
  } else {
    confettiAnimId = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

/** Para os confetes */
function stopConfetti() {
  if (confettiAnimId) {
    cancelAnimationFrame(confettiAnimId);
    confettiAnimId = null;
  }
  confettiPieces = [];
  const canvas = DOM.confettiCanvas;
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

/* ==============================================================
   GERADOR DE QUESTÕES COM REPETIÇÃO ESPAÇADA
   ==============================================================
   Algoritmo baseado no sistema Leitner modificado:
   - Itens no box 1 são os mais frequentes
   - Itens no box 5 são os mais dominados (raros)
   - Erro move de volta para box 1
   ============================================================== */

/**
 * Gera um par único baseado na operação e dificuldade
 */
function generateQuestionPair(op, difficulty) {
  const cfg = DIFFICULTY[difficulty];
  const max = cfg.maxNum;

  if (op === 'soma') {
    const a = Math.floor(Math.random() * max) + 1;
    const b = Math.floor(Math.random() * max) + 1;
    return { a, b, answer: a + b };
  }

  if (op === 'subtracao') {
    const a = Math.floor(Math.random() * max) + 1;
    const b = Math.floor(Math.random() * max) + 1;
    // Garante resultado não negativo
    const maior = Math.max(a, b);
    const menor = Math.min(a, b);
    return { a: maior, b: menor, answer: maior - menor };
  }

  if (op === 'multiplicacao') {
    const a = Math.floor(Math.random() * max) + 1;
    const b = Math.floor(Math.random() * max) + 1;
    return { a, b, answer: a * b };
  }

  if (op === 'divisao') {
    // Gera divisão exata (sem decimais)
    const b = Math.floor(Math.random() * Math.min(10, max)) + 1;
    const quotient = Math.floor(Math.random() * Math.min(10, max)) + 1;
    const a = b * quotient;
    return { a, b, answer: quotient };
  }

  return { a: 1, b: 1, answer: 1 };
}

/**
 * Gera a string de explicação
 */
function generateExplanation(a, b, op, answer) {
  const opStr = OPERATIONS[op]?.simbolo || '?';
  if (op === 'multiplicacao') {
    return `${a} ${opStr} ${b} = ${answer}, pois ${a} vezes ${b} é igual a ${answer}.`;
  }
  if (op === 'divisao') {
    return `${a} ${opStr} ${b} = ${answer}, pois ${answer} ${OPERATIONS.multiplicacao.simbolo} ${b} = ${a}.`;
  }
  if (op === 'soma') {
    return `${a} ${opStr} ${b} = ${answer}, pois ${a} mais ${b} é igual a ${answer}.`;
  }
  if (op === 'subtracao') {
    return `${a} ${opStr} ${b} = ${answer}, pois ${a} menos ${b} é igual a ${answer}.`;
  }
  return '';
}

/**
 * Prepara as questões da sessão usando repetição espaçada
 */
function prepareSessionQuestions() {
  const questions = [];
  const op = state.operation;
  const diff = state.difficulty;

  // Pega itens do Spaced Repetition para esta operação
  let dueItems = state.srItems.filter(item =>
    item.op === op &&
    item.nextReview <= Date.now()
  );

  // Embaralha itens vencidos e prioriza boxes baixos (mais erros)
  dueItems.sort((a, b) => a.box - b.box);

  // Quantos itens do SR vamos usar (até 60% da sessão)
  const srCount = Math.min(dueItems.length, Math.floor(SESSION_QUESTIONS * 0.6));

  for (let i = 0; i < srCount; i++) {
    const item = dueItems[i];
    questions.push({
      a: item.a,
      b: item.b,
      op: item.op,
      answer: calculateAnswer(item.a, item.b, item.op),
      isSR: true
    });
  }

  // Preenche o restante com questões novas
  while (questions.length < SESSION_QUESTIONS) {
    const pair = generateQuestionPair(op, diff);
    questions.push({
      a: pair.a,
      b: pair.b,
      op: op,
      answer: pair.answer,
      isSR: false
    });
  }

  // Embaralha tudo
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }

  state.sessionQuestions = questions;
  state.sessionIndex = 0;
}

/**
 * Calcula a resposta para uma operação
 */
function calculateAnswer(a, b, op) {
  if (op === 'soma') return a + b;
  if (op === 'subtracao') return a - b;
  if (op === 'multiplicacao') return a * b;
  if (op === 'divisao') return Math.round(a / b);
  return 0;
}

/**
 * Atualiza o sistema de repetição espaçada
 */
function updateSpacedRepetition(a, b, op, correct) {
  // Procura item existente
  let item = state.srItems.find(i => i.a === a && i.b === b && i.op === op);

  if (!item) {
    // Cria novo item
    item = { a, b, op, box: 1, nextReview: Date.now() };
    state.srItems.push(item);
  }

  if (correct) {
    // Sobe de box (máx 5)
    item.box = Math.min(5, item.box + 1);
  } else {
    // Volta para box 1
    item.box = 1;
  }

  // Calcula próximo review baseado no box
  // Box 1: 0 min, Box 2: 1 min, Box 3: 5 min, Box 4: 30 min, Box 5: 120 min
  const delays = [0, 1, 5, 30, 120];
  item.nextReview = Date.now() + (delays[item.box - 1] || 0) * 60 * 1000;

  // Remove itens antigos (box 5 com mais de 7 dias)
  state.srItems = state.srItems.filter(i =>
    !(i.box >= 5 && i.nextReview < Date.now() - 7 * 24 * 60 * 60 * 1000)
  );
}

/* ==============================================================
   LÓGICA DO JOGO
   ============================================================== */

/**
 * Inicia uma nova sessão de jogo
 */
function startGame() {
  prepareSessionQuestions();
  state.sessionCorrect = 0;
  state.sessionWrong = 0;
  state.sessionStartTime = Date.now();
  state.sessionTotalTime = 0;
  state.sessionXP = 0;
  state.sessionCoins = 0;
  state.consecutiveCorrect = 0;
  state.showingFeedback = false;
  state.isAnswered = false;

  // Atualiza interface
  showScreen(DOM.screenGame);
  DOM.gameOperation.textContent = OPERATIONS[state.operation]?.nome || state.operation;
  DOM.gameDifficulty.textContent = DIFFICULTY[state.difficulty]?.label || state.difficulty;

  // Timer
  state.timerSeconds = 0;
  DOM.timerDisplay.textContent = '00:00';
  DOM.gameTimer.hidden = !state.timerEnabled;
  if (state.timerEnabled) {
    startTimer();
  }

  showQuestion();
}

/**
 * Exibe a pergunta atual
 */
function showQuestion() {
  const q = state.sessionQuestions[state.sessionIndex];
  if (!q) {
    endSession();
    return;
  }

  DOM.questionNumber.textContent = `Pergunta ${state.sessionIndex + 1} de ${SESSION_QUESTIONS}`;
  DOM.qNum1.textContent = q.a;
  DOM.qOperator.textContent = OPERATIONS[q.op]?.simbolo || '?';
  DOM.qNum2.textContent = q.b;
  DOM.qAnswer.textContent = '?';
  DOM.qAnswer.className = 'q-answer';
  DOM.answerInput.value = '';
  DOM.answerInput.className = 'answer-input';
  DOM.answerInput.disabled = false;
  DOM.answerInput.focus();
  DOM.btnSubmit.disabled = false;
  DOM.btnSubmit.querySelector('.btn-text').textContent = '✓ Confirmar';
  DOM.feedbackArea.hidden = true;
  DOM.feedbackArea.setAttribute('hidden', '');
  DOM.feedbackCorrect.hidden = true;
  DOM.feedbackWrong.hidden = true;
  DOM.btnHint.hidden = false;
  state.showingFeedback = false;
  state.isAnswered = false;

  // Atualiza progresso
  updateSessionProgress();
}

/**
 * Processa a resposta do usuário
 */
function submitAnswer() {
  if (state.isAnswered || state.showingFeedback) return;

  const q = state.sessionQuestions[state.sessionIndex];
  if (!q) return;

  const userAnswer = parseInt(DOM.answerInput.value, 10);

  if (isNaN(userAnswer)) {
    DOM.answerInput.classList.add('wrong');
    setTimeout(() => DOM.answerInput.classList.remove('wrong'), 500);
    return;
  }

  const correct = userAnswer === q.answer;
  state.isAnswered = true;
  DOM.answerInput.disabled = true;
  DOM.btnSubmit.disabled = true;

  if (correct) {
    handleCorrectAnswer(q, userAnswer);
  } else {
    handleWrongAnswer(q, userAnswer);
  }
}

/**
 * Processa resposta correta
 */
function handleCorrectAnswer(q, userAnswer) {
  state.sessionCorrect++;
  state.totalCorrect++;
  state.consecutiveCorrect++;
  state.currentStreak++;
  if (state.currentStreak > state.bestStreak) {
    state.bestStreak = state.currentStreak;
  }

  // Bônus de sequência
  const streakBonus = Math.floor(state.consecutiveCorrect / 3) * STREAK_BONUS_MULTIPLIER;
  const xpGained = XP_PER_CORRECT + streakBonus;
  state.xp += xpGained;
  state.sessionXP += xpGained;

  const coinsGained = COINS_PER_CORRECT + streakBonus;
  state.coins += coinsGained;
  state.totalCoins += coinsGained;
  state.sessionCoins += coinsGained;

  // Atualiza estatísticas da operação
  updateOperationStats(q.op, true);

  // Repetição espaçada
  updateSpacedRepetition(q.a, q.b, q.op, true);

  // Feedback visual
  DOM.qAnswer.textContent = q.answer;
  DOM.qAnswer.className = 'q-answer correct';
  DOM.answerInput.className = 'answer-input correct';

  showFeedbackCorrect(xpGained);

  // Som
  playCorrectSound();

  // Confete
  fireConfetti(30);

  // Verifica conquistas
  checkAchievements();

  // Sessão perfeita?
  if (state.sessionCorrect + state.sessionWrong === SESSION_QUESTIONS &&
      state.sessionWrong === 0) {
    state.perfectSessions++;
  }

  saveState();
  updateHeaderUI();
}

/**
 * Processa resposta errada
 */
function handleWrongAnswer(q, userAnswer) {
  state.sessionWrong++;
  state.totalWrong++;
  state.consecutiveCorrect = 0;
  state.currentStreak = 0;

  // Atualiza estatísticas da operação
  updateOperationStats(q.op, false);

  // Repetição espaçada (marca como erro)
  updateSpacedRepetition(q.a, q.b, q.op, false);

  // Feedback visual
  DOM.qAnswer.textContent = q.answer;
  DOM.qAnswer.className = 'q-answer wrong';
  DOM.answerInput.className = 'answer-input wrong';

  // Vibração da tela (se suportado)
  if (navigator.vibrate) {
    navigator.vibrate([100, 50, 100]);
  }

  showFeedbackWrong(q);

  // Som
  playWrongSound();

  saveState();
  updateHeaderUI();
}

/**
 * Exibe feedback de acerto
 */
function showFeedbackCorrect(xp) {
  DOM.feedbackCorrect.hidden = false;
  DOM.correctXp.textContent = xp;
  DOM.feedbackArea.hidden = false;
  DOM.feedbackArea.removeAttribute('hidden');
  state.showingFeedback = true;

  // Frases motivacionais variadas
  const phrases = [
    'Resposta correta! 🎉',
    'Mandou bem! 🚀',
    'Você é demais! ⭐',
    'Isso aí! 💪',
    'Perfeito! 🌟',
    'Continue assim! 🔥',
    'Show de bola! ⚽',
    'Matematicamente perfeito! 📐'
  ];
  DOM.feedbackCorrectDetail.textContent = phrases[Math.floor(Math.random() * phrases.length)];
}

/**
 * Exibe feedback de erro
 */
function showFeedbackWrong(q) {
  DOM.feedbackWrong.hidden = false;
  DOM.correctAnswerDisplay.textContent = q.answer;
  DOM.explanationText.textContent = generateExplanation(q.a, q.b, q.op, q.answer);
  DOM.feedbackArea.hidden = false;
  DOM.feedbackArea.removeAttribute('hidden');
  state.showingFeedback = true;
}

/**
 * Avança para a próxima pergunta
 */
function nextQuestion() {
  state.sessionIndex++;
  if (state.sessionIndex >= SESSION_QUESTIONS) {
    endSession();
  } else {
    showQuestion();
  }
}

/**
 * Finaliza a sessão
 */
function endSession() {
  stopTimer();
  playCompleteSound();
  fireConfetti(100);

  state.sessionTotalTime = state.timerSeconds;

  // Calcula estrelas (1-3 baseado em acertos)
  const rate = state.sessionCorrect / SESSION_QUESTIONS;
  let stars = 0;
  if (rate >= 0.9) stars = 3;
  else if (rate >= 0.7) stars = 2;
  else if (rate >= 0.4) stars = 1;

  // Verifica se ganhou nova conquista
  checkAchievements();

  // Atualiza estatísticas da operação jogada
  if (!state.operationsPlayed[state.operation]) {
    state.operationsPlayed[state.operation] = 0;
  }
  state.operationsPlayed[state.operation]++;

  saveState();

  // Mostra tela de resultados
  showResults(stars);
}

/**
 * Mostra tela de resultados
 */
function showResults(stars) {
  showScreen(DOM.screenResults);
  const rate = state.sessionCorrect / SESSION_QUESTIONS;
  const pct = Math.round(rate * 100);

  // Ícone e mensagem baseados no desempenho
  if (pct === 100) {
    DOM.resultsIcon.textContent = '🏆';
    DOM.resultsTitle.textContent = 'Sessão Perfeita!';
  } else if (pct >= 80) {
    DOM.resultsIcon.textContent = '🌟';
    DOM.resultsTitle.textContent = 'Excelente!';
  } else if (pct >= 60) {
    DOM.resultsIcon.textContent = '👍';
    DOM.resultsTitle.textContent = 'Bom trabalho!';
  } else {
    DOM.resultsIcon.textContent = '💪';
    DOM.resultsTitle.textContent = 'Continue praticando!';
  }

  DOM.resultsXpGained.textContent = `+${state.sessionXP} XP`;
  DOM.resultAcertos.textContent = `${pct}%`;
  DOM.resultTempo.textContent = formatTime(state.sessionTotalTime);
  DOM.resultEstrelas.textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
  DOM.resultMoedas.textContent = `🪙 ${state.sessionCoins}`;

  // Tabela de detalhamento
  DOM.resultsTableBody.innerHTML = '';
  Object.entries(state.opsStats).forEach(([op, stats]) => {
    if (stats.total > 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${OPERATIONS[op]?.simbolo || op} ${OPERATIONS[op]?.nome || op}</td>
        <td>${stats.correct}</td>
        <td>${stats.wrong}</td>
        <td>${Math.round(stats.rate)}%</td>
        <td>${stats.rate >= 80 ? '✅ Dominada' : stats.rate >= 50 ? '📖 Em andamento' : '🔴 Crítica'}</td>
      `;
      DOM.resultsTableBody.appendChild(tr);
    }
  });

  // Verifica se subiu de nível
  checkLevelUp();
}

/* ==============================================================
   TIMER
   ============================================================== */
function startTimer() {
  stopTimer();
  state.timerInterval = setInterval(() => {
    state.timerSeconds++;
    DOM.timerDisplay.textContent = formatTime(state.timerSeconds);
  }, 1000);
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ==============================================================
   ESTATÍSTICAS POR OPERAÇÃO
   ============================================================== */
function updateOperationStats(op, correct) {
  if (!state.opsStats[op]) {
    state.opsStats[op] = { correct: 0, wrong: 0, total: 0, rate: 0 };
  }
  const stats = state.opsStats[op];
  stats.total++;
  if (correct) stats.correct++;
  else stats.wrong++;
  stats.rate = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
}

/* ==============================================================
   NÍVEIS
   ============================================================== */
function getXpForLevel(level) {
  return LEVEL_BASE_XP + (level - 1) * LEVEL_XP_INCREASE;
}

function getTotalXpForLevel(level) {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += getXpForLevel(i);
  }
  return total;
}

function checkLevelUp() {
  let leveledUp = false;
  while (state.xp >= getTotalXpForLevel(state.level + 1)) {
    state.level++;
    leveledUp = true;
  }
  if (leveledUp) {
    showLevelUp();
    playRewardSound();
    fireConfetti(150);
    checkAchievements();
  }
  updateHeaderUI();
}

function showLevelUp() {
  // Cria overlay de level up
  const overlay = document.createElement('div');
  overlay.className = 'level-up-overlay';
  overlay.innerHTML = `
    <div class="level-up-content">
      <div class="level-up-icon">🎊</div>
      <div class="level-up-title">LEVEL UP!</div>
      <div class="level-up-text">Você alcançou o <strong>Nível ${state.level}</strong>!</div>
    </div>
  `;
  document.body.appendChild(overlay);

  setTimeout(() => {
    overlay.remove();
  }, 2500);
}

/* ==============================================================
   CONQUISTAS
   ============================================================== */
function checkAchievements() {
  const allData = getAchievementCheckData();
  ACHIEVEMENTS.forEach(ach => {
    if (!state.achievements[ach.id] && ach.check(allData)) {
      // Nova conquista!
      state.achievements[ach.id] = {
        unlocked: true,
        date: new Date().toISOString()
      };
      showNewAchievement(ach);
      playRewardSound();
      state.coins += 20; // Bônus por conquista
      state.xp += 50;
      saveState();
      updateHeaderUI();
    }
  });
}

function getAchievementCheckData() {
  return {
    totalCorrect: state.totalCorrect,
    totalWrong: state.totalWrong,
    bestStreak: state.bestStreak,
    currentStreak: state.currentStreak,
    level: state.level,
    dailyStreak: state.dailyStreak,
    perfectSessions: state.perfectSessions,
    totalCoins: state.totalCoins,
    coins: state.coins,
    operationsPlayed: state.operationsPlayed,
    opsStats: state.opsStats
  };
}

function showNewAchievement(ach) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; top: 80px; right: 20px; z-index: 6000;
    background: var(--bg-secondary); border: 2px solid var(--color-accent);
    border-radius: var(--border-radius-lg); padding: 16px 20px;
    box-shadow: var(--shadow-xl); animation: feedbackIn 0.4s ease;
    max-width: 300px; display: flex; align-items: center; gap: 12px;
  `;
  toast.innerHTML = `
    <span style="font-size:2rem">${ach.icon}</span>
    <div>
      <div style="font-weight:bold;font-size:0.9rem">🏅 Nova Conquista!</div>
      <div style="font-weight:bold">${ach.name}</div>
      <div style="font-size:0.8rem;color:var(--text-secondary)">${ach.desc}</div>
    </div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.5s ease';
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}

function renderAchievements() {
  DOM.achievementsGrid.innerHTML = '';
  ACHIEVEMENTS.forEach(ach => {
    const card = document.createElement('div');
    const unlocked = state.achievements[ach.id]?.unlocked;
    card.className = `achievement-card ${unlocked ? 'unlocked' : 'locked'}`;
    card.innerHTML = `
      <div class="ach-icon">${unlocked ? ach.icon : '🔒'}</div>
      <div class="ach-name">${ach.name}</div>
      <div class="ach-desc">${ach.desc}</div>
      ${unlocked ? '<div style="font-size:0.7rem;color:var(--color-accent);margin-top:4px">✅ Concluído</div>' : ''}
    `;
    card.setAttribute('role', 'listitem');
    DOM.achievementsGrid.appendChild(card);
  });
}

/* ==============================================================
   RANKING LOCAL
   ============================================================== */
function renderRanking() {
  DOM.rankingList.innerHTML = '';

  // Ordena operações por taxa de acerto
  const ops = Object.entries(state.opsStats)
    .filter(([_, s]) => s.total > 0)
    .sort((a, b) => b[1].rate - a[1].rate);

  if (ops.length === 0) {
    DOM.rankingList.innerHTML = '<p style="text-align:center;color:var(--text-tertiary);padding:20px">Nenhuma operação praticada ainda. Comece a treinar!</p>';
    return;
  }

  ops.forEach(([op, stats], i) => {
    const item = document.createElement('div');
    item.className = 'ranking-item';
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`;
    item.innerHTML = `
      <span class="ranking-pos">${medal}</span>
      <span class="ranking-op">${OPERATIONS[op]?.simbolo || op} ${OPERATIONS[op]?.nome || op}</span>
      <span class="ranking-percent">${Math.round(stats.rate)}%</span>
      <span style="font-size:0.8rem;color:var(--text-tertiary)">(${stats.total} perguntas)</span>
    `;
    DOM.rankingList.appendChild(item);
  });
}

/* ==============================================================
   NAVEGAÇÃO ENTRE TELAS
   ============================================================== */
function showScreen(screen) {
  [DOM.screenHome, DOM.screenGame, DOM.screenResults, DOM.screenAchievements].forEach(s => {
    s.hidden = true;
    s.setAttribute('hidden', '');
  });
  screen.hidden = false;
  screen.removeAttribute('hidden');
}

/* ==============================================================
   ATUALIZAÇÃO DA UI DO CABEÇALHO
   ============================================================== */
function updateHeaderUI() {
  DOM.xpValue.textContent = state.xp;
  DOM.coinsValue.textContent = state.coins;
  DOM.streakValue.textContent = state.currentStreak;
  DOM.levelBadge.textContent = `Nível ${state.level}`;

  // Barra de XP
  const currentLevelXp = state.xp - getTotalXpForLevel(state.level);
  const nextLevelXp = getXpForLevel(state.level);
  const pct = Math.min(100, (currentLevelXp / nextLevelXp) * 100);
  DOM.xpBar.style.width = `${pct}%`;
  DOM.xpText.textContent = `${currentLevelXp} / ${nextLevelXp} XP`;

  // Acessibilidade
  DOM.xpBar?.parentElement?.setAttribute('aria-valuenow', Math.round(pct));
}

function updateSessionProgress() {
  const pct = (state.sessionIndex / SESSION_QUESTIONS) * 100;
  DOM.sessionProgressBar.style.setProperty('--progress-width', `${pct}%`);
  DOM.sessionProgressBar?.parentElement?.setAttribute('aria-valuenow', Math.round(pct));
  DOM.sessionProgressText.textContent = `${state.sessionIndex} / ${SESSION_QUESTIONS}`;
}

function updateSoundButtonUI() {
  const svg = DOM.soundToggle.querySelector('svg');
  if (svg) {
    svg.innerHTML = state.soundEnabled
      ? '<path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/>'
      : '<path d="M11 5L6 9H2v6h4l5 4V5zM22 9l-6 6M16 9l6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
  }
}

/* ==============================================================
   TEMA E ACESSIBILIDADE
   ============================================================== */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
}

function applyFontSize(multiplier) {
  document.documentElement.style.setProperty('--font-size-multiplier', multiplier);
  localStorage.setItem(FONT_KEY, String(multiplier));
  const pct = Math.round(multiplier * 100);
  DOM.fontCurrent.textContent = `${pct}%`;
}

/* ==============================================================
   EVENT LISTENERS - Configura todos os eventos da interface
   ============================================================== */
function setupEventListeners() {

  // --- Operações ---
  DOM.operationCards.forEach(card => {
    card.addEventListener('click', () => {
      if (!state.animationsEnabled || state.reducedMotion) {
        // sem som se motion reduzido
      }
      playClickSound();
      DOM.operationCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.operation = card.dataset.operation;
    });

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });

  // --- Dificuldade ---
  DOM.difficultyRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        state.difficulty = radio.value;
        playClickSound();
      }
    });
  });

  // --- Botão iniciar ---
  DOM.btnStart.addEventListener('click', () => {
    playClickSound();
    startGame();
  });

  // --- Botão voltar no jogo ---
  DOM.btnBackGame.addEventListener('click', () => {
    stopTimer();
    playClickSound();
    showScreen(DOM.screenHome);
  });

  // --- Submit resposta ---
  DOM.btnSubmit.addEventListener('click', submitAnswer);

  DOM.answerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitAnswer();
    }
  });

  // --- Botão próxima ---
  DOM.btnNext.addEventListener('click', () => {
    playClickSound();
    nextQuestion();
  });

  // --- Botão dica ---
  DOM.btnHint.addEventListener('click', () => {
    const q = state.sessionQuestions[state.sessionIndex];
    if (!q) return;
    playClickSound();
    const opName = OPERATIONS[q.op]?.nome || q.op;
    DOM.answerInput.placeholder = `Dica: ${q.a} ${OPERATIONS[q.op]?.simbolo} ${q.b} = ?`;
    DOM.answerInput.classList.add('hint-active');
    setTimeout(() => {
      DOM.answerInput.placeholder = '?';
      DOM.answerInput.classList.remove('hint-active');
    }, 3000);
  });

  // --- Controles de som ---
  DOM.soundDown.addEventListener('click', () => {
    state.volume = Math.max(0, state.volume - 0.1);
    updateVolume(state.volume);
    DOM.volumeSlider.value = state.volume * 100;
    playClickSound();
  });

  DOM.soundToggle.addEventListener('click', toggleSound);

  DOM.soundUp.addEventListener('click', () => {
    state.volume = Math.min(1, state.volume + 0.1);
    updateVolume(state.volume);
    DOM.volumeSlider.value = state.volume * 100;
    playClickSound();
  });

  // --- Configurações ---
  DOM.settingsBtn.addEventListener('click', () => {
    playClickSound();
    DOM.settingsPanel.hidden = false;
    DOM.settingsPanel.removeAttribute('hidden');
  });

  function closeSettings() {
    DOM.settingsPanel.hidden = true;
    DOM.settingsPanel.setAttribute('hidden', '');
  }

  DOM.settingsClose.addEventListener('click', () => {
    playClickSound();
    closeSettings();
  });

  DOM.settingsOverlay.addEventListener('click', closeSettings);

  // --- Volume slider ---
  DOM.volumeSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) / 100;
    updateVolume(val);
  });

  // --- Ambient toggle ---
  DOM.ambientToggle.addEventListener('change', (e) => {
    toggleAmbient(e.target.checked);
  });

  // --- Timer toggle ---
  DOM.timerToggle.addEventListener('change', (e) => {
    state.timerEnabled = e.target.checked;
    if (DOM.screenGame.hidden === false) {
      DOM.gameTimer.hidden = !state.timerEnabled;
    }
  });

  // --- Animações toggle ---
  DOM.animationsToggle.addEventListener('change', (e) => {
    state.animationsEnabled = e.target.checked;
  });

  // --- Reduced motion ---
  DOM.reducedMotionToggle.addEventListener('change', (e) => {
    state.reducedMotion = e.target.checked;
    document.documentElement.setAttribute('data-reduced-motion', state.reducedMotion);
  });

  // --- Tema ---
  DOM.themeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        applyTheme(radio.value);
        playClickSound();
      }
    });
  });

  // --- Fonte ---
  let fontSize = parseFloat(localStorage.getItem(FONT_KEY)) || 1;
  DOM.fontDecrease.addEventListener('click', () => {
    fontSize = Math.max(0.75, fontSize - 0.1);
    applyFontSize(fontSize);
    playClickSound();
  });

  DOM.fontIncrease.addEventListener('click', () => {
    fontSize = Math.min(1.5, fontSize + 0.1);
    applyFontSize(fontSize);
    playClickSound();
  });

  // --- Reset dados ---
  DOM.btnResetData.addEventListener('click', () => {
    if (confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SOUND_PREF_KEY);
      localStorage.removeItem(THEME_KEY);
      localStorage.removeItem(FONT_KEY);
      location.reload();
    }
  });

  // --- Resultados: Tentar novamente ---
  DOM.btnAgain.addEventListener('click', () => {
    playClickSound();
    startGame();
  });

  // --- Resultados: Menu ---
  DOM.btnHomeResults.addEventListener('click', () => {
    playClickSound();
    showScreen(DOM.screenHome);
  });

  // --- Achievements nav ---
  // Botão de conquistas no header pode ser adicionado via JS
  // Por enquanto, o header brand volta pra home
  document.querySelector('.header-brand').addEventListener('click', () => {
    playClickSound();
    showScreen(DOM.screenHome);
  });

  // Atalho: clique no brand vai pra home, clique duplo vai pra achievements
  document.querySelector('.header-brand').addEventListener('dblclick', () => {
    playClickSound();
    renderAchievements();
    renderRanking();
    showScreen(DOM.screenAchievements);
  });

  DOM.btnBackAchievements.addEventListener('click', () => {
    playClickSound();
    showScreen(DOM.screenHome);
  });

  // --- Atalhos de teclado globais ---
  document.addEventListener('keydown', (e) => {
    // Esc: voltar / fechar
    if (e.key === 'Escape') {
      if (!DOM.settingsPanel.hidden) {
        closeSettings();
      } else if (!DOM.screenHome.hidden) {
        // Na home, esc não faz nada
      } else if (!DOM.screenAchievements.hidden) {
        showScreen(DOM.screenHome);
      }
    }

    // M: alternar som
    if (e.key === 'm' || e.key === 'M') {
      if (e.target.tagName !== 'INPUT') {
        toggleSound();
      }
    }

    // H: dica (durante o jogo)
    if (e.key === 'h' || e.key === 'H') {
      if (e.target.tagName !== 'INPUT' && !DOM.screenGame.hidden && !state.isAnswered) {
        DOM.btnHint.click();
      }
    }
  });

  // --- Redimensionamento para confetes ---
  window.addEventListener('resize', () => {
    const canvas = DOM.confettiCanvas;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  });

  // --- Prevenção de scroll indesejado em inputs numéricos ---
  DOM.answerInput.addEventListener('wheel', (e) => e.preventDefault());

  // --- Foco no input ao entrar no jogo ---
  const observer = new MutationObserver(() => {
    if (!DOM.screenGame.hidden && !state.isAnswered) {
      setTimeout(() => DOM.answerInput.focus(), 100);
    }
  });
  [DOM.screenGame, DOM.screenHome, DOM.screenResults, DOM.screenAchievements].forEach(s => {
    observer.observe(s, { attributes: true, attributeFilter: ['hidden'] });
  });

  // --- Fechar configurações com Esc (já coberto acima) ---
}

/* ==============================================================
   INICIALIZAÇÃO DO ÁUDIO NA PRIMEIRA INTERAÇÃO
   ============================================================== */
document.addEventListener('click', () => {
  if (!audioInitialized) {
    initAudio();
    updateSoundButtonUI();
  } else {
    resumeAudio();
  }
}, { once: false });

/* ==============================================================
   NOTA: assets/sounds/ e assets/images/ são pastas preparadas
   para futura inclusão de arquivos de áudio e imagens
   externos. Atualmente os sons são gerados via Web Audio API.
   ============================================================== */
console.log('🛡️ Tabuada Blindada carregada com sucesso!');
console.log('💡 Dica: Clique duplo no logo para ver as Conquistas.');
