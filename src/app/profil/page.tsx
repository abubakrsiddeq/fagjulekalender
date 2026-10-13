import { Suspense } from "react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { registrationFormData, registrationInitial } from "@/lib/registration";
import { Loading } from "@/components/Loading";
import { RegistrationForm } from "../registrering/RegistrationForm";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.profile.title };
}

export default async function ProfilePage() {
  const t = await getT();
  return (
    <div className="wrap narrow" style={{ maxWidth: 640 }}>
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
  const data = await registrationFormData(user);
  const t = await getT();
  return (
    <>
      <p className="small">
        {t.profile.email}: {user.email}
      </p>
      <RegistrationForm mode="profile" initial={registrationInitial(user)} {...data} />
    </>
  );
}
