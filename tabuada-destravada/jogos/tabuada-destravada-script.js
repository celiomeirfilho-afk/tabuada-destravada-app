/* ============================================================
   TABUADA DESTRAVADA — script.js
   Lógica completa: 4 módulos, gamificação, áudio, acessibilidade
   ============================================================ */

/* ==================== ESTADO GLOBAL ==================== */
const AppState = {
  /* Dados do usuário */
  user: {
    name: 'Estudante',
    xp: 0,
    coins: 0,
    stars: 0,
    level: 1,
    streak: 0,
    lastPlayDate: null,
    achievements: {}
  },

  /* Módulo 1: Diagnóstico */
  diagnostic: {
    results: {},       /* { '7x8': { time: 1234, correct: true, color: 'green' } } */
    inProgress: false,
    currentIndex: 0,
    questions: [],     /* Array embaralhado de perguntas */
    startTime: null,   /* Timer da pergunta atual */
    totalStartTime: null, /* Timer total da sessão */
    completed: false,
    questionCount: 5,  /* Quantidade de perguntas: 5, 10, 15 ou 20 */
    answered: 0,       /* Perguntas respondidas nesta sessão */
    correctCount: 0,   /* Acertos nesta sessão */
    wrongCount: 0      /* Erros nesta sessão */
  },

  /* Módulo 2: Âncoras */
  anchors: {
    currentAnchor: 1,
    streak: 0,
    totalAnswered: 0,
    allCorrect: false,
    mastered: { 1: false, 2: false, 5: false, 10: false }
  },

  /* Módulo 3: Pontes */
  bridges: {
    currentPonte: null
  },

  /* Módulo 4: Reabilitação */
  rehabilitation: {
    currentVillain: null,
    step: 0,
    attempts: 0
  },

  /* Configurações */
  settings: {
    theme: 'light',
    volume: 0.7,
    muted: false,
    fontSize: 16,
    highContrast: false
  }
};

/* ==================== FATOS DA TABUADA ==================== */
/* Lista dos 100 fatos (1x1 até 10x10) */
const ALL_FACTS = [];
for (let i = 1; i <= 10; i++) {
  for (let j = 1; j <= 10; j++) {
    ALL_FACTS.push({ a: i, b: j, answer: i * j });
  }
}

/* 5 Vilões clássicos */
const VILLAINS = [
  { a: 6, b: 7, emoji: '😈', name: 'O Torturador' },
  { a: 6, b: 8, emoji: '👹', name: 'O Monstro' },
  { a: 7, b: 8, emoji: '🐉', name: 'O Dragão' },
  { a: 7, b: 9, emoji: '💀', name: 'A Caveira' },
  { a: 8, b: 9, emoji: '🦹', name: 'O Vilão Supremo' }
];

/* Conquistas disponíveis */
const ACHIEVEMENTS = [
  { id: 'first_correct', name: 'Primeiro Acerto', desc: 'Acerte sua primeira pergunta', icon: '⭐', condition: (s) => s.user.xp > 0 },
  { id: 'diag_complete', name: 'Diagnóstico Completo', desc: 'Complete o teste dos 3 segundos', icon: '🔬', condition: (s) => s.diagnostic.completed },
  { id: 'anchor_master_1', name: 'Âncora do 1', desc: 'Domine a tabuada do 1', icon: '⚓', condition: (s) => s.anchors.mastered[1] },
  { id: 'anchor_master_2', name: 'Âncora do 2', desc: 'Domine a tabuada do 2', icon: '⚓', condition: (s) => s.anchors.mastered[2] },
  { id: 'anchor_master_5', name: 'Âncora do 5', desc: 'Domine a tabuada do 5', icon: '⚓', condition: (s) => s.anchors.mastered[5] },
  { id: 'anchor_master_10', name: 'Âncora do 10', desc: 'Domine a tabuada do 10', icon: '⚓', condition: (s) => s.anchors.mastered[10] },
  { id: 'all_anchors', name: 'Mestre das Âncoras', desc: 'Domine todas as âncoras', icon: '👑', condition: (s) => Object.values(s.anchors.mastered).every(Boolean) },
  { id: 'level_5', name: 'Estudante Dedicado', desc: 'Alcance o nível 5', icon: '🏆', condition: (s) => s.user.level >= 5 },
  { id: 'level_10', name: 'Gênio Matemático', desc: 'Alcance o nível 10', icon: '🎓', condition: (s) => s.user.level >= 10 },
  { id: 'streak_7', name: 'Sequência de Fogo', desc: 'Jogue 7 dias seguidos', icon: '🔥', condition: (s) => s.user.streak >= 7 },
  { id: 'coins_100', name: 'Cofre Cheio', desc: 'Acumule 100 moedas', icon: '💰', condition: (s) => s.user.coins >= 100 },
  { id: 'villain_slayer', name: 'Caçador de Vilões', desc: 'Reabilite todos os 5 vilões', icon: '🛡️', condition: (s) => {
    return VILLAINS.every(v => {
      const key = `${v.a}x${v.b}`;
      return s.diagnostic.results[key] && s.diagnostic.results[key].correct;
    });
  }}
];

/* Nomes dos níveis */
const LEVEL_NAMES = [
  'Iniciante', 'Aprendiz', 'Estudante', 'Praticante', 'Habilidoso',
  'Avançado', 'Especialista', 'Mestre', 'Gênio', 'Lenda',
  'Titã', 'Supremo', 'Divino', 'Infinito', 'Transcendente'
];

/* ==================== SISTEMA DE ÁUDIO ==================== */
const AudioManager = {
  ctx: null,
  initialized: false,

  /** Inicializa o AudioContext (precisa de interação do usuário) */
  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API não suportada:', e);
    }
  },

  /** Toca uma nota simples */
  playTone(frequency, duration, type = 'sine', volumeMult = 1) {
    if (!this.ctx || AppState.settings.muted) return;
    const vol = AppState.settings.volume * volumeMult;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
    gain.gain.setValueAtTime(vol * 0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  },

  /** Sequência de notas */
  playSequence(notes, interval = 120) {
    notes.forEach((note, i) => {
      setTimeout(() => this.playTone(note.freq, note.dur || 0.15, note.type || 'sine', note.vol || 1), i * interval);
    });
  },

  /* Sons específicos */
  click()    { this.playTone(800, 0.08, 'sine'); },
  correct()  {
    this.playSequence([
      { freq: 523, dur: 0.1 },   /* C5 */
      { freq: 659, dur: 0.1 },   /* E5 */
      { freq: 784, dur: 0.2 }    /* G5 */
    ], 80);
  },
  wrong() {
    this.playSequence([
      { freq: 200, dur: 0.15, type: 'sawtooth' },
      { freq: 150, dur: 0.25, type: 'sawtooth' }
    ], 100);
  },
  reward() {
    this.playSequence([
      { freq: 523, dur: 0.1 },
      { freq: 659, dur: 0.1 },
      { freq: 784, dur: 0.1 },
      { freq: 1047, dur: 0.3 }
    ], 100);
  },
  complete() {
    this.playSequence([
      { freq: 440, dur: 0.15 },
      { freq: 554, dur: 0.15 },
      { freq: 659, dur: 0.15 },
      { freq: 880, dur: 0.4 }
    ], 150);
  },
  levelUp() {
    this.playSequence([
      { freq: 523, dur: 0.12 },
      { freq: 659, dur: 0.12 },
      { freq: 784, dur: 0.12 },
      { freq: 1047, dur: 0.12 },
      { freq: 1319, dur: 0.4 }
    ], 100);
  }
};

/* ==================== CONFETTI ==================== */
const ConfettiManager = {
  container: null,

  init() {
    this.container = document.getElementById('confetti-container');
  },

  /** Dispara confetti colorido */
  burst(count = 60) {
    if (!this.container) return;
    const colors = ['#6C5CE7', '#a29bfe', '#00b894', '#55efc4', '#fdcb6e', '#e17055', '#ff7675', '#d63031'];
    for (let i = 0; i < count; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + '%';
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.width = (Math.random() * 8 + 6) + 'px';
      piece.style.height = (Math.random() * 8 + 6) + 'px';
      piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      piece.style.animationDuration = (Math.random() * 2 + 1.5) + 's';
      piece.style.animationDelay = (Math.random() * 0.5) + 's';
      this.container.appendChild(piece);
    }
    setTimeout(() => { this.container.innerHTML = ''; }, 4000);
  }
};

/* ==================== TOAST ==================== */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.setAttribute('role', 'alert');
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/* ==================== PERSISTÊNCIA (LocalStorage) ==================== */
function saveState() {
  try {
    localStorage.setItem('tabuada_destravada', JSON.stringify(AppState));
  } catch (e) {
    console.warn('Erro ao salvar estado:', e);
  }
}

function loadState() {
  try {
    const saved = localStorage.getItem('tabuada_destravada');
    if (saved) {
      const parsed = JSON.parse(saved);
      /* Merge profundo preservando estrutura */
      mergeDeep(AppState, parsed);
    }
  } catch (e) {
    console.warn('Erro ao carregar estado:', e);
  }
}

function mergeDeep(target, source) {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      mergeDeep(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
}

/* ==================== SISTEMA DE GAMIFICAÇÃO ==================== */
const Gamification = {
  /** XP necessário para subir de nível */
  xpForLevel(level) {
    return level * 200;
  },

  /** Adiciona XP e verifica level-up */
  addXP(amount) {
    AppState.user.xp += amount;
    const needed = this.xpForLevel(AppState.user.level);
    if (AppState.user.xp >= needed) {
      AppState.user.xp -= needed;
      AppState.user.level++;
      this.onLevelUp();
    }
    this.updateUI();
    saveState();
  },

  /** Callback quando sobe de nível */
  onLevelUp() {
    AudioManager.levelUp();
    ConfettiManager.burst(80);
    document.getElementById('levelup-number').textContent = AppState.user.level;
    document.getElementById('levelup-modal').classList.remove('hidden');
    showToast(`Parabéns! Você subiu para o Nível ${AppState.user.level}!`, 'achievement');
    /* Recompensas de level-up */
    AppState.user.coins += 10;
    AppState.user.stars += 5;
  },

  /** Adiciona moedas */
  addCoins(amount) {
    AppState.user.coins += amount;
    this.updateUI();
    saveState();
  },

  /** Adiciona estrelas */
  addStars(amount) {
    AppState.user.stars += amount;
    this.updateUI();
    saveState();
  },

  /** Atualiza streak diário */
  updateStreak() {
    const today = new Date().toDateString();
    if (AppState.user.lastPlayDate === today) return;
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (AppState.user.lastPlayDate === yesterday) {
      AppState.user.streak++;
    } else if (AppState.user.lastPlayDate !== today) {
      AppState.user.streak = 1;
    }
    AppState.user.lastPlayDate = today;
    saveState();
  },

  /** Verifica e desbloqueia conquistas */
  checkAchievements() {
    ACHIEVEMENTS.forEach(ach => {
      if (!AppState.user.achievements[ach.id] && ach.condition(AppState)) {
        AppState.user.achievements[ach.id] = true;
        showToast(`Conquista desbloqueada: ${ach.icon} ${ach.name}!`, 'achievement');
        AudioManager.reward();
      }
    });
    saveState();
  },

  /** Atualiza toda a UI de gamificação */
  updateUI() {
    document.getElementById('stat-xp').textContent = AppState.user.xp;
    document.getElementById('stat-coins').textContent = AppState.user.coins;
    document.getElementById('stat-stars').textContent = AppState.user.stars;
    document.getElementById('stat-streak').textContent = AppState.user.streak;
    document.getElementById('stat-level').textContent = AppState.user.level;

    const needed = this.xpForLevel(AppState.user.level);
    const pct = Math.min((AppState.user.xp / needed) * 100, 100);
    document.getElementById('progress-fill').style.width = pct + '%';
    document.getElementById('progress-percent').textContent = Math.round(pct) + '%';
    document.getElementById('stat-xp-next').textContent = needed - AppState.user.xp;

    const levelName = LEVEL_NAMES[Math.min(AppState.user.level - 1, LEVEL_NAMES.length - 1)];
    document.getElementById('user-greeting').textContent = `${AppState.user.name} (${levelName})`;
  }
};

/* ==================== NAVEGAÇÃO ==================== */
const Navigation = {
  currentPage: 'dashboard',

  init() {
    /* Links da sidebar */
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigate(link.dataset.page);
        AudioManager.click();
      });
    });

    /* Cards de módulo no dashboard */
    document.querySelectorAll('.module-card').forEach(card => {
      card.addEventListener('click', () => {
        this.navigate(card.dataset.module);
        AudioManager.click();
      });
    });

    /* Hamburger mobile */
    const hamburger = document.getElementById('btn-hamburger');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
      const isOpen = sidebar.classList.contains('open');
      hamburger.setAttribute('aria-expanded', isOpen);
      overlay.setAttribute('aria-hidden', !isOpen);
    });

    overlay.addEventListener('click', () => {
      hamburger.classList.remove('active');
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
      overlay.setAttribute('aria-hidden', 'true');
    });
  },

  navigate(page) {
    this.currentPage = page;
    /* Atualizar links ativos */
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`.nav-link[data-page="${page}"]`);
    if (activeLink) activeLink.classList.add('active');

    /* Mostrar página */
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) {
      pageEl.classList.remove('active');
      /* Forçar reflow para reiniciar animação */
      void pageEl.offsetWidth;
      pageEl.classList.add('active');
    }

    /* Fechar sidebar no mobile */
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('active');
    document.getElementById('btn-hamburger').classList.remove('active');

    /* Scroll to top */
    window.scrollTo({ top: 0, behavior: 'smooth' });

    /* Atualizar conteúdo dinâmico */
    if (page === 'conquistas') this.renderConquistas();
    if (page === 'reabilitacao') this.renderVillains();
    if (page === 'painel-pais') this.renderPainelPais();
  },

  renderConquistas() {
    const grid = document.getElementById('achievements-grid');
    grid.innerHTML = '';
    ACHIEVEMENTS.forEach(ach => {
      const unlocked = !!AppState.user.achievements[ach.id];
      const card = document.createElement('div');
      card.className = `achievement-card ${unlocked ? 'unlocked' : ''}`;
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'article');
      card.innerHTML = `
        <div class="achievement-icon">${unlocked ? ach.icon : '🔒'}</div>
        <div class="achievement-info">
          <h3>${ach.name}</h3>
          <p>${ach.desc}</p>
        </div>`;
      grid.appendChild(card);
    });

    /* Ranking local */
    const tbody = document.getElementById('ranking-tbody');
    const players = [
      { name: AppState.user.name, xp: getTotalXP(), level: AppState.user.level },
      { name: 'Professor', xp: 2400, level: 12 },
      { name: 'Ana', xp: 1800, level: 9 },
      { name: 'Pedro', xp: 1200, level: 6 },
      { name: 'Maria', xp: 600, level: 3 }
    ];
    players.sort((a, b) => b.xp - a.xp);
    tbody.innerHTML = '';
    players.forEach((p, i) => {
      const isCurrent = p.name === AppState.user.name && p.xp === getTotalXP();
      const tr = document.createElement('tr');
      if (isCurrent) tr.className = 'current-player';
      tr.innerHTML = `<td>${i + 1}º</td><td>${p.name}</td><td>${p.xp} XP</td><td>Nv. ${p.level}</td>`;
      tbody.appendChild(tr);
    });
  },

  renderPainelPais() {
    const results = AppState.diagnostic.results;
    const mastered = AppState.anchors.mastered;
    const totalFacts = 100;
    const testedFacts = Object.keys(results).length;
    const correctFacts = Object.values(results).filter(r => r.correct).length;
    const greenFacts = Object.values(results).filter(r => r.color === 'green').length;
    const yellowFacts = Object.values(results).filter(r => r.color === 'yellow').length;
    const redFacts = Object.values(results).filter(r => r.color === 'red').length;
    const masteredCount = Object.values(mastered).filter(Boolean).length;
    const rehabVillains = VILLAINS.filter(v => {
      const key = `${v.a}x${v.b}`;
      return results[key] && results[key].correct;
    }).length;

    /* Tempo médio */
    const times = Object.values(results).map(r => r.time).filter(t => t > 0);
    const avgTime = times.length > 0 ? (times.reduce((a, b) => a + b, 0) / times.length / 1000).toFixed(1) : '--';

    /* Resumo geral */
    const summaryGrid = document.getElementById('parent-summary-grid');
    summaryGrid.innerHTML = `
      <div class="parent-summary-card">
        <span class="parent-summary-icon">📊</span>
        <span class="parent-summary-value">${testedFacts}/${totalFacts}</span>
        <span class="parent-summary-label">Fatos Testados</span>
      </div>
      <div class="parent-summary-card">
        <span class="parent-summary-icon">✅</span>
        <span class="parent-summary-value">${correctFacts}</span>
        <span class="parent-summary-label">Acertos</span>
      </div>
      <div class="parent-summary-card">
        <span class="parent-summary-icon">⚡</span>
        <span class="parent-summary-value">${avgTime}s</span>
        <span class="parent-summary-label">Tempo Médio</span>
      </div>
      <div class="parent-summary-card">
        <span class="parent-summary-icon">⚓</span>
        <span class="parent-summary-value">${masteredCount}/4</span>
        <span class="parent-summary-label">Âncoras Dominadas</span>
      </div>
      <div class="parent-summary-card">
        <span class="parent-summary-icon">🛡️</span>
        <span class="parent-summary-value">${rehabVillains}/5</span>
        <span class="parent-summary-label">Vilões Derrotados</span>
      </div>
      <div class="parent-summary-card">
        <span class="parent-summary-icon">⭐</span>
        <span class="parent-summary-value">Nv. ${AppState.user.level}</span>
        <span class="parent-summary-label">Nível Atual</span>
      </div>`;

    /* Progresso por tabuada */
    const tableGrid = document.getElementById('parent-table-grid');
    tableGrid.innerHTML = '';

    for (let t = 1; t <= 10; t++) {
      const facts = [];
      for (let m = 1; m <= 10; m++) {
        const key = `${t}x${m}`;
        const r = results[key];
        facts.push({ key, a: t, b: m, result: r });
      }

      const tested = facts.filter(f => f.result).length;
      const correct = facts.filter(f => f.result && f.result.correct).length;
      const green = facts.filter(f => f.result && f.result.color === 'green').length;
      const yellow = facts.filter(f => f.result && f.result.color === 'yellow').length;
      const red = facts.filter(f => f.result && f.result.color === 'red').length;
      const pct = tested > 0 ? Math.round((correct / tested) * 100) : 0;

      let badgeClass, badgeText;
      if (mastered[t]) { badgeClass = 'badge-green'; badgeText = 'Dominado'; }
      else if (tested === 0) { badgeClass = 'badge-gray'; badgeText = 'Não testado'; }
      else if (pct >= 80) { badgeClass = 'badge-green'; badgeText = 'Bom'; }
      else if (pct >= 50) { badgeClass = 'badge-yellow'; badgeText = 'Em progresso'; }
      else { badgeClass = 'badge-red'; badgeText = 'Precisa de atenção'; }

      const barColor = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)';

      let factsHtml = '';
      for (let m = 1; m <= 10; m++) {
        const key = `${t}x${m}`;
        const r = results[key];
        let chipClass = 'fact-gray';
        if (r) {
          if (r.color === 'green') chipClass = 'fact-green';
          else if (r.color === 'yellow') chipClass = 'fact-yellow';
          else if (r.color === 'red') chipClass = 'fact-red';
        }
        factsHtml += `<span class="parent-fact-chip ${chipClass}" title="${t}×${m}=${t*m}">${m}</span>`;
      }

      const avgTableTime = facts
        .filter(f => f.result && f.result.time > 0)
        .map(f => f.result.time);
      const avgT = avgTableTime.length > 0
        ? (avgTableTime.reduce((a, b) => a + b, 0) / avgTableTime.length / 1000).toFixed(1) + 's'
        : '--';

      tableGrid.innerHTML += `
        <div class="parent-table-card">
          <div class="parent-table-header">
            <span class="parent-table-name">Tabuada do ${t}</span>
            <span class="parent-table-badge ${badgeClass}">${badgeText}</span>
          </div>
          <div class="parent-table-stats">
            <span class="parent-table-stat">✅ ${correct}/${tested}</span>
            <span class="parent-table-stat">⏱️ ${avgT}</span>
            <span class="parent-table-stat">📈 ${tested > 0 ? pct + '%' : '--'}</span>
          </div>
          <div class="parent-table-bar">
            <div class="parent-table-bar-fill" style="width:${pct}%;background:${barColor}"></div>
          </div>
          <div class="parent-table-facts">${factsHtml}</div>
        </div>`;
    }

    /* Análise detalhada */
    const analysis = document.getElementById('parent-analysis');

    /* Montar listas de pontos fortes e fracos */
    const allFactData = [];
    for (let t = 1; t <= 10; t++) {
      for (let m = 1; m <= 10; m++) {
        const key = `${t}x${m}`;
        const r = results[key];
        if (r) {
          allFactData.push({ label: `${t}×${m}`, time: r.time, correct: r.correct, color: r.color });
        }
      }
    }

    /* Ordenar por tempo (mais rápido primeiro) */
    const sorted = [...allFactData].sort((a, b) => a.time - b.time);
    const fastest = sorted.slice(0, 5).filter(f => f.correct);
    const slowest = sorted.filter(f => f.correct).slice(-5).reverse();
    const wrong = allFactData.filter(f => !f.correct);

    let strengthsHtml = fastest.length > 0
      ? fastest.map(f => `<li><span>${f.label} = ${f.label.split('×').reduce((a, b) => a * b)}</span><span class="parent-analysis-badge badge-green">${(f.time / 1000).toFixed(1)}s</span></li>`).join('')
      : '<li class="parent-empty-msg">Ainda não há dados suficientes</li>';

    let weaknessesHtml = '';
    if (slowest.length > 0) {
      weaknessesHtml = slowest.map(f => `<li><span>${f.label} = ${f.label.split('×').reduce((a, b) => a * b)}</span><span class="parent-analysis-badge badge-yellow">${(f.time / 1000).toFixed(1)}s</span></li>`).join('');
    } else {
      weaknessesHtml = '<li class="parent-empty-msg">Nenhum dado lento registrado</li>';
    }

    let errorsHtml = '';
    if (wrong.length > 0) {
      errorsHtml = wrong.map(f => `<li><span>${f.label}</span><span class="parent-analysis-badge badge-red">Erro</span></li>`).join('');
    } else {
      errorsHtml = '<li class="parent-empty-msg">Nenhum erro registrado</li>';
    }

    /* Resumo textual para os pais */
    let summaryText = '';
    if (testedFacts === 0) {
      summaryText = 'Seu filho ainda não começou os exercícios. Inicie um diagnóstico para ver o progresso.';
    } else {
      const parts = [];
      if (masteredCount > 0) {
        const masteredNames = Object.entries(mastered).filter(([, v]) => v).map(([k]) => k);
        parts.push(`Dominou as tabuadas do ${masteredNames.join(', ')}.`);
      }
      if (redFacts > 0) {
        parts.push(`Ainda tem ${redFacts} fato(s) com dificuldade que precisam de atenção.`);
      }
      if (yellowFacts > 0) {
        parts.push(`${yellowFacts} fato(s) estão em fase de raciocínio (3-6s).`);
      }
      if (greenFacts > 0) {
        parts.push(`${greenFacts} fato(s) já estão na automação (<3s).`);
      }
      summaryText = parts.join(' ');
    }

    analysis.innerHTML = `
      <div class="parent-analysis-card" style="grid-column:1/-1">
        <div class="parent-analysis-title">📋 Resumo para os Pais</div>
        <p style="color:var(--text-primary);line-height:1.6">${summaryText}</p>
      </div>
      <div class="parent-analysis-card">
        <div class="parent-analysis-title">💪 Pontos Fortes</div>
        <ul class="parent-analysis-list">${strengthsHtml}</ul>
      </div>
      <div class="parent-analysis-card">
        <div class="parent-analysis-title">🐢 Mais Lentos</div>
        <ul class="parent-analysis-list">${weaknessesHtml}</ul>
      </div>
      <div class="parent-analysis-card" style="grid-column:1/-1">
        <div class="parent-analysis-title">❌ Erros</div>
        <ul class="parent-analysis-list">${errorsHtml}</ul>
      </div>`;

    /* Modal de reinício */
    this.initResetModal();
  },

  initResetModal() {
    const openBtn = document.getElementById('btn-reset-progress');
    const modal = document.getElementById('reset-modal');
    const cancelBtn = document.getElementById('btn-cancel-reset');
    const confirmBtn = document.getElementById('btn-confirm-reset');

    if (!openBtn || !modal) return;

    openBtn.onclick = () => {
      AudioManager.click();
      modal.classList.remove('hidden');
      confirmBtn.focus();
    };

    cancelBtn.onclick = () => {
      AudioManager.click();
      modal.classList.add('hidden');
    };

    confirmBtn.onclick = () => {
      AudioManager.click();
      /* Resetar apenas progresso, manter conquistas/nível/XP */
      AppState.diagnostic.results = {};
      AppState.diagnostic.completed = false;
      AppState.diagnostic.answered = 0;
      AppState.diagnostic.correctCount = 0;
      AppState.diagnostic.wrongCount = 0;
      AppState.anchors.streak = 0;
      AppState.anchors.mastered = { 1: false, 2: false, 5: false, 10: false };
      AppState.rehabilitation.currentVillain = null;
      AppState.rehabilitation.step = 0;
      AppState.rehabilitation.attempts = 0;
      saveState();
      modal.classList.add('hidden');
      showToast('Progresso reiniciado com sucesso!', 'success');
      this.renderPainelPais();
    };

    /* Fechar com ESC */
    modal.onkeydown = (e) => {
      if (e.key === 'Escape') {
        modal.classList.add('hidden');
      }
    };
  },

  renderVillains() {
    const grid = document.getElementById('villains-grid');
    grid.innerHTML = '';
    document.getElementById('villain-practice').classList.add('hidden');
    document.getElementById('villains-grid').classList.remove('hidden');

    VILLAINS.forEach(v => {
      const key = `${v.a}x${v.b}`;
      const result = AppState.diagnostic.results[key];
      const isRed = !result || !result.correct;
      const isRehabilitated = result && result.correct;

      const card = document.createElement('button');
      card.className = `villain-card ${isRed ? 'is-red' : ''}`;
      card.setAttribute('aria-label', `Vilão: ${v.a} × ${v.b} - ${v.name}`);
      card.innerHTML = `
        <div class="villain-emoji">${v.emoji}</div>
        <div class="villain-fact">${v.a} × ${v.b}</div>
        <div class="villain-status ${isRehabilitated ? 'rehabilitated' : ''}">${isRehabilitated ? 'Reabilitado ✓' : v.name}</div>
        <div class="villain-progress-mini">
          <div class="progress-bar-mini"><div class="progress-fill-mini" style="width: ${isRehabilitated ? '100' : '0'}%"></div></div>
        </div>`;
      card.addEventListener('click', () => this.startVillainPractice(v));
      grid.appendChild(card);
    });
  },

  startVillainPractice(villain) {
    AudioManager.click();
    AppState.rehabilitation.currentVillain = villain;
    AppState.rehabilitation.step = 0;
    AppState.rehabilitation.attempts = 0;
    document.getElementById('villains-grid').classList.add('hidden');
    const practice = document.getElementById('villain-practice');
    practice.classList.remove('hidden');
    this.renderRehabStep();
  },

  renderRehabStep() {
    const v = AppState.rehabilitation.currentVillain;
    if (!v) return;
    const inner = document.getElementById('villain-practice-inner');
    const step = AppState.rehabilitation.step;
    const a = v.a, b = v.b;
    const anchor5 = 5 * b;
    const remainder = (a - 5) * b;
    const total = a * b;

    let html = `<h2 style="margin-bottom:16px">Reabilitação: ${a} × ${b} ${v.emoji}</h2>`;

    if (step === 0) {
      /* Passo 1: O que você já sabe? (Âncora do 5) */
      html += `
        <div class="rehab-step">
          <h3>Passo 1: O que você já sabe?</h3>
          <p>Use a âncora do 5! Quanto é ${5} × ${b}?</p>
          <div class="math-display">5 × ${b} = ?</div>
          <div class="diag-options-grid" id="rehab-options" role="group" aria-label="Alternativas"></div>
          <div class="diag-feedback" id="rehab-feedback" aria-live="polite"></div>
          <p style="margin-top:12px;color:var(--text-muted);font-size:0.85rem">Dica: Você já domina a tabuada do 5!</p>
        </div>`;
    } else if (step === 1) {
      /* Passo 2: O que sobrou? */
      html += `
        <div class="rehab-step">
          <h3>Passo 2: O que sobrou?</h3>
          <p>Agora descubra o que falta: ${a - 5} × ${b} = ?</p>
          <div class="math-display">${a - 5} × ${b} = ?</div>
          <div class="diag-options-grid" id="rehab-options" role="group" aria-label="Alternativas"></div>
          <div class="diag-feedback" id="rehab-feedback" aria-live="polite"></div>
          <p style="margin-top:12px;color:var(--text-muted);font-size:0.85rem">Dica: Multiplique ${a - 5} por ${b}.</p>
        </div>`;
    } else if (step === 2) {
      /* Passo 3: Somando tudo */
      html += `
        <div class="rehab-step">
          <h3>Passo 3: Somando tudo!</h3>
          <div class="math-display">${anchor5} + ${remainder} = ${total}</div>
          <p style="margin:12px 0">Agora escolha <strong>${total}</strong> para confirmar que memorizou!</p>
          <div class="diag-options-grid" id="rehab-options" role="group" aria-label="Alternativas"></div>
          <div class="diag-feedback" id="rehab-feedback" aria-live="polite"></div>
          <div class="rehab-progress-dots">
            <div class="rehab-dot ${AppState.rehabilitation.attempts >= 1 ? 'filled' : ''}"></div>
            <div class="rehab-dot ${AppState.rehabilitation.attempts >= 2 ? 'filled' : ''}"></div>
            <div class="rehab-dot ${AppState.rehabilitation.attempts >= 3 ? 'filled' : ''}"></div>
          </div>
        </div>`;
    } else {
      /* Concluído! */
      html += `
        <div class="rehab-step" style="text-align:center">
          <div style="font-size:3rem;margin-bottom:16px">🎉</div>
          <h3 style="color:var(--green)">Vilão Derrotado!</h3>
          <p>Você reabilitou ${a} × ${b} = ${total}</p>
          <button class="btn-primary" id="btn-back-villain-done" style="margin-top:16px">Voltar à Lista</button>
        </div>`;

      /* Marcar como reabilitado no diagnóstico */
      const key = `${a}x${b}`;
      AppState.diagnostic.results[key] = { time: 0, correct: true, color: 'green' };
      Gamification.addXP(50);
      Gamification.addCoins(5);
      Gamification.checkAchievements();
      saveState();
    }

    inner.innerHTML = html;

    /* Bind events */
    const backBtn = document.getElementById('btn-back-villain-done');

    if (backBtn) {
      backBtn.addEventListener('click', () => this.renderVillains());
      return;
    }

    /* Opções de resposta */
    const rehabOptions = document.getElementById('rehab-options');
    if (rehabOptions) {
      let expected;
      if (step === 0) expected = 5 * b;
      else if (step === 1) expected = (a - 5) * b;
      else expected = a * b;

      const opts = generateOptions(expected, step === 1 ? a - 5 : (step === 2 ? a : 5), b);
      renderOptionButtons('rehab-options', opts, expected, (isCorrect) => {
        const fb = document.getElementById('rehab-feedback');
        if (isCorrect) {
          fb.textContent = 'Correto! ✓';
          fb.className = 'diag-feedback feedback-correct';
          setTimeout(() => {
            AppState.rehabilitation.step++;
            this.renderRehabStep();
          }, 800);
        } else {
          fb.textContent = `Incorreto. Resposta: ${expected}`;
          fb.className = 'diag-feedback feedback-wrong';
          AppState.rehabilitation.attempts++;
        }
      });
    }
  }
};

/** Calcula XP total equivalente (para ranking) */
function getTotalXP() {
  let total = AppState.user.xp;
  for (let i = 1; i < AppState.user.level; i++) {
    total += Gamification.xpForLevel(i);
  }
  return total;
}

/* ==================== UTILITÁRIOS COMPARTILHADOS ==================== */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateOptions(answer, a, b) {
  const options = new Set([answer]);
  const strategies = [
    () => answer + Math.floor(Math.random() * 5) + 1,
    () => answer - Math.floor(Math.random() * 5) - 1,
    () => answer + (Math.floor(Math.random() * 3) + 1) * (Math.random() > 0.5 ? 1 : -1),
    () => a + b,
    () => { const off = Math.random() > 0.5 ? 1 : -1; return a * (b + off); }
  ];

  let attempts = 0;
  while (options.size < 4 && attempts < 30) {
    const candidate = Math.max(0, Math.floor(strategies[attempts % strategies.length]()));
    if (candidate !== answer && !options.has(candidate)) options.add(candidate);
    attempts++;
  }

  let fallback = 1;
  while (options.size < 4) {
    if (!options.has(answer + fallback)) options.add(answer + fallback);
    else if (!options.has(answer - fallback)) options.add(Math.max(0, answer - fallback));
    fallback++;
  }

  return shuffleArray([...options]);
}

function renderOptionButtons(containerId, options, correctAnswer, onSelect) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  let answered = false;

  options.forEach((val, idx) => {
    const btn = document.createElement('button');
    btn.className = 'diag-option-btn';
    btn.dataset.value = val;
    btn.textContent = val;
    btn.setAttribute('aria-label', `${val}`);
    btn.setAttribute('role', 'option');
    btn.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      container.querySelectorAll('.diag-option-btn').forEach(b => b.disabled = true);

      if (val === correctAnswer) {
        btn.classList.add('selected-correct');
        AudioManager.correct();
      } else {
        btn.classList.add('selected-wrong');
        AudioManager.wrong();
        container.querySelectorAll('.diag-option-btn').forEach(b => {
          if (parseInt(b.dataset.value) === correctAnswer) b.classList.add('reveal-correct');
        });
      }
      onSelect(val === correctAnswer);
    });
    container.appendChild(btn);
  });

  /* Atalho de teclado 1-4 */
  const keyHandler = (e) => {
    if (e.key >= '1' && e.key <= '4' && !answered) {
      const idx = parseInt(e.key) - 1;
      const btns = container.querySelectorAll('.diag-option-btn');
      if (btns[idx] && !btns[idx].disabled) btns[idx].click();
    }
  };
  document.addEventListener('keydown', keyHandler);

  /* Foco no primeiro botão */
  container.querySelector('.diag-option-btn')?.focus();

  return () => document.removeEventListener('keydown', keyHandler);
}

/* ==================== MÓDULO 1: DIAGNÓSTICO ==================== */
const Diagnostico = {
  timerInterval: null,
  totalTimerInterval: null,

  init() {
    document.getElementById('btn-start-diag').addEventListener('click', () => this.start());
    document.getElementById('btn-reset-diag').addEventListener('click', () => this.reset());

    /* Seletor de quantidade de questões */
    document.querySelectorAll('.diag-count-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        AudioManager.init();
        AudioManager.click();
        document.querySelectorAll('.diag-count-btn').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
        AppState.diagnostic.questionCount = parseInt(btn.dataset.count);
      });
    });

    /* Eventos das alternativas múltipla escolha */
    document.querySelectorAll('.diag-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        this.submitAnswer(parseInt(btn.dataset.index));
      });
    });

    /* Atalho de teclado 1-4 para alternativas */
    document.addEventListener('keydown', (e) => {
      if (!AppState.diagnostic.inProgress) return;
      if (e.key >= '1' && e.key <= '4') {
        const idx = parseInt(e.key) - 1;
        const btn = document.querySelector(`.diag-option-btn[data-index="${idx}"]`);
        if (btn && !btn.disabled) this.submitAnswer(idx);
      }
    });

    /* Se já tem dados, mostrar heatmap e botão de refazer */
    if (AppState.diagnostic.completed) {
      document.getElementById('btn-reset-diag').classList.remove('hidden');
      document.getElementById('heatmap-section').classList.remove('hidden');
    }

    this.renderHeatmap();
  },

  /** Gera 4 alternativas (1 correta + 3 distratoras) */
  generateOptions(answer) {
    const options = new Set([answer]);
    /* Gerar distratoras inteligentes: próximo do valor, erros comuns */
    const strategies = [
      () => answer + Math.floor(Math.random() * 5) + 1,     /* um pouco maior */
      () => answer - Math.floor(Math.random() * 5) - 1,     /* um pouco menor */
      () => answer + (Math.floor(Math.random() * 3) + 1) * (Math.random() > 0.5 ? 1 : -1), /* variável */
      () => { /* Erro clássico: soma em vez de multiplicar */
        const q = AppState.diagnostic.questions[AppState.diagnostic.currentIndex];
        return q ? q.a + q.b : answer + 3;
      },
      () => { /* Erro: trocar fato vizinho */
        const q = AppState.diagnostic.questions[AppState.diagnostic.currentIndex];
        if (q) {
          const off = Math.random() > 0.5 ? 1 : -1;
          return q.a * (q.b + off);
        }
        return answer + 2;
      }
    ];

    let attempts = 0;
    while (options.size < 4 && attempts < 30) {
      const strategy = strategies[attempts % strategies.length];
      const candidate = Math.max(1, Math.floor(strategy()));
      if (candidate !== answer && !options.has(candidate)) {
        options.add(candidate);
      }
      attempts++;
    }

    /* Fallback: se ainda não tem 4, preenche com valores adjacentes */
    let fallback = 1;
    while (options.size < 4) {
      if (!options.has(answer + fallback)) options.add(answer + fallback);
      else if (!options.has(answer - fallback)) options.add(Math.max(1, answer - fallback));
      fallback++;
    }

    return this.shuffleArray([...options]);
  },

  start() {
    AudioManager.init();
    AudioManager.click();

    const count = AppState.diagnostic.questionCount;

    /* Embaralhar e limitar perguntas */
    const shuffled = this.shuffleArray([...ALL_FACTS]);
    AppState.diagnostic.questions = shuffled.slice(0, count);
    AppState.diagnostic.currentIndex = 0;
    AppState.diagnostic.answered = 0;
    AppState.diagnostic.correctCount = 0;
    AppState.diagnostic.wrongCount = 0;
    AppState.diagnostic.inProgress = true;
    AppState.diagnostic.totalStartTime = performance.now();

    document.getElementById('diag-intro').classList.add('hidden');
    document.getElementById('diag-active').classList.remove('hidden');
    document.getElementById('heatmap-section').classList.add('hidden');

    /* Iniciar timer total */
    this.startTotalTimer();

    this.showNextQuestion();
  },

  reset() {
    AppState.diagnostic.results = {};
    AppState.diagnostic.completed = false;
    saveState();
    this.renderHeatmap();
    this.start();
  },

  showNextQuestion() {
    const q = AppState.diagnostic.questions[AppState.diagnostic.currentIndex];
    if (!q) return this.finish();

    /* Atualizar operação */
    document.getElementById('diag-operation').textContent = `${q.a} × ${q.b}`;
    document.getElementById('diag-feedback').textContent = '';
    document.getElementById('diag-feedback').className = 'diag-feedback';

    /* Gerar e exibir alternativas */
    const options = this.generateOptions(q.answer);
    const btns = document.querySelectorAll('.diag-option-btn');
    btns.forEach((btn, i) => {
      btn.textContent = options[i];
      btn.disabled = false;
      btn.className = 'diag-option-btn';
      btn.setAttribute('aria-label', `Alternativa ${i + 1}: ${options[i]}`);
    });

    /* Progresso */
    const count = AppState.diagnostic.questionCount;
    const pct = (AppState.diagnostic.currentIndex / count) * 100;
    document.getElementById('diag-progress-fill').style.width = pct + '%';
    document.getElementById('diag-progress-text').textContent =
      `${AppState.diagnostic.currentIndex + 1} / ${count}`;

    /* Timer da pergunta */
    AppState.diagnostic.startTime = performance.now();
    this.startTimer();

    /* Foco na primeira alternativa */
    btns[0].focus();
  },

  startTimer() {
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      const elapsed = (performance.now() - AppState.diagnostic.startTime) / 1000;
      const timerEl = document.getElementById('diag-timer');
      timerEl.textContent = elapsed.toFixed(2) + 's';
      /* Mudar cor do timer */
      if (elapsed < 3) timerEl.style.color = 'var(--green)';
      else if (elapsed < 6) timerEl.style.color = 'var(--yellow)';
      else timerEl.style.color = 'var(--red)';
    }, 50);
  },

  startTotalTimer() {
    clearInterval(this.totalTimerInterval);
    this.totalTimerInterval = setInterval(() => {
      if (!AppState.diagnostic.totalStartTime) return;
      const elapsed = (performance.now() - AppState.diagnostic.totalStartTime) / 1000;
      const totalEl = document.getElementById('diag-timer-total');
      totalEl.textContent = elapsed.toFixed(2) + 's';
    }, 100);
  },

  submitAnswer(optionIndex) {
    if (!AppState.diagnostic.inProgress) return;

    const btns = document.querySelectorAll('.diag-option-btn');
    const selectedBtn = btns[optionIndex];
    if (!selectedBtn || selectedBtn.disabled) return;

    clearInterval(this.timerInterval);
    const elapsed = (performance.now() - AppState.diagnostic.startTime) / 1000;
    const q = AppState.diagnostic.questions[AppState.diagnostic.currentIndex];
    const selectedValue = parseInt(selectedBtn.textContent);
    const correct = selectedValue === q.answer;

    /* Desabilitar todas as alternativas */
    btns.forEach(b => b.disabled = true);

    /* Classificar */
    let color;
    if (correct && elapsed < 3) {
      color = 'green';
      AudioManager.correct();
      selectedBtn.classList.add('selected-correct');
      document.getElementById('diag-feedback').textContent = `Correto! ${elapsed.toFixed(2)}s — Automação!`;
      document.getElementById('diag-feedback').className = 'diag-feedback feedback-correct';
    } else if (correct && elapsed <= 6) {
      color = 'yellow';
      AudioManager.correct();
      selectedBtn.classList.add('selected-correct');
      document.getElementById('diag-feedback').textContent = `Correto! ${elapsed.toFixed(2)}s — Raciocínio ativo`;
      document.getElementById('diag-feedback').className = 'diag-feedback feedback-slow';
    } else if (correct) {
      color = 'red';
      AudioManager.wrong();
      selectedBtn.classList.add('selected-wrong');
      document.getElementById('diag-feedback').textContent = `Correto, mas muito lento: ${elapsed.toFixed(2)}s`;
      document.getElementById('diag-feedback').className = 'diag-feedback feedback-wrong';
    } else {
      color = 'red';
      AudioManager.wrong();
      selectedBtn.classList.add('selected-wrong');
      /* Revelar a alternativa correta */
      btns.forEach(b => {
        if (parseInt(b.textContent) === q.answer) b.classList.add('reveal-correct');
      });
      document.getElementById('diag-feedback').textContent = `Incorreto! Resposta: ${q.answer} (${elapsed.toFixed(2)}s)`;
      document.getElementById('diag-feedback').className = 'diag-feedback feedback-wrong';
    }

    /* Atualizar contadores */
    AppState.diagnostic.answered++;
    if (correct) AppState.diagnostic.correctCount++;
    else AppState.diagnostic.wrongCount++;

    /* Salvar resultado (só atualiza se não existir ou for melhor) */
    const key = `${q.a}x${q.b}`;
    const prev = AppState.diagnostic.results[key];
    if (!prev || (correct && (!prev.correct || elapsed * 1000 < prev.time))) {
      AppState.diagnostic.results[key] = {
        time: Math.round(elapsed * 1000),
        correct,
        color,
        answer: selectedValue
      };
    }

    /* XP por resposta */
    if (correct) Gamification.addXP(color === 'green' ? 5 : color === 'yellow' ? 3 : 1);

    /* Próxima pergunta */
    setTimeout(() => {
      AppState.diagnostic.currentIndex++;
      this.showNextQuestion();
      this.renderHeatmap();
      saveState();
    }, 700);
  },

  finish() {
    clearInterval(this.timerInterval);
    clearInterval(this.totalTimerInterval);
    AppState.diagnostic.inProgress = false;
    AppState.diagnostic.completed = true;

    const totalTime = (performance.now() - AppState.diagnostic.totalStartTime) / 1000;

    document.getElementById('diag-active').classList.add('hidden');
    document.getElementById('diag-intro').classList.remove('hidden');
    document.getElementById('heatmap-section').classList.remove('hidden');
    document.getElementById('btn-reset-diag').classList.remove('hidden');

    /* Calcular estatísticas */
    const count = AppState.diagnostic.questionCount;
    const correctCount = AppState.diagnostic.correctCount;
    const wrongCount = AppState.diagnostic.wrongCount;

    /* Classificar por velocidade nesta sessão */
    const sessionResults = AppState.diagnostic.questions.map(q =>
      AppState.diagnostic.results[`${q.a}x${q.b}`]
    ).filter(Boolean);
    const greens = sessionResults.filter(r => r.color === 'green').length;
    const yellows = sessionResults.filter(r => r.color === 'yellow').length;
    const reds = sessionResults.filter(r => r.color === 'red').length;
    const avgTime = sessionResults.length > 0
      ? (sessionResults.reduce((s, r) => s + r.time, 0) / sessionResults.length / 1000).toFixed(2)
      : '0.00';

    showToast(
      `Diagnóstico completo! ${correctCount}/${count} corretos | Média: ${avgTime}s | 🟢${greens} 🟡${yellows} 🔴${reds}`,
      'success'
    );
    AudioManager.complete();
    ConfettiManager.burst(40);

    Gamification.addCoins(10);
    Gamification.addStars(3);
    Gamification.checkAchievements();
    this.renderHeatmap();
    saveState();
  },

  renderHeatmap() {
    const thead = document.getElementById('heatmap-thead');
    const tbody = document.getElementById('heatmap-tbody');
    if (!thead || !tbody) return;

    /* Cabeçalho */
    let headerHTML = '<tr><th>×</th>';
    for (let j = 1; j <= 10; j++) headerHTML += `<th>${j}</th>`;
    headerHTML += '</tr>';
    thead.innerHTML = headerHTML;

    /* Contadores para estatísticas */
    let countGreen = 0, countYellow = 0, countRed = 0, countGray = 0;

    /* Corpo */
    let bodyHTML = '';
    for (let i = 1; i <= 10; i++) {
      bodyHTML += `<tr><th>${i}</th>`;
      for (let j = 1; j <= 10; j++) {
        const key = `${i}x${j}`;
        const result = AppState.diagnostic.results[key];
        let cls, timeText;

        if (result) {
          cls = `heatmap-${result.color}`;
          timeText = result.time < 1000 ? result.time + 'ms' : (result.time / 1000).toFixed(1) + 's';
          if (result.color === 'green') countGreen++;
          else if (result.color === 'yellow') countYellow++;
          else countRed++;
        } else {
          cls = 'heatmap-gray';
          timeText = '';
          countGray++;
        }

        bodyHTML += `<td class="${cls}" tabindex="0" role="gridcell"
          aria-label="${i} vezes ${j}, ${result ? result.color + ' ' + timeText : 'não testado'}"
          data-a="${i}" data-b="${j}">
          ${i}×${j}<span class="heatmap-cell-label">${timeText}</span>
        </td>`;
      }
      bodyHTML += '</tr>';
    }
    tbody.innerHTML = bodyHTML;

    /* Atualizar estatísticas */
    const setCount = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    setCount('heatmap-count-green', countGreen);
    setCount('heatmap-count-yellow', countYellow);
    setCount('heatmap-count-red', countRed);
    setCount('heatmap-count-gray', countGray);
    setCount('heatmap-count-total', countGreen + countYellow + countRed);

    /* Clique nas células para praticar */
    tbody.querySelectorAll('td').forEach(td => {
      td.addEventListener('click', () => {
        const a = parseInt(td.dataset.a);
        const b = parseInt(td.dataset.b);
        this.practiceFact(a, b);
      });
      td.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const a = parseInt(td.dataset.a);
          const b = parseInt(td.dataset.b);
          this.practiceFact(a, b);
        }
      });
    });

    /* Atualizar progresso dos módulos no dashboard */
    this.updateModuleProgress();
  },

  /** Modal de prática com múltipla escolha */
  practiceFact(a, b) {
    AudioManager.init();
    AudioManager.click();
    const correctAnswer = a * b;

    /* Gerar 4 alternativas */
    const options = new Set([correctAnswer]);
    const distractors = [
      correctAnswer + Math.floor(Math.random() * 5) + 1,
      correctAnswer - Math.floor(Math.random() * 5) - 1,
      a + b,
      (a + 1) * b,
      a * (b + 1),
      correctAnswer + (Math.random() > 0.5 ? 2 : -2)
    ];
    for (const d of distractors) {
      if (options.size >= 4) break;
      const v = Math.max(1, Math.floor(d));
      if (v !== correctAnswer) options.add(v);
    }
    let fallback = 1;
    while (options.size < 4) {
      if (!options.has(correctAnswer + fallback)) options.add(correctAnswer + fallback);
      else if (!options.has(Math.max(1, correctAnswer - fallback))) options.add(Math.max(1, correctAnswer - fallback));
      fallback++;
    }
    const shuffled = [...options].sort(() => Math.random() - 0.5);

    /* Criar modal */
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div class="modal-content glass">
        <h2 style="margin-bottom:8px">Praticar ${a} × ${b}</h2>
        <div class="diag-operation" style="font-size:3rem;margin-bottom:8px">${a} × ${b}</div>
        <div class="practice-timer" id="practice-timer">0.00s</div>
        <div class="practice-options-grid" id="practice-options">
          ${shuffled.map((val, i) => `
            <button class="practice-option-btn" data-value="${val}" data-index="${i}" aria-label="Alternativa ${i + 1}: ${val}">${val}</button>
          `).join('')}
        </div>
        <div class="diag-feedback" id="practice-feedback" aria-live="polite" style="margin-top:16px"></div>
        <button class="btn-secondary" id="btn-practice-close" style="margin-top:16px">Fechar</button>
      </div>`;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    document.getElementById('btn-practice-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    /* Timer da prática */
    const startTime = performance.now();
    const timerInterval = setInterval(() => {
      const el = (performance.now() - startTime) / 1000;
      const timerEl = document.getElementById('practice-timer');
      if (timerEl) {
        timerEl.textContent = el.toFixed(2) + 's';
        if (el < 3) timerEl.style.color = 'var(--green)';
        else if (el < 6) timerEl.style.color = 'var(--yellow)';
        else timerEl.style.color = 'var(--red)';
      }
    }, 50);

    /* Lógica de resposta */
    let answered = false;
    const btns = overlay.querySelectorAll('.practice-option-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        clearInterval(timerInterval);
        const elapsed = (performance.now() - startTime) / 1000;
        const val = parseInt(btn.dataset.value);
        const fb = document.getElementById('practice-feedback');

        /* Desabilitar todos */
        btns.forEach(b => b.disabled = true);

        if (val === correctAnswer) {
          AudioManager.correct();
          btn.classList.add('prac-correct');
          let msg = `Correto! ${elapsed.toFixed(2)}s`;
          if (elapsed < 3) msg += ' — Automação!';
          else if (elapsed <= 6) msg += ' — Raciocínio';
          else msg += ' — Lento';
          fb.textContent = msg;
          fb.className = 'diag-feedback feedback-correct';
          Gamification.addXP(elapsed < 3 ? 5 : elapsed <= 6 ? 3 : 1);

          /* Atualizar heatmap se era vazio */
          const key = `${a}x${b}`;
          const prev = AppState.diagnostic.results[key];
          if (!prev || (elapsed * 1000 < prev.time)) {
            const color = elapsed < 3 ? 'green' : elapsed <= 6 ? 'yellow' : 'red';
            AppState.diagnostic.results[key] = {
              time: Math.round(elapsed * 1000),
              correct: true,
              color
            };
          }
        } else {
          AudioManager.wrong();
          btn.classList.add('prac-wrong');
          /* Revelar correta */
          btns.forEach(b => {
            if (parseInt(b.dataset.value) === correctAnswer) b.classList.add('prac-reveal');
          });
          fb.textContent = `Incorreto! Resposta: ${correctAnswer} (${elapsed.toFixed(2)}s)`;
          fb.className = 'diag-feedback feedback-wrong';
        }

        this.renderHeatmap();
        saveState();
      });
    });

    /* Atalho de teclado 1-4 */
    const keyHandler = (e) => {
      if (e.key >= '1' && e.key <= '4' && !answered) {
        const idx = parseInt(e.key) - 1;
        if (btns[idx] && !btns[idx].disabled) btns[idx].click();
      }
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', keyHandler);
        close();
      }
    };
    document.addEventListener('keydown', keyHandler);

    /* Foco na primeira alternativa */
    btns[0].focus();
  },

  updateModuleProgress() {
    const totalFacts = 100;
    const answered = Object.keys(AppState.diagnostic.results).length;
    const pct = Math.min((answered / totalFacts) * 100, 100);
    const el = document.querySelector('[data-module-progress="diagnostico"]');
    if (el) el.style.width = pct + '%';
  },

  shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
};

/* ==================== TECLADO VIRTUAL ==================== */
const VirtualNumpad = {
  /*
   * Anexa um teclado virtual a um input.
   * submitFn(valor) — chamado ao pressionar Enter ou autoSubmit.
   * options.autoSubmit (bool) — dispara submitFn quando o input atinge o tamanho da resposta.
   * options.getAnswerLength() — retorna quantos dígitos a resposta atual tem.
   */
  bind(numpadId, inputId, submitFn, options = {}) {
    const numpad = document.getElementById(numpadId);
    const input = document.getElementById(inputId);
    if (!numpad || !input) return;

    const autoSubmit = options.autoSubmit || false;
    const getAnswerLength = options.getAnswerLength || (() => 0);

    const checkAutoSubmit = () => {
      if (!autoSubmit) return;
      const expectedLen = getAnswerLength();
      if (expectedLen > 0 && input.value.length >= expectedLen) {
        submitFn(parseInt(input.value));
      }
    };

    numpad.querySelectorAll('.numpad-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        AudioManager.click();
        const key = btn.dataset.key;

        if (key === 'enter') {
          if (input.value.length > 0) submitFn(parseInt(input.value));
          return;
        }

        if (key === 'backspace') {
          input.value = input.value.slice(0, -1);
          input.classList.remove('correct', 'wrong');
          return;
        }

        if (key === 'clear') {
          input.value = '';
          input.classList.remove('correct', 'wrong');
          return;
        }

        /* Dígito 0-9 */
        if (input.value.length < 4) {
          input.value += key;
          input.classList.remove('correct', 'wrong');
          checkAutoSubmit();
        }
      });
    });

    /* Permitir digitação via teclado físico também */
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (input.value.length > 0) submitFn(parseInt(input.value));
      }
    });

    input.addEventListener('input', () => {
      checkAutoSubmit();
    });

    /* Feedback visual: apertar botão no numpad */
    numpad.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest('.numpad-btn');
      if (btn) btn.classList.add('numpad-active');
    });
    numpad.addEventListener('pointerup', () => {
      numpad.querySelectorAll('.numpad-active').forEach(b => b.classList.remove('numpad-active'));
    });
  }
};

/* ==================== MÓDULO 2: ÂNCORAS ==================== */
const Ancoras = {
  currentQuestion: null,
  startTime: null,
  _locked: false,
  _removeKeyHandler: null,

  init() {
    document.getElementById('btn-start-ancoras').addEventListener('click', () => this.start());

    /* Tabs de âncora */
    document.querySelectorAll('.ancora-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.ancora-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        AppState.anchors.currentAnchor = parseInt(tab.dataset.anchor);
        this.showNextQuestion();
        AudioManager.click();
      });
    });

    this.updateStatusUI();
  },

  start() {
    AudioManager.init();
    AudioManager.click();
    document.getElementById('ancoras-intro').classList.add('hidden');
    document.getElementById('ancoras-active').classList.remove('hidden');
    this.showNextQuestion();
  },

  showNextQuestion() {
    const anchor = AppState.anchors.currentAnchor;
    const multiplier = Math.floor(Math.random() * 10) + 1;
    this.currentQuestion = { a: anchor, b: multiplier, answer: anchor * multiplier };

    document.getElementById('flashcard-operation').textContent = `${anchor} × ${multiplier}`;
    document.getElementById('flashcard-feedback').textContent = '';
    document.getElementById('flashcard-feedback').className = 'flashcard-feedback';

    const options = generateOptions(this.currentQuestion.answer, anchor, multiplier);

    /* Limpar listener anterior */
    if (this._removeKeyHandler) this._removeKeyHandler();

    this._locked = false;
    this.startTime = performance.now();

    this._removeKeyHandler = renderOptionButtons('flashcard-options', options, this.currentQuestion.answer, (isCorrect) => {
      this.submitAnswer(isCorrect);
    });
  },

  submitAnswer(isCorrect) {
    if (this._locked) return;
    this._locked = true;

    const elapsed = (performance.now() - this.startTime) / 1000;
    const fb = document.getElementById('flashcard-feedback');

    if (isCorrect && elapsed < 3) {
      /* Resposta rápida e correta */
      fb.textContent = `Perfeito! ${elapsed.toFixed(2)}s ⚡`;
      fb.className = 'flashcard-feedback feedback-correct';

      AppState.anchors.streak++;
      Gamification.addXP(5);
      Gamification.addCoins(1);
      ConfettiManager.burst(10);

      /* Verificar se completou 5 seguidas */
      if (AppState.anchors.streak >= 5) {
        AppState.anchors.mastered[AppState.anchors.currentAnchor] = true;
        AudioManager.reward();
        showToast(`Âncora do ${AppState.anchors.currentAnchor} dominada! ⚓`, 'achievement');
        Gamification.addStars(2);
        Gamification.addXP(20);
        Gamification.checkAchievements();
        this.resetStreak();
        this.updateStatusUI();
      }
    } else if (isCorrect) {
      fb.textContent = `Correto, mas lento: ${elapsed.toFixed(2)}s. Precisa < 3s.`;
      fb.className = 'flashcard-feedback feedback-slow';
      this.resetStreak();
      Gamification.addXP(2);
    } else {
      fb.textContent = `Incorreto! Resposta: ${this.currentQuestion.answer}`;
      fb.className = 'flashcard-feedback feedback-wrong';
      this.resetStreak();
    }

    this.updateProgressUI();
    Gamification.checkAchievements();
    saveState();

    setTimeout(() => {
      this._locked = false;
      this.showNextQuestion();
    }, 1000);
  },

  resetStreak() {
    AppState.anchors.streak = 0;
    this.updateProgressUI();
  },

  updateProgressUI() {
    const streak = AppState.anchors.streak;
    document.getElementById('ancora-streak-text').textContent = `Sequência: ${streak} / 5`;
    const pct = Math.min((streak / 5) * 100, 100);
    document.getElementById('ancora-progress-fill').style.width = pct + '%';

    /* Atualizar módulo no dashboard */
    const masteredCount = Object.values(AppState.anchors.mastered).filter(Boolean).length;
    const modulePct = (masteredCount / 4) * 100;
    const el = document.querySelector('[data-module-progress="ancoras"]');
    if (el) el.style.width = modulePct + '%';
  },

  updateStatusUI() {
    [1, 2, 5, 10].forEach(anchor => {
      const label = document.getElementById(`anchor-status-${anchor}`);
      const progress = document.getElementById(`anchor-progress-${anchor}`);
      if (AppState.anchors.mastered[anchor]) {
        label.textContent = 'Dominado ✓';
        label.className = 'anchor-status-label completed';
        progress.style.width = '100%';
      } else {
        label.textContent = 'Em treino';
        progress.style.width = '0%';
      }
    });
  }
};

/* ==================== MÓDULO 3: PONTES ==================== */
const Pontes = {
  init() {
    document.querySelectorAll('.ponte-card').forEach(card => {
      card.addEventListener('click', () => {
        AudioManager.init();
        AudioManager.click();
        AppState.bridges.currentPonte = card.dataset.ponte;
        document.querySelector('.pontes-hub').classList.add('hidden');
        document.getElementById('ponte-content').classList.remove('hidden');
        this.renderPonteContent(card.dataset.ponte);
      });
    });

    document.getElementById('btn-back-pontes').addEventListener('click', () => {
      AudioManager.click();
      document.getElementById('ponte-content').classList.add('hidden');
      document.querySelector('.pontes-hub').classList.remove('hidden');
    });
  },

  renderPonteContent(type) {
    const inner = document.getElementById('ponte-content-inner');
    let html = '';

    switch (type) {
      case 'dobro':
        html = this.renderDobroDoDobro();
        break;
      case 'metade':
        html = this.renderMetadeAmiga();
        break;
      case 'vizinhos':
        html = this.renderVizinhos();
        break;
      case 'dedos':
        html = this.renderDedos();
        break;
    }

    inner.innerHTML = html;
    this.bindPonteEvents(type);
  },

  renderDobroDoDobro() {
    return `
      <div class="bridge-explanation">
        <h3>Ponte do Dobro do Dobro</h3>
        <p>Quando você precisa multiplicar por <strong>4</strong>, basta dobrar o resultado duas vezes!</p>
        <p style="margin-bottom:16px">Escolha um número para praticar:</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px">
          ${[2,3,4,5,6,7,8,9].map(n => `<button class="btn-primary dobro-choice" data-num="${n}" style="padding:10px 20px">${n}</button>`).join('')}
        </div>
        <div id="dobro-demo"></div>
      </div>`;
  },

  renderMetadeAmiga() {
    return `
      <div class="bridge-explanation">
        <h3>Ponte da Metade Amiga</h3>
        <p>Para multiplicar por <strong>6, 7 ou 8</strong>, decomponha usando a âncora do 5!</p>
        <p style="margin-bottom:16px">Escolha um fato para praticar:</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px">
          ${[[6,7],[6,8],[7,6],[7,7],[7,8],[8,6],[8,7],[8,8]].map(([a,b]) =>
            `<button class="btn-primary metade-choice" data-a="${a}" data-b="${b}" style="padding:10px 20px">${a}×${b}</button>`
          ).join('')}
        </div>
        <div id="metade-demo"></div>
      </div>`;
  },

  renderVizinhos() {
    return `
      <div class="bridge-explanation">
        <h3>Quadrados Vizinhos</h3>
        <p>Se você sabe que <strong>7 × 7 = 49</strong>, para calcular 7 × 8 basta somar 7!</p>
        <p style="margin-bottom:16px">Escolha um fato para praticar:</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px">
          ${[[6,7],[7,8],[8,9],[5,6],[4,5]].map(([a,b]) =>
            `<button class="btn-primary vizinho-choice" data-a="${a}" data-b="${b}" style="padding:10px 20px">${a}×${b}</button>`
          ).join('')}
        </div>
        <div id="vizinho-demo"></div>
      </div>`;
  },

  renderDedos() {
    return `
      <div class="bridge-explanation">
        <h3>Magia dos Dedos do 9</h3>
        <p>Para qualquer tabuada do 9, use seus dedos! Ao levantar o dedo N (de 1 a 10), os dedos à esquerda são dezenas e à direita são unidades.</p>
        <p style="margin-bottom:16px">Escolha uma tabuada do 9:</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px">
          ${[2,3,4,5,6,7,8].map(n =>
            `<button class="btn-primary dedo-choice" data-n="${n}" style="padding:10px 20px">9 × ${n}</button>`
          ).join('')}
        </div>
        <div id="dedo-demo"></div>
      </div>`;
  },

  bindPonteEvents(type) {
    /* Dobro do Dobro */
    document.querySelectorAll('.dobro-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        const n = parseInt(btn.dataset.num);
        const demo = document.getElementById('dobro-demo');
        const result = 4 * n;
        const half = n * 2;
        demo.innerHTML = `
          <div class="bridge-step" id="ds1">
            <div class="bridge-step-number">1</div>
            <div class="bridge-step-content">
              <div class="bridge-step-title">Dobro de ${n}</div>
              <div class="bridge-step-math">${n} × 2 = ${half}</div>
            </div>
          </div>
          <div class="bridge-step" id="ds2">
            <div class="bridge-step-number">2</div>
            <div class="bridge-step-content">
              <div class="bridge-step-title">Dobro de ${half}</div>
              <div class="bridge-step-math">${half} × 2 = ${result}</div>
            </div>
          </div>
          <div class="bridge-step" id="ds3">
            <div class="bridge-step-number">✓</div>
            <div class="bridge-step-content">
              <div class="bridge-step-title">Resultado</div>
              <div class="bridge-step-math">4 × ${n} = ${result}</div>
            </div>
          </div>`;
        /* Animação sequencial */
        demo.querySelectorAll('.bridge-step').forEach((step, i) => {
          step.style.opacity = '0';
          step.style.transform = 'translateX(-20px)';
          setTimeout(() => {
            step.style.transition = 'all 0.4s ease';
            step.style.opacity = '1';
            step.style.transform = 'translateX(0)';
          }, i * 500);
        });
        AudioManager.correct();
        Gamification.addXP(3);
      });
    });

    /* Metade Amiga */
    document.querySelectorAll('.metade-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        const a = parseInt(btn.dataset.a);
        const b = parseInt(btn.dataset.b);
        const demo = document.getElementById('metade-demo');
        const part1 = 5 * b;
        const part2 = (a - 5) * b;
        const total = a * b;
        demo.innerHTML = `
          <div class="bridge-step" id="ms1">
            <div class="bridge-step-number">1</div>
            <div class="bridge-step-content">
              <div class="bridge-step-title">Âncora do 5</div>
              <div class="bridge-step-math">5 × ${b} = ${part1}</div>
            </div>
          </div>
          <div class="bridge-step" id="ms2">
            <div class="bridge-step-number">2</div>
            <div class="bridge-step-content">
              <div class="bridge-step-title">O que sobrou (${a - 5} × ${b})</div>
              <div class="bridge-step-math">${a - 5} × ${b} = ${part2}</div>
            </div>
          </div>
          <div class="bridge-step" id="ms3">
            <div class="bridge-step-number">3</div>
            <div class="bridge-step-content">
              <div class="bridge-step-title">Somando tudo</div>
              <div class="bridge-step-math">${part1} + ${part2} = ${total}</div>
            </div>
          </div>`;
        demo.querySelectorAll('.bridge-step').forEach((step, i) => {
          step.style.opacity = '0';
          step.style.transform = 'translateX(-20px)';
          setTimeout(() => {
            step.style.transition = 'all 0.4s ease';
            step.style.opacity = '1';
            step.style.transform = 'translateX(0)';
          }, i * 500);
        });
        AudioManager.correct();
        Gamification.addXP(3);
      });
    });

    /* Quadrados Vizinhos */
    document.querySelectorAll('.vizinho-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        const a = parseInt(btn.dataset.a);
        const b = parseInt(btn.dataset.b);
        const demo = document.getElementById('vizinho-demo');
        const square = a * a;
        const result = a * b;
        demo.innerHTML = `
          <div class="bridge-step" id="vs1">
            <div class="bridge-step-number">1</div>
            <div class="bridge-step-content">
              <div class="bridge-step-title">Quadrado de ${a}</div>
              <div class="bridge-step-math">${a} × ${a} = ${square}</div>
            </div>
          </div>
          <div class="bridge-step" id="vs2">
            <div class="bridge-step-number">2</div>
            <div class="bridge-step-content">
              <div class="bridge-step-title">Somando ${a} mais uma vez</div>
              <div class="bridge-step-math">${square} + ${a} = ${result}</div>
            </div>
          </div>
          <div class="bridge-step" id="vs3">
            <div class="bridge-step-number">✓</div>
            <div class="bridge-step-content">
              <div class="bridge-step-title">Resultado</div>
              <div class="bridge-step-math">${a} × ${b} = ${result}</div>
            </div>
          </div>`;
        demo.querySelectorAll('.bridge-step').forEach((step, i) => {
          step.style.opacity = '0';
          step.style.transform = 'translateX(-20px)';
          setTimeout(() => {
            step.style.transition = 'all 0.4s ease';
            step.style.opacity = '1';
            step.style.transform = 'translateX(0)';
          }, i * 500);
        });
        AudioManager.correct();
        Gamification.addXP(3);
      });
    });

    /* Dedos do 9 */
    document.querySelectorAll('.dedo-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        const n = parseInt(btn.dataset.n);
        const demo = document.getElementById('dedo-demo');
        const result = 9 * n;
        const left = n - 1;       /* Dedos à esquerda (dezenas) */
        const right = 10 - n;     /* Dedos à direita (unidades) */

        /* Construir representação visual dos dedos */
        let handsHTML = '<div class="hands-container"><div style="text-align:center">';
        handsHTML += `<p style="margin-bottom:8px;font-weight:700">Dedo ${n} abaixado:</p>`;
        handsHTML += '<div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap;margin-bottom:12px">';

        for (let i = 1; i <= 10; i++) {
          const isDown = i === n;
          const isLeft = i < n;
          let color = 'var(--primary)';
          let bg = 'var(--glass-bg)';
          if (isDown) { color = '#fff'; bg = 'var(--red)'; }
          else if (isLeft) { bg = 'var(--green-bg)'; }
          else { bg = 'var(--yellow-bg)'; }

          handsHTML += `<div style="width:40px;height:60px;border-radius:8px;background:${bg};border:2px solid ${isDown ? 'var(--red)' : 'var(--border)'};display:flex;align-items:center;justify-content:center;font-weight:900;color:${color};font-size:0.85rem;transition:all 0.3s;${isDown ? 'transform:scale(0.8);opacity:0.5' : ''}">${i}</div>`;
        }
        handsHTML += '</div>';
        handsHTML += `<div style="display:flex;gap:24px;justify-content:center;margin-top:8px">
          <span style="font-weight:700;color:var(--green)">${left} dedos = ${left}0</span>
          <span style="font-weight:700;color:var(--accent-orange)">${right} dedos = ${right}</span>
        </div></div></div>`;

        demo.innerHTML = `
          ${handsHTML}
          <div class="bridge-step" style="margin-top:16px">
            <div class="bridge-step-number">✓</div>
            <div class="bridge-step-content" style="text-align:center">
              <div class="bridge-step-title">Resultado</div>
              <div class="bridge-step-math">9 × ${n} = ${left}${right} = ${result}</div>
            </div>
          </div>`;
        AudioManager.correct();
        Gamification.addXP(3);
      });
    });
  }
};

/* ==================== TEMA & ACESSIBILIDADE ==================== */
const ThemeManager = {
  init() {
    /* === Sidebar: Toggle tema rápido === */
    const btnTheme = document.getElementById('btn-theme-toggle');
    btnTheme.addEventListener('click', () => {
      AudioManager.init();
      AudioManager.click();
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      this.setTheme(next);
    });

    /* === Sidebar: Alto contraste (barra de acessibilidade) === */
    document.getElementById('btn-high-contrast').addEventListener('click', () => {
      AudioManager.init();
      AudioManager.click();
      const current = document.documentElement.getAttribute('data-high-contrast') === 'true';
      this.setHighContrast(!current);
    });

    /* === Sidebar: Tamanho da fonte (barra de acessibilidade) === */
    document.getElementById('btn-font-decrease').addEventListener('click', () => {
      AudioManager.click();
      this.setFontSize(AppState.settings.fontSize - 2);
    });
    document.getElementById('btn-font-increase').addEventListener('click', () => {
      AudioManager.click();
      this.setFontSize(AppState.settings.fontSize + 2);
    });
    document.getElementById('btn-font-reset').addEventListener('click', () => {
      AudioManager.click();
      this.setFontSize(16);
    });

    /* === Sidebar: Áudio === */
    document.getElementById('btn-volume-up').addEventListener('click', () => {
      AudioManager.init();
      AudioManager.click();
      this.setVolume(AppState.settings.volume + 0.1);
    });
    document.getElementById('btn-volume-down').addEventListener('click', () => {
      AudioManager.init();
      AudioManager.click();
      this.setVolume(AppState.settings.volume - 0.1);
    });
    document.getElementById('btn-mute').addEventListener('click', () => {
      AudioManager.init();
      AppState.settings.muted = !AppState.settings.muted;
      this.updateMuteUI();
      if (!AppState.settings.muted) AudioManager.click();
      saveState();
    });

    /* Modal de level up */
    document.getElementById('btn-close-levelup').addEventListener('click', () => {
      document.getElementById('levelup-modal').classList.add('hidden');
      AudioManager.click();
    });

    /* === Página de Configurações: Tema cards === */
    this.initSettingsThemeCards();
    /* === Página de Configurações: Fonte === */
    this.initSettingsFont();
    /* === Página de Configurações: Áudio === */
    this.initSettingsAudio();
    /* === Página de Configurações: Acessibilidade === */
    this.initSettingsA11y();
    /* === Página de Configurações: Dados === */
    this.initSettingsData();
    /* === Página de Ajuda: Acordeão === */
    this.initHelpAccordion();

    /* Aplicar configurações salvas */
    this.applySettings();
  },

  /* --- Métodos auxiliares de aplicação --- */
  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    AppState.settings.theme = theme;
    /* Se tema for dark, desligar alto contraste */
    if (theme === 'light') {
      this.setHighContrast(false);
    }
    this.updateThemeIcons(theme);
    this.syncSettingsPage();
    saveState();
  },

  setHighContrast(enabled) {
    document.documentElement.setAttribute('data-high-contrast', enabled);
    AppState.settings.highContrast = enabled;
    this.syncSettingsPage();
    saveState();
  },

  setFontSize(size) {
    const clamped = Math.max(12, Math.min(24, size));
    AppState.settings.fontSize = clamped;
    document.documentElement.style.fontSize = clamped + 'px';
    this.syncSettingsPage();
    saveState();
  },

  setVolume(vol) {
    const clamped = Math.max(0, Math.min(1, Math.round(vol * 10) / 10));
    AppState.settings.volume = clamped;
    this.updateVolumeUI();
    this.syncSettingsPage();
    saveState();
  },

  updateThemeIcons(theme) {
    document.getElementById('icon-sun').classList.toggle('hidden', theme === 'dark');
    document.getElementById('icon-moon').classList.toggle('hidden', theme === 'light');
  },

  updateVolumeUI() {
    const pct = Math.round(AppState.settings.volume * 100);
    document.getElementById('volume-display').textContent = pct + '%';
  },

  updateMuteUI() {
    document.getElementById('icon-volume').classList.toggle('hidden', AppState.settings.muted);
    document.getElementById('icon-muted').classList.toggle('hidden', !AppState.settings.muted);
  },

  /* Sincroniza os controles da página de Configurações com o estado */
  syncSettingsPage() {
    /* Theme cards */
    document.querySelectorAll('.theme-card').forEach(card => {
      const t = card.dataset.theme;
      const hc = card.dataset.highContrast === 'true';
      const isActive = t === AppState.settings.theme && hc === AppState.settings.highContrast;
      card.classList.toggle('active', isActive);
      card.setAttribute('aria-checked', isActive);
    });
    /* Font */
    const fontVal = document.getElementById('cfg-font-size-value');
    if (fontVal) fontVal.textContent = AppState.settings.fontSize;
    const fontPrev = document.getElementById('font-preview');
    if (fontPrev) fontPrev.style.fontSize = AppState.settings.fontSize + 'px';
    /* Volume slider */
    const slider = document.getElementById('cfg-volume-slider');
    if (slider) slider.value = Math.round(AppState.settings.volume * 100);
    const volText = document.getElementById('cfg-volume-value');
    if (volText) volText.textContent = Math.round(AppState.settings.volume * 100) + '%';
    /* SFX toggle */
    const sfx = document.getElementById('cfg-sfx-toggle');
    if (sfx) sfx.checked = !AppState.settings.muted;
    /* Contrast toggle */
    const hc = document.getElementById('cfg-contrast-toggle');
    if (hc) hc.checked = AppState.settings.highContrast;
  },

  applySettings() {
    /* Tema */
    document.documentElement.setAttribute('data-theme', AppState.settings.theme);
    this.updateThemeIcons(AppState.settings.theme);
    /* Alto contraste */
    document.documentElement.setAttribute('data-high-contrast', AppState.settings.highContrast);
    /* Fonte */
    document.documentElement.style.fontSize = AppState.settings.fontSize + 'px';
    /* Volume */
    this.updateVolumeUI();
    /* Mudo */
    this.updateMuteUI();
    /* Sync settings page */
    this.syncSettingsPage();
  },

  /* --- Página de Configurações: Inicialização --- */
  initSettingsThemeCards() {
    document.querySelectorAll('.theme-card').forEach(card => {
      card.addEventListener('click', () => {
        AudioManager.init();
        AudioManager.click();
        const theme = card.dataset.theme;
        const hc = card.dataset.highContrast === 'true';
        this.setTheme(theme);
        if (hc) this.setHighContrast(true);
        else if (theme === 'dark') ; /* mantém dark sem HC */
        else this.setHighContrast(false);
      });
    });
  },

  initSettingsFont() {
    const decrease = document.getElementById('cfg-font-decrease');
    const increase = document.getElementById('cfg-font-increase');
    const reset = document.getElementById('cfg-font-reset');
    if (decrease) decrease.addEventListener('click', () => { AudioManager.click(); this.setFontSize(AppState.settings.fontSize - 2); });
    if (increase) increase.addEventListener('click', () => { AudioManager.click(); this.setFontSize(AppState.settings.fontSize + 2); });
    if (reset) reset.addEventListener('click', () => { AudioManager.click(); this.setFontSize(16); });
  },

  initSettingsAudio() {
    const slider = document.getElementById('cfg-volume-slider');
    const volUp = document.getElementById('cfg-vol-up');
    const volDown = document.getElementById('cfg-vol-down');
    const sfx = document.getElementById('cfg-sfx-toggle');

    if (slider) {
      slider.addEventListener('input', () => {
        this.setVolume(parseInt(slider.value) / 100);
      });
    }
    if (volUp) volUp.addEventListener('click', () => { AudioManager.init(); AudioManager.click(); this.setVolume(AppState.settings.volume + 0.1); });
    if (volDown) volDown.addEventListener('click', () => { AudioManager.init(); AudioManager.click(); this.setVolume(AppState.settings.volume - 0.1); });
    if (sfx) {
      sfx.addEventListener('change', () => {
        AudioManager.init();
        AppState.settings.muted = !sfx.checked;
        this.updateMuteUI();
        if (sfx.checked) AudioManager.click();
        saveState();
      });
    }
  },

  initSettingsA11y() {
    const contrast = document.getElementById('cfg-contrast-toggle');
    const reducedMotion = document.getElementById('cfg-reduced-motion');
    if (contrast) {
      contrast.addEventListener('change', () => {
        AudioManager.click();
        this.setHighContrast(contrast.checked);
      });
    }
    if (reducedMotion) {
      reducedMotion.addEventListener('change', () => {
        AudioManager.click();
        document.documentElement.style.setProperty('--transition', reducedMotion ? '0.01s' : '0.3s cubic-bezier(0.4, 0, 0.2, 1)');
        document.documentElement.style.setProperty('--transition-fast', reducedMotion ? '0.01s' : '0.15s ease');
      });
    }
  },

  initSettingsData() {
    const exportBtn = document.getElementById('btn-export-data');
    const resetBtn = document.getElementById('btn-reset-data');

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        AudioManager.click();
        const data = JSON.stringify(AppState, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tabuada-destravada-dados.json';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Dados exportados com sucesso!', 'success');
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        AudioManager.click();
        if (confirm('Tem certeza que deseja apagar todos os dados? Esta ação não pode ser desfeita.')) {
          localStorage.removeItem('tabuada_destravada');
          location.reload();
        }
      });
    }
  },

  /* --- Ajuda: Acordeão --- */
  initHelpAccordion() {
    document.querySelectorAll('.help-item-header').forEach(header => {
      header.addEventListener('click', () => {
        AudioManager.click();
        const item = header.parentElement;
        const isOpen = item.classList.contains('open');

        /* Fechar todos os outros */
        document.querySelectorAll('.help-item.open').forEach(openItem => {
          if (openItem !== item) openItem.classList.remove('open');
        });

        item.classList.toggle('open', !isOpen);
        header.setAttribute('aria-expanded', !isOpen);
      });
    });
  }
};

/* ==================== INICIALIZAÇÃO ==================== */
document.addEventListener('DOMContentLoaded', () => {
  /* Carregar estado salvo */
  loadState();

  /* Inicializar todos os módulos */
  ConfettiManager.init();
  ThemeManager.init();
  Navigation.init();
  Diagnostico.init();
  Ancoras.init();
  Pontes.init();

  /* Gamificação */
  Gamification.updateStreak();
  Gamification.updateUI();
  Gamification.checkAchievements();

  /* Atualizar progresso dos módulos */
  Ancoras.updateStatusUI();
  Diagnostico.renderHeatmap();

  /* Atualizar progresso no dashboard */
  const diagPct = Math.min((Object.keys(AppState.diagnostic.results).length / 100) * 100, 100);
  const diagEl = document.querySelector('[data-module-progress="diagnostico"]');
  if (diagEl) diagEl.style.width = diagPct + '%';

  const anchorMastered = Object.values(AppState.anchors.mastered).filter(Boolean).length;
  const anchorEl = document.querySelector('[data-module-progress="ancoras"]');
  if (anchorEl) anchorEl.style.width = ((anchorMastered / 4) * 100) + '%';

  /* Acessibilidade: navegação por teclado */
  document.addEventListener('keydown', (e) => {
    /* Escape fecha modais */
    if (e.key === 'Escape') {
      const modal = document.querySelector('.modal-overlay:not(.hidden)');
      if (modal) {
        modal.classList.add('hidden');
        AudioManager.click();
      }
    }
  });

  /* Detectar primeira interação para inicializar áudio */
  ['click', 'keydown', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, () => AudioManager.init(), { once: true });
  });

  console.log('🚀 Tabuada Destravada carregada com sucesso!');
});
