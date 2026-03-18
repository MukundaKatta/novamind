// Supabase Edge Function: Stripe Webhook
// Alternative webhook handler deployed as a Supabase Edge Function

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";
import Stripe from "https://esm.sh/stripe@17.3.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-11-20.acacia",
});

const PLANS: Record<string, { tier: string; tokens: number }> = {
  price_pro_monthly: { tier: "pro", tokens: 2_000_000 },
  price_team_monthly: { tier: "team", tokens: 10_000_000 },
  price_enterprise_monthly: { tier: "enterprise", tokens: 100_000_000 },
};

serve(async (req: Request) => {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    );
  } catch (err) {
    return new Response(`Webhook error: ${err.message}`, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.metadata?.supabase_user_id;
      if (!userId || !session.subscription) break;

      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      );
      const priceId = subscription.items.data[0]?.price.id;
      const plan = PLANS[priceId];

      if (plan) {
        await supabase
          .from("profiles")
          .update({
            subscription_tier: plan.tier,
            subscription_status: "active",
            monthly_token_limit: plan.tokens,
          })
          .eq("id", userId);
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const customerId = subscription.customer as string;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (profile) {
        const priceId = subscription.items.data[0]?.price.id;
        const plan = PLANS[priceId];

        await supabase
          .from("profiles")
          .update({
            subscription_tier: plan?.tier || "free",
            subscription_status: subscription.status === "active" ? "active" : "past_due",
            monthly_token_limit: plan?.tokens || 100_000,
          })
          .eq("id", profile.id);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const customerId = subscription.customer as string;

      await supabase
        .from("profiles")
        .update({
          subscription_tier: "free",
          subscription_status: "canceled",
          monthly_token_limit: 100_000,
        })
        .eq("stripe_customer_id", customerId);
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
