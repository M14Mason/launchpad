// Company + role catalog. Eligibility was checked against public sources in Sep 2026 —
// programs change every year, so always confirm on the source link before applying.
//
// eligibility.status:
//   "eligible"   -> open to Mason now
//   "soon"       -> not yet (age or grade), resume can be prepped ahead of time
//   "ineligible" -> refused (college-only, residency, etc.) with alternatives suggested
//
// keywords = what this kind of posting usually screens for (NOT copied from a live posting).
// `any` lists the words an ATS would accept for that keyword. Paste the real posting for an exact match.

const K = (term, any, req = false) => ({ term, any: any || [term.toLowerCase()], req });

window.COMPANIES = [
  {
    id: "sdcity",
    name: "City of San Diego",
    blurb: "Employ & Empower paid youth internships in city departments",
    source: "https://www.sandiego.gov/employ-empower",
    roles: [
      {
        id: "sdcity-ee",
        title: "Employ & Empower Intern — Finance / IT departments",
        type: "Paid internship · San Diego",
        category: "finance",
        eligibility: {
          status: "soon",
          reason: "Open to California youth ages 16–30 enrolled in school (about 20% of interns are high schoolers). You qualify once you turn 16 (Dec 2026).",
        },
        keywords: [
          K("Microsoft Excel", ["excel", "spreadsheet"], true),
          K("Communication", ["communication", "communicate"], true),
          K("Finance", ["finance", "financial", "business finance"], true),
          K("Customer service", ["customer service"]),
          K("Data entry", ["data entry"]),
          K("Team Collaboration", ["team collaboration", "teamwork"]),
          K("Time Management", ["time management"]),
          K("Attention to Detail", ["attention to detail"]),
          K("Research", ["research"]),
        ],
      },
    ],
  },
  {
    id: "sdsc",
    name: "San Diego Supercomputer Center (UC San Diego)",
    blurb: "Research Experience for High School Students (REHS)",
    source: "https://education.sdsc.edu/studenttech/internship/",
    roles: [
      {
        id: "sdsc-rehs",
        title: "REHS Research Intern (computational research)",
        type: "Unpaid summer research internship · June–July",
        category: "tech",
        eligibility: {
          status: "eligible",
          reason: "Open to high school students. Minimum age/grade isn't stated on the overview page — confirm on the REHS application page.",
        },
        keywords: [
          K("Python", ["python"], true),
          K("Programming", ["python", "programming", "coding"], true),
          K("Data analysis", ["data analysis", "analytics"], true),
          K("Research", ["research"]),
          K("Data visualization", ["data visualization", "visualization"]),
          K("Machine learning / AI", ["machine learning", "ai", "artificial intelligence"]),
          K("Linux / command line", ["linux", "command line", "bash"]),
          K("Problem Solving", ["problem solving"]),
          K("Self-motivated", ["self-motivated", "self-directed"]),
        ],
      },
    ],
  },
  {
    id: "bofa",
    name: "Bank of America",
    blurb: "Student Leaders program + college summer analyst programs",
    source: "https://about.bankofamerica.com/en/making-an-impact/student-leaders",
    roles: [
      {
        id: "bofa-leaders",
        title: "Student Leaders (paid 8-week nonprofit internship + DC summit)",
        type: "Paid summer internship · local nonprofit",
        category: "community",
        eligibility: {
          status: "soon",
          reason: "Juniors and seniors only, and you must live in a participating community. Applications usually open Oct–Jan — you can apply in fall 2027 as a junior.",
        },
        keywords: [
          K("Community service", ["community service", "volunteer", "volunteering"], true),
          K("Leadership", ["leadership", "led", "lead"], true),
          K("Communication", ["communication", "communicate"], true),
          K("Team Collaboration", ["team collaboration", "teamwork"]),
          K("Nonprofit", ["nonprofit", "non-profit"]),
          K("Self-motivated", ["self-motivated", "self-directed"]),
          K("Time Management", ["time management"]),
        ],
      },
      {
        id: "bofa-analyst",
        title: "Global Markets Summer Analyst",
        type: "Paid summer internship",
        category: "finance",
        eligibility: {
          status: "ineligible",
          reason: "Summer Analyst programs are for college students (typically rising college juniors).",
        },
        keywords: [K("Excel", ["excel"], true), K("Financial modeling", ["financial modeling"], true)],
      },
    ],
  },
  {
    id: "goldman",
    name: "Goldman Sachs",
    blurb: "Summer Analyst program",
    source: "https://www.goldmansachs.com/careers/students",
    roles: [
      {
        id: "gs-analyst",
        title: "Summer Analyst",
        type: "Paid summer internship",
        category: "finance",
        eligibility: { status: "ineligible", reason: "College-only program (undergraduates)." },
        keywords: [K("Excel", ["excel"], true), K("Financial modeling", ["financial modeling"], true)],
      },
    ],
  },
  {
    id: "nasa",
    name: "NASA",
    blurb: "Office of STEM Engagement (OSTEM) internships",
    source: "https://www.nasa.gov/learning-resources/internship-programs/",
    roles: [
      {
        id: "nasa-ostem",
        title: "OSTEM Intern",
        type: "Paid internship",
        category: "tech",
        eligibility: {
          status: "ineligible",
          reason: "As of the 2026–27 cycle, applicants must be enrolled in college/technical school (plus U.S. citizen, 16+, 3.0 GPA). High schoolers no longer meet the enrollment rule.",
        },
        keywords: [K("Python", ["python"], true), K("Research", ["research"], true)],
      },
    ],
  },
  {
    id: "qualcomm",
    name: "Qualcomm",
    blurb: "Engineering internships (San Diego HQ)",
    source: "https://www.qualcomm.com/company/careers/internships-and-early-in-career-opportunities",
    roles: [
      {
        id: "qc-eng",
        title: "Software / Engineering Intern",
        type: "Paid summer internship · San Diego",
        category: "tech",
        eligibility: { status: "ineligible", reason: "For undergraduate and graduate engineering/CS students." },
        keywords: [K("C/C++", ["c++"], true), K("Python", ["python"], true)],
      },
    ],
  },
  {
    id: "c2c",
    name: "San Diego Workforce Partnership",
    blurb: "CONNECT2Careers paid youth jobs",
    source: "https://c2csd.org/",
    roles: [
      {
        id: "c2c-youth",
        title: "CONNECT2Careers Summer Job / Internship",
        type: "Paid summer work experience",
        category: "general",
        eligibility: {
          status: "ineligible",
          reason: "Ages 16–21 who live inside the City of San Diego. Rancho Santa Fe is outside city limits, so you likely don't qualify — confirm with C2C.",
        },
        keywords: [K("Customer service", ["customer service"], true), K("Communication", ["communication"], true)],
      },
    ],
  },
  {
    id: "ladder",
    name: "Ladder Internships",
    blurb: "Selective startup internships for high schoolers (remote)",
    source: "https://www.ladderinternships.com/",
    roles: [
      {
        id: "ladder-startup",
        title: "Startup Intern (tech / AI / marketing tracks)",
        type: "Remote program · check fees on their site",
        category: "tech",
        eligibility: {
          status: "soon",
          reason: "Must be at least 16 before starting the application — you qualify after you turn 16 (Dec 2026). It's a structured program, so check whether it charges a fee.",
        },
        keywords: [
          K("Python", ["python"], true),
          K("AI", ["ai", "artificial intelligence"], true),
          K("Self-motivated", ["self-motivated", "self-directed"], true),
          K("Social Media Marketing", ["social media"]),
          K("Marketing", ["marketing"]),
          K("Startup / product", ["startup", "product"]),
          K("Research", ["research"]),
          K("Communication", ["communication"]),
        ],
      },
    ],
  },
];

// Vocabulary used to pull keywords out of a pasted job posting when no AI key is set.
window.SKILL_VOCAB = [
  K("Python", ["python"]), K("Java", ["java"]), K("JavaScript", ["javascript", "js"]), K("SQL", ["sql"]),
  K("C/C++", ["c++"]), K("HTML/CSS", ["html", "css"]), K("Git", ["git", "github"]),
  K("Microsoft Excel", ["excel", "spreadsheet"]), K("Microsoft Office", ["microsoft office", "word", "powerpoint"]),
  K("Google Workspace", ["google sheets", "google docs", "google workspace"]),
  K("Data analysis", ["data analysis", "analyze data", "analytics"]), K("Data entry", ["data entry"]),
  K("Financial modeling", ["financial modeling"]), K("Accounting", ["accounting", "bookkeeping"]),
  K("Finance", ["finance", "financial"]), K("Investing / trading", ["trading", "investing", "stock*"]),
  K("Research", ["research"]), K("Machine learning / AI", ["machine learning", "artificial intelligence", "ai"]),
  K("API integration", ["api"]), K("Web development", ["web development", "web app", "website"]),
  K("Adobe Lightroom", ["lightroom"]), K("Adobe Photoshop", ["photoshop"]), K("Photography", ["photography", "photo"]),
  K("Social Media Marketing", ["social media"]), K("Marketing", ["marketing"]), K("Content creation", ["content creation", "content"]),
  K("Customer service", ["customer service", "customers"]), K("Sales", ["sales"]),
  K("Communication", ["communication", "communicate"]), K("Team Collaboration", ["teamwork", "team player", "collaborat*"]),
  K("Leadership", ["leadership", "lead"]), K("Time Management", ["time management", "deadlines"]),
  K("Problem Solving", ["problem solving", "problem-solving"]), K("Attention to Detail", ["attention to detail", "detail-oriented", "detail oriented"]),
  K("Self-motivated", ["self-motivated", "self-starter", "independently"]), K("Community service", ["community service", "volunteer"]),
  K("Spanish", ["spanish", "bilingual"]),
];
