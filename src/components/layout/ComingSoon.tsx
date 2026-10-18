import type { LucideIcon } from "lucide-react";

interface ComingSoonProps {
  icon: LucideIcon;
  title: string;
  body: string;
}

export function ComingSoon({ icon: Icon, title, body }: ComingSoonProps) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <Icon aria-hidden className="size-8" />
      </span>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="max-w-sm text-base leading-relaxed text-muted-foreground">{body}</p>
    </section>
  );
}
