// Built-in practice partner: runs every spoken mode without Claude (no API key, out of credit, offline,
// or Claude failing mid-session). Question banks + simple listening rules + a transcript-based analysis.
// Less adaptive than Claude, but the conversation never dies.

const OFFLINE = (() => {
  const pick = (arr, seed = Math.random()) => arr[Math.floor(seed * arr.length) % arr.length];
  const ACKS = ["Got it.", "Okay, that makes sense.", "Nice.", "Interesting.", "Thanks for walking me through that.", "Okay.", "Good to know.", "That's helpful."];
  const NAMES = { female: ["Dana Lee", "Priya Shah", "Maria Lopez", "Rachel Kim", "Emily Carter"], male: ["James Park", "David Chen", "Marcus Hill", "Alex Rivera", "Ben Turner"] };
  const words = (t) => String(t || "").split(/\s+/).filter(Boolean);

  const BANKS = {
    behavioral: [
      "So, tell me a little about yourself.",
      "Tell me about a time you solved a hard problem on one of your projects. What did you do, step by step?",
      "Describe something you taught yourself. How did you go about learning it?",
      "Tell me about a time you got feedback and changed how you worked.",
      "What's a project you're proud of, and what result did it have?",
      "What's one weakness you're working on right now?",
      "Why are you interested in finance and this kind of internship?",
    ],
    python: [
      "Walk me through how your trading bot is built, from data coming in to an order going out.",
      "How did you backtest your strategies, and how do you know the results are realistic?",
      "Say an order from your bot never fills. How would you debug that?",
      "How does the spaced-repetition part of Keen decide what to show a student next?",
      "How do you keep API keys and secrets safe in your projects?",
      "What's a bug you were stuck on for a while, and how did you finally fix it?",
    ],
    markets: [
      "Explain what an EMA crossover is, like I've never traded before.",
      "What does RSI tell you, and when can it be misleading?",
      "How do you use ATR to set a stop loss?",
      "Pitch me a stock or ETF in about a minute. Why would you buy it?",
      "What's moving the market lately, in your opinion, and why does it matter?",
      "How do you think about risk versus reward on a single trade?",
    ],
    "financial planning": [
      "Why are you interested in financial planning?",
      "Explain compound interest to a sixteen-year-old.",
      "What's an emergency fund, and how big should it be?",
      "What's the difference between a Roth IRA and a traditional IRA?",
      "A client panics and wants to sell everything during a market drop. What do you say?",
      "How would you start a first meeting with a new client?",
    ],
    college: [
      "Tell me about yourself, beyond your grades.",
      "Why are you interested in this school?",
      "What would you contribute to our campus?",
      "Tell me about a challenge you faced and what you learned from it.",
      "What do you do for fun when you're not studying?",
      "What do you want to study, and why?",
    ],
  };
  BANKS.mixed = [BANKS.behavioral[0], BANKS.python[0], BANKS.markets[3], BANKS.behavioral[2], BANKS["financial planning"][1], BANKS.behavioral[5], BANKS.markets[1]];
  BANKS["program-specific"] = BANKS.behavioral;

  const CLIENT = {
    facts: [
      [/income|earn|make|salary|job|work/i, "I'm a nurse, I make about seventy-two thousand a year before taxes."],
      [/expens|spend|budget|month|rent|cost/i, "Rent is about nineteen hundred a month, and honestly I don't track the rest very well."],
      [/debt|loan|credit|owe/i, "I have about eight thousand on a credit card, and some student loans, maybe twenty-two thousand."],
      [/sav|emergency|bank|cash/i, "I've got around three thousand in savings. That's it."],
      [/goal|want|future|plan|house|retire/i, "I'd love to buy a condo in maybe five years, and I know I should be saving for retirement."],
      [/risk|stock|invest|market|comfortable/i, "Investing makes me nervous. My dad lost a lot in 2008."],
      [/401|retire|employer|match/i, "My hospital has a 401(k) with a match, but I never signed up."],
    ],
    fillers: ["Okay. So where do I even start?", "That makes sense. What would you do first if you were me?", "Hmm. Is that realistic for me?", "I see. What's the catch?"],
    // When you explain or advise, a real client mostly shows they understood — by topic, in their own words.
    understood: [
      [/emergency|rainy day|cushion|cash (cushion|reserve)/i, ["Okay, so build up the emergency savings first. That actually makes me feel better.", "Right — so if something breaks, I'm not putting it on a card. Got it.", "Three to six months… yeah, I'm not close, but I get why it matters."]],
      [/match|401|retire/i, ["Oh, so the match is basically free money I'm leaving on the table. That's annoying, honestly.", "Okay, so I bump my contribution up at least to the match. I can do that.", "Huh. I didn't realize I was missing out on that."]],
      [/debt|card|loan|interest|avalanche|snowball|pay (it |that )?off/i, ["So the card with the highest rate goes first. That makes sense — it's costing me the most.", "Okay, so I keep paying the minimums on everything and throw the extra at one card.", "Yeah, that interest is killing me. I'm on board."]],
      [/budget|spend|cut|track/i, ["Yeah… I know I spend too much eating out. I can cut that back.", "Okay, tracking it for a month. I can try that.", "That's fair. I don't really know where it all goes."]],
      [/roth|ira|tax/i, ["Okay, so I pay the tax now and it's tax-free later. That's actually pretty cool.", "Got it — tax-free when I retire. I like the sound of that."]],
      [/invest|stock|index|diversif|market|fund/i, ["So instead of picking stocks, I just own a little of everything. That sounds less scary.", "Okay. Long-term, and I don't panic when it drops. I'll try.", "That makes sense — I don't need to time it."]],
      [/goal|house|condo|down payment|college|travel|save for/i, ["Okay, so if I put a set amount aside every month, it's actually doable. That's encouraging.", "So it's more about time than a huge amount right now. Got it."]],
      [/insur|will|beneficiar|guardian/i, ["Yeah, I've been putting that off. I'll look into it.", "That's a good point — I hadn't thought about what happens if something happens to me."]],
      [/plan|step|first|priorit|next/i, ["Okay, so there's an order to this. That helps — it felt like everything at once before.", "That's a lot clearer. I can actually see the steps now."]],
    ],
    understoodGeneric: ["Okay, that makes sense.", "Got it. That's clearer than I expected.", "Huh, okay. I didn't think of it that way.", "Yeah, I can do that.", "Alright, that's fair.", "Okay. I feel a little better about this, honestly."],
    unsure: ["Hmm, I've honestly never thought about that.", "I'm not sure, to be honest. I'd have to look.", "No idea, honestly — that's kind of why I'm here.", "I don't know off the top of my head."],
  };
  const BUYER = {
    objections: ["Honestly, it sounds expensive. What does it cost?", "We already use something for this. Why switch?", "I'm not sure we need it right now.", "How do I know it actually works?", "I'd have to run this by my partner first."],
    needs: ["Our biggest problem is wasted time — everything is manual.", "We've lost customers because things fall through the cracks.", "Budget is tight this quarter, so it has to pay for itself."],
  };
  const NETWORK = ["Nice to meet you, Mason. So what got you interested in finance?", "That's impressive for a sophomore. What are you hoping to do this summer?", "Honestly, the best thing I did early on was talk to a lot of people.", "My team does a mix of analysis and client work. It's busy but fun.", "Sure, what would you like to know?"];

  function setup(kind, opts, difficulty) {
    const g = opts.character?.gender || (Math.random() < 0.5 ? "female" : "male");
    const name = opts.character ? `${opts.character.name} ${pick(["Reyes", "Bennett", "Cho", "Patel", "Morgan", "Hayes", "Silva", "Brooks"])}` : pick(NAMES[g]);
    const base = { offline: true, counterpart: { name, gender: g, role: "" }, objectives: [], hidden: "", maxTurns: 12, step: 0, followed: {}, revealed: [] };
    if (kind === "interview") {
      // Length by time: about one main question per 1.7 minutes.
      const want = Math.max(3, Math.round((opts.minutes || 8) / 1.7));
      let pool = [...(BANKS[opts.interviewType] || BANKS.behavioral)];
      if (opts.warmup === false) pool = pool.filter((q) => !/about yourself/i.test(q));
      for (const q of BANKS.mixed) if (pool.length < want && !pool.includes(q)) pool.push(q);
      const qs = pool.slice(0, want);
      if (opts.role) qs.splice(1, 0, `Why are you interested in ${opts.role.split(" — ")[0]}, specifically?`);
      qs.push("That's all my questions. Do you have any questions for me?");
      return { ...base, questions: qs, title: opts.role ? `Interview: ${opts.role.split(".")[0]}` : `${opts.interviewType[0].toUpperCase() + opts.interviewType.slice(1)} interview`, counterpart: { ...base.counterpart, role: opts.interviewType === "college" ? "Admissions interviewer" : "Interviewer" }, brief: "A practice interview with built-in questions. Use STAR: situation, task, action, result — with real numbers.", opening: `Hi Mason, I'm ${name.split(" ")[0]}. Thanks for making the time. ${qs[0]}`, objectives: ["Answer with specific examples", "Use STAR structure", "Mention real numbers and results", "Ask a thoughtful question at the end"] };
    }
    if (kind === "fpclient")
      return { ...base, title: "First meeting with a new client", counterpart: { ...base.counterpart, role: "New client" }, brief: "A new client wants help with money. They won't volunteer everything — ask about income, spending, debt, savings, goals and risk, then give clear advice.", opening: `Hi, I'm ${name.split(" ")[0]}. A friend said you could help me get my money together. I don't really know where to start.`, objectives: ["Ask open discovery questions", "Cover income, spending, debt, savings, goals, risk", "Give clear, prioritized advice", "Avoid jargon"] };
    if (kind === "sales") {
      const product = opts.product === "choose" ? "" : opts.product;
      return { ...base, product, title: product ? `Sell ${product.split(" — ")[0]}` : "Pitch your product", counterpart: { ...base.counterpart, role: "Potential buyer" }, brief: product ? `You're selling ${product}. Find the buyer's real problem first, then pitch value and handle objections.` : "Pitch any product you want. Ask about the buyer's needs, handle objections, and ask for a next step.", opening: product ? `Hi, I've got a few minutes. What did you want to show me?` : "", objectives: ["Ask discovery questions first", "Tie the pitch to their problem", "Handle objections calmly", "Ask for a clear next step"] };
    }
    return { ...base, title: "Networking conversation", counterpart: { ...base.counterpart, role: opts.persona || "Professional in finance" }, brief: "Introduce yourself, show curiosity, and end with one small, specific ask.", opening: "", objectives: ["Clear 20-second intro", "Ask curious questions", "Make a small, specific ask"] };
  }

  function turn(sc, thread, kind, t = {}) {
    const mine = thread.filter((t) => t.from === "me");
    const last = mine[mine.length - 1]?.text || "";
    const n = words(last).length;
    const ack = pick(ACKS);
    const o = t.opts || {};
    // Time's up: every mode closes naturally.
    if (t.minutes && t.elapsed >= t.minutes) {
      const close = { interview: "We're right at time, so let's stop there. Thanks so much, Mason — really enjoyed this.", fpclient: "Oh wow, that went fast. This was really helpful — can we pick this up next time?", sales: sc.revealed?.length >= 2 ? "I'm out of time, but send me the details — I'm interested." : "I've got to jump, but thanks for the pitch.", networking: "I've got to run, but it was great talking with you." }[kind];
      return { reply: close, end: true };
    }
    if (kind === "interview") {
      const qs = sc.questions;
      // One follow-up per question when the answer is thin.
      if (n < 25 && !sc.followed[sc.step] && sc.step < qs.length - 1) {
        sc.followed[sc.step] = true;
        return { reply: pick(["Can you go a little deeper? What exactly did you do, and what was the result?", "Could you give me a specific example of that?", "What was the outcome? Was there a number or result you could point to?"]), end: false };
      }
      if (sc.step >= qs.length - 1) return { reply: "Great questions. Thanks so much for your time today, Mason — we'll be in touch.", end: true };
      sc.step++;
      return { reply: `${ack} ${qs[sc.step]}`, end: false };
    }
    if (kind === "fpclient") {
      const c = o.client || {};
      const FACTS = sc.clientFacts || CLIENT.facts;
      sc.said ||= [];
      sc.asked ||= [];
      const fresh = (arr) => arr.filter((x) => !sc.said.includes(x));
      const say = (x) => (sc.said.push(x), { reply: x, end: false });
      const pickFresh = (arr) => pick(fresh(arr).length ? fresh(arr) : arr);
      const pickNew = (arr) => (fresh(arr).length ? ((x) => (sc.said.push(x), x))(pick(fresh(arr))) : "");
      const t = last.trim();
      // Is Mason asking something, or explaining/advising? Clients only share facts when asked.
      const asked =
        /\?/.test(t) ||
        /^(what|how|when|where|why|who|tell me|do you|did you|does|can you|could you|are you|is there|have you|would you|any)\b/i.test(t) ||
        /\b(tell me|walk me through|i'?d (love|like) to (hear|know|understand)|let'?s talk about|can you share|curious (about|how|what)|any idea|fill me in)\b/i.test(t);
      // Small talk gets small talk back.
      if (/\b(nice to meet|good to (see|meet)|how are you|how have you been|how'?s (it going|everything|your (day|week|weekend|family))|thanks for (coming|meeting|making)|welcome|how (I|this) work|the process|today we|agenda)\b/i.test(t) && !/\b(rent|debt|sav|income|pay|401|goal|risk|spend|budget)\b/i.test(t))
        return say(pickFresh(sc.smallTalk || ["Nice to meet you too. Where do you want to start?", "Good, thanks. I'm ready when you are."]));
      // "What brings you in?" — they tell you what's worrying them.
      if (/\b(what brings you|why (are you|did you come)|what made you|how can i help|what('s| is) on your mind|what('s| is) going on|what can i do for you|where do you want to start)\b/i.test(t) && sc.whyHere && !sc.said.includes(sc.whyHere)) return say(sc.whyHere);
      // A beginner asks what jargon means — once per term, and not when you just explained it.
      const jargon = (t.match(/\b(roth|ira|401\(?k\)?|index fund|etf|asset allocation|diversif\w*|compound(ing)?|expense ratio|liquidity|apr)\b/i) || [])[0];
      const explained = /\b(means|meaning|basically|in other words|it'?s like|which is|that'?s when|think of it)\b/i.test(t);
      // Checking in ("does that make sense?") gets a real answer, not a random fact.
      if (/\b(make sense|makes sense|sound good|sounds good|does that work|you with me|following me|any questions|clear so far|okay with you|how does that sound)\b/i.test(t) && /\?/.test(t)) {
        sc.qTurns = (sc.qTurns || 0) + 1;
        if (sc.qTurns % 3 === 0 && fresh(CLIENT.fillers).length) return say(pick(fresh(CLIENT.fillers)));
        return say(pickFresh(["Yeah, that makes sense.", "Yep, I'm following.", "I think so, yeah. It's a lot, but it makes sense.", "Sounds good to me.", "Yeah — honestly, clearer than I expected."]));
      }
      const knowsIt = jargon && (sc.knows || []).some((k) => jargon.toLowerCase().includes(k));
      if (jargon && !knowsIt && !explained && (c.know || 2) <= 2 && !sc.asked.includes(jargon.toLowerCase()) && !FACTS.some(([re], k) => asked && re.test(t) && !sc.revealed.includes(k))) {
        sc.asked.push(jargon.toLowerCase());
        return say(`Sorry — what's ${/^[aeiou]/i.test(jargon) ? "an" : "a"} ${jargon}? I've heard of it but I don't really get it.`);
      }
      // Personality shapes how they talk.
      const flavor = () => {
        const r = Math.random();
        let x = "";
        if (sc.style === "chatty" && r < 0.3) x = pickNew(["Sorry, I'm rambling — my sister says I always do this.", "Anyway, that's a long story.", "Oh, and the dog knocked over a lamp this morning, so that's my day."]);
        else if (sc.style === "skeptical" && r < 0.25) x = pickNew(["No offense, but the last guy just wanted to sell me something.", "I'll believe it when I see it."]);
        else if ((sc.style === "anxious" || (c.worry || 3) >= 4) && r < 0.3) x = pickNew(["Sorry — this stuff stresses me out.", "Is that bad? It feels bad.", "I lie awake thinking about this sometimes."]);
        else if (sc.style === "detailed" && r < 0.25) x = pickNew(["I have a spreadsheet for this, actually.", "I can send you the exact numbers later."]);
        else if (sc.style === "upbeat" && r < 0.25) x = pickNew(["This is already helping.", "Okay, I'm feeling better already."]);
        return x ? " " + x : "";
      };
      const surprise = () => (mine.length >= 3 && sc.surprise?.length && Math.random() < 0.35 ? sc.surprise.shift() : "");
      if (asked) {
        // Answer what you asked about — at most two facts, and one goal at a time (like a real person).
        let hits = FACTS.map((f, k) => [f, k]).filter(([[re], k]) => re.test(t) && !sc.revealed.includes(k));
        const goalId = (f) => (f[2] || "").replace(/^(goal|when)-/, "");
        const firstGoal = hits.find(([f]) => /^(goal|when)-/.test(f[2] || ""));
        hits = hits.filter(([f]) => !/^(goal|when)-/.test(f[2] || "") || (firstGoal && goalId(f) === goalId(firstGoal[0])));
        hits = hits.slice(0, sc.style === "brief" ? 1 : 2);
        if (hits.length) {
          hits.forEach(([, k]) => sc.revealed.push(k));
          const vague = !sc.clientFacts && (c.numbers || 2) <= 2 ? pick(["Honestly I'm not sure exactly, but ", "I think it's something like ", "Don't quote me, but "]) : "";
          const body = hits.map(([f]) => f[1]).join(" ");
          return say(vague + (vague && !/^I\b/.test(body) ? body.charAt(0).toLowerCase() + body.slice(1) : body) + flavor());
        }
        // Asked again about something they already told you: they repeat it, they don't forget.
        const told = FACTS.find(([re], k) => re.test(t) && sc.revealed.includes(k));
        if (told) return say(`Like I said — ${told[1].charAt(0).toLowerCase() + told[1].slice(1)}`);
        if (sc.style === "guarded" && /\b(how much|what('s| is) your|income|balance)\b/i.test(t) && Math.random() < 0.5) return say(pickFresh(["I'd rather not get into exact numbers yet.", "Why do you need to know that?"]));
        const sp = surprise();
        if (sp) return say(sp);
        return say(pickFresh(CLIENT.unsure));
      }
      if (mine.length >= 9 && !sc.clientFacts) return { reply: `${sc.revealed.length >= 4 ? "This actually helps a lot. I feel like I have a plan." : "Okay... I think I need to think about it more."} Thanks for your time.`, end: true };
      // Mason is explaining or advising: show you understood — mostly statements, a question at most every third time.
      const sp = surprise();
      if (sp) return say(sp);
      if (/\b(last time|you told me|you mentioned|you said|to recap|recap|as we discussed)\b/i.test(t) && !sc.recapped) {
        sc.recapped = true;
        return say(pickFresh(["Yep, that's right.", "Yeah — that's pretty much it.", "Right, exactly. That's what's been on my mind.", "Mm-hm. That about sums it up."]));
      }
      // React to the main point (the topic mentioned most), not a word in passing.
      const topic = CLIENT.understood.map(([re, ls]) => [re, ls, (t.match(new RegExp(re.source, "gi")) || []).length]).filter((x) => x[2]).sort((a, z) => z[2] - a[2])[0];
      const lines = fresh(topic ? topic[1] : []);
      if (lines.length) return say(pick(lines) + flavor());
      sc.qTurns = (sc.qTurns || 0) + 1;
      const qs = fresh(CLIENT.fillers);
      if (sc.qTurns % 3 === 0 && qs.length) return say(pick(qs));
      return say(pickFresh(CLIENT.understoodGeneric));
    }
    if (kind === "sales") {
      const asked = /\?/.test(last) || /\b(what|how|why|tell me|do you|are you)\b/i.test(last);
      if (/\b(next step|sign|trial|demo|would you be open|can we|shall we|ready to|get started|buy)\b/i.test(last) && mine.length >= 3)
        return { reply: sc.revealed.length >= ((o.interest || 3) >= 4 ? 1 : 2) ? "Okay, you've made a good case. Let's set up a trial next week." : "I'm not convinced yet — you never really asked what we need. I'll pass for now.", end: true };
      if (asked && sc.revealed.length < BUYER.needs.length) {
        const r = BUYER.needs[sc.revealed.length];
        sc.revealed.push(r);
        return { reply: r, end: false };
      }
      if (mine.length >= 10) return { reply: "I appreciate the pitch. I'll think about it.", end: true };
      return { reply: BUYER.objections[(sc.step++) % BUYER.objections.length], end: false };
    }
    // networking
    if (/\b(could i|would you be open|can i|email you|connect on|coffee|15 minutes|follow up)\b/i.test(last) && mine.length >= 2) return { reply: "Of course — send me an email and we'll find a time. Great meeting you, Mason.", end: true };
    if (mine.length >= 8) return { reply: "I've got to run, but it was great talking with you.", end: true };
    return { reply: NETWORK[Math.min(sc.step++, NETWORK.length - 1)], end: false };
  }

  function analyze(sc, thread, m, kind) {
    const mine = thread.filter((t) => t.from === "me");
    const all = mine.map((t) => t.text).join(" ");
    const avgWords = m.avgTurnWords;
    const numbers = (all.match(/\d/g) || []).length;
    const results = (all.match(/\b(result|so that|which led|increased|reduced|improved|learned|ended up|because of that|outcome)\b/gi) || []).length;
    const actions = (all.match(/\bI (built|made|wrote|tested|fixed|led|created|designed|learned|started|changed|added|used)\b/gi) || []).length;
    const clamp = (v) => Math.max(5, Math.min(98, Math.round(v)));
    const content = clamp(35 + Math.min(30, numbers * 6) + Math.min(25, actions * 5) + (avgWords >= 40 ? 10 : 0));
    const structure = clamp(30 + Math.min(35, results * 10) + Math.min(25, actions * 5) + (avgWords >= 50 && avgWords <= 180 ? 10 : 0));
    const delivery = clamp(95 - m.fillersPer100 * 9 - m.hedges * 4 - (m.wpm && (m.wpm < 115 || m.wpm > 180) ? 12 : 0));
    const engage = clamp(30 + m.questionsAsked * 18);
    const relevance = clamp(55 + Math.min(30, avgWords / 3) - (avgWords > 220 ? 15 : 0));
    const cats = {
      interview: [["Content & examples", content], ["Structure (STAR)", structure], ["Relevance", relevance], ["Delivery & confidence", delivery], ["Engagement (questions asked)", engage]],
      fpclient: [["Rapport & empathy", clamp(50 + (all.match(/\b(understand|makes sense|that's|totally|sounds)\b/gi) || []).length * 8)], (() => {
        // Discovery is about questions; every other client meeting is about covering what you came to do.
        const cl = sc.clientId && typeof Clients !== "undefined" ? Clients.find(sc.clientId) : null;
        if (cl && sc.meetingType && sc.meetingType !== "discovery") {
          const ag = Clients.agendaStatus(cl, sc.meetingType, thread, sc).filter((x) => !/^(news-mkt|guest|steer)/.test(x.id));
          return ["Agenda covered", clamp(Math.round((ag.filter((x) => x.done).length / Math.max(1, ag.length)) * 100))];
        }
        return ["Discovery questions", clamp(25 + (sc.revealed?.length || 0) * 11 + m.questionsAsked * 4)];
      })(), ["Advice quality & suitability", clamp(40 + (all.match(/\b(emergency fund|budget|401|match|roth|pay off|interest|index fund)\b/gi) || []).length * 9)], ["Clarity (no jargon)", clamp(85 - (all.match(/\b(asset allocation|liquidity|basis points|expense ratio|beta)\b/gi) || []).length * 10)], ["Delivery & confidence", delivery]],
      sales: [["Opening & rapport", clamp(55 + (mine[0] && words(mine[0].text).length > 12 ? 15 : 0))], ["Discovery of needs", clamp(25 + (sc.revealed?.length || 0) * 22)], ["Value pitch", content], ["Objection handling", clamp(40 + Math.min(40, mine.length * 5))], ["Closing & next step", clamp(/\b(next step|trial|demo|get started|sign)\b/i.test(all) ? 80 : 35)]],
      networking: [["Introduction", clamp(mine[0] ? 50 + Math.min(35, words(mine[0].text).length) : 30)], ["Curiosity & questions", engage], ["Specific ask", clamp(/\b(could i|would you be open|email|coffee|follow up)\b/i.test(all) ? 85 : 30)], ["Listening & follow-up", clamp(45 + m.questionsAsked * 10)], ["Delivery & confidence", delivery]],
    }[kind];
    const overall = Math.round(cats.reduce((n, [, v]) => n + v, 0) / cats.length);
    const worst = [...cats].sort((a, b) => a[1] - b[1])[0];
    const thin = [...mine].sort((a, b) => words(a.text).length - words(b.text).length)[0];
    const fillerTurn = [...mine].sort((a, b) => (b.text.match(FILLERS) || []).length - (a.text.match(FILLERS) || []).length)[0];
    const improvements = [];
    if (thin && words(thin.text).length < 40) improvements.push({ issue: "Answer was too short to show what you did", quote: thin.text.slice(0, 160), better: "Add the situation, the specific action you took, and the result — with a number if you have one." });
    if (fillerTurn && (fillerTurn.text.match(FILLERS) || []).length >= 2) improvements.push({ issue: "Filler words weakened this answer", quote: fillerTurn.text.slice(0, 160), better: "Pause silently instead of saying “um” or “like” — a one-second pause sounds confident." });
    if (numbers === 0 && kind !== "fpclient") improvements.push({ issue: "No numbers or measurable results", quote: (mine[1] || mine[0])?.text.slice(0, 160) || "", better: "Use real figures from your work (lines of code, users, hours saved, returns in a backtest)." });
    if (m.questionsAsked < 2) improvements.push({ issue: "You asked very few questions", quote: mine[mine.length - 1]?.text.slice(0, 160) || "", better: kind === "interview" ? "End with a question like “What does a great intern do in the first month here?”" : "Ask open questions before giving answers or pitching." });
    // Answer-by-answer: score each reply on length, specifics and fillers.
    const answers = thread
      .map((t, i) => ({ t, prev: thread[i - 1] }))
      .filter(({ t }) => t.from === "me")
      .slice(0, 10)
      .map(({ t, prev }) => {
        const w = words(t.text).length;
        const nums = (t.text.match(/\d/g) || []).length;
        const fill = (t.text.match(FILLERS) || []).length;
        if (kind === "fpclient") {
          // A planner's lines are judged like a planner's: open questions, empathy, plain words, summaries.
          const x = t.text;
          const p = prev?.text || "";
          const open = /\b(what|how|tell me|walk me through|why|describe|talk me through)\b/i.test(x) && /\?|tell me|walk me/i.test(x);
          const closed = /^(do|did|are|is|have|has|can|will|would)\b[^?]*\?$/i.test(x.trim()) && w < 14;
          const feeling = /\b(worried|scared|nervous|stress|anxious|embarrass|lost|divorce|passed away|laid off|rough|hard)\b/i.test(p);
          const empathy = /\b(understand|sorry|that's (hard|tough|stressful|a lot)|i hear you|makes sense|totally|of course|no problem|take your time)\b/i.test(x);
          const jargon = /\b(asset allocation|sequence of returns|expense ratio|standard deviation|amortiz\w*|liquidity|basis points|tax.?loss harvest\w*)\b/i.test(x);
          const summary = /\b(so what I'?m hearing|it sounds like|to recap|if I understand|so you'?re saying|let me make sure)\b/i.test(x);
          const promise = /\b(guarantee|can't lose|risk.?free)\b/i.test(x);
          const why = /(because|since|so that|so a|which means|that way|so you)/i.test(x);
          const score = clamp(62 + (open ? 14 : 0) + (summary ? 14 : 0) + (why ? 12 : 0) + (feeling && empathy ? 14 : 0) - (closed ? 8 : 0) - (feeling && !empathy ? 14 : 0) - (jargon ? 12 : 0) - (promise ? 30 : 0) - fill * 6 - (w > 110 ? 12 : 0));
          const tip = promise ? "Never promise returns or guarantees." : feeling && !empathy ? "They shared a feeling — acknowledge it before moving on." : jargon ? "Jargon — say it in everyday words." : w > 110 ? "Long — break it up and check in with them." : summary ? "Great reflective listening." : why ? "Nice — you explained why it fits them." : feeling && empathy ? "Nice — you acknowledged how they feel." : open ? "Good open question — it lets them talk." : closed ? "Yes/no question — try “Tell me about…” to get more." : fill >= 2 ? "Cut the filler words; pause instead." : "Clear and focused.";
          return { prompt: p.slice(0, 90), quote: words(x).slice(0, 15).join(" "), score, tip };
        }
        const score = clamp(40 + Math.min(30, w / 2) + (nums ? 12 : 0) + (/\bI (built|made|led|fixed|learned|created|tested)\b/i.test(t.text) ? 10 : 0) - fill * 7 - (w > 200 ? 15 : 0));
        const tip = w < 25 ? "Too short — add what you did and what happened." : fill >= 2 ? "Cut the filler words; pause instead." : !nums && kind === "interview" ? "Add a number or concrete result." : w > 200 ? "Tighten it — lead with the point, then one example." : "Good — keep this structure.";
        return { prompt: (prev?.text || "").slice(0, 90), quote: words(t.text).slice(0, 15).join(" "), score, tip };
      });
    return {
      answers,
      overall,
      verdict: overall >= 75 ? "Strong session — clear and specific." : overall >= 55 ? "Solid start with clear room to sharpen." : "A good rep — focus on specifics and structure next time.",
      categories: cats.map(([name, score]) => ({ name, score, note: score >= 75 ? "Strong" : score >= 55 ? "Okay — can be sharper" : "Needs work" })),
      tone: `You averaged ${avgWords} words per answer${m.wpm ? ` at about ${m.wpm} words per minute` : ""}, with ${m.fillersPer100} filler words per 100 words and ${m.hedges} hedge${m.hedges === 1 ? "" : "s"}. ${m.fillersPer100 < 2 ? "Your wording sounded confident." : "Cutting fillers will make you sound more confident."}`,
      strengths: [numbers ? "You used concrete numbers." : "You kept the conversation going.", actions ? "You described actions you personally took." : "You stayed engaged through every question.", m.questionsAsked >= 2 ? "You asked questions back." : "You finished the whole session."],
      improvements: improvements.slice(0, 4),
      outcome: kind === "sales" ? (sc.revealed?.length >= 2 ? "The buyer agreed to a next step." : "The buyer didn't commit.") : kind === "fpclient" ? ((sc.revealed?.length || 0) >= 4 ? "The client would likely come back." : "The client needs more trust first.") : overall >= 65 ? "Likely to advance." : "Borderline — sharpen your examples.",
      nextDrill: `Focus on “${worst[0]}”: ${worst[0].includes("STAR") ? "answer every question as situation → action → result." : worst[0].includes("question") || worst[0].includes("Discovery") ? "plan three open questions before you start." : "slow down and give one specific example per answer."}`,
      offline: true,
    };
  }
  return { setup, turn, analyze };
})();
