# Resume Builder — Mason Ngo

A resume generator that uses only verified facts and never makes anything up.

- **Build**: pick a company, pick a role, and get an ATS-friendly resume tailored to it, with a 0–100 rubric score, matched and missing keywords, and 3 interview practice questions.
- **Eligibility filter**: college-only roles are refused, and the app suggests roles you can actually apply to.
- **Skill Bank**: every skill gets a score for how much it will count on a resume. **Improve skill** asks you questions, saves your answers, and turns them into resume bullets. A bullet can't include a number that isn't already in your answers.
- **Master Resume**: everything verified in one place, plus the weak spots a recruiter will notice.

## Where the data lives

| What | Where | Public? |
|---|---|---|
| Resume facts | `js/profile.js` | Yes (in the repo) |
| Companies/roles | `js/companies.js` | Yes |
| Phone, API key, Skill Bank answers | Your browser (localStorage) | No |

Use **Settings → Export backup** to move your Skill Bank to another device.

## Put it on GitHub Pages

1. Create a repo on github.com (e.g. `resume-builder`) and push this folder.
2. In the repo, go to **Settings → Pages → Build and deployment**, set Source to *Deploy from a branch*, choose Branch `main` and folder `/ (root)`, then click Save.
3. After a minute, it's live at `https://<your-username>.github.io/resume-builder/`.

## AI features (optional)

Add a Claude API key from [console.anthropic.com](https://console.anthropic.com) under **Settings**. It powers:

- **Find roles**: live web search of any company's openings, with an eligibility check
- **Generate more questions**: new questions for a skill
- **Draft from my answers**: turns your answers into a bullet
- **Answer feedback**: scores your interview answers

The key is saved only in your browser. Only use it on your own device.

## Editing facts

When something new is verified (for example, real Baker Ave work), add it through the Skill Bank or edit `js/profile.js`. Never add anything that isn't true. The app's scores assume every line is defensible in an interview.
