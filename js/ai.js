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
      msg =
        model === "claude-opus-5"
          ? await client.beta.messages.create({ ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" })
          : await client.messages.create(params);
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
