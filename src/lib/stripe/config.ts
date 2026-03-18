import Stripe from "stripe";
import { PricingPlan } from "@/types";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
  typescript: true,
});

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    monthlyTokens: 100_000,
    features: [
      "100K tokens/month",
      "5 conversations",
      "Basic models (GPT-4o Mini, Haiku)",
      "1 API key",
      "Community support",
    ],
    stripePriceId: "",
  },
  {
    id: "pro",
    name: "Pro",
    price: 29,
    monthlyTokens: 2_000_000,
    features: [
      "2M tokens/month",
      "Unlimited conversations",
      "All models including GPT-4o, Sonnet, Gemini Pro",
      "10 API keys",
      "Prompt library access",
      "Usage analytics",
      "Priority support",
    ],
    stripePriceId: "price_pro_monthly",
  },
  {
    id: "team",
    name: "Team",
    price: 79,
    monthlyTokens: 10_000_000,
    features: [
      "10M tokens/month",
      "Everything in Pro",
      "Team workspaces",
      "Role-based access control",
      "50 API keys",
      "Advanced analytics",
      "SSO support",
    ],
    stripePriceId: "price_team_monthly",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 299,
    monthlyTokens: 100_000_000,
    features: [
      "100M tokens/month",
      "Everything in Team",
      "Unlimited API keys",
      "Custom models",
      "Dedicated support",
      "SLA guarantee",
      "Audit logs",
    ],
    stripePriceId: "price_enterprise_monthly",
  },
];

export function getPlanByTier(tier: string): PricingPlan {
  return PRICING_PLANS.find((p) => p.id === tier) || PRICING_PLANS[0];
}
