"use client";

import React, { useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { useSupabase } from "@/hooks/use-supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Settings,
  User,
  CreditCard,
  Bell,
  Shield,
  Check,
  Loader2,
} from "lucide-react";
import { PRICING_PLANS, getPlanByTier } from "@/lib/stripe/config";
import { formatTokens, formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export default function SettingsPage() {
  const supabase = useSupabase();
  const { profile, setProfile } = useAppStore();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const currentPlan = getPlanByTier(profile?.subscription_tier || "free");

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", profile.id);

    if (!error) {
      setProfile({ ...profile, full_name: fullName });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  const handleUpgrade = async (priceId: string) => {
    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId }),
    });

    if (response.ok) {
      const { url } = await response.json();
      window.location.href = url;
    }
  };

  const handleManageBilling = async () => {
    const response = await fetch("/api/billing/portal", {
      method: "POST",
    });

    if (response.ok) {
      const { url } = await response.json();
      window.location.href = url;
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account and subscription
        </p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="text-lg">
                {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{profile?.full_name || "User"}</p>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={profile?.email || ""} disabled />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed here. Contact support.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4 mr-2" />
            ) : null}
            {saved ? "Saved" : "Save Changes"}
          </Button>
        </CardFooter>
      </Card>

      {/* Subscription Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription
          </CardTitle>
          <CardDescription>
            Current plan: <Badge className="ml-1">{currentPlan.name}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PRICING_PLANS.map((plan) => {
              const isCurrent = plan.id === profile?.subscription_tier;
              return (
                <div
                  key={plan.id}
                  className={cn(
                    "rounded-lg border p-4",
                    isCurrent && "border-primary bg-primary/5 ring-1 ring-primary/20"
                  )}
                >
                  <h3 className="font-semibold">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-2xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground text-sm">/mo</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatTokens(plan.monthlyTokens)} tokens/month
                  </p>
                  <ul className="mt-3 space-y-1">
                    {plan.features.slice(0, 4).map((f) => (
                      <li key={f} className="text-xs text-muted-foreground flex items-start gap-1">
                        <Check className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4">
                    {isCurrent ? (
                      <Button variant="outline" size="sm" className="w-full" disabled>
                        Current Plan
                      </Button>
                    ) : plan.price > 0 ? (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => handleUpgrade(plan.stripePriceId)}
                      >
                        Upgrade
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          {profile?.stripe_customer_id && (
            <div className="mt-4">
              <Button variant="outline" onClick={handleManageBilling}>
                Manage Billing
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>Manage your account security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Password</p>
              <p className="text-xs text-muted-foreground">
                Change your account password
              </p>
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                if (profile?.email) {
                  await supabase.auth.resetPasswordForEmail(profile.email, {
                    redirectTo: `${window.location.origin}/auth/callback?redirect=/dashboard/settings`,
                  });
                  alert("Password reset email sent!");
                }
              }}
            >
              Change Password
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-destructive">Delete Account</p>
              <p className="text-xs text-muted-foreground">
                Permanently delete your account and all data
              </p>
            </div>
            <Button variant="destructive" size="sm">
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
