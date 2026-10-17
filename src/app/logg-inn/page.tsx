import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser, safeReturnPath } from "@/lib/auth";
import { Loading } from "@/components/Loading";
import { LoginForm } from "./LoginForm";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.login.title };
}

export default async function LoginPage(props: PageProps<"/logg-inn">) {
  const t = await getT();
  return (
    <div className="wrap narrow">
      <div className="auth">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/symbol.png" alt="" width={76} height={76} />
        <div className="stack" style={{ gap: 6 }}>
          <span className="small">{t.appName}</span>
          <h1>{t.login.title}</h1>
        </div>
        <div className="panel">
          <Suspense fallback={<Loading />}>
            <LoginContent searchParams={props.searchParams} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

async function LoginContent({ searchParams }: { searchParams: PageProps<"/logg-inn">["searchParams"] }) {
  const sp = await searchParams;
  const next = safeReturnPath(typeof sp.neste === "string" ? sp.neste : "/");
  if (await getCurrentUser()) redirect(next);
  return <LoginForm next={next} />;
}
