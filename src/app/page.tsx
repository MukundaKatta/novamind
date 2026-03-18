import Link from "next/link";
import { Brain, Zap, Shield, BarChart3, Code2, Users } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
              NovaMind
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 inline-flex items-center rounded-full border bg-muted px-4 py-1.5 text-sm">
            <Zap className="mr-2 h-3.5 w-3.5 text-amber-500" />
            Multi-model AI platform
          </div>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            One platform for{" "}
            <span className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">
              every LLM
            </span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            NovaMind gives you a unified playground, API gateway, and analytics dashboard
            for OpenAI, Anthropic, Google, and open-source models. Manage conversations,
            generate API keys, track costs, and collaborate with your team.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="inline-flex h-11 items-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:shadow-xl"
            >
              Start Free
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex h-11 items-center rounded-md border bg-background px-8 text-sm font-medium shadow-sm hover:bg-accent transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold">Everything you need</h2>
          <p className="mt-3 text-muted-foreground">
            A complete toolkit for AI development and deployment
          </p>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {[
            {
              icon: Brain,
              title: "Multi-Model Chat",
              description:
                "Switch between GPT-4o, Claude, Gemini, and Llama in a single conversation. Compare outputs side by side.",
            },
            {
              icon: Code2,
              title: "API Gateway",
              description:
                "Generate API keys with rate limits. A unified endpoint for all providers with streaming support.",
            },
            {
              icon: BarChart3,
              title: "Usage Analytics",
              description:
                "Track tokens, costs, and latency across all models. P50/P95/P99 latency charts and cost breakdowns.",
            },
            {
              icon: Shield,
              title: "Enterprise Security",
              description:
                "Row-level security, API key rotation, IP allowlists, and full audit logging for compliance.",
            },
            {
              icon: Users,
              title: "Team Workspaces",
              description:
                "Collaborate with role-based access control. Share conversations, prompts, and API keys across your team.",
            },
            {
              icon: Zap,
              title: "Prompt Library",
              description:
                "Version-controlled prompt templates with variables, tagging, and community sharing.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow"
            >
              <feature.icon className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="container mx-auto px-4 py-24 border-t">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold">Simple pricing</h2>
          <p className="mt-3 text-muted-foreground">
            Start free, scale as you grow
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
          {[
            { name: "Free", price: "$0", tokens: "100K tokens/mo", cta: "Get Started" },
            { name: "Pro", price: "$29", tokens: "2M tokens/mo", cta: "Start Trial", featured: true },
            { name: "Team", price: "$79", tokens: "10M tokens/mo", cta: "Start Trial" },
            { name: "Enterprise", price: "$299", tokens: "100M tokens/mo", cta: "Contact Sales" },
          ].map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl border p-6 ${
                plan.featured
                  ? "border-primary bg-primary/5 shadow-lg ring-1 ring-primary/20"
                  : "bg-card"
              }`}
            >
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <div className="mt-4">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{plan.tokens}</p>
              <Link
                href="/auth/signup"
                className={`mt-6 inline-flex w-full h-9 items-center justify-center rounded-md text-sm font-medium transition-colors ${
                  plan.featured
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border bg-background hover:bg-accent"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>NovaMind - LLM Playground & API Gateway</p>
        </div>
      </footer>
    </div>
  );
}
