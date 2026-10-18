"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Baby, Bike, Check, Heart, PersonStanding, Snowflake } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "cn";
import { heatShiftC, VULNERABLE_GROUP_IDS, type VulnerableGroupId } from "@/lib/vulnerable";
import { vulnerableGroupBody, vulnerableGroupLabel } from "@/lib/i18nLabels";
import { useProfileStore } from "@/store/useProfileStore";

const GROUP_ICONS = {
  senior: PersonStanding,
  child: Baby,
  pregnant: Heart,
  outdoorWorker: Bike,
} as const;

export function VulnerableMode() {
  const t = useTranslations();
  const { groups, toggleGroup, clearGroups } = useProfileStore();
  const shift = heatShiftC(groups);

  return (
    <section className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-5">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{t("vulnerable.heading")}</h1>
        <p className="text-base leading-relaxed text-muted-foreground">{t("vulnerable.body")}</p>
      </header>

      <ul className="flex flex-col gap-3.5">
        {VULNERABLE_GROUP_IDS.map((id) => (
          <li key={id}>
            <GroupCard
              id={id}
              selected={groups.includes(id)}
              title={vulnerableGroupLabel(t, id)}
              body={vulnerableGroupBody(t, id)}
              onToggle={() => toggleGroup(id)}
            />
          </li>
        ))}
      </ul>

      {shift > 0 && (
        <p className="text-sm font-medium text-foreground">{t("vulnerable.shiftNote", { degrees: shift })}</p>
      )}

      <div className="flex flex-col gap-2">
        <Link href="/cooling" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
          <Snowflake data-icon="inline-start" />
          {t("vulnerable.findCool")}
        </Link>
        {groups.length > 0 && (
          <Button variant="outline" size="lg" className="w-full" onClick={clearGroups}>
            {t("vulnerable.clear")}
          </Button>
        )}
      </div>
    </section>
  );
}

function GroupCard({
  id,
  selected,
  title,
  body,
  onToggle,
}: {
  id: VulnerableGroupId;
  selected: boolean;
  title: string;
  body: string;
  onToggle: () => void;
}) {
  const Icon = GROUP_ICONS[id];
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        "w-full rounded-2xl text-left outline-none transition-colors",
        "focus-visible:ring-3 focus-visible:ring-ring/60",
      )}
    >
      <Card
        className={cn(
          "shadow-none",
          selected ? "bg-primary/5 ring-2 ring-primary" : "ring-foreground/10",
        )}
      >
        <CardContent className="flex items-start gap-3.5">
          <span
            className={cn(
              "mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl",
              selected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
            )}
          >
            <Icon aria-hidden className="size-5" />
          </span>
          <div className="min-w-0 flex-1 space-y-1.5">
            <CardTitle className="text-base leading-tight font-semibold">{title}</CardTitle>
            <CardDescription className="text-sm leading-relaxed">{body}</CardDescription>
          </div>
          <span
            className={cn(
              "mt-1 flex size-5 shrink-0 items-center justify-center rounded-full",
              selected ? "bg-primary text-primary-foreground" : "ring-1 ring-foreground/15",
            )}
            aria-hidden
          >
            {selected && <Check className="size-3.5" strokeWidth={3} />}
          </span>
        </CardContent>
      </Card>
    </button>
  );
}
