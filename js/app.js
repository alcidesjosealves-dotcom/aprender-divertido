
// ===== OTIMIZAÇÕES AVANÇADAS =====

// Cache global de categorias
const CATEGORY_CACHE = new Map();

// Lazy loading de categorias
async function loadQuestionsByCategory(category) {
    if (CATEGORY_CACHE.has(category)) {
        return CATEGORY_CACHE.get(category);
    }

    const questions = QUESTIONS[category] || {};
    CATEGORY_CACHE.set(category, questions);

    return questions;
}

// Debounce helper
function debounce(fn, delay = 150) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

// Renderização otimizada
function createFragment(elements) {
    const fragment = document.createDocumentFragment();
    elements.forEach(el => fragment.appendChild(el));
    return fragment;
}

// Pré-carregamento inteligente
window.addEventListener('load', () => {
    requestIdleCallback?.(() => {
        console.log('Pré-cache iniciado');
    });
});

// Cache de elementos
const DOM_CACHE = {};
function $id(id) {
    if (!DOM_CACHE[id]) {
        DOM_CACHE[id] = document.getElementById(id);
    }
    return DOM_CACHE[id];
}

// Otimização de eventos
document.addEventListener('touchstart', ()=>{}, {passive:true});
document.addEventListener('scroll', ()=>{}, {passive:true});

// ===== FIM OTIMIZAÇÕES =====

import { QUESTIONS } from '../questions/questions.js';

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs, orderBy, query, limit, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC7LNHyQmVUxhHSBJusAe3hDGsIGqbzFvA",
  authDomain: "aprender-divertido-75833.firebaseapp.com",
  projectId: "aprender-divertido-75833",
  storageBucket: "aprender-divertido-75833.firebasestorage.app",
  messagingSenderId: "1017796327584",
  appId: "1:1017796327584:web:4531b74f21173c755171c5"
};

const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);
const storage = getStorage(fbApp);
let currentUser = null;
let userProgress = {};
let selectedAvatar = '😊';

const LEVEL_NAMES = ['Fácil','Médio','Difícil','Expert'];
const LEVEL_EMOJIS = ['🟢','🔵','🟡','🔴'];
const LEVEL_COLORS = ['#22C55E','#3B82F6','#F59E0B','#EF4444'];
const LEVEL_PTS = [1, 3, 5, 7]; // pontos por resposta certa por nível
// Acertos seguidos necessários para subir de nível automaticamente
const AUTO_LEVEL_UP = 7;

const AVATARS = ['😊','🦁','🐯','🐻','🦊','🐼','🐸','🦋','🐬','🦄','🐲','🦅','🌟','🚀','🎮','🎨','⚽','🎵'];

// ── AUTH ──
// ── FOTO DE PERFIL ──
window.uploadProfilePhoto = async function(input) {
  if (!currentUser || !input.files[0]) return;
  const file = input.files[0];
  if (file.size > 5 * 1024 * 1024) { alert('Foto muito grande! Use uma imagem menor que 5MB.'); return; }
  window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('photo-uploading').style.display = 'block';
  try {
    const fileRef = storageRef(storage, `avatars/${currentUser.uid}/profile.jpg`);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    await updateDoc(doc(db,'users',currentUser.uid), { photoURL: url });
    userProgress.photoURL = url;
    renderTopbarAvatar(url, selectedAvatar);
    renderProfilePhotoContainer(url, selectedAvatar);
    window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('photo-uploading').style.display = 'none';
    alert('Foto salva com sucesso! 🎉');
  } catch(e) {
    window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('photo-uploading').style.display = 'none';
    alert('Erro ao enviar foto. Verifique as configurações do Firebase Storage.');
    console.error(e);
  }
};

function renderTopbarAvatar(photoURL, emoji) {
  const el = window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('topbar-avatar');
  if (photoURL) {
    el.innerHTML = '';
    el.className = '';
    const img = document.createElement('img');
    img.src = photoURL; img.className = 'topbar-photo'; img.alt = 'foto';
    el.appendChild(img);
  } else {
    el.className = 'user-avatar-sm';
    el.textContent = emoji || '😊';
  }
}

function renderProfilePhotoContainer(photoURL, emoji) {
  const container = window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('profile-photo-container');
  if (photoURL) {
    container.innerHTML = `<img src="${photoURL}" class="profile-photo-img" alt="foto">`;
  } else {
    container.innerHTML = `<div class="profile-photo-emoji" id="profile-avatar" onclick="toggleAvatarPicker()">${emoji||'😊'}</div>`;
  }
}

window.loginGoogle = async () => {
  try { await signInWithPopup(auth, new GoogleAuthProvider()); }
  catch(e) { alert('Erro: ' + e.message); }
};
window.logoutUser = async () => { await signOut(auth); };

onAuthStateChanged(auth, async (user) => {
  window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('loading-overlay').style.display = 'none';
  if (user) {
    currentUser = user;
    window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('login-screen').style.display = 'none';
    window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('main-app').style.display = 'block';
    window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('nav-tabs').classList.add('show');
    window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('topbar').classList.add('show');
    window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('user-name').textContent = user.displayName?.split(' ')[0] || 'Aluno';
    await loadProgress();
    renderLevelBar();
    renderCats();
    renderQuestion();
  } else {
    currentUser = null; userProgress = {};
    window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('login-screen').style.display = 'flex';
    window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('main-app').style.display = 'none';
    window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('nav-tabs').classList.remove('show');
    window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('topbar').classList.remove('show');
  }
});

// ── FIRESTORE ──
async function loadProgress() {
  if (!currentUser) return;
  const ref = doc(db, 'users', currentUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    userProgress = snap.data();
    state.pts = userProgress.totalPoints || 0;
    state.done = userProgress.totalAnswered || 0;
    state.level = userProgress.currentLevel || 0;
    state.levelStreak = userProgress.levelStreak || 0;
    selectedAvatar = userProgress.avatar || '😊';
    window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('pts').textContent = state.pts;
    window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('done').textContent = state.done;
    const savedPhoto = userProgress.photoURL || null;
    renderTopbarAvatar(savedPhoto, selectedAvatar);
  } else {
    await setDoc(ref, { name: currentUser.displayName, email: currentUser.email, totalPoints:0, totalAnswered:0, categories:{}, avatar:'😊', currentLevel:0, levelStreak:0, createdAt: serverTimestamp() });
  }
}

async function saveProgress(catId, points) {
  if (!currentUser) return;
  const ref = doc(db, 'users', currentUser.uid);
  const prev = userProgress?.categories?.[catId] || {};
  try {
    await updateDoc(ref, {
      totalPoints: state.pts, totalAnswered: state.done,
      currentLevel: state.level, levelStreak: state.levelStreak,
      [`categories.${catId}.totalPoints`]: (prev.totalPoints||0)+points,
      [`categories.${catId}.totalAnswered`]: (prev.totalAnswered||0)+1,
      [`categories.${catId}.lastPlayed`]: serverTimestamp(),
      [`categories.${catId}.bestLevel`]: Math.max(prev.bestLevel||0, state.level),
    });
    if(!userProgress.categories) userProgress.categories={};
    if(!userProgress.categories[catId]) userProgress.categories[catId]={};
    userProgress.categories[catId].totalPoints = (prev.totalPoints||0)+points;
    userProgress.totalPoints = state.pts;
    userProgress.totalAnswered = state.done;
    userProgress.currentLevel = state.level;
  } catch(e){}
}

async function saveCategoryComplete(catId) {
  if (!currentUser) return;
  try {
    await updateDoc(doc(db,'users',currentUser.uid), {
      [`categories.${catId}.completed`]: true,
      [`categories.${catId}.completedLevel`]: state.level,
    });
    if(!userProgress.categories) userProgress.categories={};
    if(!userProgress.categories[catId]) userProgress.categories[catId]={};
    userProgress.categories[catId].completed = true;
  } catch(e){}
}

window._saveProgress = saveProgress;
window._saveCategoryComplete = saveCategoryComplete;

// ── NÍVEL ──
window.setLevel = function(lv) {
  state.level = lv;
  state.levelStreak = 0;
  state.cat = null; state.idx = 0; state.answered = false;
  renderLevelBar(); renderCats(); renderQuestion();
};

window.renderLevelBar = function() {
  document.querySelectorAll('.level-btn').forEach(btn => {
    const lv = parseInt(btn.dataset.lv);
    btn.classList.toggle('active-level', lv === state.level);
  });
};

function checkAutoLevelUp() {
  if (state.levelStreak >= AUTO_LEVEL_UP && state.level < 3) {
    state.level++;
    state.levelStreak = 0;
    renderLevelBar();
    showLevelUpToast();
  }
}

function showLevelUpToast() {
  const toast = window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('levelup-toast');
  toast.innerHTML = `🎉 Parabéns! Você subiu para o nível <strong>${LEVEL_EMOJIS[state.level]} ${LEVEL_NAMES[state.level]}</strong>!`;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

// ── RANKING ──
window.loadRanking = async function() {
  const list = window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('ranking-list');
  list.innerHTML = '<div class="loading-rank">Carregando...</div>';
  try {
    const q = query(collection(db,'users'), orderBy('totalPoints','desc'), limit(20));
    const snap = await getDocs(q);
    if (snap.empty) { list.innerHTML='<div class="loading-rank">Nenhum jogador ainda.</div>'; return; }
    const medals = ['🥇','🥈','🥉'];
    let html = ''; let pos = 0;
    snap.forEach(d => {
      pos++;
      const data = d.data();
      const isMe = d.id === currentUser?.uid;
      const avatar = data.avatar || '😊';
      const photo = data.photoURL || null;
      const name = data.name?.split(' ')[0] || 'Aluno';
      const pts = data.totalPoints || 0;
      const lv = data.currentLevel || 0;
      html += `<div class="rank-row">
        <div class="rank-pos">${medals[pos-1]||pos}</div>
        <div class="rank-avatar">${photo ? `<img src="${photo}" class="rank-photo" alt="foto">` : avatar}</div>
        <div class="rank-info">
          <div class="rank-name">${name} ${isMe?'<span class="rank-me">Você</span>':''} <span class="lv-pill" style="background:${LEVEL_COLORS[lv]}">${LEVEL_NAMES[lv]}</span></div>
          <div class="rank-sub">${data.totalAnswered||0} respostas</div>
        </div>
        <div class="rank-score">${pts}</div>
      </div>`;
    });
    list.innerHTML = html;
  } catch(e) { list.innerHTML='<div class="loading-rank">Erro ao carregar.</div>'; }
};

// ── PERFIL ──
window.renderProfile = function() {
  if (!currentUser) return;
  const savedPhoto = userProgress.photoURL || null;
  renderProfilePhotoContainer(savedPhoto, selectedAvatar);
  if (!savedPhoto) { const el = window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('profile-avatar'); if(el) el.textContent = selectedAvatar; }
  window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('profile-name').textContent = currentUser.displayName || 'Aluno';
  window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('profile-email').textContent = currentUser.email || '';
  window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('p-pts').textContent = userProgress.totalPoints || 0;
  window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('p-done').textContent = userProgress.totalAnswered || 0;
  const cats = Object.values(userProgress.categories || {});
  window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('p-cats').textContent = cats.filter(c => c?.completed).length;
  window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('p-level').textContent = LEVEL_EMOJIS[state.level] + ' ' + LEVEL_NAMES[state.level];
  const grid = window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('avatar-grid');
  grid.innerHTML = AVATARS.map(a => `<div class="avatar-opt${a===selectedAvatar?' selected':''}" onclick="selectAvatarOpt('${a}')">${a}</div>`).join('');
  const progList = window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('cat-progress-list');
  progList.innerHTML = CATEGORIES.map(c => {
    const cp = userProgress?.categories?.[c.id];
    const pts = cp?.totalPoints || 0;
    const bestLv = cp?.bestLevel || 0;
    const maxPts = QUESTIONS[c.id][0].length * LEVEL_PTS[bestLv];
    const pct = Math.min(100, maxPts > 0 ? Math.round((pts/maxPts)*100) : 0);
    return `<div class="cat-prog-row">
      <div class="cat-prog-icon">${c.icon}</div>
      <div class="cat-prog-label">${c.label}</div>
      <div class="cat-prog-bar"><div class="cat-prog-fill" style="width:${pct}%;background:${LEVEL_COLORS[bestLv]}"></div></div>
      <div class="cat-prog-pts">${pts}pts</div>
    </div>`;
  }).join('');
};

window.toggleAvatarPicker = function() {
  const p = window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('avatar-picker');
  p.style.display = p.style.display==='none' ? 'block' : 'none';
};
window.selectAvatarOpt = function(a) {
  selectedAvatar = a;
  document.querySelectorAll('.avatar-opt').forEach(el => el.classList.toggle('selected', el.textContent===a));
};
window.saveAvatar = async function() {
  if (!currentUser) return;
  try {
    await updateDoc(doc(db,'users',currentUser.uid), { avatar: selectedAvatar });
    userProgress.avatar = selectedAvatar;
    window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('profile-avatar').textContent = selectedAvatar;
    const savedPhoto = userProgress.photoURL || null;
    renderTopbarAvatar(savedPhoto, selectedAvatar);
    window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('avatar-picker').style.display = 'none';
    alert('Avatar salvo! 🎉');
  } catch(e) {}
};

// ── TABS ──
window.showTab = function(tab) {
  ['quiz','ranking','profile'].forEach(t => {
    window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl(`tab-${t}-content`).style.display = t===tab?'block':'none';
    window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl(`tab-${t}`).classList.toggle('active', t===tab);
  });
  if (tab==='ranking') window.loadRanking();
  if (tab==='profile') window.renderProfile();
};

// ── PERGUNTAS POR NÍVEL ──
// Estrutura: QUESTIONS[categoria][nivel] = array de perguntas
const CATEGORIES = [
  {id:'logic',label:'Lógica',icon:'🔷'},
  {id:'math',label:'Matemática',icon:'➕'},
  {id:'memory',label:'Memória',icon:'🧠'},
  {id:'science',label:'Ciências',icon:'🔬'},
  {id:'geo',label:'Geografia',icon:'🌍'},
  {id:'history',label:'História',icon:'📜'},
  {id:'art',label:'Arte',icon:'🎨'},
  {id:'music',label:'Música',icon:'🎵'},
  {id:'pt',label:'Português',icon:'📖'},
  {id:'en',label:'Inglês',icon:'🇬🇧'},
  {id:'writing',label:'Redação',icon:'✏️'},
  {id:'3d',label:'3D e Formas',icon:'🧊'},  // ← NOVA CATEGORIA
];
window.CATEGORIES = CATEGORIES;

window.QUESTIONS = QUESTIONS;

// ── ESTADO ──
window.state = {cat:null, idx:0, pts:0, streak:0, done:0, answered:false, level:0, levelStreak:0};

// ── RENDER ──
window.renderCats = function() {
  window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('cats').innerHTML = CATEGORIES.map(c => {
    const cp = userProgress?.categories?.[c.id];
    const completed = cp?.completed;
    const bestLv = cp?.bestLevel || 0;
    const color = LEVEL_COLORS[bestLv];
    return `<button class="cat-btn${state.cat===c.id?' active':''}${completed?' done-cat':''}" onclick="selectCat('${c.id}')">
      <span class="cat-icon">${c.icon}</span>${c.label}
      ${completed?`<span class="cat-badge" style="background:${color}">${LEVEL_EMOJIS[bestLv]}</span>`:''}
    </button>`;
  }).join('');
};

window.selectCat = function(id){
  state.cat=id; state.idx=0; state.answered=false;
  renderCats(); renderQuestion();
};

window.renderQuestion = function(){
  const area=window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('quiz-area');
  if(!state.cat){area.innerHTML='<p style="text-align:center;color:#888;font-size:15px;padding:1rem 0;">Escolha uma categoria acima para começar!</p>';return;}
  const qs=QUESTIONS[state.cat][state.level];
  if(state.idx>=qs.length){renderResult();return;}
  window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('prog').style.width=Math.round((state.idx/qs.length)*100)+'%';
  state.cat==='writing'?renderWriting(qs[state.idx]):renderMCQ(qs[state.idx]);
};

window.renderMCQ = function(q){
  const qs=QUESTIONS[state.cat][state.level];
  const cat=CATEGORIES.find(c=>c.id===state.cat);
  const lc=LEVEL_COLORS[state.level];
  window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('quiz-area').innerHTML=`
    <div class="question-card">
      <div class="q-meta">
        <span>${cat.icon} ${cat.label}</span>
        <span><span class="level-badge lv${state.level}" style="background:${lc}">${LEVEL_EMOJIS[state.level]} ${LEVEL_NAMES[state.level]}</span> ${state.idx+1}/${qs.length}</span>
      </div>
      <div class="q-text">${q.q}</div>
      <div class="options">${q.opts.map((o,i)=>`<button class="opt-btn" id="opt${i}" onclick="answer(${i})">${o}</button>`).join('')}</div>
      <div class="feedback" id="fb"></div>
      <button class="next-btn" id="nxt" onclick="next()">Próxima →</button>
    </div>`;
};

window.renderWriting = function(q){
  const qs=QUESTIONS[state.cat][state.level];
  const lc=LEVEL_COLORS[state.level];
  window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('quiz-area').innerHTML=`
    <div class="question-card">
      <div class="q-meta">
        <span>✏️ Redação</span>
        <span><span class="level-badge" style="background:${lc}">${LEVEL_EMOJIS[state.level]} ${LEVEL_NAMES[state.level]}</span> ${state.idx+1}/${qs.length}</span>
      </div>
      <div class="q-text">${q.prompt}</div>
      <div class="tip-box">${q.tip}</div>
      <textarea class="writing-area" id="wtxt" placeholder="Escreva aqui..." oninput="updateCount(${q.minWords})"></textarea>
      <div class="word-count" id="wcount">0 palavras (mínimo ${q.minWords})</div>
      <div class="loading-txt" id="wloading">✨ Avaliando com IA...</div>
      <div class="ai-feedback" id="wfb"></div>
      <button class="submit-btn" id="wsubmit" onclick="submitWriting()" disabled>Enviar para correção ✨</button>
      <button class="next-btn" id="nxt" onclick="next()">Próxima →</button>
    </div>`;
};

window.updateCount = function(min){
  const txt=window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('wtxt').value.trim();
  const w=txt?txt.split(/\s+/).length:0;
  window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('wcount').textContent=w+' palavra'+(w!==1?'s':'')+(w<min?` (mínimo ${min})`:'  ✓');
  window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('wsubmit').disabled=w<min;
};

window.submitWriting = async function(){
  const txt=window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('wtxt').value.trim();
  const q=QUESTIONS['writing'][state.level][state.idx];
  window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('wsubmit').disabled=true;
  window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('wloading').style.display='block';
  window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('wtxt').disabled=true;
  const levelNames={0:'iniciante',1:'intermediário',2:'avançado',3:'expert'};
  try{
    const resp=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:600,
        system:`Você é um professor carinhoso para crianças de 7-8 anos. Avalie a redação de nível ${levelNames[state.level]} positivamente. Aponte 2 pontos positivos e 1 sugestão. Use emojis. Máximo 5 frases.`,
        messages:[{role:'user',content:`Nível: ${LEVEL_NAMES[state.level]}\nTema: "${q.prompt}"\nRedação: "${txt}"`}]})});
    const data=await resp.json();
    const text=data.content&&data.content[0]?data.content[0].text:'Muito bem! Continue praticando!';
    window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('wloading').style.display='none';
    const fb=window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('wfb');fb.className='ai-feedback show';
    fb.innerHTML='<strong>✨ Correção:</strong><br><br>'+text.replace(/\n/g,'<br>');
  }catch(e){
    window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('wloading').style.display='none';
    window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('wfb').className='ai-feedback show';
    window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('wfb').innerHTML='✅ Ótimo esforço! Continue praticando!';
  }
  const pts=LEVEL_PTS[state.level]+5;
  state.pts+=pts; state.done++; state.levelStreak++;
  window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('pts').textContent=state.pts;
  window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('done').textContent=state.done;
  window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('nxt').className='next-btn show';
  checkAutoLevelUp();
  await window._saveProgress(state.cat,pts);
};

window.answer = async function(i){
  if(state.answered)return;
  state.answered=true;
  const q=QUESTIONS[state.cat][state.level][state.idx];
  document.querySelectorAll('.opt-btn').forEach(b=>b.disabled=true);
  window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('opt'+q.ans).classList.add('correct');
  state.done++;
  const ok=i===q.ans;
  const pts=ok?LEVEL_PTS[state.level]:0;
  if(ok){
    window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('opt'+i).classList.add('correct');
    state.pts+=pts; state.streak++; state.levelStreak++;
    window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('fb').className='feedback show ok';
    window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('fb').textContent=`✓ Correto! +${pts}pts — ${q.exp}`;
  }else{
    window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('opt'+i).classList.add('wrong');
    state.streak=0; state.levelStreak=0;
    window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('fb').className='feedback show nok';
    window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('fb').textContent='✗ Quase! '+q.exp;
  }
  window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('pts').textContent=state.pts;
  window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('streak').textContent=state.streak;
  window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('done').textContent=state.done;
  window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('nxt').className='next-btn show';
  if(ok) checkAutoLevelUp();
  await window._saveProgress(state.cat,pts);
};

window.next = function(){state.idx++;state.answered=false;renderQuestion();};

window.renderResult = async function(){
  window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('prog').style.width='100%';
  const cat=CATEGORIES.find(c=>c.id===state.cat);
  const lc=LEVEL_COLORS[state.level];
  const nextLv=state.level<3;
  window.__getEl||(window.__elCache={});window.__getEl=(id)=>window.__elCache[id]||(window.__elCache[id]=document.getElementById(id));__getEl('quiz-area').innerHTML=`
    <div class="result-card">
      <div style="font-size:48px;margin-bottom:12px;">🏆</div>
      <h2>Parabéns!</h2>
      <p>Você terminou <strong>${cat.label}</strong> no nível<br>
      <span class="level-badge" style="background:${lc};padding:4px 14px;font-size:14px;">${LEVEL_EMOJIS[state.level]} ${LEVEL_NAMES[state.level]}</span></p>
      <p style="margin-top:12px;">Total: <strong>${state.pts} pontos</strong></p>
      ${nextLv?`<p style="font-size:13px;color:#888;margin-bottom:8px;">Quer tentar o nível <strong>${LEVEL_NAMES[state.level+1]}</strong>?</p>
      <button class="restart-btn" style="margin-bottom:8px;border-color:${LEVEL_COLORS[state.level+1]};color:${LEVEL_COLORS[state.level+1]}" onclick="goNextLevel()">Subir para ${LEVEL_EMOJIS[state.level+1]} ${LEVEL_NAMES[state.level+1]}</button><br>`:``}
      <button class="restart-btn" onclick="restart()" style="margin-top:8px;">Escolher outra categoria</button>
    </div>`;
  await window._saveCategoryComplete(state.cat);
  renderCats();
};

window.goNextLevel = function(){
  state.level++;
  state.cat=null; state.idx=0; state.answered=false;
  renderLevelBar(); renderCats(); renderQuestion();
};

window.restart = function(){state.cat=null;state.idx=0;state.answered=false;renderCats();renderQuestion();};

if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js');}
