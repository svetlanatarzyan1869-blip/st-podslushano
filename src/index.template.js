/* ============================================================================
 * Подслушано 👂 — расширение SillyTavern (порт плагина Tavo «Подслушано»)
 * Стена анонимного паблика ВК 2017 по вашему сюжету: посты глазами соседей и
 * случайных свидетелей, комментарии, опрос, цитаты из пабликов, взаимный пиар,
 * сохранёнки и песни 2017 года.
 * Отличия от Tavo:
 *   - модель: подключение самой таверны (generateRaw) ИЛИ свой провайдер через тот же
 *     прокси на Cloudflare, что и в Tavo;
 *   - настройки — в «Расширениях», состояние стены — в метаданных чата;
 *   - «Пустить в сюжет» — через setExtensionPrompt на ОДНУ следующую генерацию;
 *   - никаких iframe: всё рисуем прямо в страницу таверны.
 * Сборка: python3 build.py (подставляет альбом, песни и стикеры).
 * ========================================================================== */
const MODULE = 'podslushano';
const VERSION = __VERSION__;
const PROXY_URL = 'https://podslushano-album.spletnik-meme-worker.workers.dev/relay';
const ALBUM_URL = 'https://podslushano-album.spletnik-meme-worker.workers.dev/img/';
const ALBUM = __ALBUM__;       // [{id:'07', tags:['sunset'], w:600, h:600}]
const SONGS = __SONGS__;       // [{id:'3', a:'Грибы', t:'Тает лёд', tags:['flirt','love']}]
const STICKERS = __STICKERS__; // {'03': 'data:image/webp;base64,…'} — стикеры Спотти для комментариев
const AVATAR = __AVATAR__;     // стикер Спотти: аватар паблика
const FAB = __FAB__;           // стикер Спотти для плавающей кнопки
const SPOTTY = '<img class="pdx-spotty" src="' + AVATAR + '" alt="">';
const MOODS = ['love', 'longing', 'sad', 'jealous', 'party', 'street', 'sunset', 'cozy', 'funny', 'sassy', 'drama', 'flirt'];

const ST_KEY = 'podslushano_state';     // chatMetadata: {fields, count, picks, recent}
const OFFER_KEY = 'podslushano_offers'; // chatMetadata: [текст, …] — новости из «Предложить новость»
const FX_KEY = 'podslushano_fx';        // chatMetadata: [OOC-строка, …] — ждут следующей генерации
const FX_PROMPT = 'podslushano_fx';     // ключ setExtensionPrompt
const MAX_OFFERS = 3;
const MAX_TOKENS = 2400;

function ctx() { return SillyTavern.getContext(); }

/* ══════════════════ настройки ══════════════════ */
const DEFAULTS = { source: 'st', providerUrl: '', apiKey: '', model: '', everyN: 4, auto: true, images: true, music: true, fab: true };
function cfg() {
    const all = ctx().extensionSettings;
    if (!all[MODULE]) all[MODULE] = {};
    const s = all[MODULE];
    for (const k in DEFAULTS) if (s[k] === undefined) s[k] = DEFAULTS[k];
    return s;
}
function saveCfg() { ctx().saveSettingsDebounced(); }
function ownProvider() { return cfg().source === 'own'; }
function everyN() { const n = parseInt(cfg().everyN, 10); return n >= 1 ? n : 4; }
function autoOn() { return cfg().auto !== false; }
function imagesOn() { return cfg().images !== false; }
function musicOn() { return cfg().music !== false; }
function configured() {
    const s = cfg();
    if (ownProvider()) return !!(String(s.providerUrl).trim() && String(s.apiKey).trim() && String(s.model).trim());
    return ctx().onlineStatus !== 'no_connection';
}
function cfgLine() {
    const s = cfg();
    const mark = v => (String(v || '').trim() ? '✓' : '✗');
    if (!ownProvider()) return 'модель: подключение таверны · ' + (ctx().onlineStatus === 'no_connection' ? 'не подключено' : 'подключено (' + (ctx().mainApi || '?') + ')');
    return 'модель: свой провайдер · адрес ' + mark(s.providerUrl) + ' · ключ ' + mark(s.apiKey) + ' · модель ' + mark(s.model);
}

/* ══════════════════ хранилище чата ══════════════════ */
function meta() { return ctx().chatMetadata || {}; }
function metaGet(key) { return meta()[key]; }
function metaSet(key, value) {
    const m = ctx().chatMetadata;
    if (!m) return;
    m[key] = value;
    ctx().saveMetadataDebounced();
}
function chatCount() { return (ctx().chat || []).length; }
function hasChat() { return !!ctx().getCurrentChatId(); }

/* ══════════════════ утилиты ══════════════════ */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function toast(m, kind = 'info') { try { toastr[kind](m); } catch (e) { console.log('[podslushano]', m); } }
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function num(v, d) { const n = parseInt(String(v == null ? '' : v).replace(/[^\d-]/g, ''), 10); return isNaN(n) ? d : n; }
function plural(n, forms) { n = Math.abs(n) % 100; const n1 = n % 10; if (n > 10 && n < 20) return forms[2]; if (n1 > 1 && n1 < 5) return forms[1]; if (n1 === 1) return forms[0]; return forms[2]; }
function short(n) { // как в ВК: 845, 1,2K, 12K
    if (n >= 1e6) return (Math.round(n / 1e5) / 10 + '').replace('.', ',') + 'M';
    if (n >= 1e4) return Math.round(n / 1e3) + 'K';
    if (n >= 1e3) return (Math.round(n / 100) / 10 + '').replace('.', ',') + 'K';
    return String(n);
}
function spaced(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
const AVA_COLORS = ['#e57373', '#f06292', '#ba68c8', '#7986cb', '#4fc3f7', '#4db6ac', '#81c784', '#ffb74d', '#a1887f', '#90a4ae'];
function avaColor(s) { let h = 0; s = String(s || ''); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return AVA_COLORS[h % AVA_COLORS.length]; }

const ICON = {
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.6 1.1 5.2 3 1.6-1.9 3.1-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z"/></svg>',
    comment: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3C6.5 3 2 6.6 2 11c0 2.4 1.3 4.5 3.4 6L4.5 21l4.3-2.3c1 .2 2.1.3 3.2.3 5.5 0 10-3.6 10-8s-4.5-8-10-8z"/></svg>',
    repost: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13 5.5V2l8 7-8 7v-3.6c-5.3 0-8.6 1.6-11 5.6.8-5.7 3.9-10.9 11-12.5z"/></svg>',
    eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 5C6.5 5 2.7 9.3 1.5 12c1.2 2.7 5 7 10.5 7s9.3-4.3 10.5-7C21.3 9.3 17.5 5 12 5zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16 3l5 5-2 1-3.5 3.5.5 4.5-1.5 1.5-4-4L5 20l-1-1 5.5-5.5-4-4L7 8l4.5.5L15 5z"/></svg>',
    play: '<svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>',
    pause: '<svg class="i-pause" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
};

/* ══════════════════ разметка окна ══════════════════ */
const MARKUP =
    '<button class="pdx-fab" type="button" title="Подслушано"><img class="pdx-spotty" src="' + FAB + '" alt=""></button>' +
    '<div class="pdx-pop">' +
    '<div class="pdx-bar"><span class="pdx-bar-t">Подслушано</span>' +
    '<span class="pdx-tools">' +
    '<button class="pdx-refresh" type="button" title="свежие записи">⟳</button>' +
    '<button class="pdx-close" type="button" title="закрыть">✕</button></span></div>' +
    '<div class="pdx-out"></div></div>';

let root, fab, pop, out, barTitle, refBtn, closeBtn;

/* ══════════════════ контекст сцены ══════════════════ */
const SERVICE_TAGS = /\[(HUD|IM|MOOD|FETISH|MSG|CHAOS|CONSEQUENCE|HEADER|BOOTS|JOURNAL)\][\s\S]*?\[\/\1\]/gi;
function buildContext() {
    const c = ctx();
    const uname = c.name1 || 'User';
    const msgs = (c.chat || []).filter(m => m && !m.is_system).slice(-10);
    const bg = [];
    if (c.groupId) {
        const g = (c.groups || []).find(x => x.id === c.groupId);
        const names = g && g.members ? g.members.map(av => (c.characters.find(ch => ch.avatar === av) || {}).name).filter(Boolean) : [];
        if (names.length) bg.push('Characters: ' + names.join(', '));
    } else if (c.name2) {
        bg.push('Character: ' + c.name2);
    }
    try {
        const f = c.getCharacterCardFields ? c.getCharacterCardFields() : {};
        if (f.description) bg.push('Description: ' + String(f.description).slice(0, 300));
        if (f.scenario) bg.push('Scenario: ' + String(f.scenario).slice(0, 180));
        bg.push('Player character: ' + uname);
        if (f.persona) bg.push('Player persona: ' + String(f.persona).slice(0, 180));
    } catch (e) { bg.push('Player character: ' + uname); }
    const transcript = msgs.map(m => {
        const who = m.is_user ? uname : (m.name || c.name2 || 'Character');
        let t = String(m.mes || '').replace(SERVICE_TAGS, '').replace(/<DYNAMICS>[\s\S]*?<\/DYNAMICS>/gi, '');
        if (t.length > 420) t = t.slice(0, 420) + '…';
        return who + ': ' + t.trim();
    }).join('\n');
    return { bg: bg.join('\n'), transcript };
}

const POST_KEYS = i => [
    '  post' + i + '_time: <HH:MM, a plausible time close to the scene>',
    '  post' + i + '_text: <the anonymous post, 2-4 sentences, as sent to the suggestion box>',
    '  post' + i + '_mood: <ONE of: ' + MOODS.join(' | ') + '>',
    '  post' + i + '_likes: <number>',
    '  post' + i + '_reposts: <number>',
    '  post' + i + '_views: <number, bigger than likes>',
    '  post' + i + '_offer: <yes if this post publishes a suggestion from the suggestion box, else no>',
    '  post' + i + '_c1_name: <Russian first and last name of a commenter>',
    '  post' + i + '_c1_text: <short comment in 2017 VK style, or exactly STICKER>',
    '  post' + i + '_c2_name: <another commenter — OPTIONAL, see comments rule>',
    '  post' + i + '_c2_text: <short comment, can argue or joke with someone above>',
    '  post' + i + '_c3_name: <OPTIONAL>',
    '  post' + i + '_c3_text: <short comment, or exactly STICKER>',
    '  post' + i + '_c4_name: <OPTIONAL>',
    '  post' + i + '_c4_text: <short comment, can reply to someone above by name>',
    '  post' + i + '_c5_name: <OPTIONAL>',
    '  post' + i + '_c5_text: <short comment>',
].join('\n');

const QUOTE_KEYS = k => [
    '  quote' + k + '_public: <name of the 2017 VK quote public it was reposted from, e.g. "Пацанские цитаты", "Мысли вслух", "Типичная девочка", "Юность", "Цитаты великих пацанов">',
    '  quote' + k + '_text: <1-2 short lines: an ORIGINAL aesthetic quote about love, youth, friends, loneliness or the mood of the scene, OR a popular 2017 Russian internet catchphrase or meme phrase. Never quote song lyrics.>',
    '  quote' + k + '_mood: <ONE of: ' + MOODS.join(' | ') + '>',
    '  quote' + k + '_likes: <number>',
].join('\n');

const SYSTEM = [
    'You are the admin of an anonymous VKontakte public page «Подслушано …» in 2017, Russia. You never roleplay and never address the user. From a roleplay transcript you write the CURRENT wall of the public.',
    '',
    'Posts are anonymous messages that people AROUND the characters sent to the suggestion box: neighbours, classmates, coworkers, a cashier, random witnesses on the street. They retell what they SAW or HEARD in the recent scene — gossipy, funny, touching or dramatic. Everything must be GROUNDED in real events of the recent scene, but seen from outside: strangers cannot know thoughts or private details, they only notice and guess. Refer to the characters by how outsiders would see them ("высокий парень в спортивках", "девушка с пионами"), use names only if people around would know them. Never contradict the story.',
    '',
    'Style: VK 2017 internet — lowercase allowed, ")))", "ахах", "лол", "ору", "пж", "спс", "кек", "#анонимно", occasional emoji. Post types to mix: признание, «ищу», наблюдение, жалоба, вопрос к подписчикам. Comments are short, lively, can argue.',
    '',
    'The admin also reposts 2 posts from 2017 quote publics: short aesthetic quotes or popular catchphrases of that time. They do not name the characters, they only echo the mood of the scene. Write them yourself; never copy song lyrics.',
    '',
    'Comments rule: each post gets between 1 and 5 comments, and the three posts must have DIFFERENT numbers of comments. Number comment keys from c1 upward without gaps and simply leave out the lines for comments you do not write.',
    '',
    'Output ONLY "key: value" lines, one per line, no preamble, no markdown, no code fences, never break a value across lines. Output every key below exactly once, in this order (except the optional comment lines):',
    '  place: <where the public is, from the story: e.g. "в МГУ", "Химки", "ЖК Солнечный", "в 17-й школе">',
    '  subscribers: <number between 3000 and 90000>',
    '  pinned: <the pinned rules line of the public, short, 2017 style>',
    POST_KEYS(1), POST_KEYS(2), POST_KEYS(3),
    '  poll_q: <an anonymous poll question to subscribers about the scene>',
    '  poll_o1: <option 1>', '  poll_p1: <percent>',
    '  poll_o2: <option 2>', '  poll_p2: <percent>',
    '  poll_o3: <option 3>', '  poll_p3: <percent, the three percents sum to 100>',
    '  poll_votes: <number of voters>',
    QUOTE_KEYS(1),
    '  promo_name: <a fake 2017 VK public name for mutual PR, e.g. "Пацанские цитаты", "Типичная девочка">',
    '  promo_text: <one-line ad of that public>',
    QUOTE_KEYS(2),
    '',
    'ALL free-text values MUST be in the SAME language as the transcript (Russian if the transcript is Russian). Numbers are digits only. "_mood" values are exactly one English word from the list.',
].join('\n');

function buildUserPrompt(cx, pending) {
    const parts = [];
    if (cx.bg) parts.push('=== Characters ===\n' + cx.bg);
    parts.push('=== Recent scene transcript ===\n' + cx.transcript);
    if (pending && pending.length) {
        parts.push('=== Suggestion box: news sent by a subscriber ===\n' + pending.map((o, k) => (k + 1) + '. ' + o).join('\n') +
            '\nPublish EACH of these as post1' + (pending.length > 1 ? '..post' + pending.length : '') + ' in this order: rewrite it in the anonymous 2017 VK style, keep every fact and name exactly as sent, do not add events that contradict it, and set _offer: yes for it. All other posts get _offer: no.');
    }
    parts.push('Now write the CURRENT wall of the public based on this scene. Output only the key: value lines.');
    return parts.join('\n\n');
}

/* ══════════════════ запрос к модели ══════════════════ */
function stageError(kind, message, extra) { const e = new Error(message); e.kind = kind; if (extra) Object.assign(e, extra); return e; }

async function callOwn(system, user, diag) {
    const s = cfg();
    const t0 = Date.now();
    let r;
    diag.maxTokens = MAX_TOKENS;
    try {
        r = await fetch(PROXY_URL, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                providerUrl: String(s.providerUrl).trim(), key: String(s.apiKey).trim(), model: String(s.model).trim(),
                messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
                max_tokens: MAX_TOKENS, temperature: 0.95,
            }),
        });
    } catch (e) {
        diag.seconds = (Date.now() - t0) / 1000;
        throw stageError('network', (e && e.message) || String(e));
    }
    const t = await r.text();
    diag.seconds = (Date.now() - t0) / 1000;
    diag.status = r.status;
    let data; try { data = JSON.parse(t); } catch (e) { data = null; }
    if (data && data.error && data.status) diag.status = data.status; // релей кладёт статус провайдера в тело
    if (data && data.meta) diag.meta = data.meta;
    if (!r.ok || (data && data.error)) {
        const msg = data && data.error ? data.error : ('прокси ' + r.status);
        throw stageError('http', msg, { detail: data && data.detail ? String(data.detail) : (data ? '' : t.slice(0, 300)) });
    }
    const content = (data && data.content) || (data ? '' : t);
    diag.rawChars = content.length;
    return content;
}

// «Думающие» модели (Gemini 2.5/3 Pro и т.п.) тратят лимит ответа ещё и на размышления:
// с 2400 токенами стена обрывалась на первом посте. Берём не меньше 8192
// или сколько стоит у таверны в «Макс. длина ответа», если там больше.
function tavernBudget() {
    const set = ctx().chatCompletionSettings || {};
    return Math.max(8192, Number(set.openai_max_tokens) || 0);
}

async function callTavern(system, user, diag) {
    const t0 = Date.now();
    const budget = tavernBudget();
    diag.maxTokens = budget;
    let text;
    try {
        text = await ctx().generateRaw({ systemPrompt: system, prompt: user, responseLength: budget });
    } catch (e) {
        diag.seconds = (Date.now() - t0) / 1000;
        throw stageError('tavern', (e && e.message) || String(e));
    }
    diag.seconds = (Date.now() - t0) / 1000;
    text = String(text || '');
    diag.rawChars = text.length;
    if (!text.trim()) throw stageError('http', 'пустой ответ');
    return text;
}

function parseBlock(raw) {
    const f = {};
    String(raw || '').replace(/```[a-z]*|```/gi, '').split(/\r?\n/).forEach(line => {
        line = line.trim(); if (!line) return;
        const c = line.indexOf(':'); if (c === -1) return;
        const k = line.slice(0, c).trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        let v = line.slice(c + 1).trim();
        // снимаем только ОБРАМЛЯЮЩИЕ кавычки: «ЖК «Северный»» не должен терять закрывающую
        if (/^".*"$/.test(v) || /^'.*'$/.test(v)) v = v.slice(1, -1).trim();
        else if (/^«[^«»]*»$/.test(v)) v = v.slice(1, -1).trim();
        if (k && v && !(k in f)) f[k] = v;
    });
    return f;
}
function hasWall(f) { return !!(f && (f.post1_text || f.post2_text || f.post3_text)); }
// в стене всегда три поста; без третьего ответ модели оборвался
function wallComplete(f) { return !!(f && f.post1_text && f.post2_text && f.post3_text); }

/* ══════════════════ подбор сохранёнок и песен ══════════════════ */
function moodOf(v) { v = String(v || '').toLowerCase().replace(/[^a-z]/g, ''); return MOODS.indexOf(v) >= 0 ? v : null; }
function pick(list, mood, avoid) {
    const free = x => avoid.indexOf(x.id) === -1;
    let pool = mood ? list.filter(x => x.tags.indexOf(mood) >= 0 && free(x)) : [];
    if (!pool.length && mood) pool = list.filter(x => x.tags.indexOf(mood) >= 0);
    if (!pool.length) pool = list.filter(free);
    if (!pool.length) pool = list;
    if (!pool.length) return null;
    const primary = mood ? pool.filter(x => x.tags[0] === mood) : [];
    const src = (primary.length && Math.random() < 0.65) ? primary : pool;
    return src[Math.floor(Math.random() * src.length)];
}
function makePicks(f, recent) {
    const picks = { img: [], song: [], stk: {} };
    const usedImg = (recent || []).slice(), usedSong = [];
    const stkIds = Object.keys(STICKERS);
    for (let i = 1; i <= 3; i++) {
        const mood = moodOf(f['post' + i + '_mood']);
        const im = pick(ALBUM, mood, usedImg); picks.img.push(im ? im.id : null); if (im) usedImg.push(im.id);
        const so = pick(SONGS, mood, usedSong); picks.song.push(so ? so.id : null); if (so) usedSong.push(so.id);
        for (let c = 1; c <= 5; c++) {
            const key = 'post' + i + '_c' + c;
            if (/^\s*sticker\s*$/i.test(f[key + '_text'] || '') && stkIds.length) picks.stk[key] = stkIds[Math.floor(Math.random() * stkIds.length)];
        }
    }
    picks.vis = [1, 2, 3].map(i => {
        let n = 0; for (let c = 1; c <= 5; c++) if (f['post' + i + '_c' + c + '_name'] && f['post' + i + '_c' + c + '_text']) n++;
        return n <= 1 ? n : 1 + Math.floor(Math.random() * Math.min(3, n));
    });
    picks.qimg = []; picks.qsong = [];
    for (let k = 1; k <= 2; k++) {
        const qm = moodOf(f['quote' + k + '_mood']);
        const qi = pick(ALBUM, qm, usedImg); picks.qimg.push(qi ? qi.id : null); if (qi) usedImg.push(qi.id);
        const qs = pick(SONGS, qm, usedSong); picks.qsong.push(qs ? qs.id : null); if (qs) usedSong.push(qs.id);
    }
    return picks;
}
function byId(list, id) { return list.find(x => x.id === id) || null; }

/* ══════════════════ сохранёнки: грузим только при открытом окне ══════════════════ */
const imgCache = {};
const imgInflight = {};
function fetchImage(id) {
    if (imgCache[id]) return Promise.resolve(imgCache[id]);
    if (imgInflight[id]) return imgInflight[id];
    const p = new Promise((resolve, reject) => {
        let done = false;
        const to = setTimeout(() => { if (!done) { done = true; reject(new Error('timeout')); } }, 25000);
        fetch(ALBUM_URL + encodeURIComponent(id)).then(r => r.json().then(d => ({ ok: r.ok, d })))
            .then(res => {
                if (done) return; done = true; clearTimeout(to);
                if (!res.ok || !res.d || !res.d.dataUrl) throw new Error((res.d && res.d.error) || 'нет картинки');
                imgCache[id] = res.d.dataUrl; resolve(res.d.dataUrl);
            })
            .catch(e => { if (!done) { done = true; clearTimeout(to); } reject(e); });
    });
    imgInflight[id] = p;
    p.then(() => { delete imgInflight[id]; }, () => { delete imgInflight[id]; });
    return p;
}
let lastImgError = '';
function loadImages() {
    if (!root.classList.contains('open')) return;
    out.querySelectorAll('.pdx-img:not(.ready):not(.loading):not(.fail)').forEach(wrap => {
        const id = wrap.getAttribute('data-img'); const img = wrap.querySelector('img'); const load = wrap.querySelector('.pdx-img-load');
        if (!id || !img) return;
        wrap.classList.add('loading');
        const t0 = Date.now();
        const fail = reason => {
            lastImgError = 'сохранёнка ' + id + ': ' + reason + ' за ' + ((Date.now() - t0) / 1000).toFixed(1) + ' с';
            wrap.classList.remove('loading'); wrap.classList.add('fail');
            if (load) load.textContent = 'сохранёнка не загрузилась (' + reason + ') — нажми, чтобы повторить';
        };
        fetchImage(id).then(url => {
            img.onload = () => { wrap.classList.remove('loading'); wrap.classList.add('ready'); };
            img.onerror = () => fail('картинка битая');
            img.src = url;
        }, e => fail((e && e.message) || 'ошибка сети'));
    });
}

/* ══════════════════ рендер стены ══════════════════ */
function publicName(f) {
    const p = String(f.place || '').trim();
    if (!p) return 'Подслушано';
    return /^подслушано/i.test(p) ? p : 'Подслушано ' + p;
}

function commentHtml(f, key, picks, t) {
    const name = f[key + '_name'], text = f[key + '_text'];
    if (!name || !text) return '';
    const stk = picks.stk && picks.stk[key] && STICKERS[picks.stk[key]];
    const body = stk ? '<img class="pdx-stk" src="' + stk + '" alt="стикер">' : '<div class="pdx-ctext">' + esc(text) + '</div>';
    return '<div class="pdx-com"><div class="pdx-ava" style="background:' + avaColor(name) + '">' + esc(name.charAt(0).toUpperCase()) + '</div>' +
        '<div class="pdx-cbody"><div class="pdx-name">' + esc(name) + '</div>' + body +
        '<div class="pdx-cmeta">' + esc(t) + '<span>Ответить</span></div></div></div>';
}

function imgHtml(id) {
    const im = imagesOn() && id && byId(ALBUM, id);
    return im ? '<div class="pdx-img" data-img="' + esc(im.id) + '" style="aspect-ratio:' + im.w + ' / ' + im.h + '"><div class="pdx-img-load">загружаю сохранёнку…</div><img alt=""></div>' : '';
}
function audioHtml(id) {
    const so = musicOn() && id && byId(SONGS, id);
    return so ? '<div class="pdx-audio"><button class="pdx-play" type="button" aria-label="Слушать">' + ICON.play + ICON.pause + '</button>' +
        '<div class="pdx-au"><div class="pdx-au-a">' + esc(so.a) + '</div><div class="pdx-au-t">' + esc(so.t) + '</div></div>' +
        '<span class="pdx-eq" aria-hidden="true"><i></i><i></i><i></i></span></div>' : '';
}
function actsHtml(likes, comments, reposts, views) {
    return '<div class="pdx-acts">' +
        '<button class="pdx-act pdx-like" type="button" data-n="' + likes + '">' + ICON.heart + '<b>' + short(likes) + '</b></button>' +
        '<button class="pdx-act pdx-cbtn" type="button" title="Комментарии">' + ICON.comment + short(comments) + '</button>' +
        '<button class="pdx-act" type="button">' + ICON.repost + short(reposts) + '</button>' +
        '<span class="pdx-views">' + ICON.eye + short(views) + '</span></div>';
}

function postHtml(f, i, picks, name) {
    const text = f['post' + i + '_text'];
    if (!text) return '';
    let time = String(f['post' + i + '_time'] || '').match(/\d{1,2}:\d{2}/);
    time = time ? time[0] : '';
    const likes = Math.max(0, num(f['post' + i + '_likes'], 40));
    const reposts = Math.max(0, num(f['post' + i + '_reposts'], 3));
    const views = Math.max(likes, num(f['post' + i + '_views'], likes * 12));
    const ct = time ? 'сегодня в ' + time : 'сегодня';
    const comms = [1, 2, 3, 4, 5].map(c => commentHtml(f, 'post' + i + '_c' + c, picks, ct)).filter(Boolean);
    const fromOffer = /^\s*(yes|да|true)/i.test(String(f['post' + i + '_offer'] || ''));
    const commCount = comms.length + Math.max(0, Math.round(likes / 9));

    let h = '<div class="pdx-card pdx-post">';
    h += '<div class="pdx-ph"><div class="pdx-ava pub">' + SPOTTY + '</div><div class="pdx-phm"><div class="pdx-name">' + esc(name) + '</div>' +
        '<div class="pdx-time">' + (time ? 'сегодня в ' + esc(time) : 'сегодня') + (fromOffer ? ' · <span class="pdx-tag">из вашей предложки</span>' : '') + '</div></div></div>';
    h += '<div class="pdx-text">' + esc(text) + (/#анонимно/i.test(text) ? '' : ' <span class="pdx-tag">#анонимно</span>') + '</div>';
    h += imgHtml(picks.img && picks.img[i - 1]);
    h += audioHtml(picks.song && picks.song[i - 1]);
    h += actsHtml(likes, commCount, reposts, views);
    h += '<button class="pdx-fxb" type="button" data-post="' + i + '">📢 Пустить в сюжет</button>';
    if (comms.length) {
        let visN = picks.vis && picks.vis[i - 1] ? picks.vis[i - 1] : Math.min(comms.length, 1 + (String(text).length % 3));
        visN = Math.max(1, Math.min(comms.length, visN));
        const hidden = comms.slice(visN);
        h += '<div class="pdx-comms">' + comms.slice(0, visN).join('') +
            hidden.map(c => c.replace('<div class="pdx-com">', '<div class="pdx-com more">')).join('') +
            (hidden.length ? '<button class="pdx-more" type="button">Показать ещё ' + hidden.length + ' ' + plural(hidden.length, ['комментарий', 'комментария', 'комментариев']) + '</button>' : '') +
            '<button class="pdx-less" type="button">Скрыть комментарии</button>' +
            '</div>';
    }
    h += '</div>';
    return h;
}

function quoteHtml(f, k, picks) {
    const text = f['quote' + k + '_text'];
    if (!text) return '';
    const pub = String(f['quote' + k + '_public'] || 'Цитаты').trim();
    const likes = Math.max(0, num(f['quote' + k + '_likes'], 300));
    let h = '<div class="pdx-card pdx-post pdx-quote">';
    h += '<div class="pdx-ph"><div class="pdx-ava" style="background:' + avaColor(pub) + '">' + esc(pub.charAt(0).toUpperCase()) + '</div>' +
        '<div class="pdx-phm"><div class="pdx-name">' + esc(pub) + '</div><div class="pdx-time">сегодня · репост из паблика</div></div></div>';
    h += '<div class="pdx-text">' + esc(text) + '</div>';
    h += imgHtml(picks.qimg && picks.qimg[k - 1]);
    h += audioHtml(picks.qsong && picks.qsong[k - 1]);
    h += actsHtml(likes, Math.round(likes / 20), Math.max(1, Math.round(likes / 6)), likes * 14);
    h += '</div>';
    return h;
}

function wallHtml(f, picks) {
    const name = publicName(f);
    const subs = Math.max(0, num(f.subscribers, 12400));
    let h = '';
    h += '<div class="pdx-card">' +
        '<div class="pdx-cover"><div class="pdx-cava">' + SPOTTY + '</div><div style="min-width:0">' +
        '<div class="pdx-ctitle">' + esc(name) + '</div>' +
        '<div class="pdx-csub">Анонимные истории и признания · ' + spaced(subs) + ' ' + plural(subs, ['подписчик', 'подписчика', 'подписчиков']) + '</div></div></div>' +
        '<div class="pdx-cbtns"><button class="pdx-btn pdx-join" type="button">Вы подписаны</button><button class="pdx-btn ghost pdx-offer" type="button">Предложить новость</button></div>' +
        '<div class="pdx-offerform" hidden><textarea class="pdx-offertext" maxlength="500" placeholder="Что случилось? Пиши как в предложку — админ опубликует анонимно"></textarea>' +
        '<div class="pdx-errbtns"><button class="pdx-btn pdx-offersend" type="button">Отправить</button><button class="pdx-btn ghost pdx-offercancel" type="button">Отмена</button></div></div>' +
        '<div class="pdx-pending" hidden></div>' +
        (f.pinned ? '<div class="pdx-pinned">' + ICON.pin + '<div><b>Запись закреплена</b>' + esc(f.pinned) + '</div></div>' : '') +
        '</div>';

    h += postHtml(f, 1, picks, name);

    const o = [1, 2, 3].map(k => ({ t: f['poll_o' + k], p: Math.max(0, Math.min(100, num(f['poll_p' + k], 0))) })).filter(x => x.t);
    if (f.poll_q && o.length >= 2) {
        const votes = Math.max(1, num(f.poll_votes, 800));
        h += '<div class="pdx-card"><div class="pdx-ph"><div class="pdx-ava pub">' + SPOTTY + '</div><div class="pdx-phm"><div class="pdx-name">' + esc(name) + '</div><div class="pdx-time">сегодня</div></div></div>' +
            '<div class="pdx-poll"><div class="pdx-poll-l">Анонимный опрос</div><div class="pdx-poll-q">' + esc(f.poll_q) + '</div>' +
            o.map(x => '<div class="pdx-opt"><div class="pdx-opt-fill" style="width:' + x.p + '%"></div><span>' + esc(x.t) + '</span><span class="pdx-opt-p">' + x.p + '%</span></div>').join('') +
            '<div class="pdx-poll-n">Проголосовали ' + spaced(votes) + ' ' + plural(votes, ['человек', 'человека', 'человек']) + '</div></div></div>';
    }

    h += quoteHtml(f, 1, picks);
    h += postHtml(f, 2, picks, name);

    if (f.promo_name) {
        h += '<div class="pdx-card pdx-promo"><div class="pdx-promo-l">Взаимный пиар</div>' +
            '<div class="pdx-ph"><div class="pdx-ava" style="background:' + avaColor(f.promo_name) + '">' + esc(f.promo_name.charAt(0).toUpperCase()) + '</div>' +
            '<div class="pdx-phm"><div class="pdx-name">' + esc(f.promo_name) + '</div><div class="pdx-time">' + esc(f.promo_text || '') + '</div></div>' +
            '<button class="pdx-sub" type="button">Подписаться</button></div></div>';
    }

    h += quoteHtml(f, 2, picks);
    h += postHtml(f, 3, picks, name);
    return h;
}

/* ══════════════════ «Пустить в сюжет» ══════════════════ */
let fxName = '';
function applyFx(f, i) {
    const text = f['post' + i + '_text'];
    if (!text) { toast('нечего пускать'); return false; }
    const line = '[OOC: В паблике ВКонтакте «' + fxName + '» вышел анонимный пост: «' + text + '». Кто-то из героев или их окружения может на него наткнуться или услышать пересказ. Учти это в следующем ответе незаметно и только если уместно, не упоминая этот OOC.]';
    const arr = Array.isArray(metaGet(FX_KEY)) ? metaGet(FX_KEY).slice() : [];
    arr.push(line);
    metaSet(FX_KEY, arr);
    toast('📢 пост разлетелся — сработает в следующем ответе');
    return true;
}
// на одну генерацию: кладём строки в промпт перед сборкой и очищаем очередь
let fxLive = false;
function onGenerationAfterCommands(type, params, dryRun) {
    if (dryRun || type === 'quiet') return;
    const arr = metaGet(FX_KEY);
    if (!Array.isArray(arr) || !arr.length) return;
    ctx().setExtensionPrompt(FX_PROMPT, arr.join('\n'), 1 /* IN_CHAT */, 0, false, 0 /* SYSTEM */);
    fxLive = true;
    metaSet(FX_KEY, []);
}
function clearFx() {
    if (!fxLive) return;
    fxLive = false;
    try { ctx().setExtensionPrompt(FX_PROMPT, '', 1, 0); } catch (e) { /* ничего */ }
}

/* ══════════════════ предложка ══════════════════ */
function offersList() {
    const v = metaGet(OFFER_KEY);
    return Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.trim()) : [];
}
function renderPending() {
    const box = out.querySelector('.pdx-pending');
    if (!box) return;
    const offers = offersList();
    if (!offers.length) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    box.innerHTML = '✉️ В предложке: ' + offers.length + ' ' + plural(offers.length, ['новость', 'новости', 'новостей']) +
        ' — появится при следующем обновлении <button class="pdx-publish" type="button">опубликовать сейчас</button>';
    box.querySelector('.pdx-publish').addEventListener('click', e => { e.stopPropagation(); genWall(); });
}
function bindOffer() {
    const btn = out.querySelector('.pdx-offer'), form = out.querySelector('.pdx-offerform');
    if (!btn || !form) return;
    const ta = form.querySelector('.pdx-offertext');
    btn.addEventListener('click', e => {
        e.stopPropagation();
        form.hidden = !form.hidden;
        if (!form.hidden) { try { ta.focus(); } catch (err) { /* ничего */ } }
    });
    form.querySelector('.pdx-offercancel').addEventListener('click', e => { e.stopPropagation(); form.hidden = true; });
    form.querySelector('.pdx-offersend').addEventListener('click', e => {
        e.stopPropagation();
        const text = String(ta.value || '').replace(/\s+/g, ' ').trim();
        if (text.length < 3) { toast('напиши новость хотя бы парой слов'); return; }
        const offers = offersList();
        if (offers.length >= MAX_OFFERS) { toast('в предложке уже ' + MAX_OFFERS + ' новости — сначала опубликуй их'); return; }
        offers.push(text.slice(0, 500));
        metaSet(OFFER_KEY, offers);
        ta.value = ''; form.hidden = true;
        renderPending();
        toast('✉️ отправлено в предложку — админ опубликует при обновлении');
    });
    renderPending();
}

function bindWall(f) {
    out.querySelectorAll('.pdx-like').forEach(b => {
        b.addEventListener('click', e => {
            e.stopPropagation();
            const n = num(b.getAttribute('data-n'), 0); const on = !b.classList.contains('liked');
            b.classList.toggle('liked', on); b.querySelector('b').textContent = short(n + (on ? 1 : 0));
        });
    });
    out.querySelectorAll('.pdx-play').forEach(b => {
        b.addEventListener('click', e => {
            e.stopPropagation();
            const row = b.closest('.pdx-audio'); const on = !row.classList.contains('on');
            out.querySelectorAll('.pdx-audio.on').forEach(r => r.classList.remove('on'));
            if (on) row.classList.add('on');
        });
    });
    out.querySelectorAll('.pdx-opt').forEach(o => {
        o.addEventListener('click', e => { e.stopPropagation(); out.querySelectorAll('.pdx-opt.mine').forEach(x => x.classList.remove('mine')); o.classList.add('mine'); });
    });
    out.querySelectorAll('.pdx-sub').forEach(b => {
        b.addEventListener('click', e => { e.stopPropagation(); const on = !b.classList.contains('on'); b.classList.toggle('on', on); b.textContent = on ? 'Вы подписаны' : 'Подписаться'; });
    });
    // комментарии: «Показать ещё» и кнопка 💬 раскрывают все, «Скрыть комментарии» и повторное 💬 — прячут
    const setComms = (box, state) => {
        box.classList.toggle('open', state === 'open');
        box.classList.toggle('shut', state === 'shut');
        const post = box.closest('.pdx-post');
        const btn = post && post.querySelector('.pdx-cbtn');
        if (btn) btn.classList.toggle('on', state === 'open');
    };
    out.querySelectorAll('.pdx-more').forEach(b => {
        b.addEventListener('click', e => { e.stopPropagation(); const box = b.closest('.pdx-comms'); if (box) setComms(box, 'open'); });
    });
    out.querySelectorAll('.pdx-less').forEach(b => {
        b.addEventListener('click', e => { e.stopPropagation(); const box = b.closest('.pdx-comms'); if (box) setComms(box, 'shut'); });
    });
    out.querySelectorAll('.pdx-cbtn').forEach(b => {
        b.addEventListener('click', e => {
            e.stopPropagation();
            const post = b.closest('.pdx-post');
            const box = post && post.querySelector('.pdx-comms');
            if (box) setComms(box, box.classList.contains('open') ? 'shut' : 'open');
        });
    });
    bindOffer();
    out.querySelectorAll('.pdx-fxb').forEach(b => {
        b.addEventListener('click', e => {
            e.stopPropagation();
            if (b.classList.contains('used')) return;
            if (applyFx(f, num(b.getAttribute('data-post'), 1))) { b.classList.add('used'); b.textContent = '✓ Пост разлетелся'; }
        });
    });
}

let lastFields = null;
function renderWall(f, picks) {
    lastFields = f;
    if (!hasWall(f)) {
        out.innerHTML = '<div class="pdx-cap">пусто — нажми ⟳, чтобы обновить стену</div>';
        if (root.classList.contains('open')) placePop();
        return;
    }
    fxName = publicName(f);
    barTitle.textContent = fxName;
    out.innerHTML = wallHtml(f, picks || { img: [], song: [], stk: {} });
    bindWall(f);
    loadImages();
    if (root.classList.contains('open')) placePop();
}

function showHint(html) {
    out.innerHTML = '<div class="pdx-hint">' + html + '<div class="pdx-cfgline">' + esc(cfgLine()) + '</div></div>';
    if (root.classList.contains('open')) placePop();
}
function showSetupHint() {
    if (ownProvider()) {
        showHint('Чтобы открыть стену, зайди в <b>Расширения → Подслушано 👂</b> и впиши <b>адрес провайдера, ключ и модель</b>. Прокси уже вшит.<br><br>Или выбери там «подключение таверны» — тогда стену пишет та же модель, что и чат.');
    } else {
        showHint('Таверна не подключена к модели. Подключись в <b>API Connections</b> (вилка сверху) и нажми ⟳.<br><br>Или в <b>Расширения → Подслушано 👂</b> выбери «свой провайдер».');
    }
}
function showNoChat() {
    barTitle.textContent = 'Подслушано';
    showHint('Открой чат с персонажем — стена паблика пишется по его сюжету.');
}

/* ══════════════════ ошибки ══════════════════ */
function providerHost() { try { return new URL(String(cfg().providerUrl)).host; } catch (e) { return String(cfg().providerUrl || '—').slice(0, 60); } }

function explain(err, diag) {
    const m = String((err && err.message) || err || '');
    const all = m + ' ' + String((err && err.detail) || '');
    const sec = diag.seconds || 0;
    if (err && err.kind === 'tavern') {
        return 'Таверна не получила ответ модели: ' + m + '. Проверь подключение в API Connections и нажми ⟳. Если модель режет запрос фильтром — попробуй «свой провайдер» в настройках расширения.';
    }
    if (err && err.kind === 'network') {
        if (sec >= 45) return 'Соединение оборвалось через ' + Math.round(sec) + ' с, пока модель думала. Нажми ⟳ ещё раз. Если повторяется — поставь модель побыстрее, например gemini-2.5-flash-lite.';
        return 'Запрос не дошёл до прокси (' + sec.toFixed(1) + ' с): нет интернета, мешает VPN или блокировка, или прокси недоступен. Проверь сеть и нажми ⟳.';
    }
    if (err && err.kind === 'http') {
        if (/fetch failed|parse url|enotfound|getaddrinfo|адрес провайдера недоступен/i.test(all)) return 'Адрес провайдера недоступен или написан с ошибкой. Он должен начинаться с https://.';
        if (/провайдер 40[13]|api key|unauthori|permission/i.test(all)) return 'Провайдер не принял ключ. Проверь ключ в настройках расширения: без пробелов и лишних символов.';
        if (/провайдер 404/i.test(all)) return 'Провайдер не нашёл модель или адрес. Проверь название модели и адрес провайдера.';
        if (/429|quota|rate.?limit/i.test(all)) return 'Лимит запросов у провайдера. Подожди минуту и нажми ⟳.';
        if (/пустой ответ/i.test(all)) return 'Модель вернула пустой ответ: у «думающей» модели кончился бюджет или сработал фильтр. Нажми ⟳ ещё раз или смени модель.';
        if (diag.status === 504 || /timeout|timed out/i.test(all)) return 'Провайдер не дождался ответа модели. Нажми ⟳ ещё раз или поставь модель побыстрее.';
        if (/^52\d$/.test(String(diag.status))) return 'Провайдер ' + providerHost() + ' не ответил вовремя (ошибка ' + diag.status + ': его сервер оборвал ожидание). Так бывает с бесплатными ([free]) и перегруженными моделями. Нажми ⟳ ещё раз или выбери другую модель.';
        if (/^провайдер: /.test(m)) return 'Провайдер прервал ответ с ошибкой — подробности ниже. Нажми ⟳ ещё раз или выбери другую модель.';
        if (diag.status >= 500) return 'Ошибка на стороне прокси или провайдера. Нажми ⟳ чуть позже.';
        return 'Провайдер вернул ошибку — подробности ниже.';
    }
    if (err && err.kind === 'cut') return 'Ответ модели оборвался на середине стены: «думающая» модель потратила лимит на размышления (было ' + (diag.maxTokens || '—') + ' токенов). Нажми ⟳ ещё раз. Если повторяется — увеличь «Макс. длина ответа» в настройках таверны или выбери в Расширения → Подслушано «свой провайдер» с моделью побыстрее.';
    if (err && err.kind === 'parse') return 'Модель ответила не в том формате, стену не из чего собрать. Нажми ⟳ ещё раз; если повторяется — смени модель.';
    return 'Что-то пошло не так на шаге «' + (diag.stage || '?') + '».';
}

function diagText(err, diag) {
    const s = cfg();
    const L = [];
    L.push('Подслушано ' + VERSION + ' (SillyTavern) · ' + diag.at.toLocaleString('ru-RU'));
    L.push('шаг: ' + (diag.stage || '—'));
    L.push('ошибка: ' + String((err && err.message) || err || '—'));
    if (err && err.detail) L.push('подробности: ' + String(err.detail).slice(0, 500));
    L.push('HTTP: ' + (diag.status || '—') + ' · время запроса: ' + (diag.seconds != null ? diag.seconds.toFixed(1) + ' с' : '—'));
    if (ownProvider()) L.push('модель: ' + (s.model || '—') + ' · провайдер: ' + providerHost());
    else L.push('модель: подключение таверны · API ' + (ctx().mainApi || '—') + ' · статус ' + (ctx().onlineStatus || '—'));
    if (diag.offers) L.push('новостей из предложки в запросе: ' + diag.offers);
    L.push('max_tokens: ' + (diag.maxTokens || '—') + ' · промпт: ' + (diag.promptChars || '—') + ' симв · ответ: ' + (diag.rawChars != null ? diag.rawChars + ' симв' : '—'));
    if (diag.meta) {
        const mm = diag.meta;
        const sec = v => (v ? (v / 1000).toFixed(1) + ' с' : '—');
        L.push('у провайдера: поток ' + (mm.stream === true ? 'да' : mm.stream === false ? 'нет' : '—') + ' · заголовки ' + sec(mm.headersMs) + ' · первые данные ' + sec(mm.firstByteMs) +
            ' · первый текст ' + sec(mm.firstTokenMs) + ' · всего ' + sec(mm.totalMs) + ' · finish ' + (mm.finish || '—') + ' · раздумья ' + (mm.effort || '—'));
    }
    if (err && err.raw) L.push('начало ответа: ' + err.raw);
    L.push('настройки: ' + cfgLine());
    if (lastImgError) L.push('последняя ошибка картинки: ' + lastImgError);
    L.push('экран: ' + innerWidth + '×' + innerHeight + ' · ' + String(navigator.userAgent || '').slice(0, 120));
    return L.join('\n');
}

function copyText(text) {
    let done = false;
    try {
        const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.left = '-9999px';
        document.body.appendChild(ta); ta.select(); done = document.execCommand('copy'); document.body.removeChild(ta);
    } catch (e) { /* ничего */ }
    if (!done) { try { navigator.clipboard.writeText(text); done = true; } catch (e) { /* ничего */ } }
    toast(done ? '📋 скопировано — пришли это Claude' : 'не получилось скопировать — сделай скриншот');
}

function showError(err, diag) {
    const text = diagText(err, diag);
    out.innerHTML = '<div class="pdx-errcard"><div class="pdx-errt">Не получилось обновить стену</div>' +
        '<div class="pdx-errh">' + esc(explain(err, diag)) + '</div>' +
        '<details class="pdx-diag"><summary>Подробности для Claude</summary><div class="pdx-diagtext">' + esc(text) + '</div></details>' +
        '<div class="pdx-errbtns" style="margin-top:10px"><button class="pdx-btn pdx-retry" type="button">⟳ Ещё раз</button><button class="pdx-btn ghost pdx-copy" type="button">Скопировать подробности</button></div></div>';
    out.querySelector('.pdx-retry').addEventListener('click', e => { e.stopPropagation(); genWall(); });
    out.querySelector('.pdx-copy').addEventListener('click', e => { e.stopPropagation(); copyText(text); });
    console.warn('[podslushano]\n' + text);
    if (root.classList.contains('open')) placePop();
}

/* ══════════════════ генерация стены ══════════════════ */
let busy = false;
async function genWall() {
    if (busy) return;
    if (!hasChat()) { showNoChat(); return; }
    const chatId = ctx().getCurrentChatId();
    busy = true; refBtn.classList.add('spin');
    const diag = { stage: 'настройки', at: new Date() };
    try {
        if (!configured()) { showSetupHint(); return; }
        out.innerHTML = '<div class="pdx-cap">👂 админ разбирает предложку…</div>';
        diag.stage = 'сбор сюжета';
        const cx = buildContext();
        const pending = offersList().slice(0, MAX_OFFERS);
        diag.offers = pending.length;
        const user = buildUserPrompt(cx, pending);
        diag.promptChars = SYSTEM.length + user.length;
        diag.stage = 'запрос к модели';
        const raw = ownProvider() ? await callOwn(SYSTEM, user, diag) : await callTavern(SYSTEM, user, diag);
        if (ctx().getCurrentChatId() !== chatId) return; // пока ждали — открыли другой чат
        diag.stage = 'разбор ответа';
        const f = parseBlock(raw);
        if (!hasWall(f)) throw stageError('parse', 'в ответе нет постов', { raw: String(raw || '(пусто)').slice(0, 300) });
        if (!wallComplete(f)) throw stageError('cut', 'ответ модели оборвался', { raw: String(raw || '').slice(-300) });
        diag.stage = 'сохранение';
        const prev = metaGet(ST_KEY);
        const picks = makePicks(f, (prev && prev.recent) || []);
        const recent = ((prev && prev.recent) || []).concat(picks.img.concat(picks.qimg || []).filter(Boolean)).slice(-24);
        metaSet(ST_KEY, { fields: f, count: chatCount(), picks, recent });
        if (pending.length) metaSet(OFFER_KEY, offersList().slice(pending.length));
        renderWall(f, picks);
    } catch (e) {
        if (ctx().getCurrentChatId() === chatId) showError(e, diag);
    } finally { busy = false; refBtn.classList.remove('spin'); }
}

function ensureFresh() {
    if (!hasChat() || !configured() || !autoOn() || busy) return;
    const st = metaGet(ST_KEY);
    const total = chatCount();
    // первый раз — когда в чате уже есть что пересказать; дальше — каждые N сообщений
    if (!st ? total >= everyN() : (total - (st.count || 0)) >= everyN()) genWall();
}

function fillOnOpen() {
    if (!hasChat()) { showNoChat(); return; }
    const st = metaGet(ST_KEY);
    // оборванную стену (сохранилась до 1.0.1) не показываем — пишем заново
    if (st && wallComplete(st.fields)) { renderWall(st.fields, st.picks); return; }
    if (!configured()) { showSetupHint(); return; }
    genWall();
}

/* ══════════════════ позиционирование / перетаскивание ══════════════════ */
let popPos = null;
function placePop() {
    if (!root.classList.contains('open')) return;
    const vw = innerWidth || document.documentElement.clientWidth || 360;
    const vh = innerHeight || document.documentElement.clientHeight || 640;
    const W = Math.min(420, vw - 24);
    pop.style.width = W + 'px';
    const ph = pop.offsetHeight || 320, pw = pop.offsetWidth || W;
    if (popPos) {
        pop.style.left = Math.min(Math.max(6, popPos.left), vw - pw - 6) + 'px';
        pop.style.top = Math.min(Math.max(6, popPos.top), vh - ph - 6) + 'px';
        pop.style.right = 'auto'; pop.style.bottom = 'auto';
        return;
    }
    let left, top;
    if (!fab.hidden) {
        const r = fab.getBoundingClientRect();
        left = Math.min(Math.max(12, r.left + r.width / 2 - W / 2), vw - 12 - W);
        if (r.top - ph - 10 >= 8) top = r.top - ph - 10;
        else if (r.bottom + ph + 10 <= vh - 8) top = r.bottom + 10;
        else top = Math.max(8, vh - ph - 8);
    } else {
        left = Math.max(12, (vw - W) / 2);
        top = Math.max(8, (vh - ph) / 2);
    }
    pop.style.left = left + 'px'; pop.style.top = top + 'px';
    pop.style.right = 'auto'; pop.style.bottom = 'auto';
}

let opened = false;
function openPop() {
    root.classList.add('open'); placePop();
    if (!opened) { opened = true; fillOnOpen(); } else { placePop(); loadImages(); }
}
function closePop() { root.classList.remove('open'); out.querySelectorAll('.pdx-audio.on').forEach(r => r.classList.remove('on')); }

const FABPOS_KEY = 'podslushano_fabpos';
function loadFabPos() {
    try {
        const s = localStorage.getItem(FABPOS_KEY);
        if (!s) return;
        const o = JSON.parse(s);
        if (o && o.left != null) { fab.style.left = o.left + 'px'; fab.style.top = o.top + 'px'; fab.style.right = 'auto'; fab.style.bottom = 'auto'; }
    } catch (e) { /* ничего */ }
}
function makeFabDraggable() {
    let dragging = false, moved = false, sx = 0, sy = 0, ox = 0, oy = 0;
    function down(e) {
        const p = e.touches ? e.touches[0] : e; dragging = true; moved = false;
        const r = fab.getBoundingClientRect(); ox = r.left; oy = r.top; sx = p.clientX; sy = p.clientY;
        fab.style.transition = 'none';
        if (e.cancelable) e.preventDefault();
    }
    function move(e) {
        if (!dragging) return;
        const p = e.touches ? e.touches[0] : e;
        const dx = p.clientX - sx, dy = p.clientY - sy;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
        const w = fab.offsetWidth, h = fab.offsetHeight;
        fab.style.left = Math.min(Math.max(2, ox + dx), innerWidth - w - 2) + 'px'; fab.style.top = Math.min(Math.max(2, oy + dy), innerHeight - h - 2) + 'px';
        fab.style.right = 'auto'; fab.style.bottom = 'auto';
        popPos = null;
        if (root.classList.contains('open')) placePop();
        if (e.cancelable) e.preventDefault();
    }
    function up() {
        if (!dragging) return; dragging = false; fab.style.transition = '';
        const r = fab.getBoundingClientRect();
        if (moved) { try { localStorage.setItem(FABPOS_KEY, JSON.stringify({ left: r.left, top: r.top })); } catch (e) { /* ничего */ } }
        else if (root.classList.contains('open')) closePop(); else openPop();
    }
    fab.addEventListener('mousedown', down); addEventListener('mousemove', move); addEventListener('mouseup', up);
    fab.addEventListener('touchstart', down, { passive: false }); addEventListener('touchmove', move, { passive: false }); addEventListener('touchend', up);
}
function makePopDraggable() {
    const popBar = root.querySelector('.pdx-bar');
    popBar.style.cursor = 'grab'; popBar.style.touchAction = 'none';
    let dragging = false, sx = 0, sy = 0, ol = 0, ot = 0;
    function down(e) {
        if (e.target && e.target.closest && e.target.closest('.pdx-tools')) return;
        const p = e.touches ? e.touches[0] : e; dragging = true;
        const r = pop.getBoundingClientRect(); ol = r.left; ot = r.top; sx = p.clientX; sy = p.clientY;
        if (e.cancelable) e.preventDefault();
    }
    function move(e) {
        if (!dragging) return;
        const p = e.touches ? e.touches[0] : e;
        const w = pop.offsetWidth, h = pop.offsetHeight;
        const nl = Math.min(Math.max(6, ol + (p.clientX - sx)), innerWidth - w - 6);
        const nt = Math.min(Math.max(6, ot + (p.clientY - sy)), innerHeight - h - 6);
        pop.style.left = nl + 'px'; pop.style.top = nt + 'px'; pop.style.right = 'auto'; pop.style.bottom = 'auto';
        popPos = { left: nl, top: nt };
        if (e.cancelable) e.preventDefault();
    }
    function up() { dragging = false; }
    popBar.addEventListener('mousedown', down); addEventListener('mousemove', move); addEventListener('mouseup', up);
    popBar.addEventListener('touchstart', down, { passive: false }); addEventListener('touchmove', move, { passive: false }); addEventListener('touchend', up);
}

function onDocDown(e) {
    if (!root.classList.contains('open')) return;
    const t = e.target;
    if (pop.contains(t) || fab.contains(t)) return;
    // меню ✨ открывает окно — клик по его пункту не должен тут же закрывать
    if (t.closest && t.closest('#pdx_menu')) return;
    closePop();
}

/* ══════════════════ интерфейс таверны ══════════════════ */
function mountRoot() {
    document.getElementById('pdx-root')?.remove();
    root = document.createElement('div');
    root.id = 'pdx-root';
    root.innerHTML = MARKUP;
    document.body.appendChild(root);
    fab = root.querySelector('.pdx-fab');
    pop = root.querySelector('.pdx-pop');
    out = root.querySelector('.pdx-out');
    barTitle = root.querySelector('.pdx-bar-t');
    refBtn = root.querySelector('.pdx-refresh');
    closeBtn = root.querySelector('.pdx-close');
    fab.hidden = !cfg().fab;
    loadFabPos();
    makeFabDraggable();
    makePopDraggable();
    closeBtn.addEventListener('click', e => { e.stopPropagation(); closePop(); });
    refBtn.addEventListener('click', e => { e.stopPropagation(); opened = true; genWall(); });
    pop.addEventListener('click', e => e.stopPropagation());
    out.addEventListener('click', e => {
        const wrap = e.target && e.target.closest && e.target.closest('.pdx-img.fail');
        if (!wrap) return;
        e.stopPropagation();
        wrap.classList.remove('fail');
        const load = wrap.querySelector('.pdx-img-load'); if (load) load.textContent = 'загружаю сохранёнку…';
        loadImages();
    });
    addEventListener('mousedown', onDocDown, true);
    addEventListener('touchstart', onDocDown, true);
    addEventListener('resize', () => {
        const r = fab.getBoundingClientRect(), w = fab.offsetWidth, h = fab.offsetHeight;
        if (!fab.hidden && fab.style.left) {
            fab.style.left = Math.min(Math.max(2, r.left), innerWidth - w - 2) + 'px';
            fab.style.top = Math.min(Math.max(2, r.top), innerHeight - h - 2) + 'px';
        }
        if (root.classList.contains('open')) placePop();
    });
}

function addMenuItem() {
    if (document.getElementById('pdx_menu')) return;
    const item = $('<div id="pdx_menu" class="list-group-item flex-container flexGap5 interactable" tabindex="0">' +
        '<div class="fa-solid fa-ear-listen extensionsMenuExtensionButton"></div><span>Подслушано</span></div>');
    item.on('click', () => { if (root.classList.contains('open')) closePop(); else openPop(); });
    $('#extensionsMenu').append(item);
}

function addSettings() {
    if (document.getElementById('pdx_settings')) return;
    const s = cfg();
    const html =
        '<div id="pdx_settings" class="inline-drawer">' +
        '<div class="inline-drawer-toggle inline-drawer-header"><b>Подслушано 👂</b>' +
        '<div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div>' +
        '<div class="inline-drawer-content">' +
        '<p>Стена анонимного паблика ВК 2017 по вашему сюжету. Открывается кружком со Спотти или через меню ✨ → Подслушано.</p>' +
        '<div class="pdx-set-row"><label for="pdx_source">Кто пишет стену</label>' +
        '<select id="pdx_source" class="text_pole"><option value="st">Модель из подключения таверны (как в чате)</option><option value="own">Свой провайдер (через прокси, как в Tavo)</option></select></div>' +
        '<div class="pdx-set-own">' +
        '<div class="pdx-set-row"><label for="pdx_url">Адрес провайдера (base URL)</label><input id="pdx_url" class="text_pole" type="text" placeholder="https://generativelanguage.googleapis.com/v1beta/openai"></div>' +
        '<div class="pdx-set-row"><label for="pdx_key">API-ключ провайдера</label><input id="pdx_key" class="text_pole" type="password" autocomplete="off" placeholder="sk-…"></div>' +
        '<div class="pdx-set-row"><label for="pdx_model">Модель-админ</label><input id="pdx_model" class="text_pole" type="text" placeholder="напр. gemini-2.5-flash"></div>' +
        '</div>' +
        '<div class="pdx-set-row"><label for="pdx_everyn">Новые записи раз в N сообщений</label><input id="pdx_everyn" class="text_pole" type="number" min="1" max="50"></div>' +
        '<label class="checkbox_label" for="pdx_auto"><input type="checkbox" id="pdx_auto"><span>Обновлять стену сама каждые N сообщений</span></label>' +
        '<label class="checkbox_label" for="pdx_images"><input type="checkbox" id="pdx_images"><span>Сохранёнки к постам</span></label>' +
        '<label class="checkbox_label" for="pdx_music"><input type="checkbox" id="pdx_music"><span>Песни к постам</span></label>' +
        '<label class="checkbox_label" for="pdx_fab"><input type="checkbox" id="pdx_fab"><span>Кружок со Спотти на экране</span></label>' +
        '<div class="menu_button menu_button_icon" id="pdx_open"><i class="fa-solid fa-ear-listen"></i><span>Открыть стену</span></div>' +
        '<small class="pdx-set-ver">v' + VERSION + ' · светлая и тёмная — вместе с темой «ВКонтакте 2017» и расширением 🌓</small>' +
        '</div></div>';
    $('#extensions_settings2').append(html);
    const ownBox = document.querySelector('#pdx_settings .pdx-set-own');
    const syncOwn = () => { ownBox.hidden = !ownProvider(); };
    $('#pdx_source').val(s.source).on('change', function () { cfg().source = this.value; syncOwn(); saveCfg(); });
    $('#pdx_url').val(s.providerUrl).on('input', function () { cfg().providerUrl = this.value.trim(); saveCfg(); });
    $('#pdx_key').val(s.apiKey).on('input', function () { cfg().apiKey = this.value.trim(); saveCfg(); });
    $('#pdx_model').val(s.model).on('input', function () { cfg().model = this.value.trim(); saveCfg(); });
    $('#pdx_everyn').val(s.everyN).on('input', function () { const n = parseInt(this.value, 10); cfg().everyN = n >= 1 ? n : 4; saveCfg(); });
    $('#pdx_auto').prop('checked', s.auto).on('change', function () { cfg().auto = this.checked; saveCfg(); });
    $('#pdx_images').prop('checked', s.images).on('change', function () { cfg().images = this.checked; saveCfg(); if (lastFields) { const st = metaGet(ST_KEY); renderWall(lastFields, st && st.picks); } });
    $('#pdx_music').prop('checked', s.music).on('change', function () { cfg().music = this.checked; saveCfg(); if (lastFields) { const st = metaGet(ST_KEY); renderWall(lastFields, st && st.picks); } });
    $('#pdx_fab').prop('checked', s.fab).on('change', function () { cfg().fab = this.checked; fab.hidden = !this.checked; saveCfg(); });
    $('#pdx_open').on('click', () => openPop());
    syncOwn();
}

/* ══════════════════ события таверны ══════════════════ */
let freshT = null;
function scheduleFresh() { if (freshT) return; freshT = setTimeout(() => { freshT = null; ensureFresh(); }, 400); }

function onChatChanged() {
    clearFx();
    lastFields = null;
    opened = false;
    barTitle.textContent = 'Подслушано';
    out.innerHTML = '';
    if (root.classList.contains('open')) { opened = true; fillOnOpen(); }
    scheduleFresh();
}

jQuery(() => {
    const c = ctx();
    cfg();
    mountRoot();
    addMenuItem();
    addSettings();
    const et = c.eventTypes || c.event_types;
    c.eventSource.on(et.MESSAGE_RECEIVED, scheduleFresh);
    c.eventSource.on(et.MESSAGE_SENT, scheduleFresh);
    c.eventSource.on(et.CHAT_CHANGED, onChatChanged);
    c.eventSource.on(et.GENERATION_AFTER_COMMANDS, onGenerationAfterCommands);
    c.eventSource.on(et.GENERATION_ENDED, clearFx);
    c.eventSource.on(et.GENERATION_STOPPED, clearFx);
    console.log('[podslushano] v' + VERSION + ' · ' + cfgLine());
});
