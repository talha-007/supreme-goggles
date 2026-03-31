"use client";

import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

const BUSINESS_TYPES = [
  { value: "shop", key: "typeShop" as const },
  { value: "retailer", key: "typeRetailer" as const },
  { value: "wholesaler", key: "typeWholesaler" as const },
] as const;

export function OnboardingForm() {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof BUSINESS_TYPES)[number]["value"]>("shop");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.rpc("create_business_with_owner", {
      p_name: name.trim(),
      p_type: type,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("businessName")}
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          minLength={1}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("businessNamePlaceholder")}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("businessType")}</span>
        <div className="flex flex-col gap-2">
          {BUSINESS_TYPES.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700"
            >
              <input
                type="radio"
                name="type"
                value={opt.value}
                checked={type === opt.value}
                onChange={() => setType(opt.value)}
              />
              <span className="text-sm text-zinc-800 dark:text-zinc-200">{t(opt.key)}</span>
            </label>
          ))}
        </div>
      </div>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {loading ? t("creating") : t("submit")}
      </button>
    </form>
  );
}
