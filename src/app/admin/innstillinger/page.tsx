import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { getOrg } from "@/lib/org";
import { Loading } from "@/components/Loading";
import { SettingsForm } from "../_components/SettingsForm";

export const metadata = { title: "Innstillinger" };

export default function SettingsPage() {
  return (
    <>
      <h1>Innstillinger</h1>
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
