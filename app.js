/* Letter Studio Pro: UI controller. */
(() => {
  const { GROUPS, TONES, TYPES, CLOSES, LOVE, LOVE_LABELS, LOVE_DEFAULTS, NICKNAMES, ILY } = window.LS_DATA;
  const A = window.LS_AGENTS;
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const ph = s => esc(s).replace(/\[[^\]]+\]/g, m => `<span class="ph">${m}</span>`);

  /* ---------- storage ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("ls:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("ls:" + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };
  const DEFAULT_CFG = { provider: "anthropic", model: "claude-sonnet-5", baseUrl: "https://api.openai.com/v1/chat/completions", oModel: "gpt-4o-mini", lang: "English", length: "standard", animate: true, remember: false, gModel: "llama-3.3-70b-versatile" };
  let cfg = { ...DEFAULT_CFG, ...store.get("cfg", {}) };
  const getKey = (p = cfg.provider) => { try { return sessionStorage.getItem("ls:key:" + p) || localStorage.getItem("ls:keyp:" + p) || ""; } catch (e) { return ""; } };
  const setKey = (p, k, remember) => {
    try {
      sessionStorage.removeItem("ls:key:" + p); localStorage.removeItem("ls:keyp:" + p);
      if (k) (remember ? localStorage : sessionStorage).setItem((remember ? "ls:keyp:" : "ls:key:") + p, k);
    } catch (e) { /* ignore */ }
  };
  const PROVIDER_NAME = { anthropic: "Claude", groq: "Groq", openai: "OpenAI-compatible" };

  /* ---------- build selects ---------- */
  let h = "";
  GROUPS.forEach((g, gi) => { h += `<optgroup label="${g}">`; TYPES.filter(t => t.g === gi).forEach(t => h += `<option value="${t.id}">${t.label}</option>`); h += "</optgroup>"; });
  $("sub").innerHTML = h;
  $("tone").innerHTML = Object.entries(TONES).map(([k, t]) => `<option value="${k}">${t.label}</option>`).join("");
  $("close").innerHTML = '<option value="auto">Auto</option>' + CLOSES.map(c => `<option>${c}</option>`).join("");
  try { $("date").value = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { /* ignore */ }

  const FIELDS = ["sub", "tone", "layout", "lh", "font", "sig", "close", "sName", "sTitle", "sContact", "sAddr", "rName", "rOrg", "rAddr", "subj", "date", "details", "encl", "cc", "ps", "prompt", "autoType", "engine", "nick", "intensity", "ily", "loveWords"];
  const collect = () => { const f = {}; FIELDS.forEach(id => { const el = $(id); f[id] = el.type === "checkbox" ? el.checked : el.value; }); return f; };
  const apply = f => {
    FIELDS.forEach(id => { if (f[id] === undefined) return; const el = $(id); if (el.type === "checkbox") el.checked = !!f[id]; else el.value = f[id]; });
    syncLoveChips(); syncLoveUI();
  };

  /* ---------- state ---------- */
  const st = { paras: null, subj: "", pristine: true, wasLLM: false, busy: false, R: null };
  const NODES = [["intent", "Intent", "\u25CE"], ["retrieve", "Retrieve", "\u2315"], ["draft", "Draft", "\u270E"], ["comply", "Comply", "\u2696"], ["critic", "Critic", "\u21BB"], ["layout", "Layout", "\u25A6"]];
  $("nodes").insertAdjacentHTML("beforeend", NODES.map(([id, n, g]) => `<div class="node" id="n-${id}"><div class="orb">${g}</div><span>${n}</span></div>`).join(""));
  $("beam").style.left = "8.33%";

  /* ---------- toast ---------- */
  let tt;
  const toast = m => { const t = $("toast"); t.textContent = m; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 2400); };

  /* ---------- run pipeline ---------- */
  function onAgent(e) {
    const el = $("n-" + e.id); if (!el) return;
    el.className = "node " + e.status;
    const i = NODES.findIndex(n => n[0] === e.id);
    if (e.status !== "running") $("beam").style.width = (i / 5) * 83.34 + "%";
  }
  async function run(opts = {}) {
    if (st.busy) return;
    const f = collect();
    if (f.engine === "llm" && !getKey() && !opts.fast) { toast("Add an API key in settings, or the built-in template is used."); }
    st.busy = true; $("btnRun").disabled = true;
    let redo = false;
    NODES.forEach(n => { $("n-" + n[0]).className = "node"; });
    $("beam").style.width = "0";
    try {
      const R = await A.runPipeline(f, {
        cfg, key: getKey(), userDocs: store.get("kb", []),
        delay: opts.fast ? 0 : (cfg.animate ? 170 : 0),
        hooks: { onAgent }, skipDraft: !!opts.skipDraft && !!st.paras, paras: st.paras, subj: st.subj, wasLLM: st.wasLLM
      });
      st.R = R;
      if (R.intent.auto) $("sub").value = R.intent.typeId;
      Object.entries(R.filled || {}).forEach(([k, v]) => { $(k).value = v; });
      st.paras = R.paras; st.subj = R.subj;
      if (!opts.skipDraft) { st.wasLLM = R.llmUsed; st.pristine = !R.llmUsed; }
      $("hint").classList.remove("show");
      if (R.draftError && !opts.fast) toast("AI draft failed: " + R.draftError);
      render(R);
      syncLoveUI();
      if (R.type.love && !st.lastLove) {
        st.lastLove = true;
        if (setLoveDefaults()) {
          if (f.engine === "llm") { $("hint").textContent = "Love letter styling applied. Press Run agents to redraft with the romantic tone."; $("hint").classList.add("show"); }
          else redo = true;
        }
      } else if (!R.type.love) st.lastLove = false;
      saveSession();
    } catch (err) {
      toast("Something went wrong: " + err.message);
    } finally {
      st.busy = false; $("btnRun").disabled = false;
    }
    if (redo) run({ fast: true });
  }

  /* ---------- render ---------- */
  function blocksHTML(R, f) {
    const mod = f.layout === "mod";
    return R.blocks.map(b => {
      if (b.paras) return b.paras.map(p => `<p>${ph(p)}</p>`).join("");
      const cls = ["blk", b.cls || "", b.bold ? "bold" : "", mod && b.right ? "mod" : ""].join(" ");
      const ls = b.lines.map((l, i) => (b.cls === "closing" && f.sig === "script" && i === 3) ? `<span class="sig">${esc(l)}</span>` : ph(l)).join("\n");
      return `<div class="${cls}"${b.right ? ' data-r="1"' : ""}>${ls}</div>`;
    }).join("");
  }
  function render(R) {
    const f = collect();
    const L = R.layout;
    $("typo").innerHTML = `Recommended font <b>${esc(L.font)}</b>, ${R.type.formal ? "headers 14 to 16 pt, body 11 to 12 pt" : "body 12 pt"}, line spacing 1.15, margins 1 in, ${L.alignment.toLowerCase()}.`;
    const paper = $("paper");
    paper.className = "paper lh-" + f.lh;
    paper.style.fontFamily = `"${L.font}", ${["Calibri", "Arial"].includes(L.font) ? "Arial, sans-serif" : "Georgia, serif"}`;
    if (st.custom) {
      if (paper.innerHTML !== st.custom.html) { paper.innerHTML = st.custom.html; st.custom.html = paper.innerHTML; }
      paper.querySelectorAll("[data-r]").forEach(e => e.classList.toggle("mod", f.layout === "mod"));
      $("out").value = paperText();
    } else {
      paper.innerHTML = blocksHTML(R, f);
      $("out").value = R.text;
    }
    $("engineChip").textContent = R.llmUsed ? "AI model drafting" : "Offline agents";
    $("engineChip").className = "engine" + (R.llmUsed ? " llm" : "");

    // trace log
    $("log").innerHTML = R.trace.map(t => {
      const n = NODES.find(x => x[0] === t.id);
      return `<li class="${t.status}"><span class="nm">${n[1]}</span><span class="sm">${esc(t.summary)}</span><span class="ms">${t.ms} ms</span></li>`;
    }).join("");

    // quality
    const c = R.critic;
    $("score").textContent = c.score;
    const off = 264 - (264 * c.score) / 100;
    $("ringFg").style.strokeDashoffset = off;
    $("ringFg").style.stroke = c.score >= 80 ? "var(--mint)" : c.score >= 60 ? "var(--amber)" : "var(--rose)";
    $("reflect").textContent = `Self-review: ${R.reflect.passes} pass${R.reflect.passes > 1 ? "es" : ""}${R.reflect.fixed ? `, ${R.reflect.fixed} issue${R.reflect.fixed > 1 ? "s" : ""} fixed automatically` : ", nothing needed fixing"}.`;
    const m = c.metrics;
    $("metrics").innerHTML = [["Words", L.words], ["Readability", m.flesch], ["Avg sentence", m.avgSentence], ["Pages", L.pages], ["Balance", L.balance + "%"], ["Tone", TONES[R.f.tone].label]]
      .map(([k, v]) => `<span class="chip">${k} <b>${esc(v)}</b></span>`).join("");
    const all = [...R.notes, ...c.issues];
    const E = R.emotion || { warmth: 0, formality: 0, urgency: 0, confidence: 0 };
    $("emotion").innerHTML = [["Warmth", E.warmth], ["Formality", E.formality], ["Urgency", E.urgency], ["Confidence", E.confidence]]
      .map(([k, v]) => `<div class="emo"><span>${k}</span><div class="meter"><i style="width:${v}%"></i></div><span>${v}</span></div>`).join("");
    $("issues").innerHTML = all.length ? all.map(i => `<li><span class="dot ${i.sev}"></span><span>${esc(i.msg)}</span></li>`).join("") : '<li><span class="dot info"></span><span>No issues found.</span></li>';
    $("retrieved").innerHTML = (R.retrieved || []).map(r => `<div class="src"><span>${esc(r.title)} <span class="chip">${r.kind === "sample" ? "your sample" : "convention"}</span></span><div class="meter"><i style="width:${Math.min(100, Math.round(r.score * 100))}%"></i></div></div>`).join("") || '<div class="chip">Nothing relevant</div>';
    const mx = Math.max(...L.bars.map(b => b.w), 1);
    if (st.custom) liveMetrics(R);
    $("bars").innerHTML = L.bars.map(b => `<div class="src"><span>${b.k}</span><div class="meter"><i style="width:${Math.max(4, Math.round((b.w / mx) * 100))}%"></i></div></div>`).join("");
  }
  const applyZoom = () => $("paper").style.setProperty("--z", $("zoom").value);

  /* ---------- input handling ---------- */
  let deb;
  const STRUCTURAL = new Set(["sub", "tone", "details", "prompt", "engine", "autoType", "nick", "intensity", "ily", "loveWords"]);
  function onInput(e) {
    const id = e && e.target && e.target.id;
    if (id === "zoom") { applyZoom(); return; }
    if (!FIELDS.includes(id)) return;
    if (id === "engine") updateEngineUI();
    if (id === "sub") syncLoveUI();
    if (st.custom && !["lh", "font", "layout", "sig"].includes(id) && !st.customToast) { st.customToast = true; toast("Your hand edits are kept. Press Regenerate to apply field changes."); }
    const f = collect();
    if (f.engine === "llm" || !st.pristine) {
      if (STRUCTURAL.has(id) && id !== "engine" && st.paras && (f.engine === "llm" || !st.pristine)) { $("hint").textContent = "Fields changed after the AI draft. Press Run agents to redraft, or keep editing to keep this draft."; $("hint").classList.add("show"); }
      clearTimeout(deb); deb = setTimeout(() => run({ fast: true, skipDraft: !!st.paras }), 250);
    } else {
      clearTimeout(deb); deb = setTimeout(() => run({ fast: true }), 300);
    }
  }
  function updateEngineUI() {
    const llm = $("engine").value === "llm";
    if (!st.R || !st.R.llmUsed) { $("engineChip").textContent = llm ? `AI mode: ${PROVIDER_NAME[cfg.provider]} (press Run agents)` : "Offline agents"; $("engineChip").className = "engine" + (llm ? " llm" : ""); }
  }
  document.addEventListener("input", onInput);
  document.addEventListener("change", onInput);

  $("btnRun").addEventListener("click", () => { st.pristine = true; run({}); });
  $("btnReset").addEventListener("click", () => { setCustom(null); st.pristine = true; st.paras = null; st.wasLLM = false; run({ fast: true }); toast("Reset to the template draft."); });
  $("btnClear").addEventListener("click", () => {
    ["sName", "sTitle", "sContact", "sAddr", "rName", "rOrg", "rAddr", "subj", "details", "encl", "cc", "ps", "prompt"].forEach(id => { $(id).value = ""; });
    setCustom(null); st.pristine = true; st.paras = null; st.wasLLM = false; run({ fast: true });
  });

  /* ---------- hand editing ---------- */
  const ALLOWED = { P: 1, DIV: 1, BR: 1, B: 1, STRONG: 1, I: 1, EM: 1, U: 1, SPAN: 1 };
  const OKCLS = new Set(["blk", "mod", "bold", "sender", "closing", "sig", "ph"]);
  // Rebuilds HTML from an untrusted source (link, backup file, storage) keeping only safe tags and classes.
  function sanitize(html) {
    const t = document.createElement("template"); t.innerHTML = String(html || "");
    const walk = n => {
      let out = "";
      n.childNodes.forEach(c => {
        if (c.nodeType === 3) { out += esc(c.nodeValue); return; }
        if (c.nodeType !== 1) return;
        const tag = c.tagName;
        if (tag === "BR") { out += "<br>"; return; }
        if (!ALLOWED[tag]) { out += walk(c); return; }
        const cls = (c.getAttribute("class") || "").split(/\s+/).filter(x => OKCLS.has(x)).join(" ");
        const attrs = (cls ? ` class="${cls}"` : "") + (c.hasAttribute("data-r") ? ' data-r="1"' : "");
        out += `<${tag.toLowerCase()}${attrs}>${walk(c)}</${tag.toLowerCase()}>`;
      });
      return out;
    };
    return walk(t.content);
  }
  function paperText() {
    const out = [];
    $("paper").childNodes.forEach(n => {
      let t = "";
      if (n.nodeType === 3) t = n.nodeValue;
      else if (n.nodeType === 1) t = n.innerText !== undefined ? n.innerText : n.textContent;
      t = t.replace(/\u00a0/g, " ").replace(/\n+$/, "");
      if (t.trim() !== "") out.push(t);
    });
    return out.join("\n\n");
  }
  const getText = () => (st.custom ? paperText() : (st.R ? st.R.text : ""));
  const getBodyHTML = () => $("paper").innerHTML.replace(/<span class="ph">([^<]*)<\/span>/g, "$1");
  function setCustom(html) { st.custom = html ? { html: sanitize(html) } : null; $("editChip").hidden = !st.custom; }
  function liveMetrics(R) {
    const text = paperText(), m = A.readability(text), wc = (text.match(/\S+/g) || []).length;
    const pages = Math.max(1, Math.ceil(wc / 450));
    $("metrics").innerHTML = [["Words", wc], ["Readability", m.flesch], ["Avg sentence", m.avgSentence], ["Pages", pages], ["Balance", R.layout.balance + "%"], ["Tone", TONES[R.f.tone].label]]
      .map(([k, v]) => `<span class="chip">${k} <b>${esc(v)}</b></span>`).join("");
    const E = A.emotion(text);
    $("emotion").innerHTML = [["Warmth", E.warmth], ["Formality", E.formality], ["Urgency", E.urgency], ["Confidence", E.confidence]]
      .map(([k, v]) => `<div class="emo"><span>${k}</span><div class="meter"><i style="width:${v}%"></i></div><span>${v}</span></div>`).join("");
    $("reflect").textContent = "You edited this letter by hand. Words, readability and emotion are live. The score and issues below are for the generated draft.";
  }
  let svt;
  $("paper").addEventListener("input", () => {
    st.custom = { html: $("paper").innerHTML }; $("editChip").hidden = false;
    $("out").value = paperText();
    if (st.R) liveMetrics(st.R);
    clearTimeout(svt); svt = setTimeout(saveSession, 600);
  });
  $("paper").addEventListener("paste", e => {
    e.preventDefault();
    const t = (e.clipboardData || window.clipboardData).getData("text/plain");
    document.execCommand("insertText", false, t);
  });
  document.querySelectorAll("#editBar [data-cmd]").forEach(b => {
    b.addEventListener("mousedown", e => e.preventDefault());
    b.addEventListener("click", () => { $("paper").focus(); document.execCommand(b.dataset.cmd); });
  });
  $("btnRegen").addEventListener("click", () => {
    if (!st.custom) { toast("Nothing to discard. The letter is already generated from your fields."); return; }
    st.customToast = false; setCustom(null); toast("Hand edits discarded. Letter rebuilt from your fields.");
    run({ fast: true, skipDraft: !!st.paras && !st.pristine });
  });
  const guardEdits = () => { if (st.custom) { toast("You edited the letter by hand. Press Regenerate first, then use this."); return true; } return false; };

  /* ---------- export ---------- */
  const fileBase = () => (st.R ? st.R.type.id : "letter") + "-letter";
  function download(name, mime, content) {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = document.createElement("a"); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  function standaloneHTML() {
    const f = collect();
    const font = st.R.layout.font;
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(st.R.subj || st.R.type.label)}</title><style>body{font-family:"${font}",Georgia,serif;font-size:12pt;line-height:1.15;max-width:680px;margin:40px auto;padding:0 24px;color:#111}.blk{margin-bottom:14px;white-space:pre-wrap}.mod{margin-left:46%}.bold{font-weight:700}p{margin:0 0 10px}.sig{font-family:"Segoe Script","Brush Script MT",cursive;font-size:1.7em}b,strong{font-weight:700}i,em{font-style:italic}u{text-decoration:underline}</style></head><body>${getBodyHTML()}</body></html>`;
  }
  $("btnCopy").addEventListener("click", async () => {
    if (!st.R) return;
    try { await navigator.clipboard.writeText(getText()); toast("Letter copied."); }
    catch (e) { $("out").focus(); $("out").select(); try { document.execCommand("copy"); toast("Letter copied."); } catch (e2) { toast("Select the text and copy it manually."); } }
  });
  $("btnTxt").addEventListener("click", () => st.R && download(fileBase() + ".txt", "text/plain", getText()));
  $("btnHtml").addEventListener("click", () => st.R && download(fileBase() + ".html", "text/html", standaloneHTML()));
  $("btnDoc").addEventListener("click", () => st.R && download(fileBase() + ".doc", "application/msword", standaloneHTML()));
  $("btnPrint").addEventListener("click", () => window.print());
  $("btnShare").addEventListener("click", async () => {
    if (!st.R) return;
    if (navigator.share) { try { await navigator.share({ title: st.R.subj || st.R.type.label, text: getText() }); } catch (e) { /* cancelled */ } }
    else toast("Sharing is not supported here. Use Copy instead.");
  });
  $("btnMail").addEventListener("click", () => {
    if (!st.R) return;
    location.href = "mailto:?subject=" + encodeURIComponent(st.R.subj || st.R.type.label) + "&body=" + encodeURIComponent(getText());
  });
  $("btnSpeak").addEventListener("click", () => {
    if (!("speechSynthesis" in window) || !st.R) { toast("Read aloud is not supported in this browser."); return; }
    if (speechSynthesis.speaking) { speechSynthesis.cancel(); $("btnSpeak").textContent = "Read aloud"; return; }
    const u = new SpeechSynthesisUtterance(getText());
    u.onend = () => { $("btnSpeak").textContent = "Read aloud"; };
    $("btnSpeak").textContent = "Stop reading";
    speechSynthesis.speak(u);
  });

  /* ---------- voice dictation ---------- */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null;
  $("btnMic").addEventListener("click", () => {
    if (!SR) { toast("Dictation is not supported in this browser."); return; }
    if (rec) { rec.stop(); return; }
    rec = new SR(); rec.lang = "en-US"; rec.interimResults = false;
    $("btnMic").classList.add("on"); $("btnMic").textContent = "Listening";
    rec.onresult = e => { const t = Array.from(e.results).map(r => r[0].transcript).join(" "); $("prompt").value = ($("prompt").value + " " + t).trim(); $("prompt").dispatchEvent(new Event("input", { bubbles: true })); };
    rec.onend = () => { rec = null; $("btnMic").classList.remove("on"); $("btnMic").textContent = "Dictate"; };
    rec.onerror = () => { toast("Could not hear you. Check microphone permission."); };
    rec.start();
  });

  /* ---------- refine ---------- */
  document.querySelectorAll("[data-t]").forEach(b => b.addEventListener("click", () => {
    if (!st.paras || guardEdits()) return;
    st.paras = A.transforms[b.dataset.t](st.paras); st.pristine = false;
    run({ fast: true, skipDraft: true }); toast("Applied: " + b.textContent.toLowerCase());
  }));
  $("btnRefine").addEventListener("click", async () => {
    const ins = $("refine").value.trim();
    if (!ins || !st.paras || guardEdits()) return;
    if (!getKey()) { toast("Add an API key in settings to use AI edits."); $("dlg").showModal(); return; }
    $("btnRefine").disabled = true;
    try {
      const r = await A.refineLLM(cfg, getKey(), st.paras, ins);
      st.paras = r.paras; st.pristine = false; st.wasLLM = true;
      $("refine").value = ""; await run({ fast: true, skipDraft: true }); toast("Edit applied.");
    } catch (e) { toast("Edit failed: " + e.message); }
    finally { $("btnRefine").disabled = false; }
  });

  /* ---------- knowledge base ---------- */
  function renderKB() {
    const docs = store.get("kb", []);
    $("kbList").innerHTML = docs.length ? docs.map(d => `<li><span>${esc(d.title)}</span><button class="sec" data-del="${d.id}">Remove</button></li>`).join("") : '<li><span class="chip">No samples yet</span></li>';
  }
  $("btnKbAdd").addEventListener("click", () => {
    const title = $("kbTitle").value.trim() || "Untitled sample", text = $("kbText").value.trim();
    if (text.length < 30) { toast("Paste a longer sample (at least a couple of sentences)."); return; }
    const docs = store.get("kb", []); docs.push({ id: "u" + Date.now(), title, text });
    store.set("kb", docs); $("kbTitle").value = ""; $("kbText").value = ""; renderKB(); toast("Added to the knowledge base."); run({ fast: true, skipDraft: !!st.paras && !st.pristine });
  });
  $("kbList").addEventListener("click", e => {
    const id = e.target.dataset && e.target.dataset.del; if (!id) return;
    store.set("kb", store.get("kb", []).filter(d => d.id !== id)); renderKB();
  });

  /* ---------- drafts ---------- */
  function renderDrafts() {
    const ds = store.get("drafts", []);
    $("draftList").innerHTML = ds.length ? ds.map(d => `<li><span>${esc(d.name)}</span><span style="display:flex;gap:6px"><button class="sec" data-load="${d.id}">Load</button><button class="sec" data-rm="${d.id}">Delete</button></span></li>`).join("") : '<li><span class="chip">No saved drafts</span></li>';
  }
  function saveDraft() {
    if (!st.R) return;
    const f = collect(); const ds = store.get("drafts", []);
    ds.unshift({ id: "d" + Date.now(), name: `${st.R.type.label}${f.rName ? " to " + f.rName : ""} (${new Date().toLocaleDateString()})`, f, paras: st.paras, subj: st.subj, pristine: st.pristine, wasLLM: st.wasLLM, custom: st.custom ? st.custom.html : null });
    store.set("drafts", ds.slice(0, 40)); renderDrafts(); toast("Draft saved on this device.");
  }
  $("btnSave").addEventListener("click", saveDraft);
  $("draftList").addEventListener("click", e => {
    const ds = store.get("drafts", []);
    if (e.target.dataset.load) {
      const d = ds.find(x => x.id === e.target.dataset.load); if (!d) return;
      apply(d.f); st.paras = d.paras; st.subj = d.subj; st.pristine = d.pristine; st.wasLLM = d.wasLLM; setCustom(d.custom);
      run({ fast: true, skipDraft: !d.pristine || !!st.custom }); toast("Draft loaded."); location.hash = "#blockB";
    } else if (e.target.dataset.rm) { store.set("drafts", ds.filter(x => x.id !== e.target.dataset.rm)); renderDrafts(); }
  });
  $("btnExportAll").addEventListener("click", () => download("letter-studio-backup.json", "application/json", JSON.stringify({ drafts: store.get("drafts", []), kb: store.get("kb", []) }, null, 2)));
  $("btnImport").addEventListener("click", () => $("importFile").click());
  $("importFile").addEventListener("change", async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const j = JSON.parse(await file.text());
      if (Array.isArray(j.drafts)) store.set("drafts", [...j.drafts, ...store.get("drafts", [])].slice(0, 40));
      if (Array.isArray(j.kb)) store.set("kb", [...j.kb, ...store.get("kb", [])]);
      renderDrafts(); renderKB(); toast("Backup imported.");
    } catch (err) { toast("That file is not a valid backup."); }
    e.target.value = "";
  });

  /* ---------- settings ---------- */
  function fillCfg() {
    ["provider", "model", "baseUrl", "oModel", "gModel", "lang", "length"].forEach(k => { $(k).value = cfg[k]; });
    $("remember").checked = !!cfg.remember; $("animate").checked = !!cfg.animate; $("apiKey").value = getKey();
  }
  $("btnSettings").addEventListener("click", () => { fillCfg(); $("dlg").showModal(); });
  $("btnCloseCfg").addEventListener("click", () => $("dlg").close());
  $("btnSaveCfg").addEventListener("click", () => {
    ["provider", "model", "baseUrl", "oModel", "gModel", "lang", "length"].forEach(k => { cfg[k] = $(k).value.trim() || DEFAULT_CFG[k]; });
    cfg.remember = $("remember").checked; cfg.animate = $("animate").checked;
    store.set("cfg", cfg); setKey(cfg.provider, $("apiKey").value.trim(), cfg.remember); updateGroqBtn(); updateEngineUI();
    $("dlg").close(); toast(getKey() ? "Saved. Choose the AI model engine to use your key." : "Saved.");
  });
  $("provider").addEventListener("change", () => { $("apiKey").value = getKey($("provider").value); });
  $("btnClearKey").addEventListener("click", () => { setKey($("provider").value, "", false); updateGroqBtn(); $("apiKey").value = ""; toast("Key removed from this browser."); });

  /* ---------- theme, shortcuts, PWA ---------- */
  const applyTheme = t => { if (t) document.documentElement.setAttribute("data-theme", t); else document.documentElement.removeAttribute("data-theme"); };
  applyTheme(store.get("theme", null));
  $("btnTheme").addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    const next = cur === "dark" ? "light" : "dark"; applyTheme(next); store.set("theme", next);
  });
  document.addEventListener("keydown", e => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key === "Enter") { e.preventDefault(); st.pristine = true; run({}); }
    else if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); saveDraft(); }
    else if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(); }
    else if (e.key === "Escape" && !$("reveal").hidden) closeReveal();
  });
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => { /* offline cache is optional */ });

  /* ---------- love letters ---------- */
  const isLoveType = () => !!A.typeById($("sub").value).love;
  $("nicks").innerHTML = NICKNAMES.map(n => `<option value="${n}">`).join("");
  $("ilyLang").innerHTML = '<option value="">None</option>' + ILY.map(([l, t]) => `<option value="${esc(t)}">${l}: ${esc(t)}</option>`).join("");
  $("loveChips").innerHTML = Object.keys(LOVE).map(k => `<button type="button" class="lc" data-k="${k}" aria-pressed="false">${LOVE_LABELS[k]}</button>`).join("");
  function syncLoveChips() {
    const sel = ($("loveWords").value || "").split(",").filter(Boolean);
    document.querySelectorAll(".lc").forEach(b => b.setAttribute("aria-pressed", sel.includes(b.dataset.k) ? "true" : "false"));
    $("ilyLang").value = $("ily").value;
    if ($("ilyLang").value !== $("ily").value) $("ilyLang").value = "";
  }
  function syncLoveUI() { $("lovePanel").hidden = !isLoveType(); }
  function setLoveDefaults() {
    let ch = false;
    if ($("tone").value === "professional") { $("tone").value = "romantic"; ch = true; }
    if ($("lh").value === "classic") { $("lh").value = "rose"; ch = true; }
    if ($("sig").value === "typed") { $("sig").value = "script"; ch = true; }
    if (!$("loveWords").value) { $("loveWords").value = LOVE_DEFAULTS.join(","); ch = true; }
    syncLoveChips();
    return ch;
  }
  $("loveChips").addEventListener("click", e => {
    const b = e.target.closest(".lc"); if (!b) return;
    const sel = ($("loveWords").value || "").split(",").filter(Boolean);
    const i = sel.indexOf(b.dataset.k); if (i >= 0) sel.splice(i, 1); else sel.push(b.dataset.k);
    $("loveWords").value = sel.join(","); syncLoveChips();
    $("loveWords").dispatchEvent(new Event("input", { bubbles: true }));
  });
  $("ilyLang").addEventListener("change", () => { $("ily").value = $("ilyLang").value; $("ily").dispatchEvent(new Event("input", { bubbles: true })); });

  /* ---------- Groq key ---------- */
  function updateGroqBtn() {
    const has = !!getKey("groq");
    $("btnGroq").classList.toggle("on", has && cfg.provider === "groq");
    $("btnGroq").lastChild.textContent = has ? (cfg.provider === "groq" ? "Groq connected" : "Groq key saved") : "Add Groq key";
  }
  const gs = (m, c) => { $("gStatus").textContent = m; $("gStatus").className = "gstatus " + (c || ""); };
  function openGroq() {
    $("gKey").value = getKey("groq");
    const sel = $("gModelPick");
    if (![...sel.options].some(o => o.value === cfg.gModel)) sel.add(new Option(cfg.gModel, cfg.gModel));
    sel.value = cfg.gModel; $("gRemember").checked = !!cfg.remember; gs("");
    $("groqDlg").showModal();
  }
  ["btnGroq", "btnGroq2"].forEach(id => $(id).addEventListener("click", openGroq));
  $("gClose").addEventListener("click", () => $("groqDlg").close());
  $("gTest").addEventListener("click", async () => {
    const k = $("gKey").value.trim(); if (!k) { gs("Paste your key first.", "bad"); return; }
    gs("Testing the key...");
    try { const ids = await A.testGroqKey(k); gs(`Key works. ${ids.length} models available.`, "ok"); }
    catch (e) { gs("Key check failed: " + e.message, "bad"); }
  });
  $("gSave").addEventListener("click", () => {
    const k = $("gKey").value.trim(); if (!k) { gs("Paste your key first.", "bad"); return; }
    cfg.provider = "groq"; cfg.gModel = $("gModelPick").value; cfg.remember = $("gRemember").checked;
    store.set("cfg", cfg); setKey("groq", k, cfg.remember);
    $("engine").value = "llm"; $("groqDlg").close(); updateGroqBtn(); updateEngineUI();
    toast("Groq connected. Press Run agents to draft with it.");
  });

  /* ---------- tone lab ---------- */
  $("btnLab").addEventListener("click", async () => {
    $("btnLab").disabled = true;
    try {
      const res = await A.toneLab(collect(), { userDocs: store.get("kb", []) });
      $("labOut").innerHTML = res.map((r, i) => `<div class="labcard"><div><b>${esc(r.label)}</b>${i === 0 ? ' <span class="chip">top score</span>' : ""}<p>${esc(r.preview)}</p></div><div><div class="sc">${r.score}</div><button class="sec" data-use="${r.tone}">Use</button></div></div>`).join("");
    } catch (e) { toast("Tone lab failed: " + e.message); }
    finally { $("btnLab").disabled = false; }
  });
  $("labOut").addEventListener("click", e => {
    const t = e.target.dataset && e.target.dataset.use; if (!t) return;
    $("tone").value = t; $("tone").dispatchEvent(new Event("change", { bubbles: true })); toast("Tone switched.");
  });

  /* ---------- translate ---------- */
  $("btnTrans").addEventListener("click", async () => {
    const lang = $("transLang").value.trim(); if (!lang || !st.paras || guardEdits()) return;
    if (!getKey()) { toast("Add an API key first. Groq is free."); openGroq(); return; }
    $("btnTrans").disabled = true;
    try {
      const r = await A.refineLLM(cfg, getKey(), st.paras, `Translate every paragraph into ${lang}. Keep any [placeholders] in square brackets unchanged. Keep the meaning and tone.`);
      st.paras = r.paras; st.pristine = false; st.wasLLM = true;
      await run({ fast: true, skipDraft: true }); toast("Translated. The salutation and sign-off stay in English.");
    } catch (e) { toast("Translation failed: " + e.message); }
    finally { $("btnTrans").disabled = false; }
  });

  /* ---------- share link and session ---------- */
  const enc = o => btoa(unescape(encodeURIComponent(JSON.stringify(o))));
  const dec = t => JSON.parse(decodeURIComponent(escape(atob(t))));
  $("btnLink").addEventListener("click", async () => {
    if (!st.R) return;
    const link = location.href.split("#")[0] + "#s=" + encodeURIComponent(enc({ f: collect(), paras: st.paras, subj: st.subj, custom: st.custom ? st.custom.html : null })) + (st.R.type.love ? "&reveal=1" : "");
    try { await navigator.clipboard.writeText(link); toast(link.length > 6000 ? "Link copied, but it is long. Some apps may cut it off." : "Link copied. The letter travels inside the link itself."); }
    catch (e) { window.prompt("Copy this link", link); }
  });
  function loadFromHash() {
    const m = location.hash.match(/#s=([^&]+)/); if (!m) return false;
    try {
      const o = dec(decodeURIComponent(m[1]));
      apply({ ...o.f, engine: "auto" }); st.paras = o.paras; st.subj = o.subj || ""; st.pristine = false; st.lastLove = isLoveType(); setCustom(o.custom);
      const reveal = /reveal=1/.test(location.hash);
      run({ fast: true, skipDraft: true }).then(() => { if (reveal) openReveal(); });
      return true;
    } catch (e) { return false; }
  }
  function saveSession() { store.set("session", { f: collect(), paras: st.paras, subj: st.subj, pristine: st.pristine, wasLLM: st.wasLLM, custom: st.custom ? st.custom.html : null }); }
  function restoreSession() {
    const s = store.get("session", null); if (!s || !s.f) return false;
    apply(s.f); st.paras = s.paras; st.subj = s.subj || ""; st.pristine = s.pristine !== false; st.wasLLM = !!s.wasLLM; st.lastLove = isLoveType(); setCustom(s.custom);
    return true;
  }

  /* ---------- envelope reveal ---------- */
  function openReveal() {
    if (!st.R) return;
    const p = $("paper"), rp = $("revPaper");
    rp.className = p.className; rp.style.fontFamily = p.style.fontFamily; rp.style.setProperty("--z", "1.05"); rp.innerHTML = p.innerHTML;
    $("rstage").className = "rstage"; $("hearts").innerHTML = ""; $("tapHint").hidden = false;
    $("reveal").hidden = false; $("reveal").scrollTop = 0; $("envelope").focus();
  }
  function closeReveal() { $("reveal").hidden = true; }
  function unseal() {
    const stg = $("rstage"); if (stg.classList.contains("open")) return;
    stg.classList.add("open"); $("tapHint").hidden = true;
    setTimeout(() => {
      stg.classList.add("shown");
      if (st.R && st.R.type.love && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
        let out = ""; for (let i = 0; i < 22; i++) out += `<span style="left:${Math.random() * 100}%;font-size:${14 + Math.random() * 22}px;animation-delay:${Math.random() * 3}s">\u2665</span>`;
        $("hearts").innerHTML = out;
      }
    }, 800);
  }
  $("envelope").addEventListener("click", unseal);
  $("envelope").addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); unseal(); } });
  $("revClose").addEventListener("click", closeReveal);
  $("btnReveal").addEventListener("click", openReveal);

  /* ---------- follow-up reminder (.ics) ---------- */
  $("btnIcs").addEventListener("click", () => {
    if (!st.R) return;
    const p = n => String(n).padStart(2, "0");
    const local = x => `${x.getFullYear()}${p(x.getMonth() + 1)}${p(x.getDate())}T${p(x.getHours())}${p(x.getMinutes())}00`;
    const d = new Date(Date.now() + 7 * 864e5); d.setHours(9, 0, 0, 0);
    const end = new Date(d.getTime() + 30 * 6e4);
    const title = (st.R.subj || st.R.type.label).replace(/[\r\n,;]/g, " ");
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Letter Studio Pro//EN", "BEGIN:VEVENT", "UID:" + Date.now() + "@letter-studio-pro",
      "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z", "DTSTART:" + local(d), "DTEND:" + local(end),
      "SUMMARY:Follow up: " + title, "DESCRIPTION:Follow up on the letter you sent.", "BEGIN:VALARM", "TRIGGER:-PT10M", "ACTION:DISPLAY", "DESCRIPTION:Follow up", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    download(fileBase() + "-reminder.ics", "text/calendar", ics); toast("Reminder file downloaded. Open it to add it to your calendar.");
  });

  /* ---------- command palette ---------- */
  function commands() {
    const base = [["Run agents", () => { st.pristine = true; run({}); }], ["Compare all tones", () => $("btnLab").click()], ["Copy letter", () => $("btnCopy").click()],
      ["Download .txt", () => $("btnTxt").click()], ["Print or PDF", () => $("btnPrint").click()], ["Envelope reveal", () => $("btnReveal").click()],
      ["Copy share link", () => $("btnLink").click()], ["Save draft", saveDraft], ["Add Groq key", openGroq], ["Open settings", () => $("btnSettings").click()],
      ["Switch theme", () => $("btnTheme").click()], ["About the developer", () => { location.hash = "#about"; }], ["Focus request box", () => $("prompt").focus()]];
    const types = TYPES.map(t => ["Write a " + t.label.toLowerCase(), () => { $("sub").value = t.id; $("autoType").checked = false; $("sub").dispatchEvent(new Event("change", { bubbles: true })); location.hash = "#blockA"; }]);
    return base.concat(types);
  }
  let palSel = 0, palItems = [];
  function renderPal() {
    const q = $("palIn").value.trim().toLowerCase();
    palItems = commands().filter(c => !q || c[0].toLowerCase().includes(q)).slice(0, 9);
    palSel = Math.min(palSel, Math.max(0, palItems.length - 1));
    $("palList").innerHTML = palItems.map((c, i) => `<li data-i="${i}" aria-selected="${i === palSel}">${esc(c[0])}</li>`).join("") || "<li>No matches</li>";
  }
  function openPalette() { $("palIn").value = ""; palSel = 0; renderPal(); $("palette").showModal(); $("palIn").focus(); }
  function runPal(i) { const c = palItems[i]; if (!c) return; $("palette").close(); setTimeout(c[1], 50); }
  $("palIn").addEventListener("input", () => { palSel = 0; renderPal(); });
  $("palIn").addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { e.preventDefault(); palSel = Math.min(palItems.length - 1, palSel + 1); renderPal(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); palSel = Math.max(0, palSel - 1); renderPal(); }
    else if (e.key === "Enter") { e.preventDefault(); runPal(palSel); }
  });
  $("palList").addEventListener("click", e => { const li = e.target.closest("li"); if (li && li.dataset.i) runPal(+li.dataset.i); });
  $("btnPalette").addEventListener("click", openPalette);

  /* ---------- mobile tab bar, footer year ---------- */
  $("year").textContent = new Date().getFullYear();
  if ("IntersectionObserver" in window) {
    const tabs = [...document.querySelectorAll("#tabbar a")];
    const io = new IntersectionObserver(es => {
      es.forEach(en => { if (en.isIntersecting) tabs.forEach(t => t.classList.toggle("on", t.dataset.s === en.target.id)); });
    }, { rootMargin: "-35% 0px -55% 0px" });
    tabs.forEach(t => { const el = document.getElementById(t.dataset.s); if (el) io.observe(el); });
  }

  /* ---------- init ---------- */
  renderKB(); renderDrafts(); applyZoom(); updateEngineUI(); updateGroqBtn();
  if (!loadFromHash()) { const had = restoreSession(); run({ fast: true, skipDraft: had && !!st.paras }); }
})();
