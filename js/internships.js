// Big catalog of REAL programs for high schoolers, compiled Sep 2026 from these curated lists
// (each row links to the program's official page — details change yearly, always confirm):
//   CollegeVine, Ladder Internships, Veritas AI (San Diego lists) · Extern "Internships for HS Students 2027"
//   Empowerly (finance + remote lists) · CollegeVine + College Transitions + StandOut (CS lists) · Ladder (remote, finance)
//
// Status is judged for Mason: 10th grade in 2026–27 (rising junior in summer 2027), turns 16 in Dec 2026
// (before most 2027 deadlines), lives in San Diego County. Citizenship isn't in the data block.
//   eligible   = can apply this cycle          soon       = a later grade/age
//   check      = depends on something the data block doesn't say (gender, background, income, a course taken)
//   ineligible = college-only or local-residents-only elsewhere
//
// Row: [organization, program, eligibility as published, location, mode, pay, typical deadline, url, field, kind, status, note]

(() => {
  const rows = [
    // ---------------- San Diego County ----------------
    ["Palomar Health", "Pathmaker Internship", "Ages 16+", "Escondido, CA", "in-person", "Unpaid ($150 onboarding fee)", "Quarterly (Oct, Jan, Apr, Jul)", "https://www.palomarhealth.org/pathmaker-internship-program/", "health", "internship", "eligible", "Rotations open 4× a year — apply once you're 16."],
    ["Rady Children's Hospital", "FACES for the Future", "Sophomores through seniors", "San Diego, CA", "in-person", "Unpaid", "Varies", "https://sdhealthscholars.org/about-faces-for-the-future/", "health", "program", "eligible", "Confirm your school participates."],
    ["Banfield Pet Hospital", "NextVet", "High school students", "San Diego, CA", "in-person", "Paid ($15+/hr)", "Rolling", "https://jobs.banfield.com/NextVet", "health", "internship", "eligible", ""],
    ["Scripps Research Translational Institute", "Student Research Internship (SURI)", "Ages 16+", "La Jolla, CA", "in-person", "Stipend varies", "Late March", "https://www.scripps.edu/science-and-medicine/translational-institute/education-and-training/student-research-internship/", "research", "research", "eligible", ""],
    ["Scripps Research", "High School Student Research Education Program", "Ages 16+, 3.0+ GPA, San Diego County resident", "La Jolla, CA", "in-person", "Paid (~$5,040)", "March", "https://education.scripps.edu/k-12-outreach/ca-outreach/hs-internships/", "research", "research", "eligible", "Your GPA and county both qualify."],
    ["Salk Institute", "Heithoff-Brody High School Scholars", "Ages 16+, 2.75+ GPA, San Diego County, completed biology/chemistry", "La Jolla, CA", "in-person", "Paid ($17/hr)", "March", "https://www.salk.edu/about/education-outreach/programs/high-school-scholars/", "research", "research", "check", "Requires completed biology/chemistry — not in your data block."],
    ["J. Craig Venter Institute", "High School Internship", "Ages 16+", "La Jolla, CA", "in-person", "Paid (~$17.50/hr)", "Rolling", "https://www.jcvi.org/careers#internships", "research", "research", "eligible", ""],
    ["U.S. Navy", "Science & Engineering Apprenticeship Program (SEAP)", "Grades 10–12, age 16+, U.S. citizen", "San Diego, CA + nationwide", "in-person", "Paid ($4,000–$4,500 stipend)", "Nov 1", "https://www.navalsteminterns.us/seap/", "tech", "internship", "eligible", "Deadline is usually Nov 1 — apply now. U.S. citizens only; confirm the age-16 cutoff date."],
    ["U.S. House — Rep. Scott Peters", "San Diego District Office Internship", "High school seniors", "San Diego, CA", "in-person", "Paid (~$16.85/hr)", "Dec, Apr, Sep", "https://scottpeters.house.gov/internships", "gov", "internship", "soon", "Seniors only — apply in 2028–29."],
    ["Pacific Arts Movement", "Reel Voices", "High school students", "San Diego, CA", "in-person", "$500 scholarship", "April", "https://pacarts.org/reel-voices/", "arts", "program", "eligible", ""],
    ["Birch Aquarium (UC San Diego)", "Volunteer Program", "High school students", "La Jolla, CA", "in-person", "Unpaid", "Rolling", "https://aquarium.ucsd.edu/about/volunteer", "community", "volunteer", "eligible", ""],
    ["San Diego Natural History Museum", "Youth Internship Program", "Ages 16+, for school credit, biology course completed", "San Diego, CA", "in-person", "Unpaid", "Rolling", "https://www.sdnhm.org/join-and-give/volunteer/internships/", "research", "internship", "check", "Needs school credit and a completed biology course — not in your data block."],
    ["Fleet Science Center", "Volunteer Program", "Ages 18+", "San Diego, CA", "in-person", "Unpaid", "Rolling", "https://www.fleetscience.org/volunteer", "community", "volunteer", "soon", "18+ only."],
    ["San Diego County Sheriff's Department", "Student Worker", "Full-time high schoolers, 2.0+ GPA", "San Diego, CA", "in-person", "Paid", "Rolling", "https://www.joinsdsheriff.net/civilian-careers/student-workers/student-worker-19090504-undergraduate-graduate-tech-and-high-school", "gov", "internship", "eligible", ""],
    ["San Diego Sockers", "Internships", "High school students", "San Diego, CA", "in-person", "Unpaid", "Rolling", "https://www.sdsockers.com/internships", "business", "internship", "eligible", "Sports media/marketing — your photography fits."],
    ["San Diego History Center", "Internships", "Ages 15+", "San Diego, CA", "in-person", "Unpaid", "Jan 15, Apr 30, Sep 8", "https://sandiegohistory.org/internships/", "arts", "internship", "eligible", ""],
    ["San Diego Museum of Art", "Teen Council", "Grades 9–12", "San Diego, CA", "in-person", "Unpaid", "Varies", "https://www.sdmart.org/teens/", "arts", "program", "eligible", ""],
    ["La Jolla Playhouse", "Internships", "Recent high school graduates", "La Jolla, CA", "in-person", "Paid (minimum wage)", "July", "https://lajollaplayhouse.org/who-we-are/get-involved/internships/", "arts", "internship", "soon", "After you graduate (2029)."],
    ["DPR Construction", "Build Up High School Internship", "Rising juniors/seniors and recent grads", "San Diego, CA", "in-person", "Paid", "April", "https://www.dpr.com/build-up-high-school-internship", "tech", "internship", "eligible", "You're a rising junior in summer 2027."],
    ["Media Arts Center San Diego", "Internship", "High school students", "San Diego, CA", "in-person", "Unpaid", "Varies", "https://mediaartscenter.org/home/education/internships/", "arts", "internship", "eligible", "Media/photo work — fits your portfolio."],
    ["San Diego Zoo Wildlife Alliance", "Internships", "High school students", "San Diego, CA", "in-person", "Paid/unpaid", "Nov–Jan", "https://sandiegozoowildlifealliance.org/jobs/internships", "research", "internship", "eligible", "Your animal photography award is relevant."],
    ["Sharp Memorial Hospital", "High School Internship", "Ages 15+, 100-hour minimum", "San Diego, CA", "in-person", "Unpaid", "Spring", "https://www.sharp.com/volunteers/memorial", "health", "internship", "eligible", ""],
    ["San Diego Air & Space Museum", "Volunteer Program", "High school students", "San Diego, CA", "in-person", "Unpaid", "Rolling", "https://sandiegoairandspace.org/support/volunteer-at-the-museum", "community", "volunteer", "eligible", ""],
    ["San Diego Public Library", "Teen Volunteer", "High school students", "San Diego, CA", "in-person", "Unpaid", "Rolling", "https://www.sandiego.gov/volunteer-program/opportunities/communityservices/library", "community", "volunteer", "eligible", ""],
    ["City of San Diego", "Department Volunteer Internships", "High school students (varies by department)", "San Diego, CA", "in-person", "Varies", "Year-round", "https://app.betterimpact.com/PublicOrganization/a267e329-b05d-489d-a0ef-2f1c9cfd48cc/1", "gov", "internship", "eligible", ""],
    ["Air Force Research Laboratory", "AFRL Scholars", "Ages 16+, 3.0+ GPA, U.S. citizen", "AFRL sites nationwide", "in-person", "Paid (~$500/week)", "Jan 10", "https://afrlscholars.usra.edu/scholarsprogram/", "tech", "internship", "eligible", "U.S. citizens only; must live near an AFRL site."],
    ["Alliance of Chinese Americans San Diego", "API Summer Journalism Internship", "High schoolers of Asian/Pacific Islander descent, San Diego County", "San Diego, CA (hybrid)", "hybrid", "$250", "June 1", "https://www.acasandiego.org/", "arts", "internship", "check", "For API-descent students — your data block doesn't say."],
    ["Sanford Burnham Prebys", "SPARK", "Ages 16+, California high school student", "La Jolla, CA", "in-person", "Paid (CIRM-funded)", "April 1", "https://sbpdiscovery.org/education/internships/", "research", "research", "eligible", ""],
    ["LaunchX", "Entrepreneurship Program", "High school students", "UC San Diego + other campuses", "in-person", "Fee ($1,995–$11,495, aid available)", "Rolling", "https://launchx.com/", "business", "program", "eligible", "Program, not a job — you build a startup."],

    // ---------------- California ----------------
    ["California Science Center", "Community Teen Interns", "Grades 10–12, 2.0+ GPA, LA-area preferred", "Los Angeles, CA", "in-person", "Paid", "Varies", "https://californiasciencecenter.org/programs/community-teen-interns", "community", "internship", "check", "LA-area residents preferred."],
    ["Kaiser Permanente", "KP Launch", "Ages 16–19, Northern California", "Northern California", "in-person", "Paid (~$24/hr)", "January", "https://about.kaiserpermanente.org/community-health/education/career-launch-programs", "health", "internship", "ineligible", "Northern California residents only."],
    ["Stanford Medicine", "SIMR (Stanford Institutes of Medicine Summer Research)", "Juniors/seniors, 16+, U.S. citizen/PR", "Stanford, CA", "in-person", "Free", "Late fall", "https://med.stanford.edu/simr.html", "research", "research", "soon", "Apply in fall 2027 as a junior."],
    ["UC Santa Barbara", "Research Mentorship Program (RMP)", "10th–11th grade, 3.8+ GPA", "Santa Barbara, CA", "in-person", "See site (aid available)", "March", "https://www.summer.ucsb.edu/pre-college/research-mentorship-program", "research", "research", "eligible", "You're in 10th with a 4.0 — strong match."],
    ["Stanford AIMI", "Summer Research Internship (AI in medicine)", "Ages 14+, U.S. residents", "Remote / Stanford, CA", "remote", "Fee (~$850, aid available)", "Late Feb", "https://aimi.stanford.edu/education/summer-research-internship", "tech", "research", "eligible", "AI + Python — fits your projects."],
    ["Stanford SHTEM", "SHTEM Summer Internships", "High school juniors/seniors, 14+", "Remote", "remote", "Free ($50 app fee, waivers)", "March", "https://compression.stanford.edu/outreach/shtem-summer-internships-high-schoolers-and-community-college-students", "tech", "research", "check", "Listed for juniors/seniors — confirm whether rising juniors qualify."],
    ["UC Berkeley Haas", "Business Academy for Youth (B-BAY)", "Grades 9–12", "Berkeley, CA", "in-person", "Fee (~$6,050 CA residents)", "Spring", "https://haas.berkeley.edu/", "business", "program", "eligible", ""],
    ["UCLA", "Introduction to Investments Summer Institute", "Ages 15+, 3.2+ GPA", "Los Angeles, CA / virtual", "hybrid", "Fee (scholarships available)", "June", "https://www.uclaextension.edu/", "finance", "program", "eligible", "Investing course — fits your trading work."],
    ["Stanford Pre-Collegiate Studies", "Summer Institutes", "Grades 8–11", "Online", "remote", "Fee (aid available)", "Winter", "https://spcs.stanford.edu/", "research", "program", "eligible", ""],
    ["SFUSD", "Summer Industry Internships", "SFUSD students", "San Francisco, CA", "in-person", "Paid", "Spring", "https://www.sfusd.edu/", "community", "internship", "ineligible", "San Francisco public school students only."],
    ["Golden Gate National Parks Conservancy", "I-YEL", "Bay Area public high school students", "San Francisco, CA", "in-person", "Paid", "Varies", "https://www.parksconservancy.org/", "community", "internship", "ineligible", "Bay Area students only."],
    ["City of Hope", "Roberts Summer Academy", "High school and undergraduate students", "Duarte, CA", "in-person", "Paid", "Winter", "https://www.cityofhope.org/", "research", "research", "check", "In-person near LA; confirm the minimum age."],
    ["Sandia National Laboratories", "Student Intern Program", "Ages 16+, full-time high school, 3.0+ GPA", "Livermore, CA / Albuquerque, NM", "in-person", "Paid", "Varies", "https://www.sandia.gov/careers/career-possibilities/students-and-postdocs/internships-co-ops/", "tech", "internship", "check", "Must live near Livermore or Albuquerque."],
    ["Meta", "Meta Summer Academy", "Sophomores, residents of East Palo Alto / Belle Haven / Redwood City", "Menlo Park, CA", "in-person", "Paid", "Feb", "https://metasummeracademy.com/", "tech", "internship", "ineligible", "Local residents only."],
    ["KPMG", "U.S. Empower High School Experience", "High school juniors and seniors", "NY, Denver, SF, LA", "in-person", "Paid ($22–25/hr)", "Via nonprofit partners", "https://kpmg.com/us/en/careers.html", "finance", "internship", "soon", "Juniors/seniors, applied through partner nonprofits."],
    ["CLA (CliftonLarsonAllen)", "High School Internship Program", "Juniors/seniors, ages 16–18", "Multiple U.S. offices", "in-person", "Paid", "Early spring", "https://www.claconnect.com/en/careers/high-school-internship", "finance", "internship", "check", "Confirm whether rising juniors count and if there's an office near you."],

    // ---------------- National: research / STEM ----------------
    ["NASA", "Neurodiversity Network (N3) Internship", "Ages 16+, neurodivergent high school students", "Remote", "remote", "Paid ($1,000)", "March", "https://www.nasa.gov/learning-resources/internship-programs/", "research", "research", "check", "For neurodivergent students."],
    ["NASA / UT Austin", "STEM Enhancement in Earth Science (SEES)", "Ages 16+, grades 10–11, U.S. citizen", "Remote + Austin, TX", "hybrid", "Fee (~$2,000, scholarships)", "Feb", "https://www.csr.utexas.edu/sees/", "research", "research", "eligible", "U.S. citizens only. You're in the right grade now."],
    ["NASA GISS", "Climate Change Research Initiative", "U.S. high schoolers, juniors/seniors preferred", "New York / remote", "hybrid", "Unpaid", "Varies", "https://www.giss.nasa.gov/", "research", "research", "check", "Juniors/seniors preferred."],
    ["Smithsonian National Museum of Natural History", "Summer High School Internship", "Ages 15–18, grades 9–12", "Washington, DC (hybrid/remote)", "hybrid", "Paid (~$5,600 stipend)", "March", "https://naturalhistory.si.edu/education/teen-programs", "research", "internship", "eligible", ""],
    ["Smithsonian Center for Folklife", "Folklife Internships", "Ages 14+", "Remote", "remote", "Paid", "Varies", "https://internships.si.edu/opportunity/internships-center-folklife-and-cultural-heritage", "arts", "internship", "eligible", ""],
    ["Smithsonian Science Education Center", "SSEC Internships", "Ages 16+", "Remote / Washington, DC", "hybrid", "Unpaid", "Feb, July, Oct", "https://ssec.si.edu/smithsonian-science-education-center-internship-program", "research", "internship", "eligible", ""],
    ["Smithsonian Institution", "Summer Internships (all museums)", "Ages 15–18", "Multiple", "hybrid", "Paid stipend", "March", "https://internships.si.edu/opportunities", "research", "internship", "eligible", ""],
    ["MIT / Center for Excellence in Education", "Research Science Institute (RSI)", "Rising seniors, 15+", "Cambridge, MA", "in-person", "Fully funded", "January", "https://www.cee.org/programs/rsi", "research", "research", "soon", "Apply as a junior (2027–28)."],
    ["Stony Brook University", "Simons Summer Research Program", "Rising seniors, school nomination", "Stony Brook, NY", "in-person", "Stipend", "February", "https://www.stonybrook.edu/simons/", "research", "research", "soon", "Apply as a junior."],
    ["Broad Institute", "Broad Summer Scholars (BSSP)", "Rising seniors (Massachusetts)", "Cambridge, MA", "in-person", "Paid", "Jan–Feb", "https://www.broadinstitute.org/bssp", "research", "research", "ineligible", "Massachusetts students."],
    ["Boston University", "RISE Internship", "Rising seniors", "Boston, MA", "in-person", "Fee (tuition-based)", "Mid-Feb", "https://www.bu.edu/summer/high-school-programs/rise/", "research", "research", "soon", "Apply as a junior."],
    ["Fermilab", "TARGET Internship", "Illinois sophomores/juniors, 3.0+ GPA", "Batavia, IL", "in-person", "Paid (~$16/hr)", "February", "https://internships.fnal.gov/", "research", "internship", "ineligible", "Illinois students."],
    ["Princeton University", "Laboratory Learning Program", "Ages 16–17", "Princeton, NJ", "in-person", "Free", "Feb–Mar", "https://scienceoutreach.princeton.edu/laboratory-learning-program", "research", "research", "check", "In-person in NJ; some listings say NJ students only."],
    ["Microsoft", "Discovery Program", "Graduating seniors near Redmond, WA or Atlanta", "Redmond, WA / Atlanta, GA", "in-person", "Paid (~$26/hr)", "Early March", "https://careers.microsoft.com/v2/global/en/discoveryprogram", "tech", "internship", "ineligible", "Local graduating seniors only."],
    ["Girls Who Code", "Summer Immersion Program", "Girls and non-binary students, rising 9th–11th", "Remote", "remote", "Free", "March", "https://girlswhocode.com/programs/summer-immersion-program", "tech", "program", "check", "For girls and non-binary students."],
    ["Lockheed Martin", "High School Internship", "Ages 16+, near an LM facility, not a graduating senior", "Multiple U.S. sites", "in-person", "Paid", "Fall", "https://www.lockheedmartin.com/en-us/careers/candidates/students-early-careers/high-school.html", "tech", "internship", "check", "Must live near a Lockheed Martin facility."],
    ["MIT Lincoln Laboratory", "LLRISE", "Completing junior year", "Lexington, MA", "in-person", "Free", "March", "https://www.ll.mit.edu/outreach/llrise", "tech", "program", "soon", "Apply as a junior."],
    ["MIT", "Beaver Works Summer Institute (BWSI)", "High schoolers with coding experience (mostly rising seniors)", "Cambridge, MA / online", "hybrid", "Free", "Spring", "https://beaverworks.ll.mit.edu/CMS/bw/bwsi", "tech", "program", "soon", "Mostly rising seniors."],
    ["NSA", "High School Work Study", "Juniors near NSA facilities", "MD, TX, GA, HI, CO", "in-person", "Paid", "October", "https://www.intelligencecareers.gov/nsa/students-and-internships", "tech", "internship", "ineligible", "Must live near an NSA site."],
    ["NSA", "Stokes Educational Scholarship", "High school seniors (CS, engineering, math, languages)", "Multiple", "in-person", "Tuition + salary", "Fall", "https://www.intelligencecareers.gov/nsa/students-and-internships", "tech", "internship", "soon", "Senior year."],
    ["NIH", "Summer Internship Program (HS-SIP)", "Seniors, 16+, U.S. citizen/PR", "Bethesda, MD", "in-person", "Paid stipend", "March", "https://www.training.nih.gov/programs/sip", "research", "research", "soon", "Senior year."],
    ["Fred Hutch Cancer Center", "Summer High School Internship (SHIP)", "Washington State seniors", "Seattle, WA", "in-person", "Paid", "March", "https://www.fredhutch.org/en/education-training/high-school-students/summer-high-school-internship-program.html", "research", "research", "ineligible", "Washington State students."],
    ["Children's Hospital of Philadelphia", "Research Summer Scholars", "Sophomores/juniors, Philadelphia area", "Philadelphia, PA", "in-person", "Paid", "February", "https://www.chop.edu/centers-programs/research-training-programs", "health", "research", "ineligible", "Philadelphia area only."],
    ["Johns Hopkins", "Internship in Brain Sciences (JHIBS)", "Rising juniors/seniors; some years limited to groups underrepresented in STEM", "Remote", "remote", "Unpaid", "March 1", "https://www.hopkinsmedicine.org/neurology-neurosurgery/research/jhu-nimh/jhibs", "research", "research", "check", "Confirm the current eligibility (may target underrepresented groups)."],
    ["U.S. Senate", "Senate Page Program", "Juniors, 16–17, 3.0+ GPA, Senator sponsorship", "Washington, DC", "in-person", "Paid", "Varies by Senator", "https://www.senate.gov/reference/Pages/page_program.htm", "gov", "internship", "soon", "Junior year, with a Senator's sponsorship."],
    ["U.S. Army", "AEOP High School Apprenticeships", "U.S. high school students (some sites have grade/age rules)", "Army labs nationwide", "in-person", "Stipend", "Sep–Mar", "https://www.usaeop.com/program/high-school-apprenticeships/", "research", "research", "eligible", "Check for a site near San Diego."],
    ["U.S. Department of State", "Pathways Internship", "Ages 16+, U.S. citizen, 2.0+ GPA", "Remote / multiple", "hybrid", "Paid", "Year-round", "https://careers.state.gov/interns-fellows/pathways-programs/", "gov", "internship", "eligible", "U.S. citizens only; 16+."],
    ["Bloomberg Philanthropies", "Bloomberg Arts Internship", "Rising seniors at public schools in participating cities", "9 U.S. cities", "in-person", "Paid ($20+/hr)", "Feb–Mar", "https://www.bloomberg.org/arts/strengthening-local-arts-organizations/bloomberg-arts-internship/", "arts", "internship", "soon", "Rising seniors — and San Diego must be a participating city."],
    ["Metropolitan Museum of Art", "Teen Internship Program", "10th–11th grade, NY/NJ/CT", "New York, NY", "in-person", "Paid ($1,100)", "February", "https://www.metmuseum.org/join-and-give/internships", "arts", "internship", "ineligible", "NY/NJ/CT students."],
    ["PBS NewsHour", "Student Reporting Labs", "High school students", "Remote (through partner schools)", "remote", "Varies", "Spring", "https://studentreportinglabs.org/", "arts", "program", "check", "Runs through partner schools/teachers."],
    ["California Academy of Sciences", "Careers in Science (CiS)", "9th–10th grade SFUSD students", "San Francisco, CA", "in-person", "Paid", "April", "https://www.calacademy.org/careers-in-science", "research", "internship", "ineligible", "SFUSD students only."],
    ["Seaside Sustainability", "Internships / Green Scholars", "All high school students", "Remote", "remote", "Free", "Rolling", "https://www.seasidesustainability.org/internships", "community", "internship", "eligible", ""],
    ["Texas Tech University", "Anson L. Clark Scholars", "Juniors and seniors", "Lubbock, TX", "in-person", "Paid stipend", "Late Feb", "https://www.depts.ttu.edu/honors/academicsandenrichment/affiliatedandhighschool/clarks/", "research", "research", "soon", "Apply as a junior."],
    ["NYU Tandon", "Computer Science for Cyber Security (CS4CS)", "Grades 9–12, NYC residents", "New York, NY", "in-person", "Free", "May", "https://engineering.nyu.edu/academics/programs/k12-stem-education/computer-science-cyber-security-cs4cs", "tech", "program", "ineligible", "NYC residents."],
    ["NIST", "Summer High School Intern Program (SHIP)", "Completed junior year, 3.0+ GPA", "Gaithersburg, MD / Boulder, CO", "in-person", "Varies", "February", "https://www.nist.gov/iaao/academic-affairs-office/high-school-students-ship/ship-research", "research", "research", "soon", "After junior year."],
    ["MITRE", "Nationwide High School Student Program", "Ages 14+, 3.0+ GPA", "MITRE sites", "in-person", "Paid", "Varies", "https://careers.mitre.org/us/en/nationwide-high-school-student-program", "tech", "internship", "check", "Must be near a MITRE site."],
    ["MIT", "MITES Summer", "High school juniors", "Cambridge, MA", "in-person", "Free", "February", "https://mites.mit.edu/discover-mites/mites-summer/", "tech", "program", "soon", "Apply as a junior."],
    ["Carnegie Mellon", "Computer Science Scholars (CSS)", "Sophomores, 16+", "Pittsburgh, PA", "in-person", "Free (grant-funded)", "March 1", "https://www.cmu.edu/pre-college/academic-programs/computer-science-scholars.html", "tech", "program", "eligible", "You're a sophomore now — apply this cycle."],
    ["Forage", "Virtual Work Experience Programs", "Anyone, no experience required", "Online", "remote", "Free", "Anytime", "https://www.theforage.com/", "business", "virtual", "eligible", "Self-paced company simulations — you can start today."],
    ["University of Chicago", "Data Science Institute Summer Lab", "Freshmen through seniors", "Chicago, IL", "in-person", "Paid (~$5,600)", "January", "https://datascience.uchicago.edu/education/summerlab/", "tech", "research", "check", "In-person Chicago; mostly local students."],
    ["NYU", "ARISE", "Rising sophomores/juniors, NYC area", "New York, NY", "in-person", "Paid ($1,000)", "February", "https://engineering.nyu.edu/academics/programs/k12-stem-education/arise", "research", "research", "ineligible", "NYC-area commuters."],
    ["Kode With Klossy", "Coding Camps", "Ages 13–18, women and gender-expansive teens", "Remote / varies", "remote", "Free", "March", "https://www.kodewithklossy.com/camp", "tech", "program", "check", "For women and gender-expansive teens."],
    ["CUNY", "STEM Research Academy", "Grades 10–11, NYC public schools", "New York, NY", "in-person", "Stipend", "Varies", "https://k16.cuny.edu/stemacademy/", "research", "research", "ineligible", "NYC public schools."],
    ["UMBC", "Meyerhoff Scholars", "High school seniors", "Baltimore, MD", "in-person", "Scholarship", "Dec 1", "https://meyerhoff.umbc.edu/", "research", "program", "soon", "Senior year."],
    ["American Collegiate Adventures", "Internship Program", "Completing grades 9–12", "New York / Boston", "in-person", "Fee ($1,995–$6,495)", "Feb 1", "https://acasummer.com/internships/", "business", "program", "eligible", "Paid program, not a job."],
    ["Boston Private Industry Council", "Tech Apprenticeship", "Boston Public Schools students", "Boston, MA", "in-person", "Paid", "Rolling", "https://www.bostonpic.org/programs-initiatives/school-to-career/tech-apprentice", "tech", "internship", "ineligible", "Boston Public Schools."],
    ["Spark SMP", "Summer Mentorship Program", "High school students (Seattle area), U.S. citizens/PR", "Seattle, WA / virtual", "hybrid", "Free; some stipends", "May", "https://www.sparksmp.org/", "tech", "research", "check", "Seattle-area focus — confirm remote projects."],
    ["Emma Bowen Foundation", "Emma Bowen Internship", "Ages 17–18 (seniors)", "Nationwide", "in-person", "Paid", "Early January", "https://www.emmabowenfoundation.org/apply", "business", "internship", "soon", "Senior year."],
    ["America on Tech", "TECH360", "Rising juniors/seniors in NYC, LA County, Miami-Dade, Broward", "NYC / LA / Miami", "in-person", "Free ($500 stipend)", "May", "https://www.americaontech.org/tech360.html", "tech", "program", "ineligible", "Only those regions (San Diego isn't one)."],
    ["Genspace", "BioRocket Internship", "Ages 16–18", "New York, NY", "in-person", "Unpaid", "Varies", "https://www.genspace.org/biorocket", "research", "research", "ineligible", "In-person New York."],
    ["Columbia Engineering", "Hk Maker Lab", "10th–11th grade, NYC", "New York, NY", "in-person", "Fee", "January", "https://www.hypothekids.org/hk-maker-lab", "tech", "program", "ineligible", "NYC students."],
    ["MIT", "Women's Technology Program (WTP)", "Rising seniors (women)", "Cambridge, MA", "in-person", "Fee", "April", "https://web.mit.edu/wtp/", "tech", "program", "check", "Rising seniors; for women."],
    ["University of Denver", "GenCyber Summer Camp", "Ages 14–18", "Denver, CO", "in-person", "Free", "TBD", "https://www.ucdenver.edu/gencyber", "tech", "program", "check", "In-person Denver."],
    ["Icahn School of Medicine at Mount Sinai", "Introduction to Bioinformatics", "Ages 14–18", "New York, NY", "in-person", "Fee", "TBD", "https://icahn.mssm.edu/inclusion/ceye", "research", "program", "ineligible", "In-person New York."],
    ["Rutgers University", "NJ Governor's School in Engineering & Technology", "NJ juniors", "New Brunswick, NJ", "in-person", "Free", "Jan 10", "https://soe.rutgers.edu/academics/pre-college-engineering-programs/new-jersey-governors-school-engineering-and-technology", "tech", "program", "ineligible", "New Jersey students."],
    ["New York Historical Society", "Girls Tech Scholars", "Ages 14–18", "New York, NY", "in-person", "Unpaid", "TBD", "https://www.nyhistory.org/education/digital-humanities", "tech", "program", "ineligible", "In-person New York, for girls."],
    ["StandOut Connect", "Virtual Internships", "Ages 15–19", "Online", "remote", "Varies by program", "Various", "https://www.standoutconnect.org/", "business", "internship", "eligible", ""],
    ["Idaho National Laboratory", "High School Internships", "High school students", "Idaho Falls, ID", "in-person", "Paid", "Varies", "https://inl.gov/internships/", "tech", "internship", "ineligible", "In-person Idaho."],
    ["Los Alamos National Laboratory", "High School Internship Program", "Northern New Mexico seniors", "Los Alamos, NM", "in-person", "Paid", "Varies", "https://www.lanl.gov/engage/collaboration/student-programs/high-school", "tech", "internship", "ineligible", "Northern New Mexico only."],
    ["Pacific Northwest National Laboratory", "High School Internships", "High school students (local)", "Richland, WA", "in-person", "Paid", "Varies", "https://www.pnnl.gov/high-school-students-pnnl", "tech", "internship", "ineligible", "In-person Washington State."],
    ["theCoderSchool", "UpCode Internship", "Ages 15–18 with 3+ years of coding", "theCoderSchool locations", "in-person", "See site", "Opens Oct 1", "https://www.thecoderschool.com/upcode-internship/", "tech", "internship", "check", "Needs 3+ years of coding — your data shows 2025–present."],
    ["NC State", "TRACES CS Internship", "High school students (North Carolina)", "Raleigh, NC", "in-person", "Paid ($1,500)", "Varies", "https://cereal.wordpress.ncsu.edu/projects/computer-science-high-school-internship-program/", "tech", "internship", "ineligible", "North Carolina students."],
    ["Immerse Education", "Software Development & AI Summer School", "Ages 15–18", "Online / UK", "remote", "Fee", "Rolling", "https://www.immerse.education/", "tech", "program", "eligible", "Paid course."],
    ["Inspirit AI", "AI Scholars / Career Programs", "Ages 14–18", "Online", "remote", "Fee", "Rolling", "https://www.inspiritai.com/", "tech", "program", "eligible", "Paid course."],

    // ---------------- Remote ----------------
    ["Building-U", "Remote Internship", "Any grade level", "Remote", "remote", "Unpaid", "Rolling", "https://building-u.com/", "business", "internship", "eligible", ""],
    ["EnergyMag", "Research / Journalism Internship", "Sophomores–seniors, 3.25+ GPA", "Remote", "remote", "Unpaid", "Rolling", "https://energymag.net/internships/", "research", "internship", "eligible", ""],
    ["Foreign Policy Research Institute", "High School Internship", "High schoolers with strong writing; authorized to work in U.S.", "Remote", "remote", "Unpaid (need-based stipends)", "Dec, Mar, Jul", "https://www.fpri.org/", "gov", "internship", "eligible", ""],
    ["Intern Abroad HQ", "Virtual Internship", "Ages 16–18", "Remote", "remote", "Fee", "Rolling", "https://www.internabroadhq.com/", "business", "internship", "eligible", "Paid program."],
    ["PHC Group", "Mary Miller Summer Program", "Rising seniors with Microsoft Office experience", "Remote", "remote", "Paid", "Rolling", "https://www.phcgroup.org/", "business", "internship", "soon", "Rising seniors."],
    ["Meaningful Teens", "Teaching Programs", "High school students", "Remote", "remote", "Unpaid", "Rolling", "https://www.meaningfulteens.org/", "community", "volunteer", "eligible", ""],
    ["Medicine Encompassed", "Medicine Encompassed Internship", "High school students", "Remote", "remote", "Unpaid", "Rolling", "https://www.medicineencompassed.org/", "health", "internship", "eligible", ""],
    ["United Planet", "Virtual Internship", "Ages 16+", "Remote", "remote", "Fee (aid available)", "Rolling", "https://www.unitedplanet.org/", "community", "internship", "eligible", "Paid program."],
    ["Virtual Internships Foundation", "High School Virtual Internships", "Ages 14–18", "Remote", "remote", "Fee", "Rolling", "https://www.virtualinternships.com/", "business", "internship", "eligible", "Paid program."],
    ["Polygence", "Core Research Program", "High school students", "Remote", "remote", "Fee", "Monthly (15th)", "https://www.polygence.org/", "research", "research", "eligible", "Paid mentorship — you do your own project."],
    ["Lumiere Education", "Research Scholar Program", "High school students", "Remote", "remote", "Fee (aid available)", "Rolling", "https://www.lumiere-education.com/", "research", "research", "eligible", "Paid mentorship."],
    ["George Mason University", "Aspiring Scientists Summer Internship (ASSIP)", "Ages 15+ remote (16+ wet-lab), 2.8+ GPA; some sources say juniors/seniors", "Remote / Fairfax, VA", "hybrid", "Unpaid ($25 fee)", "Feb 1", "https://science.gmu.edu/assip", "research", "research", "check", "Confirm whether sophomores/rising juniors can apply."],
    ["Johns Hopkins APL", "ASPIRE", "Juniors and seniors (Maryland area)", "Laurel, MD / remote", "hybrid", "Unpaid", "Varies", "https://www.jhuapl.edu/", "tech", "internship", "ineligible", "Maryland-area students."],
    ["Macmillan Publishers", "Summer Internship", "Rising seniors", "Remote", "remote", "Paid", "Late winter", "https://us.macmillan.com/careers", "arts", "internship", "soon", "Rising seniors."],
    ["Global Vision International", "Virtual Internships", "Ages 15+", "Remote", "remote", "Fee", "Rolling", "https://www.gviusa.com/", "community", "internship", "eligible", "Paid program."],
    ["Delta Institute", "Delve Work-Experience Program", "High school students", "Remote", "remote", "Fee", "Rolling cohorts", "https://www.deltainstitute.co/", "business", "internship", "eligible", "Paid program."],
    ["UT Southwestern", "Inspiring Careers in Mental Health", "Rising 10th–12th graders in the U.S.", "Remote", "remote", "Unpaid", "Early Feb", "https://www.utsouthwestern.edu/education/medical-school/departments/psychiatry/education-and-training/inspiring-careers.html", "health", "internship", "eligible", ""],
    ["Dartmouth-Hitchcock (Levy Lab)", "EDIT AI Summer Internship", "High schoolers with prior CS coursework/experience", "Remote", "remote", "Unpaid", "April 15", "https://jlevy44.github.io/levylab/opportunities/", "tech", "research", "eligible", "AI research — your Python projects count as experience."],
    ["American Psychological Association", "APA Internships", "U.S.-eligible workers; under 18 needs a DC work permit", "Remote", "remote", "Paid/unpaid", "Rolling", "https://www.apa.org/about/apa-jobs/internships", "health", "internship", "check", "Under-18s need a DC work permit."],

    // ---------------- Finance & business ----------------
    ["1435 Capital Management", "Venture Analyst Internship", "Rising juniors/seniors, 16+", "Princeton, NJ (hybrid)", "hybrid", "Paid", "Early April", "https://app.dover.com/apply/1435%20Capital%20Management%20LLC/8ccf0267-2ff5-4800-b769-149b8a1e8aad/?rs=76643084", "finance", "internship", "eligible", "Investing-focused and you're a rising junior in 2027 — strong fit."],
    ["Federal Reserve Bank of Boston", "Today's Interns, Tomorrow's Professionals (TIP)", "Boston Public Schools, completed sophomore year", "Boston, MA", "in-person", "Paid", "Early spring", "https://www.bostonfed.org/community-development/expanding-employment-opportunities/todays-interns-tomorrows-professionals.aspx", "finance", "internship", "ineligible", "Boston Public Schools."],
    ["Dartmouth College", "Finance: Investing & Market Insights", "Ages 13+", "Online", "remote", "Fee (~$1,895, scholarships)", "Rolling", "https://www.dartmouth.edu/", "finance", "program", "eligible", "Course, not a job."],
    ["University of Tennessee Haslam", "Accounting & Information Management (AIM) Academy", "Rising juniors", "Knoxville, TN", "in-person", "Free", "Mid-Dec – Mar 31", "https://haslam.utk.edu/", "finance", "program", "eligible", "Rising juniors — that's you in summer 2027."],
    ["Morgan Stanley", "Finance Academy", "High school seniors", "Virtual", "remote", "See site", "September", "https://www.morganstanley.com/people/", "finance", "program", "soon", "Senior year."],
    ["Morgan Stanley / LEADing for Life", "JumpStart Scholars in Finance", "Juniors and seniors", "Virtual", "remote", "Stipend (~$3,000–$4,000)", "~May", "https://www.leadingforlife.org/", "finance", "program", "soon", "Junior year."],
    ["Morgan Stanley", "Early Insights Program", "College freshmen/sophomores", "Virtual", "remote", "See site", "Varies", "https://www.morganstanley.com/people/", "finance", "program", "ineligible", "College students only."],
    ["JPMorgan Chase", "Thomas G. Labrecque Smart Start", "NYC seniors accepted to a participating NYC college", "New York, NY", "in-person", "Scholarship + paid internship", "January", "https://careers.jpmorgan.com/", "finance", "internship", "ineligible", "NYC students."],
    ["JPMorgan Chase", "Virtual Job Simulations (via Forage)", "Anyone", "Online", "remote", "Free", "Anytime", "https://www.theforage.com/", "finance", "virtual", "eligible", "Free, self-paced — you can list completion on a resume after you finish it."],
    ["Federal Reserve Bank of Minneapolis", "High School Research Intern", "Current high school students", "Minneapolis, MN", "in-person", "Paid", "June", "https://www.minneapolisfed.org/", "finance", "research", "ineligible", "In-person Minneapolis."],
    ["Federal Reserve Bank of Cleveland", "Fed Future Professionals", "Fourth District high schoolers (OH, PA, KY, WV)", "Cleveland, OH", "hybrid", "Paid", "School partnerships", "https://www.clevelandfed.org/", "finance", "internship", "ineligible", "Fourth District only."],
    ["Federal Reserve System", "High School Fed Challenge", "Grades 9–12", "National competition", "remote", "Free", "Feb (registration)", "https://www.federalreserve.gov/", "finance", "competition", "eligible", "Team competition through your school."],
    ["Brown Advisory / Invest in Girls", "Summer Fellowship", "Rising 11th/12th grade girls", "Boston / NYC / Baltimore", "in-person", "Paid ($650)", "May 30", "https://investingirls.org/", "finance", "internship", "check", "For girls."],
    ["Invest in Girls", "Partner-School Program", "High school girls", "Nationwide", "remote", "Varies", "Ongoing", "https://investingirls.org/", "finance", "program", "check", "For girls."],
    ["Fidelity Investments", "Boundless High School Internship", "Female high school students", "Boston, MA / Merrimack, NH", "in-person", "Paid", "Early March", "https://jobs.fidelity.com/en/students/career-discovery-programs/", "finance", "internship", "check", "For female students; in-person Boston area."],
    ["Fidelity Investments", "Career Discovery Programs", "As of 2026: 18+ with 12–18 college credits", "Multiple", "in-person", "Paid", "Spring", "https://jobs.fidelity.com/en/students/career-discovery-programs/", "finance", "internship", "ineligible", "Now requires college credits."],
    ["SEO", "SEO Scholars", "Low-income public high schoolers in NYC, SF, NC, Miami", "NYC / SF / NC / Miami", "in-person", "Free", "Nov–Dec", "https://www.seo-usa.org/", "finance", "program", "ineligible", "Those cities only."],
    ["Cristo Rey Network", "Corporate Work Study", "Cristo Rey school students", "Various", "in-person", "Paid", "Via school", "https://www.cristoreynetwork.org/", "business", "internship", "ineligible", "Cristo Rey students only."],
    ["NFTE", "Entrepreneurship Programs", "Ages 11–24", "25+ states", "hybrid", "Varies", "Varies", "https://www.nfte.com/", "business", "program", "eligible", ""],
    ["Wharton (UPenn)", "Global High School Investment Competition", "Grades 9–12", "Online (finale in Philadelphia)", "remote", "Free", "Registration ~June", "https://globalyouth.wharton.upenn.edu/", "finance", "competition", "eligible", "Investing competition — directly uses your trading skills."],
    ["Council for Economic Education", "National Personal Finance Challenge", "High school students", "State rounds → Atlanta", "in-person", "Free", "Varies by state", "https://www.councilforeconed.org/", "finance", "competition", "eligible", ""],
    ["Federal Reserve System", "National Economics Challenge", "Grades 9–12", "State rounds → Atlanta", "in-person", "Free", "Varies by state", "https://www.councilforeconed.org/", "finance", "competition", "eligible", ""],
    ["SIFMA Foundation", "The Stock Market Game", "Grades 4–12", "Online", "remote", "Free in many states", "Each session", "https://www.stockmarketgame.org/", "finance", "competition", "eligible", "Through a teacher."],
    ["SIFMA Foundation", "Capitol Hill Challenge", "Title I / CEP school students", "Online → Washington, DC", "remote", "Free", "Spring", "https://www.stockmarketgame.org/", "finance", "competition", "check", "Only Title I / CEP schools."],
    ["DECA", "Finance Competitive Events", "DECA members", "District → International", "in-person", "Membership dues", "Via chapter", "https://www.deca.org/", "finance", "competition", "check", "Needs a DECA chapter at your school."],
    ["FBLA", "Securities & Investments / Finance Events", "FBLA members", "District → National", "in-person", "Membership dues", "Dec 1 membership", "https://www.fbla.org/", "finance", "competition", "check", "Needs an FBLA chapter at your school."],
    ["Wharton (UPenn)", "Global Youth — Essentials of Finance", "Grades 9–11", "Philadelphia, PA", "in-person", "Fee (~$7,599, scholarships)", "Late Jan / early Apr", "https://globalyouth.wharton.upenn.edu/", "finance", "program", "eligible", ""],
    ["Wharton (UPenn)", "Leadership in the Business World (LBW)", "Current 11th graders", "Philadelphia, PA", "in-person", "Fee (~$9,999, scholarships)", "Late Jan / early Apr", "https://globalyouth.wharton.upenn.edu/", "business", "program", "soon", "11th grade only."],
    ["Harvard Summer School", "Pre-College Program", "Grades 9–11", "Cambridge, MA", "in-person", "Fee (~$6,100)", "Jan–Apr", "https://summer.harvard.edu/", "business", "program", "eligible", ""],
    ["Yale Young Global Scholars", "Politics, Law & Economics", "Ages 16–18, sophomores or juniors", "New Haven, CT", "in-person", "Fee ($6,500, up to 100% aid)", "Oct 15 (early) / Jan 7", "https://globalscholars.yale.edu/", "finance", "program", "eligible", "Sophomores can apply — early deadline is mid-October."],
    ["Columbia University", "Pre-College Programs", "Grades 9–12", "New York, NY / online", "hybrid", "Fee (scholarships)", "Rolling", "https://precollege.sps.columbia.edu/", "business", "program", "eligible", ""],
    ["NYU Stern", "Precollege Summer at Stern", "Rising juniors and seniors", "New York, NY", "in-person", "Fee", "Rolling", "https://www.stern.nyu.edu/", "finance", "program", "eligible", "Rising junior in 2027."],
    ["Georgetown University", "Summer Academies — Business & Economics", "High school students", "Washington, DC", "in-person", "Fee", "Rolling", "https://summer.georgetown.edu/", "business", "program", "eligible", ""],
    ["Michigan Ross", "Summer Business Academy", "Rising seniors", "Ann Arbor, MI", "in-person", "Fee (~$5,500, scholarships)", "Mid-Jan", "https://michiganross.umich.edu/", "business", "program", "soon", "Rising seniors."],
    ["Fordham Gabelli", "Finance Institute", "Any high school student", "New York, NY / virtual", "hybrid", "Fee (~$1,100)", "Priority April 1", "https://www.fordham.edu/", "finance", "program", "eligible", ""],
    ["Wake Forest School of Business", "Finance & Investing Institute", "Rising sophomores through incoming college freshmen", "Winston-Salem, NC", "in-person", "Fee (~$2,800, scholarships)", "Rolling", "https://business.wfu.edu/", "finance", "program", "eligible", ""],
    ["Babson College", "Summer Programs", "Rising sophomores–seniors", "Wellesley, MA / online", "hybrid", "Fee (aid available)", "Priority Mar 15", "https://www.babson.edu/", "business", "program", "eligible", ""],
    ["Indiana University Kelley", "BIG (Business Investigation & Growth)", "Rising sophomores–seniors", "Bloomington, IN", "in-person", "Scholarships available", "April", "https://kelley.iu.edu/", "business", "program", "eligible", ""],
    ["NYC DYCD", "Ladders for Leaders", "Ages 16–24, NYC", "New York, NY", "in-person", "Paid (~$16.50/hr)", "January", "https://www.nyc.gov/site/dycd/services/jobs-internships/about-nyc-ladders-for-leaders.page", "business", "internship", "ineligible", "NYC residents."],
    ["Economic Awareness Council", "On the Money Summer Internship", "HS seniors / college students (Chicago)", "Chicago, IL", "hybrid", "Paid (~$17/hr)", "May 29", "https://www.econcouncil.org/on-the-money", "finance", "internship", "ineligible", "Chicago; seniors."],
    ["U.S. Department of the Treasury", "Headquarters Student Internship", "High school students", "Washington, DC", "in-person", "Unpaid", "December", "https://home.treasury.gov/about/careers-at-treasury/studentinternship-programs/headquarters-student-internship-program", "gov", "internship", "check", "In-person Washington, DC."],
    ["YEP KC", "Young Entrepreneurs Program", "Completing junior/senior year, Kansas City", "Kansas City, MO", "in-person", "Paid + scholarship", "Feb 1", "https://yepkc.org/", "business", "internship", "ineligible", "Kansas City area."],
    ["Air Academy Credit Union", "High School Internship", "Grades 11–12, 16+", "Colorado Springs, CO", "in-person", "Paid", "April", "https://www.aacu.com/learn/about/internship-program.html", "finance", "internship", "ineligible", "Colorado Springs."],
    ["USLI", "High School Student Program", "High school juniors", "Wayne, PA", "in-person", "Paid ($17/hr)", "Jan 31", "https://customers.usli.com/sites/studentprogram/high-school-students.html", "finance", "internship", "ineligible", "In-person Pennsylvania."],
    ["Brooklyn Navy Yard", "Internship Program", "High school seniors", "Brooklyn, NY", "in-person", "Paid (~$16.50/hr)", "Feb 28", "https://www.brooklynnavyyard.org/internship-opportunities/", "business", "internship", "ineligible", "Brooklyn."],
    ["OneAmerica Financial", "Pathways Junior Fellows", "High school students / recent grads", "Indianapolis, IN", "in-person", "Paid", "January", "https://www.oneamerica.com/about-us/careers/pathways", "finance", "internship", "ineligible", "In-person Indianapolis."],
    ["Futures and Options", "Internship Program", "Juniors/seniors, 16–19, NYC schools", "New York, NY", "in-person", "Paid", "Jan–Feb", "https://futuresandoptions.org/our-programs/the-internship-program/", "business", "internship", "ineligible", "NYC schools."],
    ["Girls Who Invest", "Summer Intensive", "College first-years and sophomores", "Philadelphia, PA", "in-person", "Paid", "Oct 1", "https://www.girlswhoinvest.org/", "finance", "internship", "ineligible", "College students only."],
    ["Chicago Summer Business Institute", "CSBI", "Chicago 10th–11th graders, 3.0+ GPA, income limit", "Chicago, IL", "in-person", "Paid", "Feb–Mar", "https://www.chicagosbi.org/", "finance", "internship", "ineligible", "Chicago students."],
    ["Goldman Sachs", "Possibilities Summit", "High school juniors from underrepresented backgrounds", "Multiple", "in-person", "Free", "February", "https://www.goldmansachs.com/careers/students/programs/", "finance", "program", "soon", "Juniors; for underrepresented backgrounds."],
    ["San Antonio Sports", "Sports Finance Internship", "High school students", "San Antonio, TX", "in-person", "See site", "Rolling", "https://sanantoniosports.org/", "finance", "internship", "check", "In-person San Antonio."],
  ];

  // Programs whose source list didn't give an exact link: we show a web search instead of guessing a URL.
  const unsourcedLink = new Set([
    "Entrepreneurship Program", "Business Academy for Youth (B-BAY)", "Introduction to Investments Summer Institute", "Summer Institutes",
    "Summer Industry Internships", "I-YEL", "Roberts Summer Academy", "U.S. Empower High School Experience",
    "STEM Enhancement in Earth Science (SEES)", "Climate Change Research Initiative", "Summer High School Internship",
    "Remote Internship", "Virtual Internship", "Mary Miller Summer Program", "Teaching Programs", "Medicine Encompassed Internship",
    "High School Virtual Internships", "Core Research Program", "Research Scholar Program", "ASPIRE", "Summer Internship",
    "Virtual Internships", "Delve Work-Experience Program", "Finance: Investing & Market Insights",
    "Accounting & Information Management (AIM) Academy", "Finance Academy", "JumpStart Scholars in Finance", "Early Insights Program",
    "Thomas G. Labrecque Smart Start", "High School Research Intern", "Fed Future Professionals", "High School Fed Challenge",
    "Summer Fellowship", "Partner-School Program", "SEO Scholars", "Corporate Work Study", "Entrepreneurship Programs",
    "Global High School Investment Competition", "National Personal Finance Challenge", "National Economics Challenge",
    "The Stock Market Game", "Capitol Hill Challenge", "Finance Competitive Events", "Securities & Investments / Finance Events",
    "Global Youth — Essentials of Finance", "Leadership in the Business World (LBW)", "Pre-College Program",
    "Politics, Law & Economics", "Pre-College Programs", "Precollege Summer at Stern", "Summer Academies — Business & Economics",
    "Summer Business Academy", "Finance Institute", "Finance & Investing Institute", "Summer Programs",
    "BIG (Business Investigation & Growth)", "Summer Intensive", "Sports Finance Internship",
    "Software Development & AI Summer School", "AI Scholars / Career Programs", "API Summer Journalism Internship",
  ]);
  const searchLink = (org, title) => "https://www.google.com/search?q=" + encodeURIComponent(`${org} ${title} high school`);
  const sourceNote = "Details are from public listings (Sep 2026) — confirm on the official page.";
  const typicalKeywords = {
    tech: [K("Python", ["python"], true), K("Programming", ["python", "programming", "coding"], true), K("Problem Solving", ["problem solving"], true), K("Data analysis", ["data analysis", "analytics"]), K("Machine learning / AI", ["machine learning", "ai", "artificial intelligence"]), K("Teamwork", ["team collaboration", "teamwork"]), K("Communication", ["communication"]), K("Self-motivated", ["self-motivated", "self-directed"])],
    research: [K("Research", ["research"], true), K("Data analysis", ["data analysis", "analytics"], true), K("Python", ["python"]), K("Attention to Detail", ["attention to detail"]), K("Problem Solving", ["problem solving"]), K("Self-motivated", ["self-motivated", "self-directed"]), K("Communication", ["communication"])],
    finance: [K("Finance", ["finance", "financial", "business finance"], true), K("Microsoft Excel", ["excel", "spreadsheet"], true), K("Investing / trading", ["trading", "investing", "stock*"], true), K("Technical Analysis", ["technical analysis"]), K("Data analysis", ["data analysis", "analytics"]), K("Communication", ["communication"]), K("Attention to Detail", ["attention to detail"]), K("Time Management", ["time management"])],
    business: [K("Marketing", ["marketing"], true), K("Communication", ["communication"], true), K("Social Media Marketing", ["social media"]), K("Microsoft Office", ["microsoft office", "excel", "powerpoint"]), K("Business", ["business"]), K("Self-motivated", ["self-motivated", "self-directed"]), K("Time Management", ["time management"]), K("Team Collaboration", ["team collaboration", "teamwork"])],
    health: [K("Communication", ["communication"], true), K("Customer service", ["customer service"], true), K("Attention to Detail", ["attention to detail"], true), K("Team Collaboration", ["team collaboration", "teamwork"]), K("Time Management", ["time management"]), K("Research", ["research"]), K("Biology", ["biology"])],
    arts: [K("Photography", ["photography", "photo*"], true), K("Adobe Lightroom", ["lightroom"]), K("Adobe Photoshop", ["photoshop"]), K("Social Media Marketing", ["social media"]), K("Communication", ["communication"], true), K("Portfolio Development", ["portfolio"]), K("Time Management", ["time management"])],
    gov: [K("Communication", ["communication"], true), K("Research", ["research"], true), K("Writing", ["writing"]), K("Microsoft Office", ["microsoft office", "excel"]), K("Attention to Detail", ["attention to detail"]), K("Team Collaboration", ["team collaboration", "teamwork"]), K("Time Management", ["time management"])],
    community: [K("Communication", ["communication"], true), K("Team Collaboration", ["team collaboration", "teamwork"], true), K("Customer service", ["customer service"]), K("Time Management", ["time management"]), K("Self-motivated", ["self-motivated", "self-directed"]), K("Volunteering", ["volunteer*", "community service"])],
  };
  // Interview questions are grouped into three styles.
  const interviewStyle = { tech: "tech", research: "tech", finance: "finance", business: "finance", health: "community", arts: "community", gov: "community", community: "community" };

  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const byOrg = new Map();
  for (let [org, title, elig, loc, mode, pay, deadline, url, field, kind, status, note] of rows) {
    const id = "x-" + slug(org);
    const verifiedUrl = !unsourcedLink.has(title);
    if (!verifiedUrl) url = searchLink(org, title);
    if (!byOrg.has(id)) byOrg.set(id, { id, name: org, source: verifiedUrl ? url : "", roles: [] });
    byOrg.get(id).roles.push({
      id: id + "-" + slug(title),
      title,
      type: [kind[0].toUpperCase() + kind.slice(1), pay].join(" · "),
      category: interviewStyle[field],
      field,
      kind,
      location: loc,
      mode,
      pay,
      deadline,
      url,
      linkIsSearch: !verifiedUrl,
      eligibility: { status, reason: `Published eligibility: ${elig}.${note ? " " + note : ""}` },
      keywords: typicalKeywords[field],
      note: sourceNote,
    });
  }
  for (const c of byOrg.values()) {
    const r = c.roles[0];
    c.blurb = `${r.location} · ${c.roles.length > 1 ? c.roles.length + " programs" : r.kind}`;
  }

  // Location/pay details for the hand-written entries in companies.js so filters work on them too.
  const meta = {
    "sdcity-ee": ["San Diego, CA", "in-person", "Paid", "gov", "internship", "Spring"],
    "sdsc-rehs": ["La Jolla, CA", "in-person", "Unpaid", "tech", "research", "Spring"],
    "bofa-leaders": ["San Diego, CA + Washington, DC", "in-person", "Paid", "community", "internship", "Oct–Jan"],
    "bofa-analyst": ["Multiple", "in-person", "Paid", "finance", "internship", "Varies"],
    "gs-analyst": ["Multiple", "in-person", "Paid", "finance", "internship", "Varies"],
    "nasa-ostem": ["NASA centers / remote", "hybrid", "Paid", "tech", "internship", "Feb / May / Sep"],
    "qc-eng": ["San Diego, CA", "in-person", "Paid", "tech", "internship", "Fall"],
    "c2c-youth": ["San Diego, CA", "in-person", "Paid", "community", "internship", "April"],
    "ladder-startup": ["Remote", "remote", "Fee (aid available)", "business", "internship", "Multiple cohorts"],
  };
  for (const c of COMPANIES)
    for (const r of c.roles)
      if (meta[r.id]) {
        const [location, mode, pay, field, kind, deadline] = meta[r.id];
        Object.assign(r, { location, mode, pay, field, kind, deadline, url: r.url || c.source });
      }

  // Merge into a hand-written company when the organization already exists (e.g. NASA, City of San Diego).
  for (const c of byOrg.values()) {
    const existing = COMPANIES.find((x) => x.name.toLowerCase() === c.name.toLowerCase());
    if (existing) existing.roles.push(...c.roles);
    else COMPANIES.push(c);
  }
})();
