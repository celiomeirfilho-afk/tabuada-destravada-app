/* ============================================================
   REGRA DE TRÊS SIMPLES — script.js
   ============================================================ */
(function () {
  'use strict';

  /* === ÁUDIO === */
  const AudioManager = (() => {
    let ctx = null, masterGain = null, musicGain = null;
    let volume = 0.8, isMuted = false, musicPlaying = false, musicOscs = [];

    function ensure() {
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = ctx.createGain(); masterGain.gain.value = volume; masterGain.connect(ctx.destination);
        musicGain = ctx.createGain(); musicGain.gain.value = 0.15; musicGain.connect(masterGain);
      }
      if (ctx.state === 'suspended') ctx.resume();
    }
    function tone(f, dur, type = 'sine', g = 0.3) {
      ensure();
      const o = ctx.createOscillator(), gn = ctx.createGain();
      o.type = type; o.frequency.value = f;
      gn.gain.setValueAtTime(g, ctx.currentTime);
      gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(gn); gn.connect(masterGain);
      o.start(ctx.currentTime); o.stop(ctx.currentTime + dur);
    }
    function seq(notes, delay = 0.12) {
      notes.forEach((n, i) => setTimeout(() => tone(n.f, n.d || 0.2, n.t || 'sine', n.g || 0.25), i * delay * 1000));
    }
    return {
      click() { tone(800, 0.08, 'sine', 0.15); },
      correct() { seq([{f:523,d:0.15},{f:659,d:0.15},{f:784,d:0.2},{f:1047,d:0.35}], 0.1); },
      wrong() { seq([{f:300,d:0.2,t:'sawtooth',g:0.15},{f:250,d:0.3,t:'sawtooth',g:0.15}], 0.15); },
      complete() { seq([{f:523,d:0.12},{f:659,d:0.12},{f:784,d:0.12},{f:1047,d:0.12},{f:1319,d:0.4}], 0.1); },
      reward() { seq([{f:880,d:0.1,g:0.2},{f:1109,d:0.1,g:0.2},{f:1319,d:0.1,g:0.2},{f:1760,d:0.3,g:0.25}], 0.08); },
      levelUp() { seq([{f:523,d:0.15},{f:659,d:0.12},{f:784,d:0.12},{f:1047,d:0.15},{f:1319,d:0.12},{f:1568,d:0.5}], 0.09); },
      toggleMusic() {
        ensure();
        if (musicPlaying) { musicOscs.forEach(o => { try { o.stop(); } catch(e){} }); musicOscs = []; musicPlaying = false; return false; }
        musicPlaying = true;
        const notes = [261,329,392,329,349,440,349,329]; let idx = 0;
        function next() {
          if (!musicPlaying) return;
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.type = 'sine'; o.frequency.value = notes[idx % notes.length];
          g.gain.setValueAtTime(0.08, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
          o.connect(g); g.connect(musicGain);
          o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.8);
          musicOscs.push(o); idx++; setTimeout(next, 900);
        }
        next(); return true;
      },
      setVolume(v) { volume = Math.max(0, Math.min(1, v)); if (masterGain) masterGain.gain.value = isMuted ? 0 : volume; },
      setMuted(m) { isMuted = m; if (masterGain) masterGain.gain.value = m ? 0 : volume; },
      getVolume: () => volume, isMuted: () => isMuted, isMusicPlaying: () => musicPlaying, init: ensure
    };
  })();

  /* === PERSISTÊNCIA === */
  const Storage = {
    get(k, fb) { try { const v = localStorage.getItem('r3s_' + k); return v !== null ? JSON.parse(v) : fb; } catch { return fb; } },
    set(k, v) { try { localStorage.setItem('r3s_' + k, JSON.stringify(v)); } catch {} }
  };

  /* === ESTADO === */
  const State = {
    xp: Storage.get('xp', 0), coins: Storage.get('coins', 0), level: Storage.get('level', 1),
    streak: Storage.get('streak', 0), totalCorrect: Storage.get('totalCorrect', 0),
    totalSolved: Storage.get('totalSolved', 0), theme: Storage.get('theme', 'dark'),
    contrast: Storage.get('contrast', 'normal'), fontScale: Storage.get('fontScale', 1),
    volumePref: Storage.get('volume', 0.8), muted: Storage.get('muted', false),
    tutorialSeen: Storage.get('tutorialSeen', false),
    currentStep: 0, stepsData: null, currentQuestionType: 'direct',
    currentQuestionSolveFor: 'D', currentQuestionData: null, currentQuestionDValue: null,
    userVerified: false, correctAnswer: null,
    save() {
      const keys = ['xp','coins','level','streak','totalCorrect','totalSolved','theme','contrast','fontScale','volume','muted','tutorialSeen'];
      const vals = [this.xp,this.coins,this.level,this.streak,this.totalCorrect,this.totalSolved,this.theme,this.contrast,this.fontScale,this.volumePref,this.muted,this.tutorialSeen];
      keys.forEach((k, i) => Storage.set(k, vals[i]));
    }
  };

  /* === 50 QUESTÕES === */
  const QUESTIONS = [
    // --- 25 DIRETAMENTE PROPORCIONAIS ---
    { text:'Se 5 cadernos custam R$ 25,00, quanto custam 3 cadernos?', a:5, b:25, c:3, type:'direct', solveFor:'D' },
    { text:'Uma plantação de 30 árvores produz 90 caixas de frutas. Quantas caixas 12 árvores produzem?', a:30, b:90, c:12, type:'direct', solveFor:'D' },
    { text:'Um tanque de 500 litros se enche em 2 horas. Em quanto tempo se enche um tanque de 250 litros?', a:500, b:2, c:250, type:'direct', solveFor:'D' },
    { text:'Se 12 pessoas são alimentadas por 3 pizzas, quantas pessoas podem ser alimentadas por 20 pizzas?', a:12, b:3, c:20, type:'direct', solveFor:'D' },
    { text:'Uma fábrica produz 180 peças em 6 horas. Quantas peças produzirá em 10 horas?', a:6, b:180, c:10, type:'direct', solveFor:'D' },
    { text:'Se 2 metros de tecido custam R$ 30,00, quanto custam 5 metros?', a:2, b:30, c:5, type:'direct', solveFor:'D' },
    { text:'Se 15 alunos precisam de 3 lousas, quantas lousas precisa 25 alunos?', a:15, b:3, c:25, type:'direct', solveFor:'D' },
    { text:'Se 10 caixas pesam 50 kg, quanto pesam 7 caixas?', a:10, b:50, c:7, type:'direct', solveFor:'D' },
    { text:'Se 7 livros têm 280 páginas, quantas páginas têm 3 livros?', a:7, b:280, c:3, type:'direct', solveFor:'D' },
    { text:'Um carro percorre 120 km com 8 litros de gasolina. Quantos km percorre com 5 litros?', a:120, b:8, c:5, type:'direct', solveFor:'D' },
    { text:'Um avião voa 2.400 km em 4 horas. Quantos km voa em 6 horas?', a:4, b:2400, c:6, type:'direct', solveFor:'D' },
    { text:'Um cachorro percorre 36 metros em 4 segundos. Que distância percorre em 7 segundos?', a:4, b:36, c:7, type:'direct', solveFor:'D' },
    { text:'Uma lâmpada acende 40 horas com 4 pilhas. Quantas horas acende com 6 pilhas?', a:40, b:4, c:6, type:'direct', solveFor:'D' },
    { text:'Se 8 livros custam R$ 64,00, quanto custam 3 livros?', a:8, b:64, c:3, type:'direct', solveFor:'D' },
    { text:'Uma estrada tem 180 km e é percorrida em 3 horas. Em quanto tempo seriam percorridos 300 km?', a:180, b:3, c:300, type:'direct', solveFor:'D' },
    { text:'Se 6 operários fazem um trabalho em 10 dias, em quantos dias 3 operários fazem?', a:6, b:10, c:3, type:'direct', solveFor:'D' },
    { text:'Um motorista gasta R$ 120,00 com 60 litros de gasolina. Quanto gasta com 45 litros?', a:60, b:120, c:45, type:'direct', solveFor:'D' },
    { text:'Se 4 máquinas produzem 200 peças em 5 horas, quantas peças produzem 7 máquinas?', a:4, b:200, c:7, type:'direct', solveFor:'D' },
    { text:'Um jardim tem 240 m² e é dividido em 8 partes iguais. Qual é a área de 3 partes?', a:8, b:240, c:3, type:'direct', solveFor:'D' },
    { text:'Se 9 garrafas têm 3,6 litros, quantos litros têm 5 garrafas?', a:9, b:3.6, c:5, type:'direct', solveFor:'D' },
    { text:'Um trem percorre 450 km em 5 horas. Quantos km percorre em 8 horas?', a:5, b:450, c:8, type:'direct', solveFor:'D' },
    { text:'Se 14 alunos precisam de 7 cadernos, quantos cadernos precisam 20 alunos?', a:14, b:7, c:20, type:'direct', solveFor:'D' },
    { text:'Um reservatório tem 800 litros e se enche em 4 horas. Em quanto tempo se enche um de 600 litros?', a:800, b:4, c:600, type:'direct', solveFor:'D' },
    { text:'Se 3 metros de corda pesam 1,5 kg, quanto pesam 7 metros?', a:3, b:1.5, c:7, type:'direct', solveFor:'D' },
    { text:'Uma empresa tem 45 funcionários e gasta R$ 9.000,00 com salários. Quanto gasta com 30 funcionários?', a:45, b:9000, c:30, type:'direct', solveFor:'D' },

    // --- 25 INVERSAMENTE PROPORCIONAIS ---
    { text:'Se 4 operários fazem um trabalho em 10 dias, em quantos dias 8 operários fazem?', a:4, b:10, c:8, type:'inverse', solveFor:'D' },
    { text:'Se 5 pintores pintam uma casa em 8 dias, em quantos dias 10 pintores pintam?', a:5, b:8, c:10, type:'inverse', solveFor:'D' },
    { text:'Se 6 máquinas produzem 180 peças em 3 horas, em quanto tempo 9 máquinas produzem?', a:6, b:3, c:9, type:'inverse', solveFor:'D' },
    { text:'Se 8 caminhões transportam 40 toneladas em 5 viagens, quantas viagens 10 caminhões fazem?', a:8, b:5, c:10, type:'inverse', solveFor:'D' },
    { text:'Se 3 bombas enchem um reservatório em 12 horas, em quanto tempo 4 bombas enchem?', a:3, b:12, c:4, type:'inverse', solveFor:'D' },
    { text:'Se 10 operários constroem um muro em 6 dias, em quantos dias 15 operários constroem?', a:10, b:6, c:15, type:'inverse', solveFor:'D' },
    { text:'Se 4 torneiras enchem uma piscina em 8 horas, em quanto tempo 2 torneiras enchem?', a:4, b:8, c:2, type:'inverse', solveFor:'D' },
    { text:'Se 7 motoristas dirigem 14 horas cada, em quantas horas dirigem 2 motoristas?', a:7, b:14, c:2, type:'inverse', solveFor:'D' },
    { text:'Se 5 impressoras imprimem 200 páginas em 4 minutos, em quanto tempo 8 impressoras imprimem?', a:5, b:4, c:8, type:'inverse', solveFor:'D' },
    { text:'Se 6 carpinteiros fazem 30 cadeiras em 5 dias, em quantos dias 10 carpinteiros fazem?', a:6, b:5, c:10, type:'inverse', solveFor:'D' },
    { text:'Se 3 geradores funcionam 20 horas cada, em quantas horas funcionam 5 geradores?', a:3, b:20, c:5, type:'inverse', solveFor:'D' },
    { text:'Se 12 operários fazem um serviço em 8 dias, em quantos dias 6 operários fazem?', a:12, b:8, c:6, type:'inverse', solveFor:'D' },
    { text:'Se 4 bombas drenam um lago em 10 horas, em quanto tempo 5 bombas drenam?', a:4, b:10, c:5, type:'inverse', solveFor:'D' },
    { text:'Se 9 estudantes fazem um trabalho em 7 dias, em quantos dias 3 estudantes fazem?', a:9, b:7, c:3, type:'inverse', solveFor:'D' },
    { text:'Se 2 caixas de supermercado atendem 40 clientes por hora, quantas caixas atendem 50 clientes?', a:2, b:40, c:50, type:'inverse', solveFor:'D' },
    { text:'Se 5 ventiladores resfriam uma sala em 6 horas, em quanto tempo 3 ventiladores resfriam?', a:5, b:6, c:3, type:'inverse', solveFor:'D' },
    { text:'Se 8 soldados fazem uma tarefa em 4 dias, em quantos dias 16 soldados fazem?', a:8, b:4, c:16, type:'inverse', solveFor:'D' },
    { text:'Se 3 estações de rádio transmitem 18 horas cada, em quantas horas transmitem 6 estações?', a:3, b:18, c:6, type:'inverse', solveFor:'D' },
    { text:'Se 10 caminhoneiros fazem 20 viagens em 5 dias, em quantos dias 4 caminhoneiros fazem?', a:10, b:5, c:4, type:'inverse', solveFor:'D' },
    { text:'Se 6 eletricistas instalam 36 lâmpadas em 3 dias, em quantos dias 9 eletricistas instalam?', a:6, b:3, c:9, type:'inverse', solveFor:'D' },
    { text:'Se 7 tanques de combustível duram 14 dias para 100 pessoas, para quantos dias duram para 200 pessoas?', a:7, b:14, c:7, type:'inverse', solveFor:'D', dValue:200 },
    { text:'Se 4 usinas produzem energia para 500 casas em 24 horas, em quanto tempo produzem para 800 casas?', a:4, b:24, c:4, type:'inverse', solveFor:'D', dValue:800 },
    { text:'Se 5 bombeiros enchem 10 baldes em 2 minutos, em quanto tempo 2 bombeiros enchem?', a:5, b:2, c:2, type:'inverse', solveFor:'D' },
    { text:'Se 3 aviões transportam 300 passageiros em 5 horas, em quanto tempo 6 aviões transportam?', a:3, b:5, c:6, type:'inverse', solveFor:'D' },
    { text:'Se 8 telefones tocam 60 vezes em 10 minutos, quantas vezes tocam 4 telefones?', a:8, b:60, c:4, type:'inverse', solveFor:'D' },
  ];

  let currentQuestionIndex = -1;

  function showRandomQuestion() {
    let idx;
    do { idx = Math.floor(Math.random() * QUESTIONS.length); } while (idx === currentQuestionIndex && QUESTIONS.length > 1);
    currentQuestionIndex = idx;
    const q = QUESTIONS[idx];
    DOM.questionText.textContent = q.text;
    State.currentQuestionType = q.type;
    State.currentQuestionSolveFor = q.solveFor || 'D';
    State.currentQuestionData = q;
    State.currentQuestionDValue = q.dValue || null;
    State.userVerified = false;
    State.correctAnswer = null;

    const sf = q.solveFor || 'D';
    const fieldMap = { A: DOM.valA, B: DOM.valB, C: DOM.valC, D: DOM.valD };
    const labelMap = {
      A: DOM.valA.parentElement.querySelector('.input-label'),
      B: DOM.valB.parentElement.querySelector('.input-label'),
      C: DOM.valC.parentElement.querySelector('.input-label'),
      D: DOM.valD.parentElement.querySelector('.input-label')
    };
    ['A','B','C','D'].forEach(key => {
      const el = fieldMap[key]; const lbl = labelMap[key];
      if (key === sf) {
        el.readOnly = true; el.value = '?'; el.classList.add('input-unknown');
        el.parentElement.classList.add('unknown-cell');
        if (lbl) lbl.textContent = `Valor ${key} (incógnita = ?)`;
      } else {
        el.readOnly = false; el.value = ''; el.classList.remove('input-unknown');
        el.parentElement.classList.remove('unknown-cell');
        if (lbl) lbl.textContent = `Valor ${key} (conhecido)`;
      }
    });

    DOM.userAnswer.value = '';
    DOM.answerIcon.textContent = '';
    DOM.answerIcon.className = 'answer-icon';
    DOM.userAnswer.classList.remove('input-error', 'input-success');
    DOM.btnVerify.classList.remove('hidden');
    DOM.btnSolve.classList.add('hidden');
    DOM.sectionSteps.classList.add('card-hidden');
    DOM.stepsContainer.innerHTML = '';
    DOM.finalResult.classList.add('hidden');
    DOM.btnRestart.classList.add('hidden');
    return q;
  }

  function xpForLevel(l) { return 80 + (l - 1) * 40; }

  /* === DOM === */
  const $ = s => document.querySelector(s);
  const DOM = {
    valA: $('#val-a'), valB: $('#val-b'), valC: $('#val-c'), valD: $('#val-d'),
    questionText: $('#question-text'), btnVerify: $('#btn-verify'), btnSolve: $('#btn-solve'),
    sectionInput: $('#section-input'), userAnswer: $('#user-answer'), answerIcon: $('#answer-icon'),
    sectionSteps: $('#section-steps'), stepsContainer: $('#steps-container'),
    finalResult: $('#final-result'), resultText: $('#result-text'),
    resultExplanation: $('#result-explanation'), btnRestart: $('#btn-restart'),
    levelDisplay: $('#level-display'), xpDisplay: $('#xp-display'),
    coinsDisplay: $('#coins-display'), streakDisplay: $('#streak-display'),
    xpBar: $('#xp-bar'), xpBarText: $('#xp-bar-text'), xpBarWrapper: $('.xp-bar-wrapper'),
    levelUpModal: $('#level-up-modal'), newLevelDisplay: $('#new-level-display'),
    btnCloseLevelModal: $('#btn-close-level-modal'),
    helpModal: $('#help-modal'), btnCloseHelp: $('#btn-close-help'),
    tutorialModal: $('#tutorial-modal'), tutorialPrev: $('#tutorial-prev'),
    tutorialNext: $('#tutorial-next'), tutorialSkip: $('#tutorial-skip'),
    tutorialProgressBar: $('#tutorial-progress-bar'), tutorialCounter: $('#tutorial-counter'),
    btnHamburger: $('#btn-hamburger'), mainMenu: $('#main-menu'),
    menuOverlay: $('#menu-overlay'), btnCloseMenu: $('#btn-close-menu'),
    menuBtnStart: $('#menu-btn-start'), menuBtnSample: $('#menu-btn-sample'),
    menuBtnTutorial: $('#menu-btn-tutorial'), menuBtnHelp: $('#menu-btn-help'),
    menuBtnThemeLight: $('#menu-btn-theme-light'), menuBtnThemeDark: $('#menu-btn-theme-dark'),
    menuBtnContrast: $('#menu-btn-contrast'),
    menuFontUp: $('#menu-font-up'), menuFontDown: $('#menu-font-down'),
    fontSizeDisplay: $('#font-size-display'),
    menuVolumeUp: $('#menu-volume-up'), menuVolumeDown: $('#menu-volume-down'),
    volumeDisplay: $('#volume-display'),
    menuBtnMute: $('#menu-btn-mute'), menuBtnMusic: $('#menu-btn-music'),
    confettiCanvas: $('#confetti-canvas'), toastContainer: $('#toast-container'),
  };

  /* === CONFETES === */
  const Confetti = (() => {
    const c = DOM.confettiCanvas, cx = c.getContext('2d');
    let ps = [], anim = false;
    function resize() { c.width = window.innerWidth; c.height = window.innerHeight; }
    window.addEventListener('resize', resize); resize();
    const colors = ['#C08A28','#1F6E63','#C4472E','#5B4B93','#34d399','#d49a30','#2a9d8f'];
    function create(n = 80) { for (let i = 0; i < n; i++) ps.push({ x:Math.random()*c.width, y:-10-Math.random()*100, w:6+Math.random()*8, h:4+Math.random()*6, color:colors[Math.floor(Math.random()*colors.length)], vx:(Math.random()-0.5)*4, vy:2+Math.random()*4, rot:Math.random()*Math.PI*2, rotSpeed:(Math.random()-0.5)*0.2, opacity:1 }); }
    function animate() {
      cx.clearRect(0, 0, c.width, c.height);
      ps.forEach(p => { p.x+=p.vx; p.y+=p.vy; p.vy+=0.05; p.rot+=p.rotSpeed; if(p.y>c.height*0.85) p.opacity-=0.02; cx.save(); cx.globalAlpha=Math.max(0,p.opacity); cx.translate(p.x,p.y); cx.rotate(p.rot); cx.fillStyle=p.color; cx.fillRect(-p.w/2,-p.h/2,p.w,p.h); cx.restore(); });
      ps = ps.filter(p => p.opacity > 0 && p.y < c.height + 20);
      if (ps.length > 0) requestAnimationFrame(animate); else anim = false;
    }
    return { burst(n = 100) { create(n); if (!anim) { anim = true; animate(); } } };
  })();

  function showToast(msg, type = 'info', dur = 3000) {
    const t = document.createElement('div');
    t.className = `toast toast-${type}`; t.textContent = msg; t.setAttribute('role', 'status');
    DOM.toastContainer.appendChild(t);
    setTimeout(() => { t.classList.add('toast-exit'); setTimeout(() => t.remove(), 400); }, dur);
  }

  function updateHUD() {
    DOM.levelDisplay.textContent = State.level;
    DOM.xpDisplay.textContent = State.xp;
    DOM.coinsDisplay.textContent = State.coins;
    DOM.streakDisplay.textContent = State.streak;
    const needed = xpForLevel(State.level);
    const pct = Math.min(100, (State.xp / needed) * 100);
    DOM.xpBar.style.width = pct + '%';
    DOM.xpBarText.textContent = `${State.xp} / ${needed} XP`;
    DOM.xpBarWrapper.setAttribute('aria-valuenow', Math.round(pct));
  }

  function awardXP(amount) {
    State.xp += amount;
    const needed = xpForLevel(State.level);
    while (State.xp >= needed) { State.xp -= needed; State.level++; showLevelUpModal(); AudioManager.levelUp(); }
    State.coins += Math.floor(amount / 5) + 1;
    updateHUD(); State.save();
  }

  function showLevelUpModal() {
    DOM.newLevelDisplay.textContent = State.level;
    DOM.levelUpModal.classList.remove('hidden');
    Confetti.burst(150);
  }

  /* === CÁLCULO === */
  function calcular(a, b, c, type, solveFor, knownValue) {
    type = type || 'direct'; solveFor = solveFor || 'D';
    const isUA = solveFor==='A', isUB = solveFor==='B', isUC = solveFor==='C';
    if ((!isUA && (a===null||a===undefined||a===0)) || (!isUB && (b===null||b===undefined||b===0)) || (!isUC && (c===null||c===undefined||c===0)))
      return { error:true, message:'Preencha todos os valores conhecidos!' };
    if ((!isUA && a<0) || (!isUB && b<0) || (!isUC && c<0))
      return { error:true, message:'Use valores positivos!' };

    const isDirect = type === 'direct';
    let Av, Bv, Cv, Dv;
    if (solveFor==='D') { Av=a; Bv=b; Cv=c; Dv=isDirect?(Bv*Cv)/Av:(Av*Bv)/Cv; }
    else if (solveFor==='C') { Av=a; Bv=b; Dv=knownValue; Cv=isDirect?(Av*Dv)/Bv:(Av*Bv)/Dv; }
    else if (solveFor==='B') { Av=a; Cv=c; Dv=knownValue; Bv=isDirect?(Av*Dv)/Cv:(Cv*Dv)/Av; }
    else { Bv=b; Cv=c; Dv=knownValue; Av=isDirect?(Bv*Cv)/Dv:(Cv*Dv)/Bv; }

    const answer = solveFor==='D'?Dv:solveFor==='C'?Cv:solveFor==='B'?Bv:Av;
    const answerF = Number.isInteger(answer) ? answer.toString() : answer.toFixed(4).replace(/0+$/,'').replace(/\.$/,'');
    const propLabel = isDirect ? 'diretamente proporcional' : 'inversamente proporcional';
    const propRule = isDirect ? 'Quando uma grandeza aumenta, a outra também aumenta.' : 'Quando uma grandeza aumenta, a outra diminui.';

    let proportionStr, crossStr, formulaCalcStr, crossExplainStr, verifyStr;
    if (isDirect) {
      switch(solveFor) {
        case 'D': proportionStr=`${Av} / ${Bv} = ${Cv} / X`; crossStr=`${Av} × X = ${Bv} × ${Cv}`; formulaCalcStr=`X = (B × C) / A = (${Bv} × ${Cv}) / ${Av}`; crossExplainStr='Proporção direta: A/B = C/D → A·D = B·C.'; verifyStr=`Verificação: ${Av}/${Bv} = ${(Av/Bv).toFixed(4)} e ${Cv}/${answerF} = ${(Cv/answer).toFixed(4)} ✓`; break;
        case 'C': proportionStr=`${Av} / ${Bv} = X / ${Dv}`; crossStr=`${Av} × ${Dv} = ${Bv} × X`; formulaCalcStr=`X = (A × D) / B = (${Av} × ${Dv}) / ${Bv}`; crossExplainStr='Proporção direta: A/B = C/D → A·D = B·C.'; verifyStr=`Verificação: ${Av}/${Bv} = ${(Av/Bv).toFixed(4)} e ${answerF}/${Dv} = ${(answer/Dv).toFixed(4)} ✓`; break;
        case 'B': proportionStr=`${Av} / X = ${Cv} / ${Dv}`; crossStr=`${Av} × ${Dv} = X × ${Cv}`; formulaCalcStr=`X = (A × D) / C = (${Av} × ${Dv}) / ${Cv}`; crossExplainStr='Proporção direta: A/B = C/D → A·D = B·C.'; verifyStr=`Verificação: ${Av}/${answerF} = ${(Av/answer).toFixed(4)} e ${Cv}/${Dv} = ${(Cv/Dv).toFixed(4)} ✓`; break;
        case 'A': proportionStr=`X / ${Bv} = ${Cv} / ${Dv}`; crossStr=`X × ${Dv} = ${Bv} × ${Cv}`; formulaCalcStr=`X = (B × C) / D = (${Bv} × ${Cv}) / ${Dv}`; crossExplainStr='Proporção direta: A/B = C/D → A·D = B·C.'; verifyStr=`Verificação: ${answerF}/${Bv} = ${(answer/Bv).toFixed(4)} e ${Cv}/${Dv} = ${(Cv/Dv).toFixed(4)} ✓`; break;
      }
    } else {
      switch(solveFor) {
        case 'D': proportionStr=`${Av} × ${Bv} = ${Cv} × X`; crossStr=`${Av} × ${Bv} = ${Cv} × X`; formulaCalcStr=`X = (A × B) / C = (${Av} × ${Bv}) / ${Cv}`; crossExplainStr='Proporção inversa: A×B = C×D.'; verifyStr=`Verificação: ${Av}×${Bv} = ${Av*Bv} e ${Cv}×${answerF} = ${Cv*answer} ✓`; break;
        case 'C': proportionStr=`${Av} × ${Bv} = X × ${Dv}`; crossStr=`${Av} × ${Bv} = X × ${Dv}`; formulaCalcStr=`X = (A × B) / D = (${Av} × ${Bv}) / ${Dv}`; crossExplainStr='Proporção inversa: A×B = C×D.'; verifyStr=`Verificação: ${Av}×${Bv} = ${Av*Bv} e ${answerF}×${Dv} = ${answer*Dv} ✓`; break;
        case 'B': proportionStr=`${Av} × X = ${Cv} × ${Dv}`; crossStr=`${Av} × X = ${Cv} × ${Dv}`; formulaCalcStr=`X = (C × D) / A = (${Cv} × ${Dv}) / ${Av}`; crossExplainStr='Proporção inversa: A×B = C×D.'; verifyStr=`Verificação: ${Av}×${answerF} = ${Av*answer} e ${Cv}×${Dv} = ${Cv*Dv} ✓`; break;
        case 'A': proportionStr=`X × ${Bv} = ${Cv} × ${Dv}`; crossStr=`X × ${Bv} = ${Cv} × ${Dv}`; formulaCalcStr=`X = (C × D) / B = (${Cv} × ${Dv}) / ${Bv}`; crossExplainStr='Proporção inversa: A×B = C×D.'; verifyStr=`Verificação: ${answerF}×${Bv} = ${answer*Bv} e ${Cv}×${Dv} = ${Cv*Dv} ✓`; break;
      }
    }

    return {
      error:false, a:Av, b:Bv, c:Cv, d:answer, dFormatted:answerF, type, solveFor,
      steps: [
        { number:1, title:'Identificar o Tipo', body:`As grandezas são <strong>${propLabel}</strong>. ${propRule}`, math: isDirect?`${Av} ↑ → ${Bv} ↑`:`${Av} ↑ → ${Bv} ↓`, highlight:`Usamos a fórmula da proporção ${isDirect?'direta':'inversa'}.` },
        { number:2, title:'Montar a Proporção', body:'Organize os valores conhecidos.', math:proportionStr, highlight: isDirect?`A incógnita é <strong>${solveFor}</strong>.`:`O produto das grandezas é constante. A incógnita é <strong>${solveFor}</strong>.` },
        { number:3, title:'Isolar o Incógnita', body: isDirect?'Multiplicamos cruzado e dividimos.':'Isolamos X dividindo pelo coeficiente.', math:crossStr, highlight:crossExplainStr },
        { number:4, title:'Calcular', body:'Aplique a fórmula:', math:formulaCalcStr, highlight:`X = ${answerF}` },
        { number:5, title:'Resposta Final', body:'O valor desconhecido é:', math:`X = ${answerF}`, isFinal:true, highlight:verifyStr }
      ]
    };
  }

  function formatMathLine(l) { return l.replace(/X/g,'<span class="math-unknown">X</span>').replace(/=/g,'<span class="math-equals">=</span>'); }

  function showStep(i) {
    const data = State.stepsData; if (!data||!data.steps) return;
    const step = data.steps[i]; if (!step) return;
    const card = document.createElement('div');
    card.className = 'step-card'; card.setAttribute('data-step', step.number);
    card.style.animationDelay = `${i*0.1}s`;
    let mathHTML = step.math ? step.math.split('\n').map(l => `<div class="step-math-line">${formatMathLine(l)}</div>`).join('') : '';
    card.innerHTML = `<div class="step-header"><span class="step-number">${step.number}</span><span class="step-title">${step.title}</span></div><div class="step-body"><p>${step.body}</p><div class="step-math">${mathHTML}</div>${step.highlight?`<div class="step-highlight">${step.highlight}</div>`:''}</div>`;
    DOM.stepsContainer.appendChild(card);
    if (step.isFinal) showFinalResult(data);
  }

  function showFinalResult(data) {
    const { a, b, c, d } = data;
    DOM.resultText.textContent = `X = ${data.dFormatted}`;
    let vh;
    if (data.type === 'direct') {
      vh = `<strong>Verificação:</strong> ${a}/${b} = ${(a/b).toFixed(4)} | ${c}/${d.toFixed(4)} = ${(c/d).toFixed(4)}<br>As razões são iguais! ✅`;
    } else {
      vh = `<strong>Verificação:</strong> ${a}×${b} = ${a*b} | ${c}×${d.toFixed(4)} = ${(c*d).toFixed(4)}<br>Os produtos são iguais! ✅`;
    }
    DOM.resultExplanation.innerHTML = vh;
    DOM.finalResult.classList.remove('hidden');
    DOM.btnRestart.classList.remove('hidden');
  }

  function validateInputs() {
    let valid = true;
    const sf = State.currentQuestionSolveFor || 'D';
    const fm = { A:DOM.valA, B:DOM.valB, C:DOM.valC, D:DOM.valD };
    Object.keys(fm).forEach(k => {
      const el = fm[k]; el.classList.remove('input-error','input-success');
      if (k === sf) { el.classList.add('input-success'); return; }
      if (el.value.trim() === '' || isNaN(parseFloat(el.value))) { el.classList.add('input-error'); valid = false; }
      else el.classList.add('input-success');
    });
    return valid;
  }

  /* === VERIFICAR RESPOSTA === */
  function handleVerify() {
    AudioManager.init(); AudioManager.click();
    if (!validateInputs()) { AudioManager.wrong(); showToast('Preencha todos os valores conhecidos!', 'error'); return; }

    const sf = State.currentQuestionSolveFor || 'D';
    const rawA = sf==='A'?null:DOM.valA.value.trim();
    const rawB = sf==='B'?null:DOM.valB.value.trim();
    const rawC = sf==='C'?null:DOM.valC.value.trim();
    const a = rawA===null?null:parseFloat(rawA);
    const b = rawB===null?null:parseFloat(rawB);
    const c = rawC===null?null:parseFloat(rawC);

    const result = calcular(a, b, c, State.currentQuestionType, State.currentQuestionSolveFor, State.currentQuestionDValue);
    if (result.error) { AudioManager.wrong(); showToast(result.message, 'error'); return; }

    State.correctAnswer = result.d;
    const userVal = DOM.userAnswer.value.trim();

    if (userVal === '' || isNaN(parseFloat(userVal))) {
      showToast('Digite sua resposta antes de verificar!', 'error');
      DOM.userAnswer.classList.add('input-error');
      return;
    }

    const userNum = parseFloat(userVal);
    const tolerance = Math.abs(result.d) * 0.01 || 0.01;
    const isCorrect = Math.abs(userNum - result.d) <= tolerance;

    State.userVerified = true;
    State.totalSolved++;

    if (isCorrect) {
      AudioManager.correct();
      DOM.answerIcon.textContent = '✓';
      DOM.answerIcon.className = 'answer-icon correct';
      DOM.userAnswer.classList.add('input-success');
      DOM.userAnswer.classList.remove('input-error');
      showToast('Parabéns! Resposta correta! 🎉', 'success');
      State.streak++;
      awardXP(25);
      Confetti.burst(60);
    } else {
      AudioManager.wrong();
      DOM.answerIcon.textContent = '✗';
      DOM.answerIcon.className = 'answer-icon wrong';
      DOM.userAnswer.classList.add('input-error');
      DOM.userAnswer.classList.remove('input-success');
      showToast(`Resposta incorreta. O correto é ${result.dFormatted}. Veja a resolução.`, 'error', 4000);
      State.streak = 0;
      awardXP(5);
    }

    State.save();
    DOM.btnVerify.classList.add('hidden');
    DOM.btnSolve.classList.remove('hidden');
    DOM.btnSolve.scrollIntoView({ behavior:'smooth', block:'center' });
  }

  /* === RESOLVER === */
  function handleSolve() {
    AudioManager.init(); AudioManager.click();
    if (!validateInputs()) { AudioManager.wrong(); showToast('Preencha os valores!', 'error'); return; }

    const sf = State.currentQuestionSolveFor || 'D';
    const rawA = sf==='A'?null:DOM.valA.value.trim();
    const rawB = sf==='B'?null:DOM.valB.value.trim();
    const rawC = sf==='C'?null:DOM.valC.value.trim();
    const a = rawA===null?null:parseFloat(rawA);
    const b = rawB===null?null:parseFloat(rawB);
    const c = rawC===null?null:parseFloat(rawC);

    const result = calcular(a, b, c, State.currentQuestionType, State.currentQuestionSolveFor, State.currentQuestionDValue);
    if (result.error) { AudioManager.wrong(); showToast(result.message, 'error'); return; }

    State.stepsData = result;
    DOM.sectionSteps.classList.remove('card-hidden');
    DOM.stepsContainer.innerHTML = '';
    DOM.finalResult.classList.add('hidden');
    DOM.btnRestart.classList.add('hidden');
    for (let i = 0; i < result.steps.length; i++) showStep(i);
    DOM.btnRestart.classList.remove('hidden');
    DOM.sectionSteps.scrollIntoView({ behavior:'smooth', block:'start' });
    AudioManager.complete();
  }

  function handleRestart() {
    AudioManager.click();
    DOM.sectionSteps.classList.add('card-hidden');
    DOM.stepsContainer.innerHTML = '';
    DOM.finalResult.classList.add('hidden');
    DOM.btnRestart.classList.add('hidden');
    DOM.btnSolve.classList.add('hidden');
    DOM.btnVerify.classList.remove('hidden');
    State.stepsData = null;
    showRandomQuestion();
    DOM.sectionInput.scrollIntoView({ behavior:'smooth', block:'start' });
    showToast('Nova questão! Tente resolver.', 'info');
  }

  function handleApplySample() {
    AudioManager.init(); AudioManager.click(); closeMenu();
    const q = showRandomQuestion();
    const sf = q.solveFor || 'D';
    if (sf!=='A') DOM.valA.value = q.a;
    if (sf!=='B') DOM.valB.value = q.b;
    if (sf!=='C') DOM.valC.value = q.c;
    [DOM.valA, DOM.valB, DOM.valC].forEach(el => { if (!el.readOnly) el.classList.add('input-success'); });
    showToast('Exemplo aplicado! Tente sua resposta.', 'info');
    DOM.sectionInput.scrollIntoView({ behavior:'smooth', block:'start' });
  }

  /* === MENU === */
  function openMenu() { DOM.mainMenu.classList.add('open'); DOM.menuOverlay.classList.remove('hidden'); DOM.btnHamburger.setAttribute('aria-expanded','true'); }
  function closeMenu() { DOM.mainMenu.classList.remove('open'); DOM.menuOverlay.classList.add('hidden'); DOM.btnHamburger.setAttribute('aria-expanded','false'); }
  function toggleMenu() { DOM.mainMenu.classList.contains('open') ? closeMenu() : openMenu(); }

  /* === TUTORIAL === */
  let tutorialSlide = 0;
  const totalSlides = 5;
  function showTutorialSlide(n) {
    document.querySelectorAll('.tutorial-slide').forEach(s => s.classList.remove('active'));
    document.querySelector(`.tutorial-slide[data-slide="${n}"]`).classList.add('active');
    DOM.tutorialProgressBar.style.width = ((n + 1) / totalSlides * 100) + '%';
    DOM.tutorialCounter.textContent = `${n + 1} / ${totalSlides}`;
    DOM.tutorialPrev.disabled = n === 0;
    DOM.tutorialNext.textContent = n === totalSlides - 1 ? 'Começar!' : 'Próximo';
    if (n === totalSlides - 1) {
      DOM.tutorialNext.innerHTML = 'Começar! <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true"><polygon points="5,3 19,12 5,21" fill="currentColor"/></svg>';
    } else {
      DOM.tutorialNext.innerHTML = 'Próximo <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9,6 15,12 9,18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
  }
  function openTutorial() { tutorialSlide = 0; showTutorialSlide(0); DOM.tutorialModal.classList.remove('hidden'); }
  function closeTutorial() { DOM.tutorialModal.classList.add('hidden'); State.tutorialSeen = true; State.save(); }

  /* === TEMA === */
  function applyTheme(t) { document.documentElement.setAttribute('data-theme', t); State.theme = t; State.save(); updateThemeUI(); }
  function setContrast(v) { document.documentElement.setAttribute('data-contrast', v); State.contrast = v; State.save(); updateThemeUI(); }
  function updateThemeUI() {
    DOM.menuBtnThemeLight.setAttribute('data-active', State.theme==='light' && State.contrast==='normal');
    DOM.menuBtnThemeDark.setAttribute('data-active', State.theme==='dark' && State.contrast==='normal');
    DOM.menuBtnContrast.setAttribute('data-active', State.contrast==='high');
  }
  function applyFontScale(s) { document.documentElement.style.setProperty('--font-scale', s); DOM.fontSizeDisplay.textContent = Math.round(s*100)+'%'; State.fontScale = s; State.save(); }
  function changeFont(d) { applyFontScale(Math.max(0.75, Math.min(1.75, State.fontScale + d))); AudioManager.init(); AudioManager.click(); }
  function applyVolume(v) { AudioManager.setVolume(v); State.volumePref = v; DOM.volumeDisplay.textContent = Math.round(v*100)+'%'; State.save(); }
  function changeVolume(d) { applyVolume(Math.max(0, Math.min(1, State.volumePref + d))); AudioManager.init(); AudioManager.click(); }
  function toggleMute() { const m = !AudioManager.isMuted(); AudioManager.setMuted(m); State.muted = m; State.save(); AudioManager.init(); DOM.menuBtnMute.classList.toggle('active', m); showToast(m?'Áudio silenciado':'Áudio restaurado', 'info'); }
  function toggleMusic() { AudioManager.init(); const p = AudioManager.toggleMusic(); DOM.menuBtnMusic.classList.toggle('active', p); showToast(p?'Música ligada':'Música desligada', 'info'); }

  /* === EVENTOS === */
  function bindEvents() {
    DOM.btnVerify.addEventListener('click', handleVerify);
    DOM.btnSolve.addEventListener('click', handleSolve);
    DOM.btnRestart.addEventListener('click', handleRestart);
    DOM.btnHamburger.addEventListener('click', toggleMenu);
    DOM.btnCloseMenu.addEventListener('click', closeMenu);
    DOM.menuOverlay.addEventListener('click', closeMenu);
    DOM.menuBtnStart.addEventListener('click', () => { closeMenu(); showToast('Pratique!', 'info'); });
    DOM.menuBtnSample.addEventListener('click', handleApplySample);
    DOM.menuBtnTutorial.addEventListener('click', () => { closeMenu(); openTutorial(); });
    DOM.menuBtnHelp.addEventListener('click', () => { closeMenu(); DOM.helpModal.classList.remove('hidden'); });
    DOM.btnCloseHelp.addEventListener('click', () => DOM.helpModal.classList.add('hidden'));
    DOM.menuBtnThemeLight.addEventListener('click', () => { AudioManager.init(); AudioManager.click(); applyTheme('light'); setContrast('normal'); showToast('Modo claro', 'info'); });
    DOM.menuBtnThemeDark.addEventListener('click', () => { AudioManager.init(); AudioManager.click(); applyTheme('dark'); setContrast('normal'); showToast('Modo escuro', 'info'); });
    DOM.menuBtnContrast.addEventListener('click', () => { AudioManager.init(); AudioManager.click(); const n = State.contrast==='high'?'normal':'high'; setContrast(n); showToast(n?'Alto contraste':'Contraste normal', 'info'); });
    DOM.menuFontUp.addEventListener('click', () => changeFont(0.1));
    DOM.menuFontDown.addEventListener('click', () => changeFont(-0.1));
    DOM.menuVolumeUp.addEventListener('click', () => changeVolume(0.1));
    DOM.menuVolumeDown.addEventListener('click', () => changeVolume(-0.1));
    DOM.menuBtnMute.addEventListener('click', toggleMute);
    DOM.menuBtnMusic.addEventListener('click', toggleMusic);
    DOM.btnCloseLevelModal.addEventListener('click', () => DOM.levelUpModal.classList.add('hidden'));

    // Tutorial
    DOM.tutorialPrev.addEventListener('click', () => { if (tutorialSlide > 0) { tutorialSlide--; showTutorialSlide(tutorialSlide); } });
    DOM.tutorialNext.addEventListener('click', () => { if (tutorialSlide < totalSlides - 1) { tutorialSlide++; showTutorialSlide(tutorialSlide); } else closeTutorial(); });
    DOM.tutorialSkip.addEventListener('click', closeTutorial);

    document.addEventListener('keydown', e => { if (e.key==='Escape') { if (!DOM.mainMenu.classList.contains('open')) { DOM.levelUpModal.classList.add('hidden'); DOM.helpModal.classList.add('hidden'); DOM.tutorialModal.classList.add('hidden'); return; } closeMenu(); } });
    [DOM.valA, DOM.valB, DOM.valC].forEach(el => el.addEventListener('keydown', e => { if (e.key==='Enter') { e.preventDefault(); handleVerify(); } }));
    DOM.userAnswer.addEventListener('keydown', e => { if (e.key==='Enter') { e.preventDefault(); if (!DOM.btnVerify.classList.contains('hidden')) handleVerify(); else handleSolve(); } });
    document.addEventListener('click', () => AudioManager.init(), { once: true });
  }

  function init() {
    applyTheme(State.theme);
    document.documentElement.setAttribute('data-contrast', State.contrast);
    applyFontScale(State.fontScale);
    applyVolume(State.volumePref);
    AudioManager.setMuted(State.muted);
    DOM.menuBtnMute.classList.toggle('active', State.muted);
    updateThemeUI();
    updateHUD();
    showRandomQuestion();
    bindEvents();
    if (!State.tutorialSeen) setTimeout(openTutorial, 800);
    console.log('[Regra de Três Simples] Inicializado!');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
