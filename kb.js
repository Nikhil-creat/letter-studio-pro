/* Letter Studio Pro: built-in letter taxonomy, conventions and templates.
   Edit this file to add your own letter types. */
(function (root) {
  const GROUPS = [
    "Formal: Corporate and Business",
    "Formal: Academic and Institutional",
    "Formal: Legal, Official and Professional",
    "Informal: Personal and Social",
    "Informal: Love and Romance"
  ];

  const TONES = {
    professional: { label: "Professional", vibe: "Polished, neutral, courteous", cta: "I would appreciate your response at your earliest convenience.", words: ["appreciate", "kindly", "regards", "consideration", "convenience", "please"] },
    authoritative: { label: "Authoritative", vibe: "Firm, direct, decisive", cta: "I expect a written response within ten business days.", words: ["expect", "require", "must", "immediately", "failing", "deadline"] },
    empathetic: { label: "Empathetic", vibe: "Warm, considerate, human", cta: "Thank you sincerely for your understanding and care in considering this.", words: ["understand", "sincerely", "grateful", "care", "hope", "sorry", "appreciate"] },
    persuasive: { label: "Persuasive", vibe: "Confident, benefit-led", cta: "I am confident this will benefit us both, and I would welcome the chance to discuss it further.", words: ["confident", "benefit", "opportunity", "value", "ensure", "together", "welcome"] },
    romantic: { label: "Romantic", vibe: "Tender, heartfelt, devoted", cta: "Until we meet again, my heart is yours.", words: ["love", "heart", "cherish", "forever", "adore", "miss", "yours"] },
    conversational: { label: "Conversational", vibe: "Relaxed, natural", cta: "Let me know what you think. I'm always happy to talk it through.", words: ["let me know", "happy", "thanks", "chat", "!"] }
  };

  const CLOSES = ["Sincerely", "Yours faithfully", "Respectfully yours", "Regards", "Warmly", "Best regards", "Cheers", "With deepest sympathy", "With all my love", "Yours forever", "Always yours"];

  const O = v => v.org || "your organization";
  const D = (v, t) => v.d || t;

  // id, group, label, formal, keywords, default sign-off, default subject,
  // vocabulary, rule, structure, phrases to avoid, paragraph generator
  const T = (id, g, label, formal, kw, close, subj, vocab, rule, struct, avoid, p) =>
    ({ id, g, label, formal, kw, close, subj, vocab, rule, struct, avoid, p });

  const TYPES = [
    T("cover", 0, "Cover letter", 1, "job,apply,application,position,role,cover,hiring,vacancy,internship", "Sincerely", "Application for [Position]",
      ["enthusiasm", "qualifications", "contribution", "resume"], "Open with the role, evidence two or three relevant achievements, close with a call to action.",
      "role and interest, evidence, call to action", ["to whom it may concern", "hard worker", "team player", "go-getter"],
      v => [`I am writing to express my interest in the position advertised by ${O(v)}. With my background and enthusiasm for the role, I believe I can make a meaningful contribution to your team.`,
        D(v, "[Summarize your most relevant experience, skills and achievements here.]"),
        `I have enclosed my resume for your review. ${v.cta}`]),

    T("resign", 0, "Resignation", 1, "resign,resignation,quit,notice period,leaving job,last day,two weeks", "Sincerely", "Resignation: [Your Name], [Position]",
      ["formal notice", "effective", "handover", "gratitude"], "State the decision and last working day first, stay gracious, offer a smooth transition.",
      "decision and date, gratitude, handover", ["hate", "worst", "fed up"],
      v => [`Please accept this letter as formal notice of my resignation from my position at ${O(v)}, effective [last working day].`,
        D(v, "I am grateful for the opportunities and support I have received during my time here. I will do everything possible to ensure a smooth handover of my responsibilities."),
        `Thank you for the experience and guidance. ${v.cta}`]),

    T("proposal", 0, "Business proposal", 1, "proposal,propose,pitch,partnership,project plan,quotation,collaborate", "Sincerely", "Proposal: [Project Name]",
      ["objective", "scope", "deliverables", "timeline"], "Lead with the problem and the value, outline scope, timeline and next steps.",
      "problem and value, scope, next steps", ["cheap", "best in the world"],
      v => [`I am pleased to submit the following proposal for the consideration of ${O(v)}.`,
        D(v, "[Describe the objective, scope, timeline, budget and expected benefits.]"),
        `I would be glad to walk you through the details. ${v.cta}`]),

    T("complaint", 0, "Complaint", 1, "complain,complaint,poor service,refund,defective,dissatisfied,unacceptable,faulty", "Yours faithfully", "Complaint regarding [Product, Service or Order No.]",
      ["regret", "unsatisfactory", "resolution", "remedy"], "State facts in order, name the remedy you want, set a deadline, stay factual.",
      "facts, remedy sought, deadline", ["idiot", "useless", "disgusting", "scam"],
      v => ["I am writing to formally raise a concern that requires your prompt attention.",
        D(v, "[Describe what happened, when, and any reference numbers.]"),
        `I request a satisfactory resolution of this matter. ${v.cta}`]),

    T("terminate", 0, "Termination", 1, "terminate,termination,dismiss,fire,layoff,end employment,let go", "Respectfully yours", "Notice of Termination of Employment",
      ["effective date", "final settlement", "company property", "confidential"], "Be unambiguous and brief. Give the effective date, final pay and return-of-property steps.",
      "decision and date, settlement, next steps", ["unfortunately we hate", "lazy"],
      v => [`This letter serves as formal notice that your employment with ${O(v)} will end effective [date].`,
        D(v, "This decision is based on [reason]. Please return all company property by the effective date. Your final compensation will be processed in line with company policy."),
        `Please contact Human Resources with any questions. ${v.cta}`]),

    T("memo", 0, "Executive memo", 1, "memo,memorandum,internal,team update,announcement,circular", "Regards", "Memo: [Topic]",
      ["effective immediately", "action required", "summary", "stakeholders"], "Bottom line first. List the actions and state owners and dates.",
      "bottom line, context, actions", [],
      v => ["This memo is to inform you of the following matter.",
        D(v, "[State the key update, the reason, and the impact on the team.]"),
        `Action required: [owner and due date]. ${v.cta}`]),

    T("offer", 0, "Job offer", 1, "offer,job offer,appointment,hire,selected,joining,onboarding", "Sincerely", "Offer of Employment: [Position]",
      ["pleased to offer", "commencing", "compensation", "acceptance"], "Lead with the offer, list terms clearly, give an acceptance deadline.",
      "offer, terms, acceptance deadline", ["guarantee"],
      v => [`On behalf of ${O(v)}, I am pleased to offer you the position of [Position], starting on [start date].`,
        D(v, "[Compensation, reporting line, work location, benefits and any conditions of this offer.]"),
        `Please confirm your acceptance by [date]. ${v.cta}`]),

    T("sponsor", 0, "Sponsorship or donation request", 1, "sponsor,sponsorship,donation,fundraising,charity,support our event", "Sincerely", "Request for Support: [Event or Cause]",
      ["impact", "partnership", "recognition", "contribution"], "Explain the cause briefly, quantify the impact, state exactly what you are asking for and what the supporter receives.",
      "cause, impact, specific ask", ["desperate", "beg"],
      v => [`I am writing on behalf of [Organization or Event] to seek the support of ${O(v)}.`,
        D(v, "[Describe the cause, who benefits, the amount or type of support requested, and how supporters will be recognised.]"),
        `Your contribution would make a real difference. ${v.cta}`]),

    T("recommend", 1, "Recommendation letter", 1, "recommend,recommendation,reference,endorse,referee,testimonial", "Sincerely", "Letter of Recommendation for [Candidate Name]",
      ["exceptional", "capacity", "potential", "without reservation"], "State your relationship and how long you have known them, give concrete examples, end with a clear endorsement.",
      "relationship, examples, endorsement", ["perfect", "flawless"],
      v => [`I am writing to recommend [Candidate Name] to ${O(v)}. I have known them in my capacity as ${v.title || "[your role]"}.`,
        D(v, "[Describe their strengths, achievements and character with specific examples.]"),
        `I recommend them without reservation. ${v.cta}`]),

    T("scholar", 1, "Scholarship application", 1, "scholarship,fellowship,grant,financial aid,funding,bursary,stipend", "Sincerely", "Application for [Scholarship Name]",
      ["merit", "aspiration", "commitment", "opportunity"], "Link achievements to the award's criteria. Show need, goals and gratitude.",
      "eligibility, achievements, goals", ["deserve it more than"],
      v => [`I am writing to apply for the scholarship offered by ${O(v)}. I am committed to my studies and would be honored to be considered.`,
        D(v, "[Describe your academic record, achievements, financial circumstances and goals.]"),
        `I have enclosed the required documents. ${v.cta}`]),

    T("leave", 1, "Leave request", 1, "leave,absence,day off,vacation,holiday request,sick leave,medical leave,time off", "Sincerely", "Request for Leave from [Start Date] to [End Date]",
      ["kindly grant", "period", "resume duties", "arrangements"], "State dates and reason briefly. Mention coverage. Be polite and concise.",
      "dates, reason, coverage", [],
      v => ["I am writing to request leave from [start date] to [end date].",
        D(v, "[Reason for leave, and how your responsibilities will be covered.]"),
        `I will resume my duties on [return date]. ${v.cta}`]),

    T("appeal", 1, "Admission appeal", 1, "appeal,admission,rejected,reconsider,denied,waitlist,decision review", "Respectfully yours", "Appeal for Reconsideration of Admission Decision",
      ["reconsideration", "new information", "commitment", "respectfully"], "Be respectful, present new evidence, avoid blame, restate your commitment.",
      "request, new evidence, commitment", ["unfair", "biased"],
      v => [`I respectfully request that ${O(v)} reconsider its recent admission decision regarding my application.`,
        D(v, "[Present new information, updated results or circumstances the committee did not previously see.]"),
        `Thank you for taking the time to review this appeal. ${v.cta}`]),

    T("peer", 1, "Peer review response", 1, "peer review,reviewer,manuscript,journal,revision,rebuttal,editor", "Sincerely", "Response to Reviewers: Manuscript [ID]",
      ["revised", "addressed", "clarified", "we thank"], "Thank the reviewers, answer each point in order, mark changes by page or line.",
      "thanks, point-by-point replies, changes", ["wrong", "misunderstood"],
      v => [`We thank the editor and reviewers of ${O(v)} for their careful and constructive feedback.`,
        D(v, "[Respond point by point: Reviewer 1 comment, then your response, then the change made.]"),
        `We hope the revised manuscript now meets the journal's standards. ${v.cta}`]),

    T("notice", 2, "Notice of action", 1, "notice,legal notice,cease,demand,breach,eviction,default,formal warning", "Respectfully yours", "Formal Notice: [Matter or Reference No.]",
      ["hereby", "pursuant to", "failing which", "without prejudice"], "Cite the basis, state the demand and the deadline, reserve your rights.",
      "basis, demand, deadline, reservation of rights", ["threaten", "destroy"],
      v => [`This letter serves as formal notice to ${O(v)} regarding the matter referenced above.`,
        D(v, "[State the facts, the legal or contractual basis, and the action required by [date].]"),
        `Failing compliance, I reserve the right to pursue all available remedies. ${v.cta}`]),

    T("inquiry", 2, "Legal inquiry", 1, "lawyer,attorney,legal advice,legal inquiry,counsel,solicitor,consultation", "Yours faithfully", "Inquiry regarding [Legal Matter]",
      ["seeking advice", "consultation", "jurisdiction", "retainer"], "Summarize the matter neutrally, list your questions, ask about fees and availability.",
      "summary, questions, fees and availability", [],
      v => [`I am writing to enquire whether ${O(v)} could advise me on a legal matter.`,
        D(v, "[Summarize the facts, relevant dates and your specific questions.]"),
        `I would welcome an initial consultation. ${v.cta}`]),

    T("gov", 2, "Government correspondence", 1, "government,ministry,municipal,tax,license,permit,rti,official request,authority,passport", "Yours faithfully", "Request regarding [Subject or Application No.]",
      ["kindly", "request", "reference", "necessary action"], "Cite reference numbers, keep to one request, close courteously.",
      "reference, single request, courtesy", ["bribe", "urgent!!!"],
      v => [`I write to bring the following matter to the kind attention of ${O(v)}.`,
        D(v, "[State your request, cite the relevant reference or section, and attach evidence.]"),
        `I shall be grateful for the necessary action. ${v.cta}`]),

    T("diplomatic", 2, "Diplomatic note", 1, "diplomatic,embassy,consulate,ambassador,note verbale,bilateral", "Respectfully yours", "Note Regarding [Subject]",
      ["has the honour", "avails itself", "highest consideration", "bilateral"], "Use a ceremonial register and third-person phrasing. End with an assurance of highest consideration.",
      "honorific opening, message, courtesy close", ["hey", "gonna"],
      v => [`The undersigned has the honour to address ${O(v)} regarding the matter referenced above.`,
        D(v, "[State the position, request or communication in measured, ceremonial language.]"),
        `The undersigned avails itself of this opportunity to renew the assurances of its highest consideration. ${v.cta}`]),

    T("thanks", 3, "Thank-you note", 0, "thank,thanks,grateful,appreciate,gift,thank you", "Warmly", "",
      ["grateful", "meant a lot", "thoughtful", "appreciate"], "Be specific about what you are thanking them for and what it meant.",
      "thanks, specific detail, warm close", [],
      v => ["Thank you so much. I truly appreciate it.",
        D(v, "[Mention exactly what they did or gave, and how it helped or made you feel.]"),
        `It meant a lot to me. ${v.cta}`]),

    T("invite", 3, "Invitation", 0, "invite,invitation,party,wedding,celebration,join us,rsvp,housewarming", "Best regards", "",
      ["delighted", "join us", "celebrate", "RSVP"], "Give the what, when, where and RSVP details clearly in the first lines.",
      "occasion, logistics, RSVP", [],
      v => ["I'd love for you to join us for a special occasion.",
        D(v, "[Event, date, time, venue and dress code.]"),
        `Please let me know if you can make it. ${v.cta}`]),

    T("condolence", 3, "Condolence", 0, "condolence,passed away,sympathy,loss,funeral,grief,sorry for your loss,bereavement", "With deepest sympathy", "",
      ["deeply sorry", "thinking of you", "cherish", "comfort"], "Keep it short and sincere. Acknowledge the loss, offer support, avoid cliches.",
      "acknowledgement, memory, offer of support", ["at least", "everything happens for a reason"],
      v => ["I was deeply saddened to hear of your loss, and my heart is with you.",
        D(v, "[Share a brief, sincere memory or what they meant to you.]"),
        "Please know I am here for you, in any way that would help."]),

    T("congrats", 3, "Congratulations", 0, "congratulations,congrats,promotion,graduation,achievement,new job,well done,new baby", "Cheers", "",
      ["thrilled", "well-deserved", "proud", "celebrate"], "Lead with the news, praise the effort, end with a warm wish.",
      "news, praise, wish", [],
      v => ["Congratulations! I was thrilled to hear your wonderful news.",
        D(v, "[Mention the achievement and the hard work behind it.]"),
        `This is so well deserved. ${v.cta}`]),

    T("update", 3, "Casual update", 0, "update,catch up,news,how are you,friend,family,miss you,long time", "Cheers", "",
      ["lately", "can't wait", "miss", "catch up"], "Open with a personal line, share two or three updates, ask about them.",
      "greeting, updates, question back", [],
      v => ["I hope this finds you well! It feels like ages since we last caught up.",
        D(v, "[Share your news: what you've been up to, and something fun.]"),
        `How are things with you? ${v.cta}`]),

    T("holiday", 3, "Holiday greeting", 0, "holiday,christmas,diwali,eid,new year,festival,season's greetings,greeting,pongal,holi", "Warmly", "",
      ["joyful", "season", "wishing you", "blessings"], "Warm, brief and personal. Mention one shared memory or a hope for the year ahead.",
      "greeting, memory, wish", [],
      v => ["Wishing you and your loved ones a joyful and peaceful holiday season.",
        D(v, "[Add a personal memory, or your hope for the year ahead.]"),
        `Sending you my warmest wishes. ${v.cta}`]),

    T("apology", 3, "Apology", 0, "apology,apologize,apologise,sorry,forgive,my mistake,make amends", "Warmly", "",
      ["sincerely sorry", "responsibility", "make it right", "forgive"], "Own the mistake without excuses, say what you will do differently, give them space.",
      "ownership, repair, space", ["but you", "if you were offended"],
      v => ["I want to say how truly sorry I am.",
        D(v, "[Say plainly what you did wrong, and how you understand it affected them.]"),
        `I hope we can move forward. ${v.cta}`])
  ];


  /* ---------- Love letters: lovable words that express feelings ---------- */
  const LOVE = {
    smile: "Your smile is my favourite view in the whole world.",
    laugh: "Your laughter is the sound I would choose over any music.",
    cherish: "I cherish every moment we share, ordinary or extraordinary.",
    missing: "I miss you most in the quiet moments, when the world slows down and you are not beside me.",
    grateful: "I am so grateful that life led me to you.",
    home: "With you, I feel at home, wherever we are.",
    safe: "You make me feel safe, seen and completely myself.",
    forever: "I want to build a future with you, one shared dream at a time.",
    sunshine: "You are my sunshine on even the cloudiest days.",
    butterflies: "Even now, you give me butterflies.",
    bestfriend: "You are my best friend and my greatest love.",
    promise: "I promise to stand by you, to listen, and to choose you again every day.",
    kindness: "Your kindness is the most beautiful thing about you.",
    heartbeat: "My heart beats a little faster whenever your name lights up my phone.",
    stars: "If I could, I would give you the moon and every star, but for now I give you my heart."
  };
  const LOVE_LABELS = { smile: "Your smile", laugh: "Your laugh", cherish: "Cherish", missing: "Missing you", grateful: "Grateful", home: "You feel like home", safe: "Safe with you", forever: "Forever", sunshine: "Sunshine", butterflies: "Butterflies", bestfriend: "Best friend", promise: "Promise", kindness: "Your kindness", heartbeat: "Heartbeat", stars: "Moon and stars" };
  const LOVE_DEFAULTS = ["smile", "cherish", "grateful", "promise"];
  const NICKNAMES = ["my love", "sweetheart", "darling", "my heart", "my sunshine", "jaan", "priya", "my everything"];
  const ILY = [["Hindi", "Mujhe tumse pyaar hai"], ["Telugu", "Nenu ninnu premistunnanu"], ["Tamil", "Naan unnai kaadhalikkiren"], ["Malayalam", "Njan ninne snehikkunnu"], ["Bengali", "Ami tomake bhalobashi"], ["Urdu", "Mujhe tumse mohabbat hai"], ["Spanish", "Te amo"], ["French", "Je t'aime"], ["Italian", "Ti amo"], ["Japanese", "Aishiteru"]];
  const LOVE_CLOSE = {
    romantic: "Until we meet again, my heart is yours.",
    conversational: "Text me when you read this. I will be smiling.",
    empathetic: "Whatever comes, I am here for you.",
    persuasive: "Give us your heart, and I will spend every day proving it was the right choice.",
    professional: "With complete sincerity, I mean every word.",
    authoritative: "Believe this: I mean every word."
  };
  const loveCore = v => {
    if (v.d) return v.d;
    const s = (v.sel || []).map(k => LOVE[k]).filter(Boolean);
    return s.length ? s.join(" ") : "[Write what you feel: what you love about them, a memory you treasure, what they mean to you.]";
  };
  const pick = (v, arr) => arr[Math.min(2, Math.max(0, (v.intensity || 2) - 1))];
  const loveEnd = (v, line) => `${line} ${LOVE_CLOSE[v.toneId] || LOVE_CLOSE.romantic}`;
  const ily = v => (v.ily ? ` In my heart's own words: ${v.ily}.` : "");
  const L = (...a) => Object.assign(T(...a), { love: 1 });
  const nk = v => v.nick || "my love";

  TYPES.push(
    L("love", 4, "Love letter", 0, "love,romantic,girlfriend,boyfriend,wife,husband,crush,sweetheart,heart,love letter,partner", "With all my love", "",
      ["adore", "cherish", "my heart", "forever"], "Be specific and sincere. Name what you love about them, use warm images, and finish with a promise or a wish.",
      "warm opening, what you love, a promise", ["you belong to me", "i own you", "you owe me"],
      v => [pick(v, ["Every day with you feels a little brighter, and today I wanted to put that into words.", "There are feelings that do not fit into a text message, so I am writing them down for you.", "My heart has been so full of you that I could not let another day pass without telling you everything it holds."]),
        loveCore(v),
        loveEnd(v, `I love you, ${nk(v)}, more than these words can hold.${ily(v)}`)]),
    L("anniv", 4, "Anniversary letter", 0, "anniversary,years together,our day,celebrate us,milestone", "Yours forever", "",
      ["another year", "together", "grateful", "always"], "Look back on a moment you treasure, name what has grown, look forward together.",
      "memory, growth, future", [],
      v => [pick(v, ["Another year together, and I am still so happy it is you.", "Another year together, and I find I fall for you all over again.", "Another year of you, and my heart has never been more certain."]),
        loveCore(v),
        loveEnd(v, `Happy anniversary, ${nk(v)}. Here is to every year still ahead of us.${ily(v)}`)]),
    L("missyou", 4, "Missing you (long distance)", 0, "miss you,long distance,far away,apart,until we meet,homesick", "Always yours", "",
      ["miss", "distance", "counting the days", "soon"], "Make the distance feel small: share a small daily detail, say what you miss, and name a day you look forward to.",
      "distance, small details, reunion", [],
      v => [pick(v, ["The distance between us feels smaller when I write to you.", "The distance between us feels smaller when I write to you, and bigger when I think of you.", "Every mile between us has taught me how much of my heart already lives with you."]),
        loveCore(v),
        loveEnd(v, `I am counting the days until I see you, ${nk(v)}.${ily(v)}`)]),
    L("propose", 4, "Marriage proposal letter", 0, "propose,proposal,marry me,marriage,engagement,will you marry", "Yours forever", "",
      ["forever", "spend my life", "partner", "yes"], "Tell the story of why them, be honest about your hopes, and ask the question clearly at the end.",
      "why them, shared future, the question", [],
      v => [`${nk(v).charAt(0).toUpperCase() + nk(v).slice(1)}, there is a question my heart has been asking for a very long time.`,
        loveCore(v),
        loveEnd(v, `Will you marry me, and make every tomorrow ours?${ily(v)}`)])
  );

  const api = { GROUPS, TONES, TYPES, CLOSES, LOVE, LOVE_LABELS, LOVE_DEFAULTS, NICKNAMES, ILY };
  root.LS_DATA = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
