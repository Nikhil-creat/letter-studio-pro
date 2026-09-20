# Letter Studio Pro

An agentic letter writer that runs entirely in the browser. Six agents hand your letter along, review it, and lay it out. No build step, no server, no dependencies.

## What it does

- **Six agents**: Intent (picks the letter type from your plain-words request and fills recipient details), Retrieve (TF-IDF search over built-in conventions and your own sample letters), Draft (built-in templates, or an AI model with your own key), Comply (privacy and legal advisories, plus a check for numbers the model invented), Critic (scores the letter and fixes what it can in a self-review loop), Layout (page fill, balance, fonts).
- **28 letter types** across corporate, academic, legal/official, personal and love categories, with six tones.
- **Live preview** with four letterhead styles, full or modified block layout, zoom and a script signature.
- **Export**: copy, .txt, .html, .doc, print or PDF, share sheet, email, read aloud.
- **Love letters**: love letter, anniversary, missing you and marriage proposal types with a "Lovable words" panel. Tap the feelings you want (your smile, feels like home, forever, and more), add a pet name, choose how gentle or passionate to sound, and add "I love you" in Hindi, Telugu, Tamil, Malayalam, Bengali, Urdu, Spanish, French, Italian or Japanese. A rose letterhead and script signature are applied automatically.
- **Envelope reveal**: an animated sealed envelope that opens to show the letter. "Copy share link" makes a link that opens straight into the envelope for the person you send it to. The letter travels inside the link itself, so nothing is uploaded anywhere.
- **Tone lab** (ranks the letter in every tone), **emotion radar** (warmth, formality, urgency, confidence), **command palette** (Ctrl or Cmd + K), **translate** (needs an AI key), **follow-up reminder** (.ics calendar file), and automatic session restore.
- **Extras**: voice dictation, knowledge base of your own letters, saved drafts with backup and restore, light and dark themes, offline support (installable as an app).

## Project files

```
index.html     page shell
style.css      styling
kb.js          letter types, conventions and templates (edit to add your own)
agents.js      the agent pipeline
app.js         interface logic
sw.js          offline cache
manifest.json  install-as-app settings
icon.svg       app icon
```

All files sit in one flat folder, so uploading is simple.

## Publish on GitHub Pages (no git needed)

1. Sign in at github.com. On a phone, open it in your browser and switch to "Desktop site" if the upload button is missing.
2. Tap **+ > New repository**. Name it, for example, `letter-studio-pro`. Set it to **Public**. Tap **Create repository**.
3. On the new repository page choose **uploading an existing file** (or **Add file > Upload files**).
4. Select all the project files (`index.html`, `style.css`, `kb.js`, `agents.js`, `app.js`, `sw.js`, `manifest.json`, `icon.svg`, `README.md`). If you have the .zip, extract it first because GitHub does not unzip uploads.
5. `index.html` must be at the top level of the repository, not inside a subfolder. Tap **Commit changes**.
6. Go to **Settings > Pages**. Under **Build and deployment**, set **Source** to **Deploy from a branch**, **Branch** to `main`, folder `/ (root)`, then **Save**.
7. Wait one to two minutes and refresh the Pages screen. It shows your address:

   `https://YOUR-USERNAME.github.io/letter-studio-pro/`

## Publish with git (command line)

```bash
cd letter-studio-pro
git init
git add .
git commit -m "Letter Studio Pro"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/letter-studio-pro.git
git push -u origin main
```

Then do step 6 above. To update later: edit files, `git add . && git commit -m "Update" && git push`.

## Add a free Groq key (fast AI drafting)

Groq offers a free tier with fast Llama models and no credit card. Free-tier limits can change, so check console.groq.com for current numbers.

1. Open **console.groq.com/keys**, sign in, and choose **Create API key**. Copy it (it starts with `gsk_`).
2. In Letter Studio, tap **Add Groq key** at the top (or **Free Groq key** in the request box).
3. Paste the key, tap **Test key**, then **Save and use Groq**.
4. The drafting engine switches to the AI model. Press **Run agents**.

The default model is `llama-3.3-70b-versatile`. Pick a faster or different one in the same dialog, or type any Groq model name under **Settings**. If a model name stops working, choose another from Groq's model list.

Claude and other OpenAI-compatible providers also work from **Settings**. Each provider keeps its own key.

**Key safety.** The key is stored only in the visitor's own browser (session storage unless "Remember" is ticked) and is sent only to the provider. Never put a key in the source files or commit it to GitHub. Because GitHub Pages is static, anyone using your public site needs their own key. For a shared public app, put a small proxy server (for example a Cloudflare Worker) in front of the API and point the OpenAI-compatible endpoint at it.

## Customize

- Add or edit letter types in `kb.js` (copy an existing `T("id", ...)` entry).
- Add tones in the `TONES` object in `kb.js`, and add lovable phrases in the `LOVE` object.
- Adjust the review rules in the `critique` function in `agents.js`.
- After changing files, edit the `CACHE` name in `sw.js` (for example `v2`) so returning visitors get the new version.

## Troubleshooting

- **404 page**: `index.html` is not at the repository root, or Pages is not enabled yet. Recheck steps 5 and 6.
- **Page loads unstyled or blank**: a file was missed in the upload. All eight code and asset files must be present with exactly these names.
- **Old version still showing**: hard refresh, or bump `CACHE` in `sw.js`.
- **AI draft fails**: check the key with **Test key**, the model name, and that the provider allows browser requests. The app falls back to the built-in template and tells you why.

Licensed for you to use, modify and share as you like.
