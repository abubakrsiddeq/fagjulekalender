import { Suspense } from "react";
import type { Metadata } from "next";
import { requireUser, safeReturnPath } from "@/lib/auth";
import { registrationFormData, registrationInitial } from "@/lib/registration";
import { Loading } from "@/components/Loading";
import { RegistrationForm } from "./RegistrationForm";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.registration.title };

export default function RegistrationPage(props: PageProps<"/registrering">) {
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
  return (
    <>
      <p className="small">
        {t.profile.email}: {user.email}
      </p>
      <RegistrationForm mode="register" next={next} initial={registrationInitial(user)} {...data} />
    </>
  );
}
