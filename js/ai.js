// Optional Claude features. The API key is typed into Settings and stays in this browser only.
// Every prompt carries the same rule: use ONLY Mason's verified data; never invent.

const SDK_URL = "https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk/+esm";

const NO_HALLUCINATION = `You help Mason Ngo, a 10th-grade high school student, with resumes and interview prep.
Hard rules:
- Use ONLY facts from MASON'S VERIFIED DATA below or from answers Mason typed. Never invent projects, jobs, metrics, tools, or results.
- Never add "likely", "probably", or assumed achievements. Never turn one fact into several bigger claims.
- If something needed isn't in the data, say it's missing instead of filling the gap.`;

const AI = {
  _client: null,
  _key: null,

  enabled() {
    return !!getSettings().apiKey;
  },

  async client() {
    const { apiKey } = getSettings();
    if (!apiKey) throw new Error("Add your Claude API key in Settings to use AI features.");
    if (!this._client || this._key !== apiKey) {
      const { default: Anthropic } = await import(SDK_URL);
      this._client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
      this._key = apiKey;
    }
    return this._client;
  },

  dataBlock() {
    const bank = getBank();
    const resume = resumeToText(buildResume(null, bank, { phone: "" }));
    const answers = bank.answers
      .filter((a) => a.answer.trim())
      .map((a) => `Q (${a.skillId}): ${a.question}\nA: ${a.answer}`)
      .join("\n\n");
    return `MASON'S VERIFIED DATA\n${resume}\n\nHobbies: ${PROFILE.hobbies.join(", ")}\n\nMASON'S OWN SKILL BANK ANSWERS\n${answers || "(none yet)"}`;
  },

  async ask(prompt, { effort = "low", maxTokens = 4000, webSearch = false } = {}) {
    const client = await this.client();
    const { model } = getSettings();
    const params = {
      model,
      max_tokens: maxTokens,
      system: NO_HALLUCINATION + "\n\n" + this.dataBlock(),
      messages: [{ role: "user", content: prompt }],
      output_config: { effort },
    };
    if (webSearch) params.tools = [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }];

    let msg;
    // Server tools can pause a long turn; send it back to let Claude continue.
    for (let i = 0; i < 4; i++) {
      try {
        msg =
          model === "claude-opus-5"
            ? await client.beta.messages.create({ ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" })
            : await client.messages.create(params);
      } catch (e) {
        const friendly = {
          401: "Your Claude API key was rejected — check it in Settings.",
          403: "This API key doesn't have access to that model — try Sonnet 5 in Settings.",
          429: "Too many requests right now — wait a minute and try again.",
          529: "Claude is overloaded right now — try again in a minute.",
        }[e.status];
        throw new Error(friendly || (e.status >= 500 ? "Claude's servers had a problem — try again." : e.status ? `Request failed (${e.status}).` : "Couldn't reach Claude — check your internet connection."));
      }
      if (msg.stop_reason !== "pause_turn") break;
      params.messages = [...params.messages, { role: "assistant", content: msg.content }];
    }
    if (msg.stop_reason === "refusal") throw new Error("Claude declined this request.");
    return msg.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
  },

  parseJSON(text, fallback) {
    const m = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    try {
      return JSON.parse(m ? m[1] : text);
    } catch {
      return fallback;
    }
  },

  async skillQuestions(skill, existing) {
    const text = await this.ask(
      `Write 4 new interview-style questions that will help Mason prove the skill "${skill.name}" on a resume.
Each question should pull out a concrete, verifiable detail (what he did, a number, a result) tied to his real projects/jobs where relevant.
Do not repeat these existing questions:\n${existing.map((q) => "- " + q).join("\n")}
Return ONLY a JSON array of 4 strings.`
    );
    const qs = this.parseJSON(text, []);
    return Array.isArray(qs) ? qs.filter((q) => typeof q === "string").slice(0, 4) : [];
  },

  async draftBullet(skill, itemLabel, qa) {
    return (
      await this.ask(
        `Draft ONE resume bullet (max 25 words, starts with a strong past- or present-tense verb, no period) showing the skill "${skill.name}" for: ${itemLabel}.
Use ONLY facts stated in these answers Mason wrote. If an answer has a number, keep it exact. If the answers don't contain enough to write an honest bullet, reply exactly: NOT ENOUGH INFO — then one sentence saying what's missing.

${qa.map((x) => `Q: ${x.question}\nA: ${x.answer}`).join("\n\n")}

Reply with the bullet text only.`
      )
    ).trim();
  },

  async scoreAnswer(question, answer) {
    return this.ask(
      `Interview question: "${question}"
Mason's answer: """${answer}"""

Score it 1-10 for a high school internship interview. Give:
1. Score and one-line verdict
2. What worked (2 bullets)
3. What to fix, using the STAR method (Situation, Task, Action, Result) (2-3 bullets)
4. A tightened version that uses ONLY facts already in his answer or his verified data — mark anything missing as [add your real number here] instead of inventing it.
Keep it under 250 words.`,
      { effort: "medium" }
    );
  },

  async findRoles(company) {
    const text = await this.ask(
      `Search the web for current or upcoming internship / job / program openings at "${company}" (Sep 2026 onward).
Mason is in 10th grade (Class of 2029), turns 16 in ${PROFILE.turns16}, lives in Rancho Santa Fe (San Diego County), California. His work authorization isn't stated — don't assume it.
For each real opening you find in search results, decide eligibility:
- "eligible": open to 10th graders / high schoolers at his age now
- "soon": high school program he'll qualify for later (age 16, or junior/senior)
- "ineligible": college-only, 18+, or residency he doesn't meet
Include college-only roles marked ineligible so he knows. NEVER invent a role; only list ones in your search results, with the URL you found.
Return ONLY a JSON array (max 6) of objects:
{"title": str, "type": str (paid/unpaid, location, timing), "category": "tech"|"finance"|"community", "status": "eligible"|"soon"|"ineligible", "reason": str, "url": str, "keywords": [{"term": str, "required": bool}] (5-9 skills the posting screens for)}
If you find nothing, return [].`,
      { effort: "medium", maxTokens: 16000, webSearch: true }
    );
    const roles = this.parseJSON(text, []);
    if (!Array.isArray(roles)) return [];
    return roles.map((r) => ({
      id: "ai-" + uid(),
      title: String(r.title || "Untitled role"),
      type: String(r.type || ""),
      category: ["tech", "finance", "community"].includes(r.category) ? r.category : "community",
      url: r.url,
      eligibility: { status: ["eligible", "soon", "ineligible"].includes(r.status) ? r.status : "ineligible", reason: String(r.reason || "") },
      keywords: (r.keywords || []).map((k) => ({ term: String(k.term), any: [String(k.term).toLowerCase()], req: !!k.required })),
    }));
  },

  async postingKeywords(posting) {
    const text = await this.ask(
      `Extract the 6-12 skills/keywords this job posting screens for. For each, list the words an ATS would accept as a match.
Return ONLY a JSON array of {"term": str, "any": [lowercase strings], "required": bool}.

POSTING:
"""${posting.slice(0, 12000)}"""`
    );
    const ks = this.parseJSON(text, null);
    if (!Array.isArray(ks)) return null;
    return ks.map((k) => ({ term: String(k.term), any: (k.any || [k.term]).map((a) => String(a).toLowerCase()), req: !!k.required }));
  },
};

Object.assign(AI, {
  // Live web research on one role/program. Cached per role so it only costs once.
  async researchRole(role) {
    const cache = Store.get("research", {});
    if (cache[role.id]) return cache[role.id];
    const text = await this.ask(
      `Research this opportunity on the web (official page first): "${role.org || ""} — ${role.title}"${role.url ? ` (official page: ${role.url})` : ""}.
Return ONLY JSON:
{"summary": "3-5 sentences: what it is, what participants actually do, length, pay/cost",
 "lookFor": ["3-6 things selectors say they want"],
 "keywords": [{"term": str, "any": [lowercase ATS synonyms], "required": bool}] (6-10 skills/traits it screens for),
 "opens": "when applications open, or empty", "closes": "deadline, or empty",
 "acceptance": "published acceptance rate or cohort/applicant numbers with year, or empty — never estimate",
 "tips": ["2-4 concrete application tips"],
 "sources": ["urls you used"]}
Only include facts you found. Leave fields empty rather than guessing.`,
      { effort: "medium", maxTokens: 16000, webSearch: true }
    );
    const r = this.parseJSON(text, null);
    if (!r || typeof r !== "object" || Array.isArray(r)) throw new Error("Research came back in an unexpected format — try again.");
    r.keywords = (r.keywords || []).map((k) => ({ term: String(k.term), any: (k.any && k.any.length ? k.any : [k.term]).map((a) => String(a).toLowerCase()), req: !!k.required }));
    r.at = Date.now();
    cache[role.id] = r;
    Store.set("research", cache);
    return r;
  },

  // Reword bullets to front-load what the role screens for — same facts, same numbers.
  async tailorBullets(role, research, bullets, allowed) {
    const text = await this.ask(
      `Tailor these resume bullets for: ${role.org || ""} — ${role.title}.
What they screen for: ${(research?.lookFor || []).join("; ") || role.keywords.map((k) => k.term).join(", ")}.
Rules — break any and the line is thrown out automatically:
- Keep every fact and every number exactly; do not add results, scope, tools, or skills that aren't in the original line.
- You MAY reorder, tighten, choose a stronger truthful verb, and use these descriptive terms only where the original line clearly describes that activity: ${allowed.join(", ") || "(none)"}.
- Max 28 words, no period at the end. Leave a line unchanged if it can't be improved honestly.
Return ONLY a JSON array of {"i": index, "text": "new line"} for lines you changed.

${bullets.map((b, i) => `${i}. ${b}`).join("\n")}`,
      { effort: "medium" }
    );
    const out = this.parseJSON(text, []);
    return Array.isArray(out) ? out.filter((x) => Number.isInteger(x.i) && typeof x.text === "string") : [];
  },

  // One coaching turn: decide whether to dig deeper, move on, and/or write a bullet from Mason's own words.
  async coachTurn(skill, itemLabel, thread) {
    const text = await this.ask(
      `You're coaching Mason to prove the skill "${skill.name}"${itemLabel ? ` using: ${itemLabel}` : ""}.
Conversation so far (coach = you, me = Mason):
${thread.map((m) => `${m.from}: ${m.text}`).join("\n")}

Decide the next step:
- If his latest answer is vague, missing what HE did, missing a verifiable number, or missing the result, ask ONE short, specific follow-up about that gap.
- If this area is now well-proven, write ONE resume bullet (max 25 words, strong verb, no period) using ONLY facts he stated — never add numbers or claims — and set done=true.
- If he says he doesn't know / has nothing more, set done=true and bullet="" (don't invent anything).
Return ONLY JSON: {"reply": "your next message (a follow-up question, or a short 1-sentence acknowledgment if done)", "done": bool, "bullet": "resume line or empty"}`,
      { effort: "low" }
    );
    const r = this.parseJSON(text, null);
    if (!r || typeof r.reply !== "string") throw new Error("The coach's reply came back in an unexpected format.");
    return { reply: r.reply, done: !!r.done, bullet: typeof r.bullet === "string" ? r.bullet.trim().replace(/\.$/, "") : "" };
  },
});

Object.assign(AI, {
  // Essays and cover letters written only from Mason's verified data + Skill Bank answers.
  async draftWriting(role, kind, prompt, limit, research) {
    const task =
      kind === "cover"
        ? `Write a cover letter (max ${limit} words) from Mason to ${role.org} for "${role.title}".`
        : `Answer this application question in Mason's voice (max ${limit} words): """${prompt}"""`;
    const text = await this.ask(
      `${task}
Program: ${role.org} — ${role.title}. ${role.about || ""}
${research?.lookFor?.length ? `What they look for: ${research.lookFor.join("; ")}` : ""}

Rules:
- Use ONLY facts from MASON'S VERIFIED DATA and his Skill Bank answers. Pick the 1–2 most relevant true stories rather than listing everything.
- Never invent numbers, results, feelings he didn't state, people, or events. If the question needs a detail he hasn't given, write a short [bracketed note] describing what he should add, e.g. [add a real moment when…].
- Sound like a thoughtful 15-year-old, not a corporate brochure: specific, plain words, no clichés ("passionate", "ever since I was young"), no exaggeration.
- Stay under the word limit. Return only the text — no title, no commentary.`,
      { effort: "medium", maxTokens: 4000 }
    );
    return text.trim();
  },
});

Object.assign(AI, {
  // A short, accurate lesson with a quiz. General teaching content (not claims about Mason); examples may use his real projects.
  async lesson(track, title) {
    const text = await this.ask(
      `Teach Mason one lesson. Track: ${track.name}. Lesson: "${title}".
He's a 10th grader who built a Python trading bot (Alpaca API, EMA/RSI/ATR strategies, Flask dashboard), a study app, and a fitness app. Use his real projects as examples where they genuinely fit — never claim things about him that aren't in his data.
Be accurate and practical; ~5 minutes of reading; plain language; ${track.id === "python" ? "include short, correct Python code examples in ``` fences" : "no fluff"}.${track.id === "ta" ? " This is education, not financial advice — say so once, briefly." : ""}
Return ONLY JSON:
{"intro": str, "sections": [{"heading": str, "body": str}] (3-4), "example": str, "keyPoints": [str] (3-5),
 "quiz": [{"q": str, "options": [4 strings], "answer": 0-3, "why": str}] (5 questions, mixing recall, application and one tied to his projects), "practice": "one concrete thing to do this week"}`,
      { effort: "medium", maxTokens: 8000 }
    );
    const j = this.parseJSON(text, null);
    if (!j || !Array.isArray(j.sections) || !Array.isArray(j.quiz)) throw new Error("The lesson came back in an unexpected format — try again.");
    return j;
  },

  // Networking role-play: Claude plays a realistic person; each turn also returns one coaching tip on Mason's last message.
  async roleplayTurn(persona, thread) {
    const text = await this.ask(
      `ROLE-PLAY for networking practice. You play: ${persona.who}. Setting: ${persona.setting}
Stay in character: realistic, friendly but busy; short replies (1-3 sentences); react naturally to what Mason says (if he's vague, be a little vague back; if he's specific and curious, open up).
Transcript so far:
${thread.map((m) => `${m.from === "me" ? "Mason" : "You"}: ${m.text}`).join("\n")}

Return ONLY JSON: {"reply": "your in-character reply", "tip": "one short coaching tip on Mason's LAST message (what worked or what to try), max 20 words"}`,
      { effort: "low" }
    );
    const j = this.parseJSON(text, null);
    if (!j || typeof j.reply !== "string") throw new Error("The practice partner's reply came back in an unexpected format.");
    return j;
  },
  async roleplayFeedback(persona, thread) {
    const text = await this.ask(
      `Grade Mason's networking conversation. He was talking to: ${persona.who} (${persona.setting}).
${thread.map((m) => `${m.from === "me" ? "Mason" : "Them"}: ${m.text}`).join("\n")}
Return ONLY JSON: {"score": 1-10, "verdict": str, "strengths": [2-3 str], "fixes": [2-3 str], "betterLine": "a stronger version of one thing he said, using only his facts"}`,
      { effort: "medium" }
    );
    const j = this.parseJSON(text, null);
    if (!j || typeof j.score !== "number") throw new Error("Feedback came back in an unexpected format.");
    return j;
  },

  // Short, honest outreach email; Mason reviews and sends it himself.
  async draftOutreach(role, recipient, name, context, purpose) {
    const text = await this.ask(
      `Write a short networking email from Mason (high school sophomore) to ${name || "the recipient"} — ${recipient} — about ${role.org} (${role.title}).
Purpose: ${purpose}. ${context ? `How he found them / context: ${context}.` : ""}
Rules: 90-140 words; specific and humble; mention at most ONE relevant true fact from his data; one clear, small ask; easy to say yes to; no flattery or clichés; never invent anything (use [brackets] for details he must fill in, like the recipient's name if not given).
Return ONLY JSON: {"subject": str, "body": str}`,
      { effort: "low" }
    );
    const j = this.parseJSON(text, null);
    if (!j || typeof j.body !== "string") throw new Error("The email came back in an unexpected format — try again.");
    return j;
  },

  // Web search for programs not already in the catalog.
  async findNewPrograms(goalLabel, existing) {
    const text = await this.ask(
      `Search the web for REAL internships, research programs, competitions and pre-college programs for high school students focused on: ${goalLabel}.
Mason: 10th grade now (rising junior in summer 2027), turns 16 in Dec 2026, lives in San Diego County, CA. Prefer programs he can apply to this cycle: San Diego, remote, or national.
Skip anything already in his list: ${existing.slice(0, 160).join("; ")}.
Only include programs you found with an official page. Return ONLY a JSON array (max 8) of:
{"org": str, "title": str, "kind": "internship"|"research"|"program"|"competition", "field": "finance"|"business"|"tech"|"research", "location": str, "mode": "remote"|"in-person"|"hybrid", "pay": str, "deadline": str, "url": "official page", "about": "1-2 sentences", "status": "eligible"|"soon"|"ineligible", "reason": str, "selectivity": "open"|"easy"|"moderate"|"selective"|"competitive"|"elite", "acceptance": "published rate with source, or empty"}`,
      { effort: "medium", maxTokens: 16000, webSearch: true }
    );
    const arr = this.parseJSON(text, []);
    return Array.isArray(arr) ? arr.filter((x) => x && x.org && x.title && /^https?:\/\//.test(x.url || "")) : [];
  },
});

Object.assign(AI, {
  // Per-bullet rewrites aimed at the ATS/recruiter issues found. Same facts, same numbers — verified after.
  async improveBullets(target, items, allowed) {
    const text = await this.ask(
      `Improve these resume bullets for: ${target.org ? target.org + " — " : ""}${target.title}.
Keywords this role screens for: ${target.keywords.map((k) => k.term).join(", ")}.
Each line lists the issues an ATS/recruiter check found. Fix what you honestly can:
- Start with a strong, specific action verb; cut filler; keep under ~25 words.
- Keep EVERY fact and EVERY number exactly. Never add numbers, results, tools, scope or claims that aren't in the line.
- You may use these descriptive terms only where the line clearly describes that activity: ${allowed.join(", ") || "(none)"}.
- If a line needs a number it doesn't have, don't invent one — leave the number out.
- Skip lines that are already strong.
Return ONLY a JSON array of {"id": "the id", "text": "improved line (no period)", "why": "max 12 words"}.

${items.map((b) => `${b.id} | ${b.text} | issues: ${b.issues.join("; ") || "none"}`).join("\n")}`,
      { effort: "medium" }
    );
    const out = this.parseJSON(text, []);
    return Array.isArray(out) ? out.filter((x) => x && typeof x.id === "string" && typeof x.text === "string") : [];
  },

  async writeSummary(target, resume) {
    const text = await this.ask(
      `Write a resume summary for Mason targeting: ${target.org ? target.org + " — " : ""}${target.title}.
2 sentences, 35-55 words. Open with who he is (high school sophomore, Business Finance focus), name the target role, then his 1-2 most relevant TRUE accomplishments from his data. Use these keywords only where true: ${target.keywords.map((k) => k.term).join(", ")}.
Never invent numbers or claims. No first person ("I"). Return only the summary text.

Current resume:
${resumeToText(resume)}`,
      { effort: "medium" }
    );
    return text.trim().replace(/^["']|["']$/g, "");
  },
});

// ---------- spoken practice (interview · financial planning · sales · networking) ----------
const DIFFICULTY_NOTE = {
  easy: "Friendly and forgiving; give him openings and only light pushback.",
  realistic: "Like a normal busy professional: some pushback, expects specifics.",
  tough: "Skeptical and demanding: real objections, interrupts vague answers, asks hard follow-ups.",
};
Object.assign(AI, {
  async practiceSetup(mode, opts) {
    const spec = {
      interview: `A ${opts.interviewType} interview${opts.role ? ` for: ${opts.role}` : ""}. You are the interviewer. Plan ${opts.count} main questions (mix in natural follow-ups). Types: behavioral = STAR stories; python = his bot/apps, debugging, data, APIs; markets = EMA/RSI/ATR, risk/reward, markets, a stock pitch; financial planning = budgeting, emergency funds, compound interest, risk tolerance, diversification, Roth IRA basics, client empathy; college = curiosity, why this school, contribution; mixed = blend. End by asking if he has questions for you, answer them briefly, then close.`,
      fpclient: "A first financial-planning meeting. Mason is the planner. You are the client with a realistic money situation (income, expenses, debts, savings, goals, worries). Keep key details hidden unless he asks good discovery questions. Judge whether his advice is clear, suitable and empathetic.",
      sales: opts.product === "choose" ? "A sales conversation. Mason will pitch a product of his choice — you don't know what yet. You are a realistic buyer. React to whatever he pitches, raise objections that fit it, and decide at the end whether to buy." : `A sales conversation. Mason is selling: ${opts.product}. You are a realistic buyer with hidden needs, a budget and objections. Decide at the end whether to buy.`,
      networking: `A networking conversation. You are ${opts.persona || "a professional in finance"}. Mason is a high school student introducing himself. Respond naturally; reward curiosity and a specific, small ask.`,
    }[mode];
    const text = await this.ask(
      `Create a spoken role-play scenario. ${spec}
Difficulty: ${opts.difficulty} — ${DIFFICULTY_NOTE[opts.difficulty]}
Return ONLY JSON:
{"title": str, "counterpart": {"name": realistic first+last name, "role": str},
 "brief": "2 sentences shown to Mason before starting (what he knows; never reveal hidden details)",
 "opening": "your first spoken line in character, or empty string if Mason should speak first",
 "hidden": "private notes only you see: situation, goals, objections, question plan",
 "objectives": ["3-5 things a great performance does in this scenario"],
 "maxTurns": number between 6 and 16}`,
      { effort: "medium", maxTokens: 3000 }
    );
    const j = this.parseJSON(text, null);
    if (!j || !j.counterpart || typeof j.brief !== "string") throw new Error("Couldn't set up the scenario — try again.");
    return j;
  },
  async practiceTurn(sc, thread, mode, difficulty) {
    const mine = thread.filter((t) => t.from === "me").length;
    const text = await this.ask(
      `ROLE-PLAY (spoken). You are ${sc.counterpart.name}, ${sc.counterpart.role}. Scenario: ${sc.title}.
Private notes: ${sc.hidden}
Difficulty: ${difficulty} — ${DIFFICULTY_NOTE[difficulty]}
Rules: stay fully in character; this is spoken aloud, so 1-3 short natural sentences, no lists, no markdown, no emojis, no stage directions. React to what Mason actually said (if he's vague, press; if he asks a good question, answer with real detail). Never coach him. ${mine >= sc.maxTurns ? "Time is up: give a natural closing line now." : "When the conversation reaches a natural end, give a closing line."}
Transcript:
${thread.map((t) => `${t.from === "me" ? "Mason" : sc.counterpart.name}: ${t.text}`).join("\n")}
Return ONLY JSON: {"reply": "what you say next", "end": true/false}`,
      { effort: "low", maxTokens: 1200 }
    );
    const j = this.parseJSON(text, null);
    if (!j || typeof j.reply !== "string") throw new Error("Lost the conversation for a second — say that again?");
    return { reply: j.reply.replace(/[*_#]/g, "").trim(), end: !!j.end };
  },
  async practiceAnalyze(sc, thread, metrics, mode) {
    const rubric = {
      interview: ["Content & examples", "Structure (STAR)", "Relevance", "Delivery & confidence", "Engagement (questions asked)"],
      fpclient: ["Rapport & empathy", "Discovery questions", "Advice quality & suitability", "Clarity (no jargon)", "Delivery & confidence"],
      sales: ["Opening & rapport", "Discovery of needs", "Value pitch", "Objection handling", "Closing & next step"],
      networking: ["Introduction", "Curiosity & questions", "Specific ask", "Listening & follow-up", "Delivery & confidence"],
    }[mode];
    const text = await this.ask(
      `Analyze Mason's spoken ${mode === "fpclient" ? "financial-planning client meeting" : mode} practice. He's a high school sophomore — be honest and specific, not harsh.
Scenario: ${sc.title}. Counterpart: ${sc.counterpart.name}, ${sc.counterpart.role}. What great looks like: ${(sc.objectives || []).join("; ")}
Measured speech (from his mic/transcript): ${JSON.stringify(metrics)}
Guide: conversational pace ~130-160 wpm; fillers under ~2 per 100 words is strong; pitch variation under ~1.5 semitones sounds monotone, ~2-5 is expressive; hedges ("I guess", "maybe") weaken authority.
Transcript:
${thread.map((t) => `${t.from === "me" ? "Mason" : sc.counterpart.name}: ${t.text}`).join("\n")}

Score each category 0-100: ${rubric.join(", ")}.
Return ONLY JSON:
{"overall": 0-100, "verdict": "one sentence", "categories": [{"name": str, "score": 0-100, "note": str}],
 "tone": "2-3 sentences on tone, confidence and wording, citing the measured numbers",
 "strengths": [2-4 str],
 "improvements": [{"issue": str, "quote": "his exact words from the transcript", "better": "a stronger way to say it using only his facts"}] (3-5),
 "outcome": "${mode === "sales" ? "did the buyer buy and why" : mode === "fpclient" ? "would the client trust him and come back" : "would you advance him"}",
 "nextDrill": "one specific thing to practice next time"}`,
      { effort: "medium", maxTokens: 6000 }
    );
    const j = this.parseJSON(text, null);
    if (!j || typeof j.overall !== "number") throw new Error("The analysis came back in an unexpected format — tap Analyze again.");
    return j;
  },
});

Object.assign(AI, {
  // Fresh practice-quiz questions for a track (different every time).
  async quiz(track, lessons) {
    const text = await this.ask(
      `Write a fresh 6-question multiple-choice practice quiz for Mason on "${track.name}", covering: ${lessons.join("; ")}.
Mix: 2 concept checks, 2 applied scenarios, 1 tied to his real projects (trading bot, Keen, Titan, photography) where it fits, 1 harder stretch question. Accurate, unambiguous, one correct answer, plausible distractors. Vary the question wording each time (seed ${Math.random().toString(36).slice(2, 7)}).
Return ONLY JSON: [{"q": str, "options": [4 strings], "answer": 0-3, "why": "one-sentence explanation"}]`,
      { effort: "low", maxTokens: 5000 }
    );
    const qs = this.parseJSON(text, null);
    if (!Array.isArray(qs) || !qs.length || !qs.every((q) => q.q && Array.isArray(q.options) && q.options.length === 4 && Number.isInteger(q.answer))) throw new Error("The quiz came back in an unexpected format — try again.");
    return qs;
  },
});
