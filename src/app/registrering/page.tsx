import { Suspense } from "react";
import type { Metadata } from "next";
import { requireUser, safeReturnPath } from "@/lib/auth";
import { registrationFormData, registrationInitial } from "@/lib/registration";
import { Loading } from "@/components/Loading";
import { RegistrationForm } from "./RegistrationForm";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.registration.title };
}

export default async function RegistrationPage(props: PageProps<"/registrering">) {
  const t = await getT();
  return (
    <div className="wrap narrow" style={{ maxWidth: 640 }}>
      <h1>{t.registration.title}</h1>
      <p className="muted">{t.registration.intro}</p>
      <div className="panel">
        <Suspense fallback={<Loading />}>
          <Content searchParams={props.searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/registrering">["searchParams"] }) {
  const sp = await searchParams;
  const next = safeReturnPath(typeof sp.neste === "string" ? sp.neste : "/");
  const user = await requireUser(`/registrering?neste=${encodeURIComponent(next)}`);
  const data = await registrationFormData(user);
  const t = await getT();
  return (
    <>
      <p className="small">
        {t.profile.email}: {user.email}
      </p>
      <RegistrationForm mode="register" next={next} initial={registrationInitial(user)} {...data} />
    </>
  );
}
