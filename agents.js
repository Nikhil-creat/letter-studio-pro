/* Letter Studio Pro: the agent pipeline.
   Agents: intent, retrieve, draft, comply, critic (self-review loop), layout.
   Works fully offline. The draft agent can optionally call an LLM (bring your own key). */
(function (root) {
  const { TYPES, TONES } = root.LS_DATA || require("./kb.js");

  const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
  const lines = s => (s || "").split("\n").map(x => x.trim()).filter(Boolean);
  const wordCount = s => (s.trim().match(/\S+/g) || []).length;

  /* ---------- Retrieval: TF-IDF + cosine similarity ---------- */
  const STOP = new Set("a an the and or of to in on for with at by from is are was were be been it this that as your you i we our my me us he she they them his her their not but if so do does did have has had will would can could should may might shall than then there here into about".split(" "));
  function tok(s) {
    return (String(s).toLowerCase().match(/[a-z0-9']+/g) || [])
      .map(w => w.replace(/'s$/, ""))
      .filter(w => w.length > 1 && !STOP.has(w))
      .map(w => (w.length > 4 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w));
  }
  function buildIndex(docs) {
    const df = new Map();
    const toks = docs.map(d => tok(d.text));
    toks.forEach(t => new Set(t).forEach(w => df.set(w, (df.get(w) || 0) + 1)));
    const N = docs.length;
    const idf = w => Math.log((N + 1) / ((df.get(w) || 0) + 1)) + 1;
    const vec = t => {
      const tf = new Map();
      t.forEach(w => tf.set(w, (tf.get(w) || 0) + 1));
      let n = 0;
      const v = new Map();
      tf.forEach((c, w) => { const x = (1 + Math.log(c)) * idf(w); v.set(w, x); n += x * x; });
      return { v, n: Math.sqrt(n) || 1 };
    };
    return { docs, vecs: toks.map(vec), vec };
  }
  function cosine(a, b) {
    let s = 0;
    const [x, y] = a.v.size < b.v.size ? [a, b] : [b, a];
    x.v.forEach((w, k) => { const o = y.v.get(k); if (o) s += w * o; });
    return s / (a.n * b.n);
  }
  function search(index, query, k) {
    const q = index.vec(tok(query));
    return index.docs.map((d, i) => ({ doc: d, score: cosine(q, index.vecs[i]) }))
      .sort((a, b) => b.score - a.score).slice(0, k);
  }
  const typeDocs = TYPES.map(t => ({
    id: t.id, kind: "convention", title: t.label,
    text: [t.label, t.kw.replace(/,/g, " "), t.vocab.join(" "), t.rule, t.struct].join(" ")
  }));
  const typeIndex = buildIndex(typeDocs);
  const typeById = id => TYPES.find(t => t.id === id) || TYPES[0];

  /* ---------- Helpers ---------- */
  function salutationFor(f, formal, type) {
    const n = (f.rName || "").trim();
    if (type && type.love) {
      const nick = (f.nick || "").trim();
      return `My dearest ${nick || (n ? n.split(/\s+/)[0] : "love")},`;
    }
    if (formal) {
      if (!n) return "Dear Sir or Madam,";
      const m = n.match(/^(Mr|Mrs|Ms|Miss|Dr|Prof|Sir|Madam|Mx)\.?\s+(.+)$/i);
      if (m) {
        const parts = m[2].split(/\s+/);
        const dot = /^(sir|madam)$/i.test(m[1]) ? "" : ".";
        return `Dear ${m[1]}${dot} ${parts[parts.length - 1]},`;
      }
      return `Dear ${n},`;
    }
    return n ? `Hi ${n.split(/\s+/)[0]},` : "Hi there,";
  }
  function resolveSign(f, type) {
    if (f.close && f.close !== "auto") return f.close;
    if (type.formal && !(f.rName || "").trim() && type.close === "Sincerely") return "Yours faithfully";
    return type.close;
  }
  function fontFor(f, type) {
    if (f.font && f.font !== "auto") return f.font;
    if (!type.formal) return "Georgia";
    return type.g === 0 ? "Calibri" : "Times New Roman";
  }
  const vars = (f, tone) => ({
    sName: (f.sName || "").trim(), title: (f.sTitle || "").trim(), org: (f.rOrg || "").trim(),
    d: (f.details || "").trim(), cta: tone.cta, rName: f.rName || "",
    nick: (f.nick || "").trim(), sel: (f.loveWords || "").split(",").map(x => x.trim()).filter(Boolean),
    intensity: parseInt(f.intensity, 10) || 2, ily: (f.ily || "").trim(), toneId: f.tone
  });

  /* ---------- Assemble the letter into layout blocks ---------- */
  function assemble(f, type, paras, subj, sign) {
    const formal = !!type.formal;
    const name = (f.sName || "").trim() || "[Your Name]";
    const blocks = [];
    const addr = lines(f.sAddr);
    const sl = formal ? [f.sName, f.sTitle, ...addr, f.sContact].map(x => (x || "").trim()).filter(Boolean) : addr;
    if (sl.length) blocks.push({ k: "Sender", lines: sl, right: true, cls: "sender" });
    if ((f.date || "").trim()) blocks.push({ k: "Date", lines: [f.date.trim()], right: true });
    if (formal) {
      const rl = [(f.rName || "").trim(), (f.rOrg || "").trim(), ...lines(f.rAddr)].filter(Boolean);
      if (rl.length) blocks.push({ k: "Recipient", lines: rl });
      if (subj) blocks.push({ k: "Subject", lines: [(/^(re|ref|subject)\s*:/i.test(subj) ? "" : "Subject: ") + subj], bold: true });
    }
    const salutation = salutationFor(f, formal, type);
    blocks.push({ k: "Salutation", lines: [salutation] });
    blocks.push({ k: "Body", paras: paras.slice() });
    const title = (f.sTitle || "").trim();
    blocks.push({ k: "Closing", lines: [sign + ",", "", "", name, ...(formal && title ? [title] : [])], right: true, cls: "closing" });
    const post = [];
    if ((f.encl || "").trim()) post.push("Encl: " + f.encl.trim());
    if ((f.cc || "").trim()) post.push("CC: " + f.cc.trim());
    if ((f.ps || "").trim()) post.push("P.S. " + f.ps.trim());
    if (post.length) blocks.push({ k: "Post-words", lines: post });
    const text = blocks.map(b => (b.paras ? b.paras.join("\n\n") : b.lines.join("\n"))).join("\n\n");
    return { blocks, text, salutation };
  }

  /* ---------- Agent 1: intent ---------- */
  function extractEntities(t) {
    const out = {};
    let m = t.match(/\b(Mr|Mrs|Ms|Miss|Dr|Prof)\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
    if (m) out.rName = m[1] + ". " + m[2];
    m = t.match(/\bat\s+([A-Z][A-Za-z0-9&.\-]+(?:\s+[A-Z][A-Za-z0-9&.\-]+){0,3})/);
    if (m) out.rOrg = m[1];
    return out;
  }
  function intent(f) {
    const text = (f.prompt || "").trim();
    let ranked = search(typeIndex, text || "x", TYPES.length).map(r => {
      const t = typeById(r.doc.id);
      const hits = t.kw.split(",").reduce((n, k) => n + (text && text.toLowerCase().includes(k.trim()) ? 1 : 0), 0);
      return { id: t.id, label: t.label, score: text ? r.score + 0.35 * hits : 0 };
    }).sort((a, b) => b.score - a.score);
    const top = ranked[0], second = ranked[1];
    const confidence = text ? Math.min(0.99, top.score / (top.score + (second ? second.score : 0) + 0.15)) : 0;
    const auto = !!(f.autoType && text && top.score > 0.12);
    return { typeId: auto ? top.id : f.sub, auto, confidence, alternatives: ranked.slice(0, 3), entities: text ? extractEntities(text) : {} };
  }

  /* ---------- Agent 3: draft (offline template or LLM) ---------- */
  const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
  async function callLLM(cfg, key, system, user) {
    if (cfg.provider === "openai" || cfg.provider === "groq") {
      const url = cfg.provider === "groq" ? GROQ_URL : cfg.baseUrl;
      const model = cfg.provider === "groq" ? cfg.gModel : cfg.oModel;
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer " + key },
        body: JSON.stringify({ model, temperature: 0.6, max_tokens: 1400, messages: [{ role: "system", content: system }, { role: "user", content: user }] })
      });
      const j = await r.json();
      if (!r.ok) throw new Error((j.error && j.error.message) || "Request failed (" + r.status + ")");
      return j.choices[0].message.content;
    }
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({ model: cfg.model, max_tokens: 1600, system, messages: [{ role: "user", content: user }] })
    });
    const j = await r.json();
    if (!r.ok) throw new Error((j.error && j.error.message) || "Request failed (" + r.status + ")");
    return (j.content || []).map(c => c.text || "").join("");
  }
  function parseJSON(text) {
    const a = text.indexOf("{"), b = text.lastIndexOf("}");
    if (a < 0 || b < a) throw new Error("Model did not return JSON");
    const j = JSON.parse(text.slice(a, b + 1));
    if (!Array.isArray(j.paragraphs) || j.paragraphs.length < 1) throw new Error("No paragraphs in model output");
    return { paras: j.paragraphs.map(String), subj: j.subject ? String(j.subject) : "" };
  }
  const DRAFT_SYSTEM = 'You are the Drafter agent inside a letter-writing studio. Write the BODY of a letter only: no address blocks, no salutation, no sign-off. Follow the conventions given. Never invent facts, names, dates, amounts or reference numbers that the user did not provide; use square-bracket placeholders like [date] instead. Reply with ONLY a JSON object: {"subject": string (empty for informal letters), "paragraphs": [string, ...]}.';
  async function draftLLM(f, type, tone, retrieved, ctx) {
    const cfg = ctx.cfg;
    const samples = retrieved.filter(r => r.kind === "sample").slice(0, 2).map(r => `--- Style sample: ${r.title}\n${r.text.slice(0, 700)}`).join("\n");
    const lenMap = { short: "about 90 to 140 words", standard: "about 160 to 260 words", detailed: "about 280 to 400 words" };
    const user = [
      `Letter type: ${type.label} (${type.formal ? "formal" : "informal"})`,
      `Tone: ${tone.label} (${tone.vibe})`,
      `Language: ${cfg.lang || "English"}`,
      `Length: ${lenMap[cfg.length] || lenMap.standard}`,
      `Conventions: ${type.rule} Structure: ${type.struct}. Useful vocabulary: ${type.vocab.join(", ")}.`,
      type.avoid.length ? `Avoid: ${type.avoid.join(", ")}.` : "",
      `Sender: ${f.sName || "[unknown]"}${f.sTitle ? ", " + f.sTitle : ""}`,
      `Recipient: ${f.rName || "[unknown]"}${f.rOrg ? ", " + f.rOrg : ""}`,
      f.subj ? `Subject: ${f.subj}` : "",
      type.love ? `This is a personal love letter. Write warmly and sincerely in first person, with concrete images instead of cliches. Do not invent shared memories, places or events; use [placeholders] if a detail is needed. Emotional intensity: ${["gentle and sweet", "warm and heartfelt", "deeply passionate"][(parseInt(f.intensity, 10) || 2) - 1]}.` : "",
      type.love && f.nick ? `Pet name for the recipient: ${f.nick}` : "",
      type.love && f.loveWords ? `Feelings to express: ${f.loveWords.split(",").map(k => (root.LS_DATA.LOVE[k.trim()] || "")).filter(Boolean).join(" ")}` : "",
      type.love && f.ily ? `Include this line once, naturally: "${f.ily}"` : "",
      f.prompt ? `User request: ${f.prompt}` : "",
      f.details ? `Key details to include: ${f.details}` : "",
      samples
    ].filter(Boolean).join("\n");
    return parseJSON(await callLLM(cfg, ctx.key, DRAFT_SYSTEM, user));
  }

  /* ---------- Agent 5: critic ---------- */
  const CONTR = { "can't": "cannot", "won't": "will not", "i'm": "I am", "i'll": "I will", "i've": "I have", "i'd": "I would", "let's": "let us", "it's": "it is", "that's": "that is", "we're": "we are", "you're": "you are", "they're": "they are", "we'll": "we will", "we've": "we have" };
  function expand(s) {
    return s.replace(/\b[A-Za-z]+'[a-z]+\b/g, m => {
      const k = m.toLowerCase();
      let r = CONTR[k];
      if (!r && k.endsWith("n't")) r = k.slice(0, -3) + " not";
      if (!r) return m;
      return m[0] === m[0].toUpperCase() && r[0] !== "I" ? r[0].toUpperCase() + r.slice(1) : r;
    });
  }
  function syl(w) {
    w = w.toLowerCase().replace(/[^a-z]/g, "");
    if (!w) return 0;
    if (w.length <= 3) return 1;
    w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
    const m = w.match(/[aeiouy]{1,2}/g);
    return m ? m.length : 1;
  }
  function readability(text) {
    const words = text.match(/[A-Za-z']+/g) || [];
    const sentences = Math.max(1, (text.match(/[.!?]+(\s|$)/g) || []).length);
    const syll = words.reduce((n, w) => n + syl(w), 0);
    const w = Math.max(1, words.length);
    const flesch = Math.round(206.835 - 1.015 * (w / sentences) - 84.6 * (syll / w));
    return { flesch: Math.max(0, Math.min(100, flesch)), sentences, avgSentence: Math.round(w / sentences), words: words.length };
  }
  function emotion(text) {
    const low = text.toLowerCase();
    const n = list => list.reduce((c, w) => c + (low.split(w).length - 1), 0);
    const clamp = x => Math.max(0, Math.min(100, Math.round(x)));
    const warm = n(["love", "dear", "heart", "cherish", "adore", "miss", "grateful", "happy", "smile", "thank", "warm", "wonderful", "care", "joy", "appreciate", "sincer"]);
    const formal = n(["hereby", "pursuant", "kindly", "sincerely", "respectfully", "regards", "request", "enclosed", "faithfully"]);
    const contr = (low.match(/\b\w+'(t|re|ve|ll|d|m)\b/g) || []).length + (low.match(/!/g) || []).length;
    const urgent = n(["immediately", "urgent", "deadline", "asap", "promptly", "within", "expect", "failing"]);
    const conf = n(["confident", "certain", "will ", "ensure", "committed", "assure", "promise", "without reservation"]);
    const hedge = n(["maybe", "perhaps", "might", "sort of", "kind of", "i think", "possibly"]);
    return { warmth: clamp(warm * 11), formality: clamp(50 + formal * 12 - contr * 9), urgency: clamp(urgent * 20), confidence: clamp(50 + conf * 9 - hedge * 14) };
  }
  function critique(f, type, tone, R) {
    const issues = [];
    const add = (sev, msg, fix) => issues.push({ sev, msg, fix });
    const bodyText = R.paras.join(" ");
    const full = R.text;
    const low = full.toLowerCase();
    const met = readability(bodyText);

    const ph = (full.match(/\[[^\]]+\]/g) || []).length;
    if (ph) add("warn", `${ph} placeholder${ph > 1 ? "s" : ""} still to fill in (highlighted in the preview).`);
    if (!(f.sName || "").trim()) add("warn", "Add your name so the closing is complete.");
    if (type.formal && !(f.sContact || "").trim()) add("info", "Add an email or phone number so the recipient can reply.");
    if (type.formal && !(R.subj || "").trim()) add("warn", "A formal letter needs a subject line.");

    if (type.formal && /\b\w+'(t|re|ve|ll|d|m|s)\b/i.test(bodyText.replace(/\b(it|that|there|here)'s\b/gi, "$1 is"))) {
      add("warn", "Contractions found in a formal letter. Auto-fix expands them.", "contractions");
    }
    const named = !!(f.rName || "").trim();
    if (type.formal && R.salutation.startsWith("Dear Sir or Madam") && R.sign !== "Yours faithfully" && R.sign !== "Respectfully yours") {
      add("warn", `"Dear Sir or Madam" pairs with "Yours faithfully", not "${R.sign}".`, "sign:Yours faithfully");
    }
    if (type.formal && named && R.sign === "Yours faithfully") {
      add("info", `You addressed a named person, so "Sincerely" is the usual closing.`, "sign:Sincerely");
    }
    if (met.avgSentence > 26) add("warn", `Average sentence is ${met.avgSentence} words. Shorter sentences read better.`);
    if (!type.formal && met.flesch < 45) add("info", "This reads stiff for an informal letter. Try a warmer, simpler tone.");
    if (type.formal && met.flesch > 85) add("info", "This may read too casual for a formal letter.");
    const last = R.paras[R.paras.length - 1] || "";
    if (type.formal && !/(please|kindly|request|look forward|appreciate|grateful|welcome|expect|confirm|respond|contact)/i.test(last)) {
      add("warn", "The conclusion has no clear call to action.");
    }
    const hits = tone.words.filter(w => low.includes(w)).length;
    if (hits === 0) add("info", `Few ${tone.label.toLowerCase()} tone signals. Try the tone quick-adjust below.`);
    type.avoid.forEach(p => { if (low.includes(p)) add("warn", `Avoid the phrase "${p}" in this type of letter.`); });
    const counts = {};
    tok(bodyText).forEach(w => { counts[w] = (counts[w] || 0) + 1; });
    const rep = Object.keys(counts).filter(w => counts[w] >= 4 && w.length > 4);
    if (rep.length) add("info", `Repeated word: "${rep[0]}". Vary the wording.`);
    const wc = wordCount(full);
    if (type.formal && wc > 420) add("warn", `${wc} words is long. Formal letters are usually under one page.`);
    if (wc < 60) add("info", "Very short. Add key details for a fuller letter.");
    if ((bodyText.match(/\b(was|were|been|being|is|are)\s+\w+ed\b/gi) || []).length > 3) add("info", "Several passive constructions. Active voice is more direct.");

    const pen = { error: 12, warn: 6, info: 2 };
    const score = Math.max(0, 100 - issues.reduce((n, i) => n + pen[i.sev], 0));
    return { score, issues, metrics: met };
  }
  function applyFixes(R, issues) {
    let changed = false;
    issues.forEach(i => {
      if (i.fix === "contractions") {
        const np = R.paras.map(expand);
        if (np.join("\u0001") !== R.paras.join("\u0001")) { R.paras = np; changed = true; }
      } else if (i.fix && i.fix.startsWith("sign:")) {
        const s = i.fix.slice(5);
        if (R.sign !== s) { R.sign = s; changed = true; }
      }
    });
    return changed;
  }

  /* ---------- Agent 4: compliance and grounding ---------- */
  function comply(f, type, R, usedLLM) {
    const notes = [];
    const all = [f.prompt, f.details, f.ps].join(" ");
    if (/\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/.test(all)) notes.push({ sev: "error", msg: "This looks like a card number. Remove it before sharing the letter." });
    else if (/\b\d{3}-\d{2}-\d{4}\b/.test(all) || /\b\d{4}\s\d{4}\s\d{4}\b/.test(all)) notes.push({ sev: "warn", msg: "This looks like a government ID number. Only include it if the recipient truly needs it." });
    if (["notice", "inquiry", "terminate", "gov"].includes(type.id)) notes.push({ sev: "info", msg: "Legal or official template. Have a qualified professional review it before sending. This is not legal advice." });
    if (usedLLM) {
      const known = Object.values(f).join(" ").toLowerCase();
      const nums = (R.paras.join(" ").match(/\b\d[\d,./:-]*\d\b|\b\d\b/g) || []).filter(n => !known.includes(n.toLowerCase()));
      if (nums.length) notes.push({ sev: "warn", msg: `Unverified figure${nums.length > 1 ? "s" : ""} from the model: ${[...new Set(nums)].slice(0, 4).join(", ")}. Check ${nums.length > 1 ? "them" : "it"} against your facts.` });
    }
    return notes;
  }

  /* ---------- Agent 6: layout ---------- */
  function layoutAgent(f, type, R) {
    const words = wordCount(R.text);
    const bars = R.blocks.map(b => ({ k: b.k, w: wordCount(b.paras ? b.paras.join(" ") : b.lines.join(" ")) }));
    const bodyW = (bars.find(b => b.k === "Body") || { w: 0 }).w;
    const ratio = bodyW / Math.max(1, words);
    return {
      words, bars,
      fill: Math.min(100, Math.round((words / 450) * 100)),
      pages: Math.max(1, Math.ceil(words / 450)),
      balance: Math.round(100 - Math.min(100, Math.abs(ratio - 0.68) * 160)),
      font: fontFor(f, type),
      alignment: f.layout === "mod" ? "Modified block" : "Full block"
    };
  }

  /* ---------- Orchestrator ---------- */
  async function runPipeline(f0, ctx) {
    const H = ctx.hooks || {};
    const sleep = ms => (ms ? new Promise(r => setTimeout(r, ms)) : Promise.resolve());
    const trace = [];
    const R = { trace, notes: [], llmUsed: false, draftError: "" };
    const t0 = now();
    let f = { ...f0 };

    async function agent(id, fn) {
      H.onAgent && H.onAgent({ id, status: "running" });
      await sleep(ctx.delay);
      const s = now();
      let out;
      try { out = (await fn()) || {}; } catch (err) { out = { error: err.message || String(err) }; }
      const e = { id, status: out.error ? "error" : out.skipped ? "skipped" : "done", ms: Math.round(now() - s), summary: out.error || out.summary || "" };
      trace.push(e);
      H.onAgent && H.onAgent(e);
      return out;
    }

    await agent("intent", async () => {
      R.intent = intent(f);
      const ent = R.intent.entities;
      R.filled = {};
      if (ent.rName && !(f.rName || "").trim()) { f.rName = ent.rName; R.filled.rName = ent.rName; }
      if (ent.rOrg && !(f.rOrg || "").trim()) { f.rOrg = ent.rOrg; R.filled.rOrg = ent.rOrg; }
      f.sub = R.intent.typeId;
      const t = typeById(f.sub);
      const filledN = Object.keys(R.filled).length;
      return { summary: `${t.label}${R.intent.auto ? ` (chosen from your request, ${Math.round(R.intent.confidence * 100)}% sure)` : " (your selection)"}${filledN ? `; filled ${filledN} field${filledN > 1 ? "s" : ""}` : ""}` };
    });
    const type = typeById(f.sub);
    const tone = TONES[f.tone] || TONES.professional;

    await agent("retrieve", async () => {
      const user = (ctx.userDocs || []).map(d => ({ id: d.id, kind: "sample", title: d.title, text: d.text }));
      const idx = buildIndex([...typeDocs, ...user]);
      const q = [type.label, type.kw.replace(/,/g, " "), f.prompt, f.details, tone.label].join(" ");
      R.retrieved = search(idx, q, 4).filter(r => r.score > 0.02).map(r => ({ id: r.doc.id, kind: r.doc.kind, title: r.doc.title, text: r.doc.text, score: r.score }));
      return { summary: `${R.retrieved.length} sources (${user.length} of your own samples indexed)` };
    });

    await agent("draft", async () => {
      const wantLLM = f.engine === "llm";
      if (ctx.skipDraft && ctx.paras) {
        R.paras = ctx.paras.slice(); R.subj = ctx.subj || "";
        R.llmUsed = !!ctx.wasLLM;
        return { skipped: true, summary: "Kept the current draft and re-applied your fields" };
      }
      if (wantLLM && ctx.key) {
        try {
          const d = await draftLLM(f, type, tone, R.retrieved, ctx);
          R.paras = d.paras; R.subj = type.formal ? (f.subj || d.subj || type.subj) : "";
          R.llmUsed = true;
          return { summary: `Drafted by ${ctx.cfg.provider === "openai" ? ctx.cfg.oModel : ctx.cfg.provider === "groq" ? "Groq " + ctx.cfg.gModel : ctx.cfg.model}` };
        } catch (err) {
          R.draftError = err.message || String(err);
        }
      }
      const t = type.p(vars(f, tone));
      R.paras = t; R.subj = type.formal ? (f.subj || type.subj) : "";
      return { summary: R.draftError ? `AI draft failed, used the built-in template (${R.draftError})` : wantLLM ? "No API key, used the built-in template" : "Built-in template" };
    });

    await agent("comply", async () => {
      // Sign-off and assembly are needed first so the critic can see the whole letter.
      R.sign = resolveSign(f, type);
      Object.assign(R, assemble(f, type, R.paras, R.subj, R.sign));
      R.notes = comply(f, type, R, R.llmUsed);
      return { summary: R.notes.length ? `${R.notes.length} advisory note${R.notes.length > 1 ? "s" : ""}` : "No concerns" };
    });

    await agent("critic", async () => {
      let passes = 0, fixed = 0;
      for (let i = 0; i < 3; i++) {
        Object.assign(R, assemble(f, type, R.paras, R.subj, R.sign));
        R.critic = critique(f, type, tone, R);
        const fixable = R.critic.issues.filter(x => x.fix && x.sev !== "info");
        passes++;
        if (!fixable.length || !applyFixes(R, fixable)) break;
        fixed += fixable.length;
      }
      // Info-level sign-off suggestions are applied only on request, so re-assemble once more.
      Object.assign(R, assemble(f, type, R.paras, R.subj, R.sign));
      R.critic = critique(f, type, tone, R);
      R.reflect = { passes, fixed };
      R.emotion = emotion(R.text);
      return { summary: `Score ${R.critic.score}/100 after ${passes} pass${passes > 1 ? "es" : ""}${fixed ? `, auto-fixed ${fixed}` : ""}` };
    });

    await agent("layout", async () => {
      R.layout = layoutAgent(f, type, R);
      return { summary: `${R.layout.pages} page, ${R.layout.fill}% full, ${R.layout.font}` };
    });

    R.f = f; R.type = type; R.tone = tone; R.ms = Math.round(now() - t0);
    return R;
  }

  /* ---------- Quick adjustments (work offline) ---------- */
  const FORMAL_MAP = [["a lot of", "many"], ["get", "obtain"], ["need", "require"], ["buy", "purchase"], ["start", "begin"], ["let me know", "please inform me"], ["thanks", "thank you"], ["sorry", "apologise"], ["help", "assist"], ["about", "regarding"]];
  const cap = (src, r) => (src[0] === src[0].toUpperCase() ? r[0].toUpperCase() + r.slice(1) : r);
  const transforms = {
    formalize: ps => ps.map(p => FORMAL_MAP.reduce((s, [a, b]) => s.replace(new RegExp("\\b" + a + "\\b", "gi"), m => cap(m, b)), expand(p))),
    concise: ps => ps.map(p => p.replace(/\b(very|really|just|quite|actually|basically)\s+/gi, "").replace(/\bin order to\b/gi, "to").replace(/\s{2,}/g, " ")),
    warmer: ps => { const c = ps.slice(); const i = c.length - 1; if (!/truly appreciate/i.test(c[i])) c[i] = "I truly appreciate your time and consideration. " + c[i]; return c; },
    firmer: ps => ps.map(p => Object.values(TONES).reduce((s, t) => s.split(t.cta).join(TONES.authoritative.cta), p).replace(/\bI would be glad to\b/g, "I am prepared to"))
  };
  async function refineLLM(cfg, key, paras, instruction) {
    const sys = 'You are the Editor agent. Revise the letter body paragraphs as instructed. Do not add facts. Reply with ONLY JSON: {"subject": "", "paragraphs": [string, ...]}.';
    const usr = `Instruction: ${instruction}\n\nCurrent paragraphs:\n${paras.map((p, i) => `${i + 1}. ${p}`).join("\n")}`;
    return parseJSON(await callLLM(cfg, key, sys, usr));
  }

  async function toneLab(f, ctx) {
    const out = [];
    for (const k of Object.keys(TONES)) {
      const R = await runPipeline({ ...f, tone: k, engine: "auto" }, { delay: 0, userDocs: ctx.userDocs || [] });
      out.push({ tone: k, label: TONES[k].label, score: R.critic.score, words: R.layout.words, preview: R.paras[0], emotion: R.emotion });
    }
    return out.sort((a, b) => b.score - a.score);
  }
  async function testGroqKey(key) {
    const r = await fetch("https://api.groq.com/openai/v1/models", { headers: { authorization: "Bearer " + key } });
    if (!r.ok) { let m = "HTTP " + r.status; try { const j = await r.json(); m = (j.error && j.error.message) || m; } catch (e) { /* ignore */ } throw new Error(m); }
    const j = await r.json();
    return (j.data || []).map(x => x.id);
  }

  const api = { emotion, toneLab, testGroqKey, runPipeline, transforms, refineLLM, assemble, critique, readability, salutationFor, resolveSign, fontFor, typeById, search, buildIndex, expand };
  root.LS_AGENTS = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
