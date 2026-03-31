"use server";

import { cookies } from "next/headers";
import { isAppLocale } from "@/i18n/routing";

export async function setUserLocale(locale: string) {
  if (!isAppLocale(locale)) return;
  const store = await cookies();
  store.set("NEXT_LOCALE", locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
}
