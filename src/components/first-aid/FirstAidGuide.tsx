"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  CircleAlert,
  Droplets,
  Frown,
  Phone,
  ShieldAlert,
  Siren,
  Sun,
  Thermometer,
  Waves,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "cn";
import {
  FIRST_AID_SYMPTOM_IDS,
  FIRST_AID_URGENCY,
  matchFirstAid,
  type FirstAidCaseId,
  type FirstAidSymptomId,
  type FirstAidUrgency,
} from "@/lib/firstAid";
import {
  firstAidCaseDo,
  firstAidCaseDont,
  firstAidCaseSummary,
  firstAidCaseTitle,
  firstAidSymptomLabel,
  firstAidUrgencyLabel,
} from "@/lib/i18nLabels";

const CASE_ICONS = {
  heatStroke: Siren,
  heatExhaustion: Thermometer,
  heatCramps: Waves,
  dehydration: Droplets,
  heatSyncope: Frown,
  heatRash: Sun,
} as const;

export function FirstAidGuide() {
  const t = useTranslations();
  const [selected, setSelected] = useState<FirstAidSymptomId[]>([]);
  const match = useMemo(() => matchFirstAid(selected), [selected]);

  function setChecked(id: FirstAidSymptomId, next: boolean) {
    setSelected((current) => {
      if (next) {
        return current.includes(id) ? current : [...current, id];
      }
      return current.filter((item) => item !== id);
    });
  }

  return (
    <section className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-5 pb-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{t("firstAid.heading")}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("firstAid.body")}</p>
      </header>

      <a href="tel:911" className={cn(buttonVariants({ variant: "destructive", size: "lg" }), "h-12 w-full text-base")}>
        <Phone data-icon="inline-start" />
        {t("firstAid.call911")}
      </a>
      <p className="text-xs leading-relaxed text-muted-foreground">{t("firstAid.call911Hint")}</p>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{t("firstAid.checkTitle")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("firstAid.checkHint")}</p>
        </div>
        {selected.length > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setSelected([])}>
            {t("firstAid.clearChecks")}
          </Button>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {FIRST_AID_SYMPTOM_IDS.map((id) => {
          const checked = selected.includes(id);
          return (
            <li key={id}>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-2xl px-3 py-2.5 ring-1 transition-colors",
                  checked ? "bg-primary/5 ring-primary" : "bg-card ring-foreground/10",
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) => {
                    if (typeof value === "boolean") setChecked(id, value);
                  }}
                  className="mt-0.5 size-5"
                />
                <span className="text-sm leading-snug">{firstAidSymptomLabel(t, id)}</span>
              </label>
            </li>
          );
        })}
      </ul>

      {match.primary ? (
        <CaseResult id={match.primary} emergency={match.emergency} />
      ) : (
        <p className="rounded-2xl bg-muted/60 px-3 py-2.5 text-sm leading-relaxed text-muted-foreground">
          {t("firstAid.checkEmpty")}
        </p>
      )}

      <Alert className="border-red-300 bg-red-50 text-red-950">
        <ShieldAlert />
        <AlertTitle>{t("firstAid.redFlagsTitle")}</AlertTitle>
        <AlertDescription>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-red-950">
            <li>{t("firstAid.redFlags.one")}</li>
            <li>{t("firstAid.redFlags.two")}</li>
            <li>{t("firstAid.redFlags.three")}</li>
            <li>{t("firstAid.redFlags.four")}</li>
          </ul>
        </AlertDescription>
      </Alert>

      <p className="text-xs leading-relaxed text-muted-foreground">{t("firstAid.disclaimer")}</p>
    </section>
  );
}

function CaseResult({ id, emergency }: { id: FirstAidCaseId; emergency: boolean }) {
  const t = useTranslations();
  const Icon = CASE_ICONS[id];
  const urgency = FIRST_AID_URGENCY[id];

  return (
    <Card
      className={cn(
        "shadow-none",
        emergency || urgency === "emergency"
          ? "bg-red-50/80 ring-2 ring-red-300"
          : "ring-primary/30",
      )}
    >
      <CardHeader className="gap-2">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {t("firstAid.resultLead")}
        </p>
        <div className="flex items-start gap-3">
          <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", urgencyTone(urgency))}>
            <Icon aria-hidden className="size-5" />
          </span>
          <div className="min-w-0 flex-1 space-y-1.5">
            <CardTitle className="text-base leading-tight font-semibold">{firstAidCaseTitle(t, id)}</CardTitle>
            <UrgencyBadge urgency={urgency} />
          </div>
        </div>
        <CardDescription className="text-sm leading-relaxed text-foreground">
          {firstAidCaseSummary(t, id)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {(emergency || urgency === "emergency") && (
          <a href="tel:911" className={cn(buttonVariants({ variant: "destructive", size: "sm" }), "w-full")}>
            <Phone data-icon="inline-start" />
            {t("firstAid.call911")}
          </a>
        )}
        <GuideList title={t("firstAid.do")} items={firstAidCaseDo(t, id)} />
        <GuideList title={t("firstAid.dont")} items={firstAidCaseDont(t, id)} icon="alert" />
      </CardContent>
    </Card>
  );
}

function GuideList({
  title,
  items,
  icon,
}: {
  title: string;
  items: readonly string[];
  icon?: "alert";
}) {
  return (
    <div className="rounded-xl bg-background/80 px-3 py-2.5 ring-1 ring-foreground/8">
      <p className="text-xs font-semibold">{title}</p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-snug">
            {icon === "alert" ? (
              <CircleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0 text-destructive" />
            ) : (
              <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
            )}
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function UrgencyBadge({ urgency }: { urgency: FirstAidUrgency }) {
  const t = useTranslations();
  return (
    <Badge
      variant={urgency === "emergency" ? "destructive" : urgency === "urgent" ? "default" : "secondary"}
      className="h-6"
    >
      {firstAidUrgencyLabel(t, urgency)}
    </Badge>
  );
}

function urgencyTone(urgency: FirstAidUrgency): string {
  if (urgency === "emergency") return "bg-red-100 text-red-900";
  if (urgency === "urgent") return "bg-orange-100 text-orange-950";
  return "bg-muted text-foreground";
}
