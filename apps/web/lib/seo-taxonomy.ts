import { parseJobsSearchParams, type JobsSearchParams } from "@/lib/job-search"

export type LinkCard = {
  href: string
  title: string
  description: string
}

export type FaqItem = {
  question: string
  answer: string
}

export type JobsLandingPage = {
  slug: string
  path: string
  seoTitle: string
  seoDescription: string
  heroTitle: string
  eyebrow: string
  intro: string[]
  highlights: string[]
  faqs: FaqItem[]
  relatedLinks: LinkCard[]
  searchParams: JobsSearchParams
}

export type ResourceArticle = {
  slug: string
  path: string
  seoTitle: string
  seoDescription: string
  heroTitle: string
  intro: string[]
  sections: Array<{
    heading: string
    paragraphs: string[]
  }>
  faqs: FaqItem[]
  relatedLinks: LinkCard[]
}

export const EDITORIAL_CONTENT_LAST_MODIFIED = new Date("2026-03-08T00:00:00.000Z")

function buildSearchParams(input: Partial<JobsSearchParams> & Record<string, string>) {
  return parseJobsSearchParams(input)
}

export const jobsLandingPages: JobsLandingPage[] = [
  {
    slug: "salem",
    path: "/jobs/salem",
    seoTitle: "Salem Oregon Jobs",
    seoDescription:
      "Find jobs in Salem, Oregon across healthcare, construction, warehouse, retail, government, and local employers hiring now.",
    heroTitle: "Find jobs in Salem, Oregon",
    eyebrow: "Salem Oregon jobs",
    intro: [
      "HireSalem is built to rank for and serve Salem Oregon jobs, not generic national search terms. This page is the main local index for people searching jobs in Salem Oregon, hiring in Salem Oregon, and Salem Oregon employment.",
      "Use this page as the broad Salem market view, then narrow into category pages like restaurant jobs, construction jobs, warehouse jobs, healthcare jobs, or government jobs in Salem."
    ],
    highlights: [
      "Broad Salem-local coverage across the city and nearby commute zones.",
      "Built for Salem Oregon search intent instead of a national jobs feed.",
      "The best starting point before drilling into local job categories."
    ],
    faqs: [
      {
        question: "What kinds of Salem Oregon jobs are covered here?",
        answer:
          "This page is the broad Salem jobs hub and can surface office, healthcare, education, trades, warehouse, retail, hospitality, and government-adjacent hiring across the Salem market."
      },
      {
        question: "Should I start here or on a category page?",
        answer:
          "Start here if you want the broad local market. Move to a category page when you already know you want restaurant, warehouse, healthcare, construction, retail, or government work."
      }
    ],
    relatedLinks: [
      {
        href: "/jobs/keizer",
        title: "Keizer jobs",
        description: "Expand the search into the nearby Keizer market and North Salem commute corridor."
      },
      {
        href: "/jobs/salem/restaurant",
        title: "Restaurant jobs in Salem",
        description: "Browse one of the clearest city-and-category search combinations."
      },
      {
        href: "/resources/best-places-to-find-jobs-in-salem",
        title: "Best places to find jobs in Salem",
        description: "Use the local guide to widen your Salem job search beyond a single filter."
      }
    ],
    searchParams: buildSearchParams({ location: "Salem" })
  },
  {
    slug: "keizer",
    path: "/jobs/keizer",
    seoTitle: "Keizer Oregon Jobs",
    seoDescription:
      "Browse Keizer jobs and North Salem corridor openings for candidates searching nearby local work in the Salem area.",
    heroTitle: "Jobs in Keizer and the North Salem corridor",
    eyebrow: "Keizer Oregon jobs",
    intro: [
      "Keizer and Salem behave like one practical labor market for many job seekers, but Keizer still deserves its own search destination. This page is tuned for Keizer jobs and nearby North Salem openings that make sense for local commuters.",
      "Use it when Keizer is your main location phrase, then widen into Salem Oregon jobs if you want more volume."
    ],
    highlights: [
      "Focused on Keizer search intent and the north-side commute corridor.",
      "Useful for nearby service, retail, support, and local employer searches.",
      "Pairs naturally with the broader Salem jobs page."
    ],
    faqs: [
      {
        question: "Should I search Salem and Keizer jobs together?",
        answer:
          "Usually yes. Many practical openings sit across the city boundary, so most job seekers should use both pages."
      },
      {
        question: "Why have a separate Keizer jobs page at all?",
        answer:
          "Because Keizer is a real local search phrase with distinct user intent, even though the labor market overlaps with Salem."
      }
    ],
    relatedLinks: [
      {
        href: "/jobs/salem",
        title: "Salem jobs",
        description: "Switch to the broad Salem jobs hub when you want the wider city market."
      },
      {
        href: "/jobs/salem/retail",
        title: "Retail jobs in Salem",
        description: "A useful nearby category if you live in Keizer and want front-line local work."
      },
      {
        href: "/resources/salem-vs-keizer-job-market-guide",
        title: "Salem vs. Keizer guide",
        description: "Compare how to search both markets without missing practical openings."
      }
    ],
    searchParams: buildSearchParams({ location: "Keizer" })
  },
  {
    slug: "remote",
    path: "/jobs/salem/remote",
    seoTitle: "Remote Jobs in Salem Oregon",
    seoDescription: "Explore remote jobs for Salem Oregon job seekers who want flexibility while staying rooted in the local market.",
    heroTitle: "Remote jobs for Salem Oregon workers",
    eyebrow: "Remote jobs in Salem Oregon",
    intro: [
      "Remote jobs in Salem Oregon are less about the office being in Salem and more about Salem-area candidates finding flexible work that still fits their local life. This page narrows the board toward remote-friendly roles while keeping Salem intent front and center.",
      "It is especially useful for people who want to stay in Salem or Keizer while opening up their job search beyond strictly on-site employers."
    ],
    highlights: [
      "Targets remote search intent for Salem-area candidates.",
      "Useful when flexibility matters more than an exact city office location.",
      "Pairs well with full-time and category pages."
    ],
    faqs: [
      {
        question: "Are these remote jobs physically based in Salem?",
        answer:
          "Not always. The page is designed for Salem-area candidates searching remote work, so the employer may be elsewhere while the role is still practical locally."
      },
      {
        question: "Should I only look at remote jobs?",
        answer:
          "Usually no. Salem hiring can be stronger in hybrid and on-site roles, so checking both often gives better results."
      }
    ],
    relatedLinks: [
      {
        href: "/jobs/salem/full-time",
        title: "Full-time jobs in Salem",
        description: "Combine flexibility goals with stable full-time openings."
      },
      {
        href: "/jobs/salem",
        title: "All Salem jobs",
        description: "Reset to the full Salem market when you want more local volume."
      },
      {
        href: "/resources/salem-resume-tips",
        title: "Salem resume tips",
        description: "Sharpen your application before targeting competitive remote roles."
      }
    ],
    searchParams: buildSearchParams({ workMode: "remote", location: "Salem" })
  },
  {
    slug: "part-time",
    path: "/jobs/salem/part-time",
    seoTitle: "Part-Time Jobs in Salem Oregon",
    seoDescription: "Browse part-time jobs in Salem Oregon across hospitality, education support, retail, and flexible local schedules.",
    heroTitle: "Part-time jobs in Salem Oregon",
    eyebrow: "Part-time Salem Oregon jobs",
    intro: [
      "Part-time jobs in Salem Oregon are a major local search pattern for students, parents, career changers, and workers building flexible schedules. This page is built around that exact search intent rather than forcing candidates to sift through the whole board.",
      "It is a strong starting point for hospitality, support, retail-adjacent, and flexible local openings."
    ],
    highlights: [
      "Targets part-time Salem search intent directly.",
      "Useful for flexible schedules and side-income work.",
      "Pairs well with restaurant and retail pages."
    ],
    faqs: [
      {
        question: "Which Salem industries produce the most part-time openings?",
        answer:
          "Hospitality, restaurant, retail, education support, and service roles tend to produce repeat part-time demand in Salem."
      },
      {
        question: "Is this page useful outside Salem city limits?",
        answer:
          "Yes. It still fits the greater Salem commute market, including nearby areas like Keizer and West Salem."
      }
    ],
    relatedLinks: [
      {
        href: "/jobs/salem/restaurant",
        title: "Restaurant jobs in Salem",
        description: "A strong companion search for part-time local work."
      },
      {
        href: "/jobs/salem/retail",
        title: "Retail jobs in Salem",
        description: "Another common local category for flexible schedules."
      },
      {
        href: "/jobs/keizer",
        title: "Keizer jobs",
        description: "Check nearby options if you want more part-time volume."
      }
    ],
    searchParams: buildSearchParams({ employmentType: "part_time", location: "Salem" })
  },
  {
    slug: "full-time",
    path: "/jobs/salem/full-time",
    seoTitle: "Full-Time Jobs in Salem Oregon",
    seoDescription: "Find full-time jobs in Salem Oregon across healthcare, trades, office, government, and local employers hiring now.",
    heroTitle: "Full-time jobs in Salem Oregon",
    eyebrow: "Full-time Salem Oregon jobs",
    intro: [
      "Full-time jobs in Salem Oregon are usually tied to stability, benefits, and career-track local employers. This page narrows the job board toward that outcome while keeping Salem-specific search value high.",
      "Use it as the starting point for long-term local roles before drilling further into healthcare, government, education, or skilled-trade pages."
    ],
    highlights: [
      "Focused on stable career-track Salem jobs.",
      "Useful before narrowing into local categories or employers.",
      "Strong fit for job seekers prioritizing benefits and continuity."
    ],
    faqs: [
      {
        question: "Which Salem industries drive the most full-time hiring?",
        answer:
          "Healthcare, government, education, administration, and skilled trades often make up a large share of full-time hiring in Salem."
      },
      {
        question: "Should I use this instead of the main Salem page?",
        answer:
          "Use this page when schedule stability is the first filter. The main Salem page is better for the broadest view."
      }
    ],
    relatedLinks: [
      {
        href: "/jobs/salem/healthcare",
        title: "Healthcare jobs in Salem",
        description: "One of the strongest local full-time categories."
      },
      {
        href: "/jobs/salem/government",
        title: "Government jobs in Salem",
        description: "A major category for steady local employment."
      },
      {
        href: "/resources/how-to-get-hired-in-salem-healthcare",
        title: "How to get hired in Salem healthcare",
        description: "Read the local guide before applying into a competitive sector."
      }
    ],
    searchParams: buildSearchParams({ employmentType: "full_time", location: "Salem" })
  },
  {
    slug: "healthcare",
    path: "/jobs/salem/healthcare",
    seoTitle: "Healthcare Jobs in Salem Oregon",
    seoDescription: "Browse healthcare jobs in Salem Oregon, from clinical support and care teams to healthcare operations roles.",
    heroTitle: "Healthcare jobs in Salem Oregon",
    eyebrow: "Salem Oregon healthcare jobs",
    intro: [
      "Healthcare jobs in Salem Oregon deserve a dedicated page because healthcare is one of the strongest and most consistent local hiring categories. This page helps local candidates focus on that market without sorting through unrelated openings first.",
      "Use it for care support, clinic operations, administrative healthcare work, and other roles tied to the Salem healthcare ecosystem."
    ],
    highlights: [
      "Built around one of Salem's strongest recurring categories.",
      "Useful for both patient-facing and operational healthcare roles.",
      "Pairs well with the full-time Salem page and healthcare guide."
    ],
    faqs: [
      {
        question: "Why give healthcare its own Salem page?",
        answer:
          "Because healthcare has strong local search intent in Salem and enough recurring demand to justify a focused destination."
      },
      {
        question: "Are these only hospital jobs?",
        answer:
          "No. The page can surface clinic, support, admin, and broader healthcare-adjacent roles too."
      }
    ],
    relatedLinks: [
      {
        href: "/resources/how-to-get-hired-in-salem-healthcare",
        title: "Salem healthcare hiring guide",
        description: "Learn how to position yourself for local healthcare roles."
      },
      {
        href: "/jobs/salem/full-time",
        title: "Full-time jobs in Salem",
        description: "Many healthcare roles overlap with the full-time market."
      },
      {
        href: "/jobs/salem",
        title: "All Salem jobs",
        description: "Widen the search if you want to compare adjacent roles."
      }
    ],
    searchParams: buildSearchParams({ category: "healthcare", location: "Salem" })
  },
  {
    slug: "restaurant",
    path: "/jobs/salem/restaurant",
    seoTitle: "Restaurant Jobs in Salem Oregon",
    seoDescription: "Find restaurant jobs in Salem Oregon including kitchen, service, support, and hospitality-adjacent local openings.",
    heroTitle: "Restaurant jobs in Salem Oregon",
    eyebrow: "Salem Oregon restaurant jobs",
    intro: [
      "Restaurant jobs in Salem Oregon are one of the clearest city-plus-category SEO opportunities, and they are also a real user need. This page gives restaurant and service-focused candidates a local destination instead of burying the category inside a generic jobs index.",
      "It is useful for front-of-house, back-of-house, support, and fast-moving hospitality work across Salem."
    ],
    highlights: [
      "Targets a high-intent city-and-category search phrase.",
      "Useful for quick-hire and flexible local work.",
      "Pairs naturally with part-time and hospitality pages."
    ],
    faqs: [
      {
        question: "Are restaurant jobs different from the hospitality page?",
        answer:
          "Yes. Restaurant intent is narrower and often maps more directly to kitchen, service, and food-related openings, even when the wider hospitality page also helps."
      },
      {
        question: "Is this a good page for entry-level candidates?",
        answer:
          "Often yes. Restaurant hiring can be one of the strongest entry points into local work in Salem."
      }
    ],
    relatedLinks: [
      {
        href: "/jobs/salem/hospitality",
        title: "Hospitality jobs in Salem",
        description: "Widen into the broader guest-facing and service market."
      },
      {
        href: "/jobs/salem/part-time",
        title: "Part-time jobs in Salem",
        description: "Many restaurant candidates also want flexible scheduling."
      },
      {
        href: "/jobs/keizer",
        title: "Keizer jobs",
        description: "Check nearby service and restaurant openings too."
      }
    ],
    searchParams: buildSearchParams({ q: "restaurant", location: "Salem" })
  },
  {
    slug: "construction",
    path: "/jobs/salem/construction",
    seoTitle: "Construction Jobs in Salem Oregon",
    seoDescription: "Explore construction jobs in Salem Oregon, including hands-on field roles, operations support, and local project work.",
    heroTitle: "Construction jobs in Salem Oregon",
    eyebrow: "Salem Oregon construction jobs",
    intro: [
      "Construction jobs in Salem Oregon have strong local search intent because commute distance and job-site geography matter. This page keeps the search rooted in Salem and nearby work zones instead of pulling in statewide noise.",
      "It is useful for field work, project support, operations, and other construction-adjacent local roles."
    ],
    highlights: [
      "Built for a local category where geography matters.",
      "Useful for trades-adjacent and project-based work.",
      "Pairs well with skilled trades and full-time pages."
    ],
    faqs: [
      {
        question: "Why have a Salem-specific construction page?",
        answer:
          "Because construction search intent is highly local, and Salem candidates usually care about practical commute range as much as the role itself."
      },
      {
        question: "Should I also check skilled trades pages?",
        answer:
          "Yes. Some relevant roles may be categorized or titled under trades, operations, or maintenance rather than construction directly."
      }
    ],
    relatedLinks: [
      {
        href: "/jobs/salem/skilled-trades",
        title: "Skilled trades jobs in Salem",
        description: "Widen into hands-on local work that overlaps with construction hiring."
      },
      {
        href: "/jobs/salem/full-time",
        title: "Full-time jobs in Salem",
        description: "Many construction and field roles align with full-time hiring."
      },
      {
        href: "/resources/salem-resume-tips",
        title: "Salem resume tips",
        description: "Strengthen your application for practical local employers."
      }
    ],
    searchParams: buildSearchParams({ q: "construction", location: "Salem" })
  },
  {
    slug: "warehouse",
    path: "/jobs/salem/warehouse",
    seoTitle: "Warehouse Jobs in Salem Oregon",
    seoDescription: "Browse warehouse jobs in Salem Oregon, including fulfillment, logistics, operations, and local distribution work.",
    heroTitle: "Warehouse jobs in Salem Oregon",
    eyebrow: "Salem Oregon warehouse jobs",
    intro: [
      "Warehouse jobs in Salem Oregon are another strong local SEO phrase because the work is highly place-dependent and candidates usually search by city first. This page gives warehouse and logistics candidates a clean Salem-focused destination.",
      "It works for distribution, fulfillment, logistics support, shipping, and operations-heavy roles in the Salem market."
    ],
    highlights: [
      "Targets a strong local warehouse search phrase.",
      "Useful for logistics, fulfillment, and operations candidates.",
      "Pairs well with construction, full-time, and entry-level searches."
    ],
    faqs: [
      {
        question: "Are warehouse jobs only entry-level?",
        answer:
          "No. Some warehouse pages attract early-career candidates, but local logistics hiring can also include leads, coordinators, operations, and management roles."
      },
      {
        question: "Why not just use the main Salem jobs page?",
        answer:
          "Because warehouse candidates often search by category directly, and a focused page is easier for both searchers and search engines to understand."
      }
    ],
    relatedLinks: [
      {
        href: "/jobs/salem/entry-level",
        title: "Entry-level jobs in Salem",
        description: "Useful if you want local roles with lower barriers to entry."
      },
      {
        href: "/jobs/salem/full-time",
        title: "Full-time jobs in Salem",
        description: "Many warehouse roles align with full-time local hiring."
      },
      {
        href: "/jobs/salem",
        title: "All Salem jobs",
        description: "Widen into the broader local market when useful."
      }
    ],
    searchParams: buildSearchParams({ q: "warehouse", location: "Salem" })
  },
  {
    slug: "retail",
    path: "/jobs/salem/retail",
    seoTitle: "Retail Jobs in Salem Oregon",
    seoDescription: "Find retail jobs in Salem Oregon across sales floors, customer service, local stores, and nearby front-line employers.",
    heroTitle: "Retail jobs in Salem Oregon",
    eyebrow: "Salem Oregon retail jobs",
    intro: [
      "Retail jobs in Salem Oregon are a core local search pattern for candidates who want steady front-line work, flexible schedules, or an accessible entry point into the local market. This page gives retail search intent its own Salem destination.",
      "It works especially well alongside Keizer and part-time pages because many practical local options overlap across those searches."
    ],
    highlights: [
      "Built around a durable local front-line category.",
      "Useful for schedule-flexible and customer-facing work.",
      "Pairs naturally with part-time and Keizer searches."
    ],
    faqs: [
      {
        question: "Are retail jobs in Salem mostly part-time?",
        answer:
          "Not entirely. Many are part-time, but retail also includes full-time and lead-style local roles."
      },
      {
        question: "Should I check Keizer too for retail jobs?",
        answer:
          "Yes. Salem and Keizer overlap strongly for retail search behavior, so most candidates should search both."
      }
    ],
    relatedLinks: [
      {
        href: "/jobs/salem/part-time",
        title: "Part-time jobs in Salem",
        description: "A common companion page for retail candidates."
      },
      {
        href: "/jobs/keizer",
        title: "Keizer jobs",
        description: "Expand into nearby north-side and Keizer options."
      },
      {
        href: "/jobs/salem/entry-level",
        title: "Entry-level jobs in Salem",
        description: "Retail is often a strong early-career local path."
      }
    ],
    searchParams: buildSearchParams({ q: "retail", location: "Salem" })
  },
  {
    slug: "government",
    path: "/jobs/salem/government",
    seoTitle: "Government Jobs in Salem Oregon",
    seoDescription: "Browse government jobs in Salem Oregon, including city, county, and state-related local employment opportunities.",
    heroTitle: "Government jobs in Salem Oregon",
    eyebrow: "Salem Oregon government jobs",
    intro: [
      "Government jobs in Salem Oregon are strategically important because Salem is the state capital and candidates search for this category explicitly. This page creates a clear local destination for government-oriented hiring intent.",
      "It is useful for candidates looking for city, county, state, and public-sector-adjacent opportunities tied to Salem."
    ],
    highlights: [
      "Targets one of the most strategic Salem-specific job categories.",
      "Useful for stable, locally rooted employment searches.",
      "Pairs well with full-time and administration-oriented browsing."
    ],
    faqs: [
      {
        question: "Why is a government jobs page especially important in Salem?",
        answer:
          "Because Salem's role as the capital makes government-related job intent unusually strong compared with many other local markets."
      },
      {
        question: "Will all government jobs use the word government in the title?",
        answer:
          "No. Some may appear under agency, city, county, administrative, or public-service language, which is why the page combines listings with supporting local context."
      }
    ],
    relatedLinks: [
      {
        href: "/jobs/salem/full-time",
        title: "Full-time jobs in Salem",
        description: "Many government-oriented roles align with stable full-time local employment."
      },
      {
        href: "/jobs/salem",
        title: "All Salem jobs",
        description: "Broaden the search if you want related admin or support roles too."
      },
      {
        href: "/resources/best-places-to-find-jobs-in-salem",
        title: "Best places to find jobs in Salem",
        description: "Use the guide to widen your public-sector search strategy."
      }
    ],
    searchParams: buildSearchParams({ q: "government", location: "Salem" })
  },
  {
    slug: "hospitality",
    path: "/jobs/salem/hospitality",
    seoTitle: "Hospitality Jobs in Salem Oregon",
    seoDescription: "Find hospitality jobs in Salem Oregon including service, guest-facing, and flexible local schedule roles.",
    heroTitle: "Hospitality jobs in Salem Oregon",
    eyebrow: "Salem Oregon hospitality jobs",
    intro: [
      "Hospitality jobs in Salem Oregon are often fast-moving and local by nature, which makes them a strong category page for both searchers and search engines. This page is designed for guest-facing work, service operations, and flexible schedule hiring.",
      "If you are comparing flexibility and speed, this page pairs especially well with the restaurant and part-time Salem pages."
    ],
    highlights: [
      "Good fit for fast-moving local openings.",
      "Useful for service and guest-facing work.",
      "Pairs well with restaurant and part-time searches."
    ],
    faqs: [
      {
        question: "Is hospitality a good local entry point in Salem?",
        answer:
          "Often yes. Hospitality can be one of the strongest local routes for candidates who want flexible schedules or quicker hiring cycles."
      },
      {
        question: "Should I also search Keizer for hospitality work?",
        answer:
          "Yes. Nearby service and hospitality demand often overlaps across Salem and Keizer."
      }
    ],
    relatedLinks: [
      {
        href: "/jobs/salem/restaurant",
        title: "Restaurant jobs in Salem",
        description: "Narrow into a more specific hospitality segment."
      },
      {
        href: "/jobs/salem/part-time",
        title: "Part-time jobs in Salem",
        description: "Flexible hospitality schedules often overlap here."
      },
      {
        href: "/jobs/keizer",
        title: "Keizer jobs",
        description: "Expand into the nearby local market."
      }
    ],
    searchParams: buildSearchParams({ category: "hospitality", location: "Salem" })
  },
  {
    slug: "skilled-trades",
    path: "/jobs/salem/skilled-trades",
    seoTitle: "Skilled Trades Jobs in Salem Oregon",
    seoDescription: "Explore skilled trades jobs in Salem Oregon across maintenance, field work, operations, and hands-on local hiring.",
    heroTitle: "Skilled trades jobs in Salem Oregon",
    eyebrow: "Salem Oregon skilled trades jobs",
    intro: [
      "Skilled trades jobs in Salem Oregon are highly local because commute range, job site access, and practical geography matter. This page is for candidates who want hands-on Salem-area work without getting lost in statewide results.",
      "Use it for maintenance, operations, field, and practical roles that fit the local trades market."
    ],
    highlights: [
      "Built for a category where local geography matters.",
      "Useful for hands-on and operations-heavy work.",
      "Strong companion to the construction and full-time pages."
    ],
    faqs: [
      {
        question: "Why are trades pages good for local SEO?",
        answer:
          "Because candidates usually search these jobs with city intent, and the work itself tends to be highly place-dependent."
      },
      {
        question: "Should I also check construction jobs?",
        answer:
          "Yes. Trades and construction searches overlap enough that most candidates should use both."
      }
    ],
    relatedLinks: [
      {
        href: "/jobs/salem/construction",
        title: "Construction jobs in Salem",
        description: "Widen into another hands-on local hiring category."
      },
      {
        href: "/jobs/salem/full-time",
        title: "Full-time jobs in Salem",
        description: "Many trades roles align with stable full-time work."
      },
      {
        href: "/resources/salem-resume-tips",
        title: "Salem resume tips",
        description: "Tighten your application before applying broadly."
      }
    ],
    searchParams: buildSearchParams({ category: "skilled_trades", location: "Salem" })
  },
  {
    slug: "education",
    path: "/jobs/salem/education",
    seoTitle: "Education Jobs in Salem Oregon",
    seoDescription: "Browse education jobs in Salem Oregon including classroom support, school operations, and education-adjacent local roles.",
    heroTitle: "Education jobs in Salem Oregon",
    eyebrow: "Salem Oregon education jobs",
    intro: [
      "Education jobs in Salem Oregon deserve their own page because candidates often search for them directly rather than from a broad jobs page. This page gives education-related local hiring a clearer destination.",
      "It works for classroom support, school operations, administration, and education-adjacent work across the Salem market."
    ],
    highlights: [
      "Targets education-specific Salem intent.",
      "Useful for both direct and adjacent school roles.",
      "Pairs with part-time and full-time Salem searches."
    ],
    faqs: [
      {
        question: "Are these only teaching jobs?",
        answer:
          "No. Education hiring includes support, operations, administration, and many roles beyond classroom teaching."
      },
      {
        question: "Should I combine this with schedule pages?",
        answer:
          "Yes. Education hiring spans different schedules, so pairing category intent with part-time or full-time pages can help."
      }
    ],
    relatedLinks: [
      {
        href: "/jobs/salem/part-time",
        title: "Part-time jobs in Salem",
        description: "Useful for some education support searches."
      },
      {
        href: "/jobs/salem/full-time",
        title: "Full-time jobs in Salem",
        description: "Good for stable education-track roles."
      },
      {
        href: "/jobs/salem",
        title: "All Salem jobs",
        description: "Broaden the market when you want adjacent roles too."
      }
    ],
    searchParams: buildSearchParams({ category: "education", location: "Salem" })
  },
  {
    slug: "entry-level",
    path: "/jobs/salem/entry-level",
    seoTitle: "Entry-Level Jobs in Salem Oregon",
    seoDescription: "Find entry-level jobs in Salem Oregon across hospitality, retail, support work, and early-career local hiring.",
    heroTitle: "Entry-level jobs in Salem Oregon",
    eyebrow: "Entry-level Salem Oregon jobs",
    intro: [
      "Entry-level jobs in Salem Oregon are a major local need because many candidates are re-entering the workforce, changing industries, or starting their first serious job search. This page is designed to meet that intent directly.",
      "It uses listing data plus local guidance so the page still helps when employers do not use the exact words entry level in the job title."
    ],
    highlights: [
      "Built for early-career and re-entry local candidates.",
      "Useful for hospitality, retail, and support paths into the market.",
      "Pairs well with restaurant, retail, and part-time pages."
    ],
    faqs: [
      {
        question: "Do Salem employers always label entry-level roles clearly?",
        answer:
          "No. Many early-career roles show up as assistant, coordinator, support, trainee, or customer-facing titles instead."
      },
      {
        question: "What should I check if this page looks light?",
        answer:
          "Use it as a starting point, then widen into restaurant, retail, hospitality, part-time, and the main Salem page."
      }
    ],
    relatedLinks: [
      {
        href: "/jobs/salem/restaurant",
        title: "Restaurant jobs in Salem",
        description: "One of the strongest local entry paths."
      },
      {
        href: "/jobs/salem/retail",
        title: "Retail jobs in Salem",
        description: "Another common early-career local category."
      },
      {
        href: "/resources/salem-resume-tips",
        title: "Salem resume tips",
        description: "Improve your applications when your experience is still growing."
      }
    ],
    searchParams: buildSearchParams({ q: "entry level", location: "Salem" })
  }
]

export const resourceArticles: ResourceArticle[] = [
  {
    slug: "best-places-to-find-jobs-in-salem",
    path: "/resources/best-places-to-find-jobs-in-salem",
    seoTitle: "Best Places to Find Jobs in Salem Oregon",
    seoDescription:
      "A Salem Oregon job search guide covering where to look, how to widen a local search, and how to avoid missing practical opportunities.",
    heroTitle: "Best places to find jobs in Salem Oregon",
    intro: [
      "The best Salem Oregon jobs strategy is not a single job board. It is a repeatable local system that combines city pages, category pages, employer pages, and a weekly habit of checking fresh listings.",
      "This guide explains how Salem job seekers can cover the local market more thoroughly without turning the search into a mess."
    ],
    sections: [
      {
        heading: "Start with Salem, then narrow by category",
        paragraphs: [
          "Open the main Salem jobs page first so you can see the shape of the local market. After that, move into targeted pages like restaurant jobs, healthcare jobs, construction jobs, or warehouse jobs in Salem.",
          "That sequence keeps you from narrowing too early before you understand where local volume really is."
        ]
      },
      {
        heading: "Use nearby city pages as part of one search system",
        paragraphs: [
          "Many candidates should search Keizer along with Salem because the practical labor market overlaps. Limiting yourself to one city phrase too early can shrink real options.",
          "That is especially true for retail, service, hospitality, support, and front-line work."
        ]
      },
      {
        heading: "Keep a local weekly rhythm",
        paragraphs: [
          "In a local market, missing fresh openings matters. Recheck the board a few times each week, save useful searches, and tighten your resume for the categories that appear most often.",
          "That habit does more for results than endlessly opening new generic job boards."
        ]
      }
    ],
    faqs: [
      {
        question: "Should I only use local boards for Salem jobs?",
        answer:
          "No. Local boards are the best anchor, but the strongest search still mixes local pages, employer sites, and nearby-city searches."
      },
      {
        question: "Is Keizer part of the same practical search area?",
        answer:
          "Usually yes. Most Salem-area job seekers should keep both Salem and Keizer in rotation."
      }
    ],
    relatedLinks: [
      {
        href: "/jobs/salem",
        title: "Salem jobs",
        description: "Start on the main Salem jobs page."
      },
      {
        href: "/jobs/keizer",
        title: "Keizer jobs",
        description: "Add the nearby city market to your routine."
      },
      {
        href: "/resources/salem-vs-keizer-job-market-guide",
        title: "Salem vs. Keizer guide",
        description: "Compare the two local markets more directly."
      }
    ]
  },
  {
    slug: "salem-resume-tips",
    path: "/resources/salem-resume-tips",
    seoTitle: "Salem Oregon Resume Tips",
    seoDescription:
      "Practical resume advice for Salem Oregon job seekers applying to local employers across healthcare, service, office, and trades work.",
    heroTitle: "Salem Oregon resume tips that help local applications",
    intro: [
      "A Salem Oregon resume does not need to sound like a national corporate template. It needs to be clear, locally relevant, and easy for employers to scan quickly.",
      "These tips are written for real Salem-area job seekers who want stronger local applications without overcomplicating the process."
    ],
    sections: [
      {
        heading: "Lead with relevance",
        paragraphs: [
          "Local employers often want to understand fit quickly. Put the most relevant experience, tools, certifications, and customer-facing work near the top so the match is obvious.",
          "That matters even more in smaller markets where screening often happens fast."
        ]
      },
      {
        heading: "Translate your experience across local categories",
        paragraphs: [
          "Many Salem candidates change industries or return to work after a gap. Rewrite experience around reliability, teamwork, scheduling, documentation, customer service, safety, and follow-through so it reads well across categories.",
          "Those patterns matter in healthcare support, retail, hospitality, education, administration, and trades."
        ]
      },
      {
        heading: "Tailor lightly, but do tailor",
        paragraphs: [
          "You do not need a brand-new resume every time. A few targeted edits to the summary, ordering, and a handful of bullets often do enough.",
          "That is especially effective when you came in through a category page like healthcare, restaurant, or warehouse jobs in Salem."
        ]
      }
    ],
    faqs: [
      {
        question: "Do Salem employers expect a one-page resume?",
        answer:
          "Often yes for straightforward local roles, though two pages can still work if the content is clearly relevant and easy to scan."
      },
      {
        question: "Should I tailor my resume for every application?",
        answer:
          "Yes, but keep it lightweight. Small targeted edits usually matter more than a full rewrite."
      }
    ],
    relatedLinks: [
      {
        href: "/jobs/salem/entry-level",
        title: "Entry-level jobs in Salem",
        description: "Useful if you are rewriting your resume for early-career roles."
      },
      {
        href: "/jobs/salem/skilled-trades",
        title: "Skilled trades jobs in Salem",
        description: "Apply these resume tips to hands-on local work."
      },
      {
        href: "/jobs/salem",
        title: "Salem jobs",
        description: "Put the advice to work on live local openings."
      }
    ]
  },
  {
    slug: "how-to-get-hired-in-salem-healthcare",
    path: "/resources/how-to-get-hired-in-salem-healthcare",
    seoTitle: "How to Get Hired in Salem Oregon Healthcare",
    seoDescription:
      "A Salem Oregon healthcare hiring guide for candidates targeting care teams, support roles, and healthcare operations jobs locally.",
    heroTitle: "How to get hired in Salem Oregon healthcare",
    intro: [
      "Healthcare is one of the strongest Salem Oregon job categories, but that also means candidates cannot afford to sound generic. The strongest applications show fit quickly and clearly.",
      "This guide is built for Salem-area job seekers targeting healthcare support, operations, and patient-facing roles."
    ],
    sections: [
      {
        heading: "Show the kind of environment you can handle",
        paragraphs: [
          "Healthcare employers often want proof you can handle pace, documentation, confidentiality, scheduling, teamwork, and process discipline.",
          "Even if your background is not clinical, frame your experience around those realities."
        ]
      },
      {
        heading: "Use the category page first",
        paragraphs: [
          "Start with the dedicated Salem healthcare jobs page, then widen to full-time or general Salem jobs if you want related support roles too.",
          "That keeps the search focused without making it too narrow."
        ]
      },
      {
        heading: "Write a better short note",
        paragraphs: [
          "A short application note should explain why your experience fits the specific healthcare environment, not just why you need the job.",
          "That matters in smaller local markets where employers can spot generic applications quickly."
        ]
      }
    ],
    faqs: [
      {
        question: "Do I need direct healthcare experience to get hired in Salem healthcare?",
        answer:
          "Not always. Support, admin, operations, and some patient-facing roles can still value transferable experience if you explain it well."
      },
      {
        question: "Should I only search healthcare category pages?",
        answer:
          "Start there, then widen into full-time or broader Salem pages so you catch related roles that may be categorized differently."
      }
    ],
    relatedLinks: [
      {
        href: "/jobs/salem/healthcare",
        title: "Healthcare jobs in Salem",
        description: "Start with the dedicated category page."
      },
      {
        href: "/jobs/salem/full-time",
        title: "Full-time jobs in Salem",
        description: "Expand into stable local roles where useful."
      },
      {
        href: "/resources/salem-resume-tips",
        title: "Salem resume tips",
        description: "Tighten your application before applying."
      }
    ]
  },
  {
    slug: "salem-vs-keizer-job-market-guide",
    path: "/resources/salem-vs-keizer-job-market-guide",
    seoTitle: "Salem vs Keizer Job Market Guide",
    seoDescription:
      "Compare Salem and Keizer job-search strategy, commute overlap, and when to search both local markets together.",
    heroTitle: "Salem vs. Keizer job market guide",
    intro: [
      "Salem and Keizer are different search phrases, but for many candidates they are one practical market. The commute is short, employer footprints overlap, and searching both usually produces better options.",
      "This guide shows how to use both local pages without turning the process into duplicate work."
    ],
    sections: [
      {
        heading: "Use Salem as the broad anchor",
        paragraphs: [
          "Salem usually has the wider employer mix and works best as the main city page when you want the broadest snapshot.",
          "From there, Keizer becomes the focused nearby page when north-side commute convenience matters most."
        ]
      },
      {
        heading: "Search both if you want real local coverage",
        paragraphs: [
          "A narrow city-only search can miss good opportunities that are effectively next door. This is especially true for retail, service, hospitality, and support roles.",
          "Use both pages, then jump into the full jobs index when you want every current opening."
        ]
      },
      {
        heading: "Let commute reality decide",
        paragraphs: [
          "The right mix depends on where you live, your schedule, and how much travel flexibility you have.",
          "In practice, most nearby residents should keep both pages in rotation."
        ]
      }
    ],
    faqs: [
      {
        question: "Should I choose Salem or Keizer first?",
        answer:
          "Start with Salem for the broadest view, then use Keizer when north-side convenience or city-specific intent matters more."
      },
      {
        question: "Are there jobs that only make sense on one page?",
        answer:
          "Sometimes, but many practical opportunities sit close enough that checking both pages is still the strongest approach."
      }
    ],
    relatedLinks: [
      {
        href: "/jobs/salem",
        title: "Salem jobs",
        description: "Use Salem as the anchor page."
      },
      {
        href: "/jobs/keizer",
        title: "Keizer jobs",
        description: "Add the nearby city page to your search."
      },
      {
        href: "/jobs",
        title: "All jobs",
        description: "Open the full index when you want everything current."
      }
    ]
  }
]

export const primaryLandingLinks: LinkCard[] = [
  {
    href: "/jobs/salem",
    title: "Salem jobs",
    description: "The main city page for Salem Oregon jobs and broad local hiring."
  },
  {
    href: "/jobs/keizer",
    title: "Keizer jobs",
    description: "A focused nearby city page for Keizer and North Salem hiring."
  },
  {
    href: "/jobs/salem/restaurant",
    title: "Restaurant jobs in Salem",
    description: "One of the strongest city-plus-category search combinations."
  },
  {
    href: "/jobs/salem/healthcare",
    title: "Healthcare jobs in Salem",
    description: "A durable local hiring category with strong Salem-specific intent."
  },
  {
    href: "/jobs/salem/construction",
    title: "Construction jobs in Salem",
    description: "A local category where commute range and geography matter."
  },
  {
    href: "/jobs/salem/warehouse",
    title: "Warehouse jobs in Salem",
    description: "A strong local search phrase for logistics and fulfillment work."
  }
]

export const allJobsLandingLinks: LinkCard[] = jobsLandingPages.map((page) => ({
  href: page.path,
  title: page.heroTitle,
  description: page.seoDescription
}))

export const allResourceArticleLinks: LinkCard[] = resourceArticles.map((article) => ({
  href: article.path,
  title: article.heroTitle,
  description: article.seoDescription
}))

export const salemCategoryPages = jobsLandingPages.filter((page) => page.path.startsWith("/jobs/salem/"))

export function getJobsLandingPageBySlug(slug: string) {
  return jobsLandingPages.find((page) => page.slug === slug) ?? null
}

export function getJobsLandingPageByPath(path: string) {
  return jobsLandingPages.find((page) => page.path === path) ?? null
}

export function getResourceArticleBySlug(slug: string) {
  return resourceArticles.find((article) => article.slug === slug) ?? null
}
