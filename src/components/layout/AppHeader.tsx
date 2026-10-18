import { useTranslations } from "next-intl";
import { Radar } from "lucide-react";
import { ProfileHeaderLink } from "@/components/profile/ProfileHeaderLink";

export function AppHeader() {
  const t = useTranslations("app");
  return (
    <header className="z-40 flex items-center justify-between gap-2.5 border-b bg-background/95 px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Radar aria-hidden className="size-5" />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-lg font-bold tracking-tight">{t("name")}</span>
          <span className="text-xs text-muted-foreground">{t("tagline")}</span>
        </div>
      </div>
      <ProfileHeaderLink />
    </header>
  );
}
