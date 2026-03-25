import type { CompanyPlanId } from "@repo/db/plans"

export type EmployerPricingPlan = {
  id: CompanyPlanId
  name: string
  priceLabel: string
  monthlyPriceCents: number | null
  eyebrow: string
  description: string
  features: string[]
  publicCtaLabel: string
  publicCtaHref: string
}

export const EMPLOYER_PRICING_PLANS: EmployerPricingPlan[] = [
  {
    id: "free",
    name: "Community",
    priceLabel: "$0 / month",
    monthlyPriceCents: 0,
    eyebrow: "For occasional hiring",
    description: "A simple starting point for Salem-area teams that only need a couple of active roles at a time.",
    features: [
      "Up to 2 active listings",
      "30-day expiry on each listing",
      "Basic text business profile",
      "Standard feed ranking"
    ],
    publicCtaLabel: "Get Started Free",
    publicCtaHref: "/employers/start?plan=free"
  },
  {
    id: "standard",
    name: "Standard",
    priceLabel: "$149 / month",
    monthlyPriceCents: 14900,
    eyebrow: "For steady local hiring",
    description: "Keep roles live year-round and give one important opening top-of-feed Spotlight visibility.",
    features: [
      "Unlimited active listings",
      "No expiry while subscription stays active",
      "Enhanced business profile",
      "1 featured Spotlight slot"
    ],
    publicCtaLabel: "Go Standard",
    publicCtaHref: "/employers/start?plan=standard"
  },
  {
    id: "partner",
    name: "Partner",
    priceLabel: "$299 / month",
    monthlyPriceCents: 29900,
    eyebrow: "For top-of-market presence",
    description: "Own the premium employer position with every listing featured and homepage Top Employer placement.",
    features: [
      "Unlimited active listings",
      "No expiry while subscription stays active",
      "Enhanced business profile",
      "All listings featured",
      'Homepage "Top Employer" slot'
    ],
    publicCtaLabel: "Go Partner",
    publicCtaHref: "/employers/start?plan=partner"
  }
]

export const EMPLOYER_PRICING_EXPLANATIONS = [
  {
    title: 'What is a "Featured Spotlight"?',
    body:
      'Our "Spotlight" feature pins your job to the very top of the HireSalem homepage and search results. Featured jobs get 3x more clicks than standard listings because they are the first thing local seekers see.'
  },
  {
    title: 'What is an "Enhanced Business Profile"?',
    body:
      "Instead of a dry list of text, we build you a dedicated Join Our Team landing page with your company logo, a custom bio, high-quality workspace photos, and direct social links. It is your chance to tell Salem why they should work for you."
  },
  {
    title: "The 30-Day Community Guarantee",
    body:
      "The Community tier is built for occasional hirers. Each post stays live for 30 days to help you find the right fit, and upgrading is one click away when you need more time or more roles."
  }
] as const

export const EMPLOYER_ADD_ONS = [
  {
    title: "The Weekly Feature",
    priceLabel: "$45",
    description: "Bump any job to the top of the list for 7 days."
  },
  {
    title: "The Extra Slot",
    priceLabel: "$29",
    description: "Need a 3rd job on your free account? Add a one-time listing."
  },
  {
    title: "The Social Shoutout",
    priceLabel: "$25",
    description: "We’ll feature your job on our local Instagram and Facebook feeds."
  }
] as const

export const EMPLOYER_FAQS = [
  {
    question: "Why hire on HireSalem instead of a national board?",
    answer:
      "HireSalem keeps your openings in front of people who already live, work, and commute in the Mid-Willamette Valley instead of burying them under giant national brands."
  },
  {
    question: "How many jobs can I post on the Community plan?",
    answer:
      "Community includes up to 2 active listings at a time. Each listing stays live for 30 days, which keeps the free tier useful for occasional hiring without turning it into an unmanaged backlog."
  },
  {
    question: "What does Standard change for my hiring team?",
    answer:
      "Standard removes the listing cap, keeps jobs live with no expiry, unlocks your enhanced business profile, and gives you one Featured Spotlight slot for the role that matters most right now."
  },
  {
    question: "What is included in Partner?",
    answer:
      "Partner adds the premium distribution layer: every listing is featured and your brand can occupy the homepage Top Employer slot, which is the strongest ongoing visibility package on HireSalem."
  },
  {
    question: "What if I only need a one-time boost?",
    answer:
      "Use an add-on. Weekly Feature, Extra Slot, and Social Shoutout are designed for employers that want a short-term lift without committing to a monthly subscription."
  }
] as const

export const COMMUNITY_LIMIT_TITLE = "You've hit the Community Limit!"

export function getCommunityLimitBody(activeListings = 2) {
  return `You currently have ${activeListings} active listings. To post more, you can buy a one-time Extra Slot ($29) or upgrade to Standard ($149/mo) to get unlimited listings and a managed business profile.`
}

export function getCommunityLimitErrorMessage(activeListings = 2) {
  return `${COMMUNITY_LIMIT_TITLE} ${getCommunityLimitBody(activeListings)}`
}

export function getEmployerPricingPlan(planId: CompanyPlanId) {
  return EMPLOYER_PRICING_PLANS.find((plan) => plan.id === planId) ?? EMPLOYER_PRICING_PLANS[0]
}
