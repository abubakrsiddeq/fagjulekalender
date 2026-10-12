import { Suspense } from "react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { Loading } from "@/components/Loading";
import { ProfileForm } from "./ProfileForm";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.profile.title };

export default function ProfilePage() {
  return (
    <div className="wrap narrow">
      <h1>{t.profile.title}</h1>
      <div className="panel">
        <Suspense fallback={<Loading />}>
          <ProfileContent />
        </Suspense>
      </div>
    </div>
  );
}

async function ProfileContent() {
  const user = await requireUser("/profil");
  return (
    <>
      <p className="small">
        {t.profile.email}: {user.email}
      </p>
      <ProfileForm name={user.display_name} hideName={!!user.hide_name} notify={!!user.notify_daily} />
    </>
  );
}
