"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { t } from "@/i18n";

export interface ProfileState {
  ok?: boolean;
  error?: string;
}

export async function saveProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await getCurrentUser();
  if (!user) redirect("/logg-inn?neste=/profil");
  const name = String(formData.get("display_name") ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
  if (!name) return { error: t.profile.nameRequired };
  await db.execute("UPDATE users SET display_name = ?, hide_name = ?, notify_daily = ? WHERE id = ?", [
    name,
    formData.get("hide_name") === "on" ? 1 : 0,
    formData.get("notify_daily") === "on" ? 1 : 0,
    user.id,
  ]);
  return { ok: true };
}
