# Launchpad: Mason Ngo

An internship, college, and resume app built only from verified facts.

- **Dashboard**: a readiness score, "Next moves" that raise your odds, upcoming deadlines, and your best matches.
- **Internships**: 140 real programs with official links, eligibility for you, and application dates. Every program shows your estimated chance, which starts from a real published acceptance rate (or a labeled estimate) and is adjusted for your GPA, skills, experience, and resume match. Each program page includes where to improve and your potential chance.
- **Generate tailored resume**: researches the role (live, with an API key), reorders your experience, rewords lines toward the role's keywords, and fact-checks every change. Any new number, tool, or claim is blocked. You can undo any change.
- **Colleges**: 42 colleges with real admit rates (Class of 2029 / Fall 2025), your estimated chance today, and your potential by senior year.
- **Skill Bank coach**: asks one question at a time and follows up on what's missing (what you did, a number, the result). Once a skill is proven, it adds the bullet to your resume automatically after checking it against your answers.

Sources for acceptance rates and program data are listed at the top of `js/internships.js` and `js/colleges.js`.

## Run it

Double-click `index.html`. No install needed.

## Where data lives

Resume facts are in `js/profile.js`, which is public in the repo. Your phone number, API key, Skill Bank answers, coach chats, and saved resumes are stored only in your browser. Use Settings → Export backup to move them to another device.

## AI features (optional)

Add a Claude API key from console.anthropic.com in Settings. It enables live research, keyword rewording, the adaptive coach, "Find roles", and interview feedback.
