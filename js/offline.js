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
  };
  const BUYER = {
    objections: ["Honestly, it sounds expensive. What does it cost?", "We already use something for this. Why switch?", "I'm not sure we need it right now.", "How do I know it actually works?", "I'd have to run this by my partner first."],
    needs: ["Our biggest problem is wasted time — everything is manual.", "We've lost customers because things fall through the cracks.", "Budget is tight this quarter, so it has to pay for itself."],
  };
  const NETWORK = ["Nice to meet you, Mason. So what got you interested in finance?", "That's impressive for a sophomore. What are you hoping to do this summer?", "Honestly, the best thing I did early on was talk to a lot of people.", "My team does a mix of analysis and client work. It's busy but fun.", "Sure, what would you like to know?"];

  function setup(kind, opts, difficulty) {
    const g = Math.random() < 0.5 ? "female" : "male";
    const name = pick(NAMES[g]);
    const base = { offline: true, counterpart: { name, gender: g, role: "" }, objectives: [], hidden: "", maxTurns: 12, step: 0, followed: {}, revealed: [] };
    if (kind === "interview") {
      const qs = (BANKS[opts.interviewType] || BANKS.behavioral).slice(0, Math.max(3, opts.count || 5));
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

  function turn(sc, thread, kind) {
    const mine = thread.filter((t) => t.from === "me");
    const last = mine[mine.length - 1]?.text || "";
    const n = words(last).length;
    const ack = pick(ACKS);
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
      const asked = /\?|what|how|tell me|do you/i.test(last);
      const hit = CLIENT.facts.find(([re], i) => re.test(last) && !sc.revealed.includes(i));
      if (hit) sc.revealed.push(CLIENT.facts.indexOf(hit));
      if (mine.length >= 9) return { reply: `${sc.revealed.length >= 4 ? "This actually helps a lot. I feel like I have a plan." : "Okay... I think I need to think about it more."} Thanks for your time.`, end: true };
      return { reply: hit ? hit[1] : asked ? pick(["I'm not totally sure. What do you mean exactly?", "Good question. Honestly, I've never thought about that."]) : pick(CLIENT.fillers), end: false };
    }
    if (kind === "sales") {
      const asked = /\?/.test(last) || /\b(what|how|why|tell me|do you|are you)\b/i.test(last);
      if (/\b(next step|sign|trial|demo|would you be open|can we|shall we|ready to|get started|buy)\b/i.test(last) && mine.length >= 3)
        return { reply: sc.revealed.length >= 2 ? "Okay, you've made a good case. Let's set up a trial next week." : "I'm not convinced yet — you never really asked what we need. I'll pass for now.", end: true };
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
      fpclient: [["Rapport & empathy", clamp(50 + (all.match(/\b(understand|makes sense|that's|totally|sounds)\b/gi) || []).length * 8)], ["Discovery questions", clamp(25 + (sc.revealed?.length || 0) * 11 + m.questionsAsked * 4)], ["Advice quality & suitability", clamp(40 + (all.match(/\b(emergency fund|budget|401|match|roth|pay off|interest|index fund)\b/gi) || []).length * 9)], ["Clarity (no jargon)", clamp(85 - (all.match(/\b(asset allocation|liquidity|basis points|expense ratio|beta)\b/gi) || []).length * 10)], ["Delivery & confidence", delivery]],
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
    if (numbers === 0) improvements.push({ issue: "No numbers or measurable results", quote: (mine[1] || mine[0])?.text.slice(0, 160) || "", better: "Use real figures from your work (lines of code, users, hours saved, returns in a backtest)." });
    if (m.questionsAsked < 2) improvements.push({ issue: "You asked very few questions", quote: mine[mine.length - 1]?.text.slice(0, 160) || "", better: kind === "interview" ? "End with a question like “What does a great intern do in the first month here?”" : "Ask open questions before giving answers or pitching." });
    return {
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
