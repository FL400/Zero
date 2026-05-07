'use strict';

// ================================================================
//  ESTADO DO JOGO
// ================================================================
const G = {
  zeros: 0,
  totalEarned: 0,
  totalClicks: 0,
  perClick: 1,
  perSec: 0,
  prestige: 0,
  prestigeMulti: 1,
  combo: 1,
  comboTimer: 0,
  comboMax: 10,
  comboDecay: 3.0,
  lastClickTime: 0,
  generators: [],
  upgradesBought: new Set(),
  achievementsUnlocked: new Set(),
  specialization: null,
  skills: {},
  milestones: [100,500,1000,5000,10e3,50e3,100e3,500e3,1e6,5e6,1e7,5e7,
               1e8,5e8,1e9,5e9,1e10,1e11,1e12,1e15,1e18,1e21,Infinity],
  milestoneIdx: 0,
  achClickBonus: 0,
  achGenBonus: 0,
  autoBuyActive: false,
  autoBuyTimer: 0,
  activeEvent: null,
  eventTimer: 0,
  nextEventIn: 0,
  ascensions: 0,
  ascensionMulti: 1,
  tick: 0,
  lastSaveTime: Date.now(),
  lastTimestamp: Date.now(),
};

// ================================================================
//  DEFINIÇÕES DE GERADORES
// ================================================================
const GENERATOR_DEFS = [
  { id:0, icon:'🔬', name:'Nano-Zero',    desc:'Gera zeros automaticamente.',        base:10,     baseProd:0.1  },
  { id:1, icon:'🤖', name:'Bot Clicker',  desc:'Um robô que clica pra você.',        base:80,     baseProd:0.5  },
  { id:2, icon:'🌾', name:'Fazenda 0',    desc:'Plantação de zeros por segundo.',    base:500,    baseProd:2    },
  { id:3, icon:'⛏️', name:'Mina de 0',    desc:'Extrai zeros da rocha digital.',     base:3200,   baseProd:8    },
  { id:4, icon:'🏭', name:'Fábrica 0',    desc:'Produção industrial de zeros.',      base:25000,  baseProd:25   },
  { id:5, icon:'🏦', name:'Banco 0',      desc:'Juros em zeros por segundo.',        base:150000, baseProd:80   },
  { id:6, icon:'🌀', name:'Portal Zero',  desc:'Importa zeros de outras dimensões.', base:1e6,   baseProd:250  },
  { id:7, icon:'⭐', name:'Estrela 0',    desc:'Uma estrela que irradia zeros.',     base:1e7,    baseProd:800  },
  { id:8, icon:'🕳️', name:'Buraco Zero',  desc:'Suga zeros do vácuo quântico.',      base:1e8,   baseProd:2500 },
  { id:9, icon:'🌌', name:'Universo 0',   desc:'Todo o universo é seus zeros.',      base:1e10,   baseProd:10000},
];

// ================================================================
//  UPGRADES
// ================================================================
const UPGRADE_DEFS = [
  { id:'u1', icon:'👆', name:'Dedo Treinado',     desc:'+1 zero por clique.',        cost:50,     effect:()=>{ G.perClick+=1; },        req:()=>G.totalClicks>=10 },
  { id:'u2', icon:'✌️', name:'Clique Duplo',      desc:'Dobra zeros por clique.',    cost:200,    effect:()=>{ G.perClick*=2; },        req:()=>G.totalClicks>=50 },
  { id:'u3', icon:'🧤', name:'Luvas de Zero',     desc:'+5 zeros por clique.',       cost:800,    effect:()=>{ G.perClick+=5; },        req:()=>G.totalClicks>=200 },
  { id:'u4', icon:'⚛️', name:'Punho Quântico',    desc:'×3 zeros por clique.',       cost:5000,   effect:()=>{ G.perClick*=3; },        req:()=>G.totalEarned>=1000 },
  { id:'u5', icon:'🚀', name:'Hiperclique',       desc:'+20 zeros por clique.',      cost:25000,  effect:()=>{ G.perClick+=20; },       req:()=>G.totalEarned>=10000 },
  { id:'u6', icon:'🌀', name:'Clique Dimensional',desc:'×5 zeros por clique.',       cost:200000, effect:()=>{ G.perClick*=5; },        req:()=>G.totalEarned>=100000 },
  { id:'u7', icon:'💥', name:'Mega Toque',        desc:'+100 zeros por clique.',     cost:2e6,    effect:()=>{ G.perClick+=100; },      req:()=>G.totalEarned>=1e6 },
  { id:'u8', icon:'⚡', name:'Clique Absoluto',   desc:'×10 zeros por clique.',      cost:5e7,    effect:()=>{ G.perClick*=10; },       req:()=>G.totalEarned>=1e7 },
  { id:'g1', icon:'⚙️', name:'Nano Turbo',        desc:'×2 Nano-Zeros.',             cost:100,    effect:()=>{ mulGen(0,2); },          req:()=>getGen(0).owned>=1 },
  { id:'g2', icon:'🔧', name:'Bot 2.0',           desc:'×2 Bot Clicker.',            cost:500,    effect:()=>{ mulGen(1,2); },          req:()=>getGen(1).owned>=1 },
  { id:'g3', icon:'🌿', name:'Fertilizante 0',    desc:'×2 Fazenda.',                cost:2000,   effect:()=>{ mulGen(2,2); },          req:()=>getGen(2).owned>=1 },
  { id:'g4', icon:'💣', name:'Explosivos',        desc:'×3 Mina.',                   cost:15000,  effect:()=>{ mulGen(3,3); },          req:()=>getGen(3).owned>=5 },
  { id:'g5', icon:'🤖', name:'Automação',         desc:'×3 Fábrica.',                cost:100000, effect:()=>{ mulGen(4,3); },          req:()=>getGen(4).owned>=5 },
  { id:'g6', icon:'📈', name:'Investimento',      desc:'×4 Banco.',                  cost:800000, effect:()=>{ mulGen(5,4); },          req:()=>getGen(5).owned>=5 },
  { id:'g7', icon:'🌀', name:'Portal Aprimorado', desc:'×4 Portal.',                 cost:8e6,    effect:()=>{ mulGen(6,4); },          req:()=>getGen(6).owned>=5 },
  { id:'g8', icon:'🔥', name:'Fusão Estelar',     desc:'×5 Estrela.',                cost:8e7,    effect:()=>{ mulGen(7,5); },          req:()=>getGen(7).owned>=5 },
  { id:'g9', icon:'🌑', name:'Hawking Zero',      desc:'×5 Buraco Zero.',            cost:8e8,    effect:()=>{ mulGen(8,5); },          req:()=>getGen(8).owned>=5 },
  { id:'g10',icon:'💥', name:'Big Bang',          desc:'×10 TODOS geradores.',       cost:1e10,   effect:()=>{ G.generators.forEach(g=>g.multi*=10); }, req:()=>getGen(9).owned>=1 },
  { id:'gl1',icon:'⚡', name:'Eficiência 0',      desc:'+50% de tudo/s.',            cost:1000,   effect:()=>{ G.generators.forEach(g=>g.multi*=1.5); }, req:()=>G.perSec>=1 },
  { id:'gl2',icon:'☯️', name:'Zen do Zero',       desc:'×2 clique e /s.',            cost:50000,  effect:()=>{ G.perClick*=2; G.generators.forEach(g=>g.multi*=2); }, req:()=>G.perSec>=10 },
  { id:'gl3',icon:'✨', name:'Transcendência',    desc:'×3 de tudo.',               cost:1e6,    effect:()=>{ G.perClick*=3; G.generators.forEach(g=>g.multi*=3); }, req:()=>G.perSec>=100 },
  { id:'gl4',icon:'🌟', name:'Singularidade',     desc:'×5 de tudo.',               cost:5e7,    effect:()=>{ G.perClick*=5; G.generators.forEach(g=>g.multi*=5); }, req:()=>G.perSec>=1000 },
  { id:'gl5',icon:'♾️', name:'Infinito Zero',     desc:'×10 de tudo.',              cost:1e9,    effect:()=>{ G.perClick*=10; G.generators.forEach(g=>g.multi*=10); }, req:()=>G.perSec>=10000 },
];

// ================================================================
//  CONQUISTAS
// ================================================================
const ACHIEVEMENTS = [
  { id:'a1',  icon:'🖱️',  name:'Primeiro Zero',    desc:'Faça seu primeiro clique.',              check:()=>G.totalClicks>=1,        bonus:null },
  { id:'a2',  icon:'💯',  name:'Centena',           desc:'Acumule 100 zeros.',                     check:()=>G.totalEarned>=100,      bonus:null },
  { id:'a3',  icon:'🔥',  name:'Combo x3',          desc:'Alcance combo ×3.',                      check:()=>G.combo>=3,              bonus:{ type:'click', val:0.05, label:'+5% clique' } },
  { id:'a4',  icon:'🤖',  name:'Primeiro Robô',     desc:'Compre seu primeiro gerador.',           check:()=>G.generators.some(g=>g.owned>=1), bonus:null },
  { id:'a5',  icon:'💎',  name:'Milhar',            desc:'Acumule 1.000 zeros.',                   check:()=>G.totalEarned>=1000,     bonus:{ type:'gen', val:0.05, label:'+5% geradores' } },
  { id:'a6',  icon:'⚡',  name:'Combo Máximo',      desc:'Alcance o combo máximo.',                check:()=>G.combo>=G.comboMax,     bonus:{ type:'click', val:0.10, label:'+10% clique' } },
  { id:'a7',  icon:'🏭',  name:'Indústria',         desc:'Tenha 10 geradores no total.',           check:()=>G.generators.reduce((s,g)=>s+g.owned,0)>=10, bonus:{ type:'gen', val:0.10, label:'+10% geradores' } },
  { id:'a8',  icon:'📈',  name:'1K/s',             desc:'Produza 1.000 zeros/s.',                 check:()=>G.perSec>=1000,          bonus:{ type:'gen', val:0.15, label:'+15% geradores' } },
  { id:'a9',  icon:'💰',  name:'Milionário',        desc:'Acumule 1.000.000 zeros.',               check:()=>G.totalEarned>=1e6,      bonus:{ type:'click', val:0.20, label:'+20% clique' } },
  { id:'a10', icon:'🌌',  name:'Dimensão Zero',     desc:'Faça seu primeiro prestígio.',           check:()=>G.prestige>=1,           bonus:{ type:'gen', val:0.25, label:'+25% geradores' } },
  { id:'a11', icon:'🖱️',  name:'Clicador Insano',  desc:'Faça 1.000 cliques.',                    check:()=>G.totalClicks>=1000,     bonus:{ type:'click', val:0.10, label:'+10% clique' } },
  { id:'a12', icon:'🚀',  name:'1M/s',             desc:'Produza 1.000.000/s.',                   check:()=>G.perSec>=1e6,           bonus:{ type:'gen', val:0.20, label:'+20% geradores' } },
  { id:'a13', icon:'🌟',  name:'Bilionário',        desc:'Acumule 1 bilhão de zeros.',             check:()=>G.totalEarned>=1e9,      bonus:{ type:'click', val:0.30, label:'+30% clique' } },
  { id:'a14', icon:'👾',  name:'Mestre do Zero',    desc:'Faça 10.000 cliques.',                   check:()=>G.totalClicks>=10000,    bonus:{ type:'click', val:0.20, label:'+20% clique' } },
  { id:'a15', icon:'♾️',  name:'Infinito',          desc:'Alcance 1 trilhão de zeros totais.',     check:()=>G.totalEarned>=1e12,     bonus:{ type:'gen', val:0.50, label:'+50% geradores' } },
  { id:'a16', icon:'🏆',  name:'Tri-Prestígio',     desc:'Faça prestígio 3 vezes.',                check:()=>G.prestige>=3,           bonus:{ type:'click', val:0.50, label:'+50% clique' } },
  { id:'a17', icon:'🎯',  name:'Combo Insano',      desc:'Alcance combo ×8.',                      check:()=>G.combo>=8,              bonus:{ type:'click', val:0.15, label:'+15% clique' } },
  { id:'a18', icon:'⚙️',  name:'50 Geradores',      desc:'Tenha 50 geradores no total.',           check:()=>G.generators.reduce((s,g)=>s+g.owned,0)>=50, bonus:{ type:'gen', val:0.30, label:'+30% geradores' } },
];

// ================================================================
//  HABILIDADES ATIVAS
// ================================================================
const SKILL_DEFS = [
  {
    id: 'overload', icon: '⚡', name: 'OVERLOAD', desc: '×5 produção por 10s',
    cooldown: 60, duration: 10, color: '#ffcc00',
    tooltip: 'Multiplica toda produção automática por 5x durante 10 segundos.\nCooldown: 60s',
    activate() { G.skills.overload.active = true; G.skills.overload.remaining = 10; }
  },
  {
    id: 'burst', icon: '💥', name: 'BURST CLICK', desc: '×50 clique por 5s',
    cooldown: 45, duration: 5, color: '#ff4466',
    tooltip: 'Cada clique vale 50x pelo período de 5 segundos.\nCooldown: 45s',
    activate() { G.skills.burst.active = true; G.skills.burst.remaining = 5; }
  },
];

// ================================================================
//  EVENTOS ALEATÓRIOS
// ================================================================
const RANDOM_EVENTS = [
  { id:'storm',      title:'🌩 TEMPESTADE DE ZEROS', desc:'+500% produção',       duration:20, color:'#44aaff', multiplier:6,  clickMul:1  },
  { id:'dimensional',title:'🌀 FALHA DIMENSIONAL',   desc:'×20 clique por 15s',  duration:15, color:'#aa44ff', multiplier:1,  clickMul:20 },
  { id:'quantum',    title:'⚛️ PICO QUÂNTICO',       desc:'+1000% tudo por 10s', duration:10, color:'#00ffcc', multiplier:11, clickMul:11 },
  { id:'cascade',    title:'💥 CASCATA ZERO',        desc:'×3 combo (10s)',       duration:10, color:'#ffcc00', multiplier:1,  clickMul:1, comboBonusMul:3 },
];

// ================================================================
//  HELPERS
// ================================================================
function getGen(id) { return G.generators.find(g=>g.id===id); }
function mulGen(id, factor) { const g=getGen(id); if(g) g.multi*=factor; }

function fmt(n) {
  if(n===undefined||n===null||isNaN(n)) return '0';
  if(n<1000) return Math.floor(n).toLocaleString('pt-BR');
  const suf=['','K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc'];
  let i=0, v=n;
  while(v>=1000 && i<suf.length-1){ v/=1000; i++; }
  return v.toFixed(2)+suf[i];
}

function calcGenCost(def) {
  const owned = G.generators.find(g=>g.id===def.id)?.owned||0;
  let cost = def.base * Math.pow(1.15, owned);
  if(G.specialization==='idle') cost *= 0.80;
  return Math.floor(cost);
}

function calcPerSec() {
  let base = G.generators.reduce((s,g) => s + g.baseProd * g.multi * g.owned, 0);
  base *= G.prestigeMulti * G.ascensionMulti;
  base *= (1 + G.achGenBonus);
  if(G.specialization==='idle') base *= 3;
  if(G.skills.overload?.active) base *= 5;
  if(G.activeEvent) base *= G.activeEvent.multiplier;
  return base;
}

function calcPerClick() {
  let base = G.perClick * G.prestigeMulti * G.ascensionMulti;
  base *= (1 + G.achClickBonus);
  if(G.specialization==='speed') base *= 4;
  if(G.skills.burst?.active) base *= 50;
  if(G.activeEvent) base *= G.activeEvent.clickMul;
  return base;
}

function prestigeRequired() { return Math.pow(10, 6 + G.prestige * 2); }
function prestigeBonus()     { return (1 + G.prestige * 0.5).toFixed(2); }

function bestBuy() {
  let best = null, bestRatio = -1;
  G.generators.forEach(g=>{
    const def = GENERATOR_DEFS.find(d=>d.id===g.id);
    const cost = calcGenCost(def);
    if(G.zeros < cost) return;
    const prod = g.baseProd * g.multi * G.prestigeMulti;
    const ratio = prod / cost;
    if(ratio > bestRatio){ bestRatio=ratio; best={type:'gen', id:g.id}; }
  });
  UPGRADE_DEFS.forEach(u=>{
    if(G.upgradesBought.has(u.id)) return;
    if(!u.req()) return;
    if(G.zeros < u.cost) return;
    const ratio = 1/(u.cost+1);
    if(ratio > bestRatio/100){ bestRatio=ratio/100; best={type:'upg', id:u.id}; }
  });
  return best;
}

function recalcAchievementBonuses() {
  G.achClickBonus = 0;
  G.achGenBonus = 0;
  ACHIEVEMENTS.forEach(a=>{
    if(G.achievementsUnlocked.has(a.id) && a.bonus){
      if(a.bonus.type==='click') G.achClickBonus += a.bonus.val;
      if(a.bonus.type==='gen')   G.achGenBonus += a.bonus.val;
    }
  });
}

// ================================================================
//  INICIALIZAÇÃO
// ================================================================
function initGenerators() {
  G.generators = GENERATOR_DEFS.map(d => ({
    id: d.id, name: d.name, desc: d.desc,
    base: d.base, baseProd: d.baseProd,
    multi: 1, owned: 0,
  }));
}

function initSkills() {
  SKILL_DEFS.forEach(def => {
    G.skills[def.id] = { id: def.id, cooldownRemaining: 0, active: false, remaining: 0 };
  });
}

function init() {
  initGenerators();
  initSkills();
  G.nextEventIn = 60 + Math.random()*120;
  loadGame();
  checkOffline();
  recalcAchievementBonuses();
  renderAll();
  renderSkills();
  setupEvents();
  startBgCanvas();
  loop();
}

// ================================================================
//  LOOP PRINCIPAL
// ================================================================
let lastTime = performance.now();

function loop() {
  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.5);
  lastTime = now;
  G.tick++;

  G.perSec = calcPerSec();
  const earned = G.perSec * dt;
  G.zeros += earned;
  G.totalEarned += earned;

  if(G.combo > 1){
    G.comboTimer -= dt;
    if(G.comboTimer <= 0){ G.combo=1; G.comboTimer=0; }
  }

  tickSkills(dt);
  tickEvents(dt);

  if(G.autoBuyActive){
    G.autoBuyTimer += dt;
    if(G.autoBuyTimer >= 1.0){ G.autoBuyTimer=0; doBestBuy(); }
  }

  checkMilestone();
  checkAchievements();
  updateStats();
  updateComboUI();
  updatePrestigeBtn();
  updateShopAffordability();
  updateSkillsUI();
  updateTopBar();
  updateWorldTheme();

  if(G.tick % (60*5) === 0) { saveGame(); flashSaveIndicator(); }

  requestAnimationFrame(loop);
}

// ================================================================
//  HABILIDADES ATIVAS
// ================================================================
function tickSkills(dt) {
  SKILL_DEFS.forEach(def => {
    const s = G.skills[def.id];
    if(!s) return;
    if(s.active){
      s.remaining -= dt;
      if(s.remaining <= 0){
        s.active = false; s.remaining = 0;
        s.cooldownRemaining = def.cooldown;
        if(def.id==='burst')   document.getElementById('mainBtn')?.classList.remove('burst-mode');
        if(def.id==='overload') document.getElementById('mainBtn')?.classList.remove('overload-mode');
        addLog(`⏱ Habilidade expirada: ${def.name}`, '');
      }
    } else if(s.cooldownRemaining > 0){
      s.cooldownRemaining = Math.max(0, s.cooldownRemaining - dt);
    }
  });
}

function activateSkill(id) {
  const def = SKILL_DEFS.find(d=>d.id===id);
  const s = G.skills[id];
  if(!def || !s) return;
  if(s.active || s.cooldownRemaining > 0) return;
  def.activate();
  addLog(`⚡ Habilidade ativada: ${def.name}!`, 'highlight');
  showToast(`${def.icon} ${def.name} ATIVADA!`, 'gold');
  if(id==='overload') document.getElementById('mainBtn').classList.add('overload-mode');
  if(id==='burst')    document.getElementById('mainBtn').classList.add('burst-mode');
}

function renderSkills() {
  const container = document.getElementById('skillsContainer');
  container.innerHTML = '';
  SKILL_DEFS.forEach(def => {
    const btn = document.createElement('button');
    btn.className = 'skill-btn';
    btn.id = `skill-btn-${def.id}`;
    btn.innerHTML = `
      <div class="sk-info">
        <span class="sk-name">${def.icon} ${def.name}</span>
        <span class="sk-desc">${def.desc}</span>
      </div>
      <span class="sk-cd" id="skcd-${def.id}">PRONTO</span>
      <div class="skill-cd-bar" id="skbar-${def.id}" style="width:100%"></div>
    `;
    btn.setAttribute('data-tip', def.tooltip);
    btn.addEventListener('click', ()=>activateSkill(def.id));
    container.appendChild(btn);
  });
}

function updateSkillsUI() {
  if(G.tick % 3 !== 0) return;
  SKILL_DEFS.forEach(def => {
    const s = G.skills[def.id];
    const btn = document.getElementById(`skill-btn-${def.id}`);
    const cdText = document.getElementById(`skcd-${def.id}`);
    const cdBar  = document.getElementById(`skbar-${def.id}`);
    if(!btn || !cdText || !cdBar) return;
    if(s.active){
      btn.classList.add('active-skill'); btn.disabled = true;
      cdText.textContent = s.remaining.toFixed(1)+'s';
      cdBar.style.width = (s.remaining/def.duration*100)+'%';
      cdBar.style.background = def.color;
    } else if(s.cooldownRemaining > 0){
      btn.classList.remove('active-skill'); btn.disabled = true;
      cdText.textContent = s.cooldownRemaining.toFixed(0)+'s';
      cdBar.style.width = ((1-s.cooldownRemaining/def.cooldown)*100)+'%';
      cdBar.style.background = 'var(--border)';
    } else {
      btn.classList.remove('active-skill'); btn.disabled = false;
      cdText.textContent = 'PRONTO';
      cdBar.style.width = '100%';
      cdBar.style.background = def.color;
    }
  });
}

// ================================================================
//  EVENTOS ALEATÓRIOS
// ================================================================
function tickEvents(dt) {
  if(G.activeEvent){
    G.eventTimer -= dt;
    document.getElementById('eventTimerText').textContent = G.eventTimer.toFixed(1)+'s restantes';
    if(G.eventTimer <= 0){
      G.activeEvent = null; G.eventTimer = 0;
      document.getElementById('eventBanner').classList.remove('show');
      document.getElementById('mainBtn').classList.remove('overload-mode','burst-mode');
      addLog('🌀 Evento encerrado.','');
      G.nextEventIn = 90 + Math.random()*180;
    }
  } else {
    G.nextEventIn -= dt;
    if(G.nextEventIn <= 0) triggerRandomEvent();
  }
}

function triggerRandomEvent() {
  const ev = RANDOM_EVENTS[Math.floor(Math.random()*RANDOM_EVENTS.length)];
  G.activeEvent = { ...ev };
  if(G.specialization==='rng'){
    G.activeEvent.multiplier *= 2;
    G.activeEvent.clickMul *= 2;
    G.activeEvent.duration *= 1.5;
  }
  G.eventTimer = G.activeEvent.duration;
  const banner = document.getElementById('eventBanner');
  document.getElementById('eventTitle').textContent = ev.title + ' — ' + ev.desc;
  banner.style.borderColor = ev.color;
  banner.style.color = ev.color;
  banner.classList.add('show');
  addLog(`🎲 EVENTO: ${ev.title}!`, 'event-log-entry');
  showToast(`${ev.title}`, 'purple');
  G.nextEventIn = 90 + Math.random()*180;
}

// ================================================================
//  CLIQUE PRINCIPAL
// ================================================================
function handleClick(e) {
  let critMul = 1, isCrit = false;
  if(G.specialization==='rng' && Math.random()<0.15){ critMul=5; isCrit=true; }
  const comboSpeed = G.specialization==='speed' ? 1.5 : 1;
  const gained = calcPerClick() * G.combo * critMul;
  G.zeros += gained; G.totalEarned += gained; G.totalClicks++;

  const nowSec = performance.now()/1000;
  const dt = nowSec - G.lastClickTime;
  G.lastClickTime = nowSec;
  if(dt < 0.4)      G.combo = Math.min(G.combo + 0.6*comboSpeed, G.comboMax);
  else if(dt < 1.0) G.combo = Math.min(G.combo + 0.25*comboSpeed, G.comboMax);
  G.comboTimer = G.comboDecay;

  spawnParticle(e, gained, isCrit);
  spawnSparks(e);

  const btn = document.getElementById('mainBtn');
  btn.classList.remove('click-pulse');
  void btn.offsetWidth;
  btn.classList.add('click-pulse');
  playClickSound(isCrit);
}

// ================================================================
//  PARTÍCULAS E SPARKS
// ================================================================
function spawnParticle(e, value, isCrit) {
  const container = document.getElementById('particles');
  const rect = document.getElementById('mainBtn').getBoundingClientRect();
  const p = document.createElement('div');
  if(isCrit){ p.className='particle crit'; p.textContent='✦ CRÍTICO! +'+fmt(value); }
  else if(value > calcPerClick()*5){ p.className='particle big'; p.textContent='+'+fmt(value); }
  else if(G.skills.burst?.active){ p.className='particle burst'; p.textContent='+'+fmt(value); }
  else { p.className='particle'; p.textContent='+'+fmt(value); }
  const ox=(Math.random()-0.5)*70, oy=(Math.random()-0.5)*50-20;
  p.style.left=(rect.width/2+ox)+'px';
  p.style.top=(rect.height/2+oy)+'px';
  container.appendChild(p);
  setTimeout(()=>p.remove(), 1200);
}

function spawnSparks(e) {
  const container = document.getElementById('particles');
  const rect = document.getElementById('mainBtn').getBoundingClientRect();
  const count = G.combo > 5 ? 8 : 4;
  for(let i=0; i<count; i++){
    const sp = document.createElement('div');
    sp.className='spark';
    const size=3+Math.random()*5;
    sp.style.width=size+'px'; sp.style.height=size+'px';
    sp.style.left=(rect.width/2)+'px'; sp.style.top=(rect.height/2)+'px';
    const angle=Math.random()*Math.PI*2, dist=30+Math.random()*60;
    sp.style.setProperty('--spark-target',`translate(${Math.cos(angle)*dist}px,${Math.sin(angle)*dist}px)`);
    if(G.combo>7) sp.style.background='#ff4466';
    else if(G.combo>4) sp.style.background='#ffcc00';
    else sp.style.background='#00ffcc';
    container.appendChild(sp);
    setTimeout(()=>sp.remove(), 850);
  }
}

// ================================================================
//  WEB AUDIO
// ================================================================
let audioCtx;
function getAudioCtx() {
  if(!audioCtx){ try{ audioCtx=new(window.AudioContext||window.webkitAudioContext)(); }catch(e){} }
  return audioCtx;
}
function playClickSound(isCrit) {
  try {
    const ctx=getAudioCtx(); if(!ctx) return;
    const o=ctx.createOscillator(), g=ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type=isCrit?'square':'sine';
    const freq=isCrit?880:220+G.combo*30;
    o.frequency.setValueAtTime(freq,ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(freq*1.5,ctx.currentTime+0.04);
    g.gain.setValueAtTime(0.08,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.12);
    o.start(ctx.currentTime); o.stop(ctx.currentTime+0.13);
  } catch(e){}
}
function playUpgradeSound() {
  try {
    const ctx=getAudioCtx(); if(!ctx) return;
    [440,660,880].forEach((f,i)=>{
      const o=ctx.createOscillator(), g=ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type='sine'; o.frequency.value=f;
      g.gain.setValueAtTime(0,ctx.currentTime+i*0.06);
      g.gain.linearRampToValueAtTime(0.1,ctx.currentTime+i*0.06+0.03);
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+i*0.06+0.2);
      o.start(ctx.currentTime+i*0.06); o.stop(ctx.currentTime+i*0.06+0.21);
    });
  } catch(e){}
}
function playPrestigeSound() {
  try {
    const ctx=getAudioCtx(); if(!ctx) return;
    [261,329,392,523,659,784,1047].forEach((f,i)=>{
      const o=ctx.createOscillator(), g=ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type='sine'; o.frequency.value=f;
      g.gain.setValueAtTime(0,ctx.currentTime+i*0.08);
      g.gain.linearRampToValueAtTime(0.12,ctx.currentTime+i*0.08+0.05);
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+i*0.08+0.5);
      o.start(ctx.currentTime+i*0.08); o.stop(ctx.currentTime+i*0.08+0.51);
    });
  } catch(e){}
}

// ================================================================
//  UI — STATS
// ================================================================
function updateStats() {
  document.getElementById('zerosDisplay').textContent      = fmt(G.zeros);
  document.getElementById('perClickDisplay').textContent   = fmt(calcPerClick()*G.combo)+(G.combo>1?' ×'+G.combo.toFixed(1):'');
  document.getElementById('perSecDisplay').textContent     = fmt(G.perSec)+'/s';
  document.getElementById('totalEarnedDisplay').textContent= fmt(G.totalEarned);
  document.getElementById('totalClicksDisplay').textContent= G.totalClicks.toLocaleString('pt-BR');
  document.getElementById('prestigeCount').textContent     = 'Prestígio: '+G.prestige;
  document.getElementById('multiplierDisplay').textContent = '×'+G.prestigeMulti.toFixed(2);
  const specEl = document.getElementById('specDisplay');
  if(G.specialization && G.prestige > 0){
    specEl.style.display='inline-block';
    const labels={speed:'⚡ SPEED',idle:'🏭 IDLE',rng:'🎲 RNG'};
    specEl.textContent=labels[G.specialization]||'';
    specEl.className=`${G.specialization}-spec`;
  } else { specEl.style.display='none'; }
}

function updateComboUI() {
  const pct=((G.combo-1)/(G.comboMax-1))*100;
  document.getElementById('comboBarFill').style.width=pct+'%';
  const cc=document.getElementById('comboCount');
  const bg=document.getElementById('comboBg');
  cc.textContent='×'+G.combo.toFixed(1);
  if(G.combo<3){ cc.className='low'; bg.classList.remove('shaking'); }
  else if(G.combo<6){ cc.className='mid'; bg.classList.remove('shaking'); }
  else if(G.combo<9){ cc.className='high'; bg.classList.remove('shaking'); }
  else { cc.className='max'; bg.classList.add('shaking'); }
  document.getElementById('comboTimer').textContent=G.comboTimer>0?G.comboTimer.toFixed(1)+'s':'0.0s';
}

function updatePrestigeBtn() {
  const btn=document.getElementById('prestigeBtn');
  const req=prestigeRequired();
  document.getElementById('prestigeRequirement').textContent=fmt(req);
  btn.disabled=G.zeros<req;
}

function updateTopBar() {
  if(G.tick%5!==0) return;
  const req=prestigeRequired();
  const pct=Math.min(100,(G.zeros/req)*100);
  document.getElementById('topProgressBar').style.width=pct+'%';
}

function updateWorldTheme() {
  if(G.tick%300!==0) return;
  const log10=G.totalEarned>0?Math.floor(Math.log10(G.totalEarned)):0;
  const world=Math.min(5,Math.floor(log10/4)+1);
  document.body.className=`world-${world}`;
}

// ================================================================
//  MILESTONE
// ================================================================
function checkMilestone() {
  if(G.milestoneIdx>=G.milestones.length) return;
  const target=G.milestones[G.milestoneIdx];
  if(target===Infinity){
    document.getElementById('milestoneBar').style.width='100%';
    document.getElementById('milestoneLabel').textContent='Meta: ∞';
    document.getElementById('milestonePct').textContent='MAX';
    return;
  }
  const prev=G.milestoneIdx>0?G.milestones[G.milestoneIdx-1]:0;
  const pct=Math.min(100,((G.totalEarned-prev)/(target-prev))*100);
  document.getElementById('milestoneBar').style.width=pct+'%';
  document.getElementById('milestoneLabel').textContent='Meta: '+fmt(target);
  document.getElementById('milestonePct').textContent=pct.toFixed(1)+'%';
  if(G.totalEarned>=target){
    addLog('🏆 Meta alcançada: '+fmt(target)+' zeros!','highlight');
    G.milestoneIdx++;
  }
}

// ================================================================
//  SHOP — RENDER
// ================================================================
function renderUpgrades() {
  const list=document.getElementById('upgradeList');
  list.innerHTML='';
  let shown=0;
  UPGRADE_DEFS.forEach(u=>{
    if(G.upgradesBought.has(u.id)) return;
    if(!u.req()) return;
    shown++;
    const canAfford=G.zeros>=u.cost;
    const card=document.createElement('div');
    card.className='item-card'+(canAfford?'':' disabled');
    card.dataset.id=u.id;
    card.innerHTML=`
      <span class="item-icon">${u.icon||'🔧'}</span>
      <span class="item-name">${u.name}</span>
      <span class="item-desc">${u.desc}</span>
      <span class="item-cost${canAfford?' can-afford':''}">${fmt(u.cost)}</span>
    `;
    card.setAttribute('data-tip',`Custo: ${fmt(u.cost)}\n${u.desc}`);
    card.addEventListener('click',()=>buyUpgrade(u.id));
    list.appendChild(card);
  });
  if(shown===0) list.innerHTML='<p style="color:var(--text-dim);font-size:0.68rem;padding:14px;line-height:1.8;">Sem upgrades disponíveis.<br>Continue acumulando zeros!</p>';
}

function renderGenerators() {
  const list=document.getElementById('generatorList');
  list.innerHTML='';
  let bestId=-1, bestRatio=-1;
  G.generators.forEach(g=>{
    const def=GENERATOR_DEFS.find(d=>d.id===g.id);
    const cost=calcGenCost(def);
    if(G.zeros<cost) return;
    const ratio=(g.baseProd*g.multi)/cost;
    if(ratio>bestRatio){ bestRatio=ratio; bestId=g.id; }
  });
  G.generators.forEach(g=>{
    const def=GENERATOR_DEFS.find(d=>d.id===g.id);
    const cost=calcGenCost(def);
    const prod=(g.baseProd*g.multi*G.prestigeMulti).toFixed(2);
    const canAfford=G.zeros>=cost;
    const isBest=g.id===bestId;
    const card=document.createElement('div');
    card.className='item-card'+(canAfford?'':' disabled')+(g.owned>0?' bought':'')+(isBest?' best-deal':'');
    card.dataset.gid=g.id;
    card.innerHTML=`
      <span class="item-icon">${def.icon||'⚙️'}</span>
      <span class="item-name">${g.name}${isBest?'<span class="best-deal-tag"> ★ MELHOR</span>':''}</span>
      <span class="item-desc">${g.desc}<br>${prod}/s cada</span>
      <span class="item-cost${canAfford?' can-afford':''}">${fmt(cost)}</span>
      <span class="item-owned">Qtd: ${g.owned}</span>
    `;
    card.setAttribute('data-tip',`Produção: ${prod}/s cada\nTotal: ${fmt(g.baseProd*g.multi*g.owned*G.prestigeMulti)}/s\nCusto próximo: ${fmt(cost)}`);
    card.addEventListener('click',()=>buyGenerator(g.id));
    list.appendChild(card);
  });
}

function renderAchievements() {
  const list=document.getElementById('achievementList');
  list.innerHTML='';
  let unlockedCount=0;
  ACHIEVEMENTS.forEach(a=>{
    const unlocked=G.achievementsUnlocked.has(a.id);
    if(unlocked) unlockedCount++;
    const card=document.createElement('div');
    card.className='ach-card '+(unlocked?'unlocked':'locked');
    card.innerHTML=`
      <span class="ach-icon">${unlocked?a.icon:'🔒'}</span>
      <div class="ach-info">
        <div class="ach-name">${unlocked?a.name:'???'}</div>
        <div class="ach-desc">${unlocked?a.desc:'Conquista bloqueada'}</div>
        ${unlocked&&a.bonus?`<div class="ach-bonus">✦ ${a.bonus.label}</div>`:''}
      </div>
    `;
    list.appendChild(card);
  });
  const badge=document.querySelector('[data-tab="achievements"] .tab-badge');
  if(!badge){
    const tab=document.querySelector('[data-tab="achievements"]');
    if(unlockedCount>0){
      const b=document.createElement('span');
      b.className='tab-badge'; b.textContent=unlockedCount;
      tab?.appendChild(b);
    }
  } else { badge.textContent=unlockedCount; }
}

function renderAll() {
  renderUpgrades();
  renderGenerators();
  renderAchievements();
}

// ================================================================
//  AFFORDABILITY
// ================================================================
function updateShopAffordability() {
  if(G.tick%8!==0) return;
  document.querySelectorAll('[data-gid]').forEach(card=>{
    const gid=parseInt(card.dataset.gid);
    const def=GENERATOR_DEFS.find(d=>d.id===gid);
    const cost=calcGenCost(def);
    const costEl=card.querySelector('.item-cost');
    const ownedEl=card.querySelector('.item-owned');
    if(G.zeros>=cost){ card.classList.remove('disabled'); costEl?.classList.add('can-afford'); }
    else             { card.classList.add('disabled');    costEl?.classList.remove('can-afford'); }
    if(costEl)  costEl.textContent=fmt(cost);
    if(ownedEl) ownedEl.textContent='Qtd: '+getGen(gid).owned;
  });
  document.querySelectorAll('[data-id]').forEach(card=>{
    const u=UPGRADE_DEFS.find(x=>x.id===card.dataset.id);
    if(!u) return;
    const costEl=card.querySelector('.item-cost');
    if(G.zeros>=u.cost){ card.classList.remove('disabled'); costEl?.classList.add('can-afford'); }
    else               { card.classList.add('disabled');    costEl?.classList.remove('can-afford'); }
  });
}

// ================================================================
//  COMPRAS
// ================================================================
function buyUpgrade(id) {
  const u=UPGRADE_DEFS.find(x=>x.id===id);
  if(!u||G.zeros<u.cost||G.upgradesBought.has(id)) return;
  G.zeros-=u.cost; G.upgradesBought.add(id); u.effect();
  G.perSec=calcPerSec();
  addLog('✔ Upgrade: '+u.name,'highlight');
  showToast('UPGRADE: '+u.name,'cyan');
  playUpgradeSound(); renderUpgrades();
}

function buyGenerator(id) {
  const g=G.generators.find(x=>x.id===id);
  const def=GENERATOR_DEFS.find(d=>d.id===id);
  if(!g||!def) return;
  const cost=calcGenCost(def);
  if(G.zeros<cost) return;
  G.zeros-=cost; g.owned++;
  G.perSec=calcPerSec();
  addLog('✔ '+g.name+' ×'+g.owned,'');
  playUpgradeSound(); renderGenerators();
}

function doBestBuy() {
  const b=bestBuy();
  if(!b) return;
  if(b.type==='gen') buyGenerator(b.id);
  else if(b.type==='upg') buyUpgrade(b.id);
}

// ================================================================
//  CONQUISTAS
// ================================================================
function checkAchievements() {
  if(G.tick%30!==0) return;
  ACHIEVEMENTS.forEach(a=>{
    if(G.achievementsUnlocked.has(a.id)) return;
    if(a.check()){
      G.achievementsUnlocked.add(a.id);
      recalcAchievementBonuses();
      const bonusTxt=a.bonus?` (+${a.bonus.label})`:'';
      addLog('🏅 Conquista: '+a.name+bonusTxt,'highlight');
      showToast('🏅 '+a.name+' '+a.icon,'gold');
      playUpgradeSound(); renderAchievements();
    }
  });
}

// ================================================================
//  PRESTÍGIO
// ================================================================
function openPrestige() {
  document.getElementById('prestigeBonus').textContent='×'+prestigeBonus();
  document.getElementById('prestigeScreen').classList.remove('hidden');
}

function confirmPrestige() {
  G.prestige++;
  G.prestigeMulti=parseFloat(prestigeBonus());
  G.zeros=0; G.totalEarned=0; G.totalClicks=0;
  G.perClick=1; G.upgradesBought=new Set();
  G.milestoneIdx=0; G.combo=1; G.comboTimer=0;
  G.activeEvent=null; G.eventTimer=0;
  G.nextEventIn=60+Math.random()*120;
  initGenerators(); initSkills();
  document.getElementById('prestigeScreen').classList.add('hidden');
  playPrestigeSound();
  addLog('⚡ PRESTÍGIO '+G.prestige+'! Multi: ×'+G.prestigeMulti.toFixed(2),'prestige-log');
  showToast('🌌 PRESTÍGIO '+G.prestige+' ATIVADO!','red');
  if(G.prestige>=1){ setTimeout(()=>{ document.getElementById('specScreen').classList.remove('hidden'); },800); }
  renderAll();
}

// ================================================================
//  ESPECIALIZAÇÃO
// ================================================================
function chooseSpec(type) {
  G.specialization=type;
  document.getElementById('specScreen').classList.add('hidden');
  const labels={speed:'⚡ SPEED BUILD',idle:'🏭 IDLE BUILD',rng:'🎲 RNG BUILD'};
  addLog(`🎯 Especialização: ${labels[type]||type}`,'highlight');
  showToast(`${labels[type]} SELECIONADO!`,'purple');
  recalcAchievementBonuses();
}

// ================================================================
//  EVENT LOG
// ================================================================
function addLog(msg, cls='') {
  const log=document.getElementById('eventLog');
  const el=document.createElement('div');
  el.className='log-entry '+(cls?cls:'');
  el.textContent=msg;
  log.prepend(el);
  while(log.children.length>25) log.removeChild(log.lastChild);
}

// ================================================================
//  TOAST
// ================================================================
let toastTimeout;
function showToast(msg, type='') {
  const t=document.getElementById('toast');
  t.textContent=msg;
  t.className=type?`show toast-${type}`:'show';
  clearTimeout(toastTimeout);
  toastTimeout=setTimeout(()=>t.classList.remove('show'),2600);
}

// ================================================================
//  SAVE INDICATOR
// ================================================================
function flashSaveIndicator() {
  const ind=document.getElementById('saveIndicator');
  ind.classList.add('saved');
  setTimeout(()=>ind.classList.remove('saved'),2000);
}

// ================================================================
//  TABS
// ================================================================
function setupTabs() {
  document.querySelectorAll('.tab').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-'+btn.dataset.tab).classList.add('active');
      if(btn.dataset.tab==='upgrades')     renderUpgrades();
      if(btn.dataset.tab==='generators')   renderGenerators();
      if(btn.dataset.tab==='achievements') renderAchievements();
    });
  });
}

// ================================================================
//  EVENTS (botões)
// ================================================================
function setupEvents() {
  document.getElementById('mainBtn').addEventListener('click', handleClick);
  document.getElementById('prestigeBtn').addEventListener('click', openPrestige);
  document.getElementById('confirmPrestige').addEventListener('click', confirmPrestige);
  document.getElementById('cancelPrestige').addEventListener('click', ()=>{
    document.getElementById('prestigeScreen').classList.add('hidden');
  });

  ['Speed','Idle','Rng'].forEach(s=>{
    document.getElementById('spec'+s).addEventListener('click', ()=>chooseSpec(s.toLowerCase()));
  });

  document.getElementById('autoBuyBtn').addEventListener('click', ()=>{
    doBestBuy(); showToast('MELHOR COMPRA REALIZADA!','cyan');
  });
  document.getElementById('autoBuyToggle').addEventListener('click', ()=>{
    G.autoBuyActive=!G.autoBuyActive;
    document.getElementById('autoBuyToggle').textContent=G.autoBuyActive?'🔄 AUTO ON':'🔄 AUTO OFF';
    showToast(G.autoBuyActive?'AUTO-COMPRA ATIVADA!':'AUTO-COMPRA DESATIVADA!',G.autoBuyActive?'cyan':'');
  });

  document.getElementById('saveBtn').addEventListener('click', ()=>{
    saveGame(); showToast('JOGO SALVO!','cyan'); flashSaveIndicator();
  });

  // RESET — limpa TODO o localStorage
  document.getElementById('resetBtn').addEventListener('click', ()=>{
    document.getElementById('resetScreen').classList.remove('hidden');
    document.getElementById('resetConfirmInput').value='';
    document.getElementById('confirmReset').disabled=true;
  });
  document.getElementById('resetConfirmInput').addEventListener('input', function(){
    document.getElementById('confirmReset').disabled=this.value.trim().toUpperCase()!=='ZERO';
  });
  document.getElementById('confirmReset').addEventListener('click', ()=>{
    localStorage.clear();   // <-- limpa TUDO, incluindo save v1.0 e qualquer outro
    location.reload();
  });
  document.getElementById('cancelReset').addEventListener('click', ()=>{
    document.getElementById('resetScreen').classList.add('hidden');
  });

  document.getElementById('closeOffline').addEventListener('click', ()=>{
    document.getElementById('offlineScreen').classList.add('hidden');
  });

  setupTabs();
}

// ================================================================
//  SAVE / LOAD
// ================================================================
const SAVE_KEY = 'zero_save_v2';

function saveGame() {
  const data = {
    zeros: G.zeros,
    totalEarned: G.totalEarned,
    totalClicks: G.totalClicks,
    perClick: G.perClick,
    prestige: G.prestige,
    prestigeMulti: G.prestigeMulti,
    ascensions: G.ascensions,
    ascensionMulti: G.ascensionMulti,
    milestoneIdx: G.milestoneIdx,
    specialization: G.specialization,
    autoBuyActive: G.autoBuyActive,
    generators: G.generators.map(g=>({ id:g.id, owned:g.owned, multi:g.multi })),
    upgradesBought: [...G.upgradesBought],
    achievementsUnlocked: [...G.achievementsUnlocked],
    timestamp: Date.now(),
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

function loadGame() {
  // Tenta v2 primeiro, depois v1 (migração)
  const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem('zero_save');
  if(!raw) return;
  try {
    const d=JSON.parse(raw);
    G.zeros            = d.zeros        || 0;
    G.totalEarned      = d.totalEarned  || 0;
    G.totalClicks      = d.totalClicks  || 0;
    G.perClick         = d.perClick     || 1;
    G.prestige         = d.prestige     || 0;
    G.prestigeMulti    = d.prestigeMulti|| 1;
    G.ascensions       = d.ascensions   || 0;
    G.ascensionMulti   = d.ascensionMulti || 1;
    G.milestoneIdx     = d.milestoneIdx || 0;
    G.specialization   = d.specialization || null;
    G.autoBuyActive    = d.autoBuyActive || false;
    G.upgradesBought   = new Set(d.upgradesBought||[]);
    G.achievementsUnlocked = new Set(d.achievementsUnlocked||[]);
    (d.generators||[]).forEach(saved=>{
      const g=G.generators.find(x=>x.id===saved.id);
      if(g){ g.owned=saved.owned||0; g.multi=saved.multi||1; }
    });
    G.perSec=calcPerSec();
    G.lastTimestamp=d.timestamp||Date.now();
    if(G.autoBuyActive){
      const btn=document.getElementById('autoBuyToggle');
      if(btn) btn.textContent='🔄 AUTO ON';
    }
  } catch(e){ console.warn('Erro ao carregar save:', e); }
}

// ================================================================
//  GANHO OFFLINE
// ================================================================
function checkOffline() {
  const now=Date.now();
  const elapsed=(now-(G.lastTimestamp||now))/1000;
  if(elapsed<30) return;
  const maxOffline=8*3600;
  const effectiveTime=Math.min(elapsed,maxOffline);
  const offlineGain=G.perSec*effectiveTime;
  const finalGain=G.specialization==='idle'?offlineGain*1.5:offlineGain;
  if(finalGain<1) return;
  G.zeros+=finalGain; G.totalEarned+=finalGain;
  const horas=Math.floor(elapsed/3600);
  const mins=Math.floor((elapsed%3600)/60);
  const secs=Math.floor(elapsed%60);
  const timeStr=horas>0?`${horas}h ${mins}m`:mins>0?`${mins}m ${secs}s`:`${secs}s`;
  document.getElementById('offlineMsg').innerHTML=`Você ganhou <strong>${fmt(finalGain)}</strong> zeros enquanto estava offline!`;
  document.getElementById('offlineTime').textContent=`Ausência: ${timeStr}`;
  document.getElementById('offlineScreen').classList.remove('hidden');
}

// ================================================================
//  BG CANVAS
// ================================================================
function startBgCanvas() {
  const canvas=document.getElementById('bgCanvas');
  const ctx=canvas.getContext('2d');
  function resize(){ canvas.width=window.innerWidth; canvas.height=window.innerHeight; }
  resize(); window.addEventListener('resize',resize);
  const COLS=22, ROWS=14, cells=[];
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++)
    cells.push({ x:c, y:r, v:Math.random(), s:Math.random()*0.4+0.15 });
  let worldColor=[0,255,204];
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const cw=canvas.width/COLS, ch=canvas.height/ROWS;
    if(G.activeEvent){
      const hex=G.activeEvent.color||'#00ffcc';
      worldColor=[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];
    } else { worldColor=[0,255,204]; }
    cells.forEach(cell=>{
      cell.v+=cell.s*0.003;
      if(cell.v>1) cell.v=0;
      const alpha=Math.sin(cell.v*Math.PI)*0.35;
      const [r,g,b]=worldColor;
      ctx.fillStyle=`rgba(${r},${g},${b},${alpha})`;
      ctx.font=`${Math.min(cw,ch)*0.52}px 'Share Tech Mono'`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('0',cell.x*cw+cw/2,cell.y*ch+ch/2);
    });
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

// ================================================================
//  START
// ================================================================
window.addEventListener('DOMContentLoaded', init);
