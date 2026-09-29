// MASON'S IMMUTABLE DATA BLOCK
// Every resume line in the app comes from here (or from answers Mason writes in the Skill Bank).
// Nothing is added, inferred, or "filled in". Edit this file only when Mason verifies a new fact.
//
// Deliberately NOT stored here (this repo is public on GitHub):
//   - Phone number -> entered once in Settings, saved only in your browser
//   - Date of birth -> removed from resumes; only the month Mason turns 16 is kept for age-gated programs

window.PROFILE = {
  name: "Mason Ngo",
  location: "Rancho Santa Fe, CA",
  email: "masonngo70@gmail.com",
  linkedin: "linkedin.com/in/mason-ngo-29261b40a",
  portfolio: "masonngo.weebly.com",
  turns16: "Dec 2026",
  grade: 10,

  education: {
    id: "edu",
    school: "Canyon Crest Academy",
    city: "San Diego, CA",
    gradYear: 2029,
    gpa: "4.0",
    concentration: "Business Finance",
    coursework: ["Math 1 Honors", "Math 2", "Intro to Business", "Marketing", "Photography"],
    notes: ["Post-high-school reading and math levels (STAR assessments)"],
  },

  summary: [
    "Self-directed high school developer and award-winning photographer.",
    "Built an autonomous Python trading bot (Alpaca API; backtested 100+ strategies).",
    "Designed the Keen study app (30,000 questions, spaced repetition).",
    "4.0 GPA, Business Finance concentration at Canyon Crest Academy.",
    "3 edX Verified Certificates in trading.",
  ],

  projects: [
    {
      id: "bot",
      title: "Algorithmic Trading Bot (Python, Alpaca API)",
      dates: "2026–Present",
      bullets: [
        "Built and maintain an autonomous day-trading bot in Python, integrated with the Alpaca brokerage API",
        "Run the bot as a persistent background service across scheduled market sessions",
        "Backtested 100+ strategies, including EMA crossovers, RSI mean-reversion, and ATR-based volatility stops",
        "Implemented risk controls: stop-losses, per-trade risk caps, and a reward-to-risk gate",
        "Built a Flask performance dashboard tracking positions, orders, and trade decisions in real time",
      ],
    },
    {
      id: "keen",
      title: "Keen — Study App",
      dates: "2025–Present",
      bullets: [
        "Designed and built a study app with 30,000 questions across 144 courses",
        "Core differentiator: automatic retesting on missed questions using spaced repetition",
        "Reworded question variants prevent memorization of Q&A pairs",
        "Own the question bank structure, course organization, and spaced-repetition scheduling logic",
      ],
    },
    {
      id: "titan",
      title: "Titan — Fitness Tracking Web App",
      dates: "2025–Present",
      bullets: [
        "Designed and built a web app that creates fitness programs and tracks progress",
        "Self-hosted on a custom Python server",
        "Integrated Apple Health data sync (heart rate, sleep, and respiratory data)",
        "Includes AI-based food logging",
      ],
    },
  ],

  experience: [
    {
      id: "photo",
      title: "Freelance Photographer",
      org: "Self-employed",
      place: "San Diego, CA",
      dates: "2024–Present",
      bullets: [
        "Edited over 10,000 photos in Adobe Lightroom",
        "Captured people, animals, and events across outdoor and indoor settings",
        "Grew digital portfolio and social presence to 100+ followers",
      ],
    },
    {
      id: "carwash",
      title: "Car Washer",
      org: "",
      place: "San Diego, CA",
      dates: "2023–Present",
      bullets: [
        "Washed and detailed vehicles to customer specification",
        "Adjusted service based on direct client feedback",
      ],
    },
  ],

  // Shown on resumes only once Mason adds a real bullet for it in the Skill Bank.
  internships: [
    { id: "bakerave", title: "Remote Intern", org: "Baker Ave", place: "Remote", dates: "2026–Present", bullets: [] },
  ],

  certifications: [
    { id: "cert-pro", text: "Stock Trading Professional Certification Examination — edX Verified Certificate (May 2026)" },
    { id: "cert-ta", text: "Technical Analysis and the Skill of Day Trading — edX Verified Certificate (May 2026)" },
    { id: "cert-intro", text: "Intro to Stock Trading — edX Verified Certificate (May 2026)" },
  ],

  awards: [
    { id: "award-fair", text: "1st Place, High School Animal Photography — San Diego County Fair (2026)" },
    { id: "award-sdag", text: "3rd Place, Photography — SDAG Small Image Show, juried by Blanca Bergman (Aug 2026)" },
  ],

  languages: ["English (Native)", "Spanish (Novice)"],
  hobbies: ["Amateur Boxer", "Soccer", "AI/Tech Enthusiast", "Biking", "Outdoor Photography"],
};

// Skills exactly as listed in the data block. `evidence` = data-block items that directly show the skill.
// Empty evidence is honest: it means nothing in the data block proves it yet (use Improve Skill).
window.BASE_SKILLS = [
  { id: "trading-systems", name: "Automated Trading Systems", type: "technical", evidence: ["bot", "cert-pro", "cert-intro"] },
  { id: "technical-analysis", name: "Technical Analysis", type: "technical", evidence: ["bot", "cert-ta"] },
  { id: "backtesting", name: "Backtesting", type: "technical", evidence: ["bot"] },
  { id: "python", name: "Python", type: "technical", evidence: ["bot", "titan"] },
  { id: "ai-dev", name: "AI-Assisted Development", type: "technical", evidence: [] },
  { id: "lightroom", name: "Adobe Lightroom", type: "technical", evidence: ["photo"] },
  { id: "retouching", name: "Photo Retouching", type: "technical", evidence: ["photo"] },
  { id: "composition", name: "Composition", type: "technical", evidence: ["photo", "award-fair", "award-sdag"] },
  { id: "portfolio-dev", name: "Portfolio Development", type: "technical", evidence: ["photo"] },
  { id: "social-media", name: "Social Media Marketing", type: "technical", evidence: ["photo"] },
  { id: "time-management", name: "Time Management", type: "soft", evidence: [] },
  { id: "problem-solving", name: "Problem Solving", type: "soft", evidence: [] },
  { id: "self-motivated", name: "Self-motivated", type: "soft", evidence: [] },
  { id: "attention-to-detail", name: "Attention to Detail", type: "soft", evidence: [] },
  { id: "teamwork", name: "Team Collaboration", type: "soft", evidence: [] },
];
