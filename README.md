# NovaMind

**Unified Multi-Model AI Platform**

NovaMind is a single platform to interact with every major LLM. Access OpenAI, Anthropic, Google, and open-source models through a unified playground, manage API keys, track costs, run prompt experiments, and collaborate with your team.

## Features

- **Multi-Model Playground** -- Chat with OpenAI, Anthropic, and Google models from one interface
- **Conversation Management** -- Save, organize, and search conversation history
- **API Key Management** -- Generate and rotate keys for programmatic access
- **Prompt Library** -- Store, version, and share prompt templates
- **Usage Analytics** -- Track token usage, costs, and performance across models
- **Workspace Collaboration** -- Team workspaces with shared prompts and conversations
- **Stripe Billing** -- Subscription and usage-based billing integration
- **Auth System** -- Full authentication with login, signup, and session management

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **AI Providers:** OpenAI, Anthropic SDK, Google Generative AI
- **Backend:** Supabase (Auth, Database, SSR)
- **Payments:** Stripe
- **Styling:** Tailwind CSS, Radix UI, shadcn/ui
- **State Management:** Zustand
- **Charts:** Recharts
- **Markdown:** react-markdown, remark-gfm
- **Validation:** Zod
- **Icons:** Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase project
- API keys for desired AI providers

### Installation

```bash
git clone <repository-url>
cd novamind
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_AI_API_KEY=your_google_key
STRIPE_SECRET_KEY=your_stripe_key
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── auth/                 # Login & signup
│   └── dashboard/
│       ├── conversations/    # Chat interface
│       ├── playground/       # Model playground
│       ├── api-keys/         # API key management
│       ├── prompts/          # Prompt library
│       ├── analytics/        # Usage & cost analytics
│       ├── workspace/        # Team collaboration
│       └── settings/         # Account settings
├── components/               # Radix UI-based components
└── lib/                      # AI providers, Supabase, Stripe
```

## License

MIT
