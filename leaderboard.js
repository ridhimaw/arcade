/* Mini Arcade leaderboard
 * ------------------------------------------------------------------
 * Shared by every game. Shows a leaderboard at the side (laptop) or
 * behind a 🏆 button (phone), and lets players save their score with a name.
 *
 * WORLDWIDE MODE: paste your Supabase details below. Until then, scores
 * are kept on each device only.
 */
const LEADERBOARD_CONFIG = {
  supabaseUrl: 'https://kklanvtonnqbpxpcbrld.supabase.co',
  supabaseKey: 'sb_publishable_nElmHUn-EpLlhguLl3p-vQ_MwElXEIX'    // publishable key — safe to put in a web page
};

window.LB = (() => {
  const SIDE_W = 300;
  const NAME_KEY = 'arcadePlayerName';
  const remote = !!(LEADERBOARD_CONFIG.supabaseUrl && LEADERBOARD_CONFIG.supabaseKey);
  const wideMQ = matchMedia('(min-width: 900px)');

  let boards = [], current = null, opts = {}, offers = [], highlight = null, open = true, lastRows = [];
  try { open = localStorage.getItem('lbOpen') !== '0'; } catch (e) {}

  // ---------- data ----------
  function headers() {
    const k = LEADERBOARD_CONFIG.supabaseKey;
    const h = { apikey: k, 'Content-Type': 'application/json' };
    if (!k.startsWith('sb_')) h.Authorization = 'Bearer ' + k; // older "anon" JWT keys need this too
    return h;
  }
  const api = () => LEADERBOARD_CONFIG.supabaseUrl.replace(/\/+$/, '') + '/rest/v1/scores';

  function localGet(id) { try { return JSON.parse(localStorage.getItem('lb:' + id)) || []; } catch (e) { return []; } }
  function localAdd(b, name, score) {
    const rows = localGet(b.id); rows.push({ name, score, at: Date.now() });
    rows.sort((x, y) => b.lower ? x.score - y.score : y.score - x.score);
    try { localStorage.setItem('lb:' + b.id, JSON.stringify(rows.slice(0, 50))); } catch (e) {}
  }
  // one row per player (their best), top 10
  function bestPerName(rows, b) {
    const seen = new Map();
    for (const r of rows) {
      const k = r.name.trim().toLowerCase();
      const old = seen.get(k);
      if (!old || (b.lower ? r.score < old.score : r.score > old.score)) seen.set(k, r);
    }
    return [...seen.values()].sort((x, y) => b.lower ? x.score - y.score : y.score - x.score).slice(0, 10);
  }

  async function load(b) {
    if (!remote) return bestPerName(localGet(b.id), b);
    const q = `?select=name,score&game=eq.${encodeURIComponent(b.id)}&order=score.${b.lower ? 'asc' : 'desc'}&limit=200`;
    const res = await fetch(api() + q, { headers: headers() });
    if (!res.ok) throw new Error('load ' + res.status);
    return bestPerName(await res.json(), b);
  }

  async function submit(b, name, score) {
    name = cleanName(name);
    if (!name) throw new Error('name');
    try { localStorage.setItem(NAME_KEY, name); } catch (e) {}
    localAdd(b, name, score);
    if (remote) {
      const res = await fetch(api(), { method: 'POST', headers: { ...headers(), Prefer: 'return=minimal' }, body: JSON.stringify({ game: b.id, name, score: Math.round(score) }) });
      if (!res.ok) throw new Error('save ' + res.status);
    }
    highlight = name.toLowerCase();
  }

  function cleanName(n) { return String(n || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16); }
  function savedName() { try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; } }
  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  // ---------- UI ----------
  const css = `
  .lb-panel{position:fixed;top:0;right:0;bottom:0;width:${SIDE_W}px;z-index:20;display:flex;flex-direction:column;
    background:rgba(13,12,30,.94);border-left:1px solid rgba(255,255,255,.1);color:#eef0ff;
    font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
    transform:translateX(0);transition:transform .25s ease;-webkit-user-select:text;user-select:text}
  .lb-panel.closed{transform:translateX(105%)}
  .lb-head{display:flex;align-items:center;justify-content:space-between;padding:18px 18px 10px}
  .lb-head b{font-size:18px;font-weight:800}
  .lb-x{background:none;border:0;color:#a7a3c9;font-size:22px;cursor:pointer;padding:4px 8px;border-radius:8px;line-height:1}
  .lb-x:hover{background:rgba(255,255,255,.08);color:#fff}
  .lb-tabs{display:flex;flex-wrap:wrap;gap:6px;padding:0 18px 10px}
  .lb-tabs button{font:600 12px inherit;font-family:inherit;color:#c9c6e6;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:99px;padding:5px 10px;cursor:pointer}
  .lb-tabs button.on{background:var(--lb-accent);color:#0c0b1d;border-color:var(--lb-accent)}
  .lb-mode{font-size:12px;color:#8f8ab5;padding:0 18px 8px}
  .lb-list{list-style:none;margin:0;padding:0 10px;overflow-y:auto;flex:1}
  .lb-list li{display:flex;align-items:center;gap:10px;padding:9px 8px;border-radius:10px;font-size:15px}
  .lb-list li:nth-child(odd){background:rgba(255,255,255,.03)}
  .lb-list li.me{background:color-mix(in srgb,var(--lb-accent) 22%,transparent);outline:1px solid var(--lb-accent)}
  .lb-rank{width:26px;text-align:center;font-weight:800;color:#8f8ab5}
  .lb-list li:nth-child(1) .lb-rank{color:#ffd479} .lb-list li:nth-child(2) .lb-rank{color:#d5dbe8} .lb-list li:nth-child(3) .lb-rank{color:#e3a36b}
  .lb-name{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .lb-score{font-weight:800;font-variant-numeric:tabular-nums}
  .lb-empty{color:#8f8ab5;font-size:14px;padding:14px 8px;line-height:1.45}
  .lb-form{margin:10px 14px 16px;padding:14px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid var(--lb-accent)}
  .lb-form p{margin:0 0 10px;font-size:14px;color:#d9d6f2;line-height:1.35}
  .lb-form p b{color:#fff;font-size:16px}
  .lb-row{display:flex;gap:8px}
  .lb-row input{flex:1;min-width:0;font:600 15px inherit;font-family:inherit;color:#fff;background:#0c0b1d;border:1px solid rgba(255,255,255,.2);border-radius:10px;padding:10px 12px;outline:none}
  .lb-row input:focus{border-color:var(--lb-accent)}
  .lb-row button{font:800 14px inherit;font-family:inherit;color:#0c0b1d;background:var(--lb-accent);border:0;border-radius:10px;padding:0 14px;cursor:pointer}
  .lb-row button:disabled{opacity:.5}
  .lb-msg{font-size:13px;margin-top:8px;min-height:1em;color:#a7a3c9}
  .lb-tab-btn{position:fixed;z-index:19;right:12px;bottom:12px;padding:9px 14px;border-radius:999px;cursor:pointer;
    font:700 13px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#eef0ff;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);
    backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
  .lb-tab-btn.hide{display:none}
  .lb-tab-btn.pulse{background:var(--lb-accent);color:#0c0b1d;border-color:var(--lb-accent)}
  @media (max-width:899px){
    .lb-panel{top:auto;left:0;width:auto;max-height:78vh;border-left:0;border-top:1px solid rgba(255,255,255,.12);border-radius:20px 20px 0 0;transform:translateY(0)}
    .lb-panel.closed{transform:translateY(105%)}
    .lb-panel.peek .lb-list,.lb-panel.peek .lb-tabs,.lb-panel.peek .lb-mode{display:none}
    .lb-panel.peek .lb-head{padding-bottom:0}
  }`;

  let panel, tabBtn;
  function build() {
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    document.documentElement.style.setProperty('--lb-accent', opts.accent || '#c48bff');
    panel = document.createElement('aside');
    panel.className = 'lb-panel';
    panel.setAttribute('aria-label', 'Leaderboard');
    panel.innerHTML = `<div class="lb-head"><b>🏆 Leaderboard</b><button class="lb-x" title="Hide leaderboard" aria-label="Hide leaderboard">×</button></div>
      <div class="lb-tabs"></div><div class="lb-mode">${remote ? 'Worldwide · best score per player' : 'On this device · best score per player'}</div>
      <ol class="lb-list"></ol><div class="lb-formwrap"></div>`;
    tabBtn = document.createElement('button');
    tabBtn.className = 'lb-tab-btn'; tabBtn.textContent = '🏆 Leaderboard';
    document.body.appendChild(panel); document.body.appendChild(tabBtn);
    // keep game controls from firing while using the panel
    ['pointerdown', 'keydown', 'keyup'].forEach(ev => { panel.addEventListener(ev, e => e.stopPropagation()); tabBtn.addEventListener(ev, e => e.stopPropagation()); });
    panel.querySelector('.lb-x').onclick = () => setOpen(false);
    tabBtn.onclick = () => { panel.classList.remove('peek'); setOpen(true); };
    wideMQ.addEventListener ? wideMQ.addEventListener('change', layout) : wideMQ.addListener(layout);
    if (boards.length > 1) {
      panel.querySelector('.lb-tabs').innerHTML = boards.map(b => `<button data-id="${b.id}">${esc(b.label)}</button>`).join('');
      panel.querySelectorAll('.lb-tabs button').forEach(t => t.onclick = () => show(boards.find(b => b.id === t.dataset.id)));
    }
    if (!wideMQ.matches) open = false; // phones start with it tucked away
    layout(); show(boards[0]);
  }

  function setOpen(v) {
    open = v;
    if (wideMQ.matches) { try { localStorage.setItem('lbOpen', v ? '1' : '0'); } catch (e) {} }
    layout();
  }
  function layout() {
    panel.classList.toggle('closed', !open);
    tabBtn.classList.toggle('hide', open);
    document.body.classList.toggle('lb-side', side() > 0);
    if (opts.pageShift) document.body.style.paddingRight = side() ? SIDE_W + 'px' : '';
    dispatchEvent(new Event('resize'));
  }
  function side() { return wideMQ.matches && open ? SIDE_W : 0; }

  async function show(b) {
    current = b;
    panel.querySelectorAll('.lb-tabs button').forEach(t => t.classList.toggle('on', t.dataset.id === b.id));
    const list = panel.querySelector('.lb-list');
    list.innerHTML = '<div class="lb-empty">Loading…</div>';
    try { lastRows = await load(b); }
    catch (e) { lastRows = bestPerName(localGet(b.id), b); list.innerHTML = ''; }
    if (current !== b) return;
    list.innerHTML = lastRows.length
      ? lastRows.map((r, i) => `<li class="${r.name.trim().toLowerCase() === highlight ? 'me' : ''}"><span class="lb-rank">${i + 1}</span><span class="lb-name">${esc(r.name)}</span><span class="lb-score">${esc(b.fmt(r.score))}</span></li>`).join('')
      : `<div class="lb-empty">No scores yet. Play a round and be the first name on the board!</div>`;
    renderForm();
  }

  function renderForm() {
    const wrap = panel.querySelector('.lb-formwrap');
    if (!offers.length) { wrap.innerHTML = ''; return; }
    const items = offers.map(o => `${esc(o.label || 'Your score')}: <b>${esc(o.board.fmt(o.score))}</b>`).join('<br>');
    wrap.innerHTML = `<form class="lb-form"><p>${items}<br>Add your name to the leaderboard</p>
      <div class="lb-row"><input maxlength="16" placeholder="Your name" autocomplete="nickname" enterkeyhint="done" value="${esc(savedName())}"><button type="submit">${offers.length > 1 ? 'Save all' : 'Save'}</button></div>
      <div class="lb-msg"></div></form>`;
    const form = wrap.querySelector('form'), input = form.querySelector('input'), btn = form.querySelector('button'), msg = form.querySelector('.lb-msg');
    form.onsubmit = async e => {
      e.preventDefault();
      if (!cleanName(input.value)) { msg.textContent = 'Type a name first.'; input.focus(); return; }
      btn.disabled = true; msg.textContent = 'Saving…';
      try {
        let last = null;
        while (offers.length) { const o = offers[0]; await submit(o.board, input.value, o.score); last = o.board; offers.shift(); }
        panel.classList.remove('peek');
        await show(last || current);
        const me = panel.querySelector('.lb-list li.me'); if (me) me.scrollIntoView({ block: 'nearest' });
      } catch (err) {
        btn.disabled = false;
        msg.textContent = remote ? "Couldn't reach the leaderboard. Check your connection and try again." : 'Something went wrong.';
      }
    };
  }

  // ---------- public ----------
  return {
    /** boards: [{id, label, lower?, fmt?}], accent, pageShift (true for normal pages) */
    init(o) {
      opts = o || {};
      boards = (opts.boards || []).map(b => ({ fmt: s => String(s), lower: false, ...b }));
      if (document.body) build(); else addEventListener('DOMContentLoaded', build);
    },
    /** how many px on the right the game should leave free */
    side,
    /** call when a round ends */
    offer(score, boardId, label) {
      if (!panel || !(score > 0)) return;
      const b = boards.find(x => x.id === boardId) || boards[0];
      offers = offers.filter(o => o.board !== b);
      offers.push({ board: b, score, label });
      if (current !== b) show(b); else renderForm();
      if (wideMQ.matches) { if (!open) setOpen(true); }
      else { panel.classList.add('peek'); open = true; layout(); }
    },
    /** call when a new round starts */
    clearOffer() {
      if (!panel) return;
      offers = []; renderForm();
      if (!wideMQ.matches && panel.classList.contains('peek')) { panel.classList.remove('peek'); open = false; layout(); }
    },
    isRemote: () => remote
  };
})();
