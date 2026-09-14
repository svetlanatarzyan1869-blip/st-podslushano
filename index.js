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
const VERSION = "1.0.0";
const PROXY_URL = 'https://podslushano-album.spletnik-meme-worker.workers.dev/relay';
const ALBUM_URL = 'https://podslushano-album.spletnik-meme-worker.workers.dev/img/';
const ALBUM = [{"id": "01", "tags": ["street", "party"], "w": 600, "h": 595}, {"id": "02", "tags": ["party", "street"], "w": 548, "h": 600}, {"id": "03", "tags": ["funny"], "w": 480, "h": 480}, {"id": "04", "tags": ["street"], "w": 600, "h": 590}, {"id": "05", "tags": ["sunset", "street"], "w": 600, "h": 562}, {"id": "06", "tags": ["longing", "sad"], "w": 600, "h": 400}, {"id": "07", "tags": ["sunset"], "w": 450, "h": 600}, {"id": "08", "tags": ["street"], "w": 600, "h": 600}, {"id": "09", "tags": ["funny", "flirt"], "w": 600, "h": 394}, {"id": "10", "tags": ["love"], "w": 600, "h": 600}, {"id": "11", "tags": ["flirt", "love"], "w": 600, "h": 600}, {"id": "12", "tags": ["party"], "w": 600, "h": 578}, {"id": "13", "tags": ["sassy", "jealous", "longing"], "w": 600, "h": 591}, {"id": "14", "tags": ["sunset"], "w": 600, "h": 600}, {"id": "15", "tags": ["sassy"], "w": 600, "h": 600}, {"id": "16", "tags": ["drama", "sad", "jealous"], "w": 600, "h": 600}, {"id": "17", "tags": ["street", "sassy"], "w": 600, "h": 599}, {"id": "18", "tags": ["cozy"], "w": 500, "h": 499}, {"id": "19", "tags": ["party"], "w": 512, "h": 600}, {"id": "20", "tags": ["funny", "cozy"], "w": 600, "h": 600}, {"id": "21", "tags": ["longing", "love"], "w": 600, "h": 600}, {"id": "22", "tags": ["love", "cozy"], "w": 600, "h": 592}, {"id": "23", "tags": ["party", "drama"], "w": 600, "h": 600}, {"id": "24", "tags": ["love", "longing"], "w": 540, "h": 417}, {"id": "25", "tags": ["flirt"], "w": 600, "h": 600}, {"id": "26", "tags": ["sad", "jealous"], "w": 512, "h": 600}, {"id": "27", "tags": ["sunset", "sad"], "w": 480, "h": 480}, {"id": "28", "tags": ["love"], "w": 540, "h": 405}, {"id": "29", "tags": ["longing"], "w": 600, "h": 600}, {"id": "30", "tags": ["drama"], "w": 600, "h": 599}, {"id": "31", "tags": ["cozy", "love", "funny"], "w": 600, "h": 600}, {"id": "32", "tags": ["cozy", "flirt"], "w": 600, "h": 399}, {"id": "33", "tags": ["love", "flirt"], "w": 500, "h": 600}, {"id": "34", "tags": ["flirt", "funny"], "w": 540, "h": 382}, {"id": "35", "tags": ["love", "longing"], "w": 600, "h": 600}, {"id": "36", "tags": ["love", "sad"], "w": 450, "h": 600}, {"id": "37", "tags": ["love"], "w": 500, "h": 500}, {"id": "38", "tags": ["sassy", "drama", "jealous"], "w": 600, "h": 454}, {"id": "39", "tags": ["flirt"], "w": 540, "h": 535}, {"id": "40", "tags": ["cozy", "love"], "w": 600, "h": 600}, {"id": "41", "tags": ["longing"], "w": 600, "h": 450}, {"id": "42", "tags": ["love"], "w": 600, "h": 600}, {"id": "43", "tags": ["love", "cozy"], "w": 600, "h": 451}, {"id": "44", "tags": ["love", "sunset"], "w": 600, "h": 598}, {"id": "45", "tags": ["funny", "sassy"], "w": 600, "h": 559}, {"id": "46", "tags": ["street", "sad"], "w": 600, "h": 589}, {"id": "47", "tags": ["sunset", "longing"], "w": 600, "h": 573}, {"id": "48", "tags": ["sad"], "w": 600, "h": 600}, {"id": "49", "tags": ["sassy", "funny"], "w": 500, "h": 498}, {"id": "50", "tags": ["street"], "w": 500, "h": 500}, {"id": "51", "tags": ["street", "sassy"], "w": 551, "h": 600}, {"id": "52", "tags": ["street", "funny"], "w": 600, "h": 600}, {"id": "53", "tags": ["party", "funny"], "w": 600, "h": 600}, {"id": "54", "tags": ["sassy", "drama"], "w": 600, "h": 600}, {"id": "55", "tags": ["sunset", "street"], "w": 600, "h": 599}, {"id": "56", "tags": ["funny", "cozy", "party"], "w": 476, "h": 592}, {"id": "57", "tags": ["party"], "w": 600, "h": 600}, {"id": "58", "tags": ["party"], "w": 600, "h": 600}, {"id": "59", "tags": ["funny", "street"], "w": 600, "h": 600}, {"id": "60", "tags": ["cozy"], "w": 600, "h": 600}, {"id": "61", "tags": ["street"], "w": 600, "h": 598}, {"id": "62", "tags": ["longing", "love"], "w": 600, "h": 600}, {"id": "63", "tags": ["love"], "w": 600, "h": 450}, {"id": "64", "tags": ["love", "funny"], "w": 597, "h": 595}, {"id": "65", "tags": ["flirt"], "w": 461, "h": 461}, {"id": "66", "tags": ["cozy", "flirt"], "w": 600, "h": 600}, {"id": "67", "tags": ["funny", "love"], "w": 500, "h": 374}, {"id": "68", "tags": ["street"], "w": 554, "h": 548}, {"id": "69", "tags": ["love"], "w": 600, "h": 548}, {"id": "70", "tags": ["love", "drama"], "w": 600, "h": 600}];       // [{id:'07', tags:['sunset'], w:600, h:600}]
const SONGS = [{"id": "1", "a": "Элджей & Feduk", "t": "Розовое вино", "tags": ["party", "flirt"]}, {"id": "2", "a": "T-Fest x Скриптонит", "t": "Ламбада", "tags": ["party", "street"]}, {"id": "3", "a": "MiyaGi & Эндшпиль", "t": "Половина моя", "tags": ["love", "longing"]}, {"id": "4", "a": "Jah Khalib", "t": "Лейла", "tags": ["love", "longing"]}, {"id": "5", "a": "ESTRADARADA", "t": "Вите надо выйти", "tags": ["funny", "party"]}, {"id": "6", "a": "Грибы", "t": "Тает лёд", "tags": ["flirt", "love", "funny"]}, {"id": "7", "a": "Мот feat. Ани Лорак", "t": "Сопрано", "tags": ["love", "drama"]}, {"id": "8", "a": "T-Fest", "t": "Улети", "tags": ["longing", "sad"]}, {"id": "9", "a": "Баста", "t": "Сансара", "tags": ["sad", "drama"]}, {"id": "10", "a": "Элджей", "t": "Рваные джинсы", "tags": ["street", "sassy"]}, {"id": "11", "a": "Макс Корж", "t": "Малый повзрослел", "tags": ["street", "sunset"]}, {"id": "12", "a": "Егор Крид", "t": "Потрачу", "tags": ["flirt", "sassy"]}, {"id": "13", "a": "LOBODA", "t": "Случайная", "tags": ["drama", "jealous"]}, {"id": "14", "a": "ЛСП", "t": "Монетка", "tags": ["sad", "drama"]}, {"id": "15", "a": "Face", "t": "Бургер", "tags": ["sassy", "funny"]}, {"id": "16", "a": "Artik & Asti", "t": "Неделимы", "tags": ["love", "cozy"]}, {"id": "17", "a": "Скруджи", "t": "Рукалицо", "tags": ["funny"]}, {"id": "18", "a": "Елена Темникова", "t": "Вдох", "tags": ["flirt"]}, {"id": "19", "a": "Макс Барских", "t": "Туманы", "tags": ["sad", "longing"]}, {"id": "20", "a": "Джиган", "t": "Дни и ночи", "tags": ["longing", "love"]}, {"id": "21", "a": "MONATIK", "t": "Кружит", "tags": ["cozy", "love"]}, {"id": "22", "a": "Егор Крид & MOLLY", "t": "Если ты меня не любишь", "tags": ["jealous", "sad"]}, {"id": "23", "a": "Пошлая Молли", "t": "Нон стоп", "tags": ["party", "sassy"]}, {"id": "24", "a": "PHARAOH", "t": "5 минут назад", "tags": ["sad", "street"]}, {"id": "25", "a": "Tatarka", "t": "Altyn", "tags": ["party", "sassy", "funny"]}, {"id": "26", "a": "Тима Белорусских", "t": "Незабудка", "tags": ["love", "longing"]}, {"id": "27", "a": "Тима Белорусских", "t": "Мокрые кроссы", "tags": ["sad", "street"]}, {"id": "28", "a": "Макс Корж", "t": "Слово пацана", "tags": ["street", "sassy"]}, {"id": "29", "a": "Макс Корж", "t": "Малиновый закат", "tags": ["sunset", "street"]}, {"id": "30", "a": "MiyaGi & Эндшпиль", "t": "I Got Love", "tags": ["love", "street"]}, {"id": "31", "a": "Rauf & Faik", "t": "Детство", "tags": ["cozy", "longing"]}, {"id": "32", "a": "Макс Корж", "t": "Пьяный дождь", "tags": ["party", "sad"]}, {"id": "33", "a": "Мукка", "t": "Девочка с каре", "tags": ["love", "flirt"]}, {"id": "34", "a": "LIZER", "t": "Пачка сигарет", "tags": ["sad", "street"]}, {"id": "35", "a": "RASA", "t": "Под фонарём", "tags": ["sunset", "flirt"]}, {"id": "36", "a": "Ганвест", "t": "Никотин", "tags": ["drama", "sad"]}, {"id": "37", "a": "Гречка", "t": "Люби меня люби", "tags": ["love", "longing"]}, {"id": "38", "a": "FEM.LOVE", "t": "Фотографирую закат", "tags": ["sunset", "cozy"]}, {"id": "39", "a": "Face", "t": "Я роняю Запад", "tags": ["sassy", "party"]}, {"id": "40", "a": "Мальбэк", "t": "Равнодушие", "tags": ["sad", "jealous"]}, {"id": "41", "a": "Markul feat. Oxxxymiron", "t": "Fata Morgana", "tags": ["drama", "longing"]}, {"id": "42", "a": "PHARAOH", "t": "Дико, например", "tags": ["party", "sassy"]}, {"id": "43", "a": "Мот", "t": "Капкан", "tags": ["jealous", "drama"]}, {"id": "44", "a": "Грибы", "t": "Копы", "tags": ["funny", "street"]}];       // [{id:'3', a:'Грибы', t:'Тает лёд', tags:['flirt','love']}]
const STICKERS = {"03": "data:image/webp;base64,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", "06": "data:image/webp;base64,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", "08": "data:image/webp;base64,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", "11": "data:image/webp;base64,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", "16": "data:image/webp;base64,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", "23": "data:image/webp;base64,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", "25": "data:image/webp;base64,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", "31": "data:image/webp;base64,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", "39": "data:image/webp;base64,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", "48": "data:image/webp;base64,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"}; // {'03': 'data:image/webp;base64,…'} — стикеры Спотти для комментариев
const AVATAR = "data:image/webp;base64,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";     // стикер Спотти: аватар паблика
const FAB = "data:image/webp;base64,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";           // стикер Спотти для плавающей кнопки
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

async function callTavern(system, user, diag) {
    const t0 = Date.now();
    diag.maxTokens = MAX_TOKENS;
    let text;
    try {
        text = await ctx().generateRaw({ systemPrompt: system, prompt: user, responseLength: MAX_TOKENS });
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
        '<button class="pdx-act" type="button">' + ICON.comment + short(comments) + '</button>' +
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
    out.querySelectorAll('.pdx-more').forEach(b => {
        b.addEventListener('click', e => {
            e.stopPropagation();
            const box = b.closest('.pdx-comms'); if (box) box.classList.add('open');
            if (b.parentNode) b.parentNode.removeChild(b);
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
    if (st && st.fields) { renderWall(st.fields, st.picks); return; }
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
