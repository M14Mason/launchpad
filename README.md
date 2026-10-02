# Launchpad: Mason Ngo

An internship, college, and resume app built only from verified facts.

- **Dashboard**: a readiness score, "Next moves" that raise your odds, upcoming deadlines, and your best matches.
- **Internships**: 140 real programs with official links, eligibility for you, and application dates. Every program shows your estimated chance, which starts from a real published acceptance rate (or a labeled estimate) and is adjusted for your GPA, skills, experience, and resume match. Each program page includes where to improve and your potential chance.
- **Generate tailored resume**: researches the role (live, with an API key), reorders your experience, rewords lines toward the role's keywords, and fact-checks every change. Any new number, tool, or claim is blocked. You can undo any change.
- **Colleges**: 42 colleges with real admit rates (Class of 2029 / Fall 2025), your estimated chance today, and your potential by senior year.
- **Skill Bank coach**: asks one question at a time and follows up on what's missing (what you did, a number, the result). Once a skill is proven, it adds the bullet to your resume automatically after checking it against your answers.

Sources for acceptance rates and program data are listed at the top of `js/internships.js` and `js/colleges.js`.

- **Study**: 21 tracks and 180+ AI lessons across finance and markets (accounting, valuation/DCF, options, economics, 10-Ks, personal finance, financial planning), trading and code, and career skills (Excel, public speaking, email, negotiation, LinkedIn). Unlimited quizzes (6, 10, or 15 questions at three levels), a mixed-review quiz, 20-question mock exams with printable certificates (80% to pass), graded case studies with model answers, and custom tracks that Claude builds on any topic.
- **Spoken practice**: interview, financial planning (as planner or candidate), sales, and networking. Hands-free on PC and Mac. On iPhone, tap the mic once per turn (Apple's rule) and it sends when you pause. Optional ElevenLabs voices sound human. Every session is saved with a replay, a full analysis, and a progress chart.
- **Markets**: a daily brief of 3 market stories with concepts, interview talking points, and a quiz. Includes a $10,000 paper-trading simulator with real prices (Finnhub or Claude web search for stocks, Coinbase for crypto), a trade journal, and an AI review of your process. It is for education only.
- **Pitch & LinkedIn**: a 30- or 60-second elevator pitch built from verified data, then timed and scored out loud. A LinkedIn optimizer writes your headline, About section, experience, skills, post ideas, and message templates, and fact-checks every number.
- **Reminders**: "Heads up" alerts for deadlines within 2 weeks and applications that open soon, a home-screen badge, and one-tap calendar export.
- **Tracker**: application status for each program, exact deadlines, and calendar reminders.
- **Application writing and outreach**: essays, cover letters, and networking emails drafted only from verified data. Every number is fact-checked, and missing details become [bracketed] notes for you to fill in.
- **College profile**: courses, test scores, activities, leadership, and awards, which feed into your college chances.
- **New-program finder**: an AI web search for new programs that matches your goal.
- **Resume Studio**: a live editor with an ATS score (keyword match, job-title alignment, parseability, verbs, metrics, length) and a recruiter score (7-second scan, impact, relevance, clarity, completeness). Both update as you type. It includes per-bullet diagnostics, AI improvements that are fact-checked before you accept them, job-description targeting, and an "How an ATS reads it" view. Scoring draws on Jobscan match-rate guidance and the 2018 Ladders eye-tracking study.
- **Command palette**: press Ctrl/Cmd+K to jump to any page, program, college, skill, or lesson.
- **Safety**: an automatic restore point every time the app updates, a full backup file (including your API key and phone number), and one-click restore.

## Run it

Double-click `index.html`. No install needed.

## Where data lives

Resume facts are in `js/profile.js`, which is public in the repo. Your phone number, API key, Skill Bank answers, coach chats, and saved resumes are stored in your browser. To keep them the same on your PC and phone, turn on **Settings → Sync between devices**. It saves everything to a secret gist on your GitHub account. Only your GitHub token is needed, and there is no passphrase.

## AI features (optional)

Add a Claude API key from console.anthropic.com in Settings. It enables live research, keyword rewording, the adaptive coach, "Find roles", and interview feedback.
