import { Suspense } from "react";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getOrg } from "@/lib/org";
import { Loading } from "@/components/Loading";
import { getT } from "@/i18n/server";
import { SettingsForm } from "../_components/SettingsForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).admin.settings.title };
}

export default async function SettingsPage() {
  const s = (await getT()).admin.settings;
  return (
    <>
      <h1>{s.title}</h1>
      <div className="panel">
        <Suspense fallback={<Loading />}>
          <Content />
        </Suspense>
      </div>
    </>
  );
}

async function Content() {
  await requireAdmin("/admin/innstillinger");
  const org = await getOrg();
  return (
    <SettingsForm
      initial={{
        name: org.name,
        domains: org.allowed_email_domains ?? "",
        allowProposals: !!org.allow_department_proposals,
        brandColor: org.brand_color ?? "",
        logoUrl: org.logo_url ?? "",
      }}
    />
  );
}
