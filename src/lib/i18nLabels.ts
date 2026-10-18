import type { _Translator as Translator } from "use-intl/core";
import type en from "@/i18n/messages/en.json";
import type { AreaLevel } from "./psgc";
import type { CoolingKind } from "./cooling";
import type { FirstAidCaseId, FirstAidSymptomId, FirstAidUrgency } from "./firstAid";
import type { VulnerableGroupId } from "./vulnerable";

export type Translate = Translator<typeof en>;

export function coolingKindLabel(t: Translate, kind: CoolingKind): string {
  if (kind === "mall") return t("cooling.kind.mall");
  if (kind === "library") return t("cooling.kind.library");
  if (kind === "lgu") return t("cooling.kind.lgu");
  return t("cooling.kind.water");
}

export function coolingKindHint(t: Translate, kind: CoolingKind): string {
  if (kind === "mall") return t("cooling.kindHint.mall");
  if (kind === "library") return t("cooling.kindHint.library");
  if (kind === "lgu") return t("cooling.kindHint.lgu");
  return t("cooling.kindHint.water");
}

export function vulnerableGroupLabel(t: Translate, id: VulnerableGroupId): string {
  if (id === "senior") return t("vulnerable.group.senior");
  if (id === "child") return t("vulnerable.group.child");
  if (id === "pregnant") return t("vulnerable.group.pregnant");
  return t("vulnerable.group.outdoorWorker");
}

export function vulnerableGroupBody(t: Translate, id: VulnerableGroupId): string {
  if (id === "senior") return t("vulnerable.groupBody.senior");
  if (id === "child") return t("vulnerable.groupBody.child");
  if (id === "pregnant") return t("vulnerable.groupBody.pregnant");
  return t("vulnerable.groupBody.outdoorWorker");
}

export function vulnerableExtraTip(t: Translate, id: VulnerableGroupId): string {
  if (id === "senior") return t("vulnerable.extra.senior");
  if (id === "child") return t("vulnerable.extra.child");
  if (id === "pregnant") return t("vulnerable.extra.pregnant");
  return t("vulnerable.extra.outdoorWorker");
}

export function areaLevelLabel(t: Translate, level: AreaLevel): string {
  if (level === "region") return t("map.level.region");
  if (level === "province") return t("map.level.province");
  return t("map.level.city");
}

export function categoryLabel(t: Translate, id: "safe" | "caution" | "extremeCaution" | "danger" | "extremeDanger"): string {
  if (id === "safe") return t("category.safe");
  if (id === "caution") return t("category.caution");
  if (id === "extremeCaution") return t("category.extremeCaution");
  if (id === "danger") return t("category.danger");
  return t("category.extremeDanger");
}

export function officialTip(t: Translate, id: "safe" | "caution" | "extremeCaution" | "danger" | "extremeDanger"): string {
  if (id === "safe") return t("tip.safe");
  if (id === "caution") return t("tip.caution");
  if (id === "extremeCaution") return t("tip.extremeCaution");
  if (id === "danger") return t("tip.danger");
  return t("tip.extremeDanger");
}

export function firstAidUrgencyLabel(t: Translate, urgency: FirstAidUrgency): string {
  if (urgency === "emergency") return t("firstAid.urgency.emergency");
  if (urgency === "urgent") return t("firstAid.urgency.urgent");
  return t("firstAid.urgency.watch");
}

export function firstAidSymptomLabel(t: Translate, id: FirstAidSymptomId): string {
  if (id === "confused") return t("firstAid.symptoms.confused");
  if (id === "hotSkin") return t("firstAid.symptoms.hotSkin");
  if (id === "seizure") return t("firstAid.symptoms.seizure");
  if (id === "heavySweat") return t("firstAid.symptoms.heavySweat");
  if (id === "dizzy") return t("firstAid.symptoms.dizzy");
  if (id === "nauseous") return t("firstAid.symptoms.nauseous");
  if (id === "cramps") return t("firstAid.symptoms.cramps");
  if (id === "thirst") return t("firstAid.symptoms.thirst");
  if (id === "fainted") return t("firstAid.symptoms.fainted");
  return t("firstAid.symptoms.rash");
}

export function firstAidCaseTitle(t: Translate, id: FirstAidCaseId): string {
  if (id === "heatStroke") return t("firstAid.cases.heatStroke.title");
  if (id === "heatExhaustion") return t("firstAid.cases.heatExhaustion.title");
  if (id === "heatCramps") return t("firstAid.cases.heatCramps.title");
  if (id === "dehydration") return t("firstAid.cases.dehydration.title");
  if (id === "heatSyncope") return t("firstAid.cases.heatSyncope.title");
  return t("firstAid.cases.heatRash.title");
}

export function firstAidCaseSummary(t: Translate, id: FirstAidCaseId): string {
  if (id === "heatStroke") return t("firstAid.cases.heatStroke.summary");
  if (id === "heatExhaustion") return t("firstAid.cases.heatExhaustion.summary");
  if (id === "heatCramps") return t("firstAid.cases.heatCramps.summary");
  if (id === "dehydration") return t("firstAid.cases.dehydration.summary");
  if (id === "heatSyncope") return t("firstAid.cases.heatSyncope.summary");
  return t("firstAid.cases.heatRash.summary");
}

export function firstAidCaseSigns(t: Translate, id: FirstAidCaseId): string[] {
  return caseLines(t, id, "signs");
}

export function firstAidCaseDo(t: Translate, id: FirstAidCaseId): string[] {
  return caseLines(t, id, "do");
}

export function firstAidCaseDont(t: Translate, id: FirstAidCaseId): string[] {
  return caseLines(t, id, "dont");
}

function caseLines(
  t: Translate,
  id: FirstAidCaseId,
  field: "signs" | "do" | "dont",
): string[] {
  if (id === "heatStroke") {
    if (field === "signs") {
      return [
        t("firstAid.cases.heatStroke.signs.one"),
        t("firstAid.cases.heatStroke.signs.two"),
        t("firstAid.cases.heatStroke.signs.three"),
        t("firstAid.cases.heatStroke.signs.four"),
      ];
    }
    if (field === "do") {
      return [
        t("firstAid.cases.heatStroke.do.one"),
        t("firstAid.cases.heatStroke.do.two"),
        t("firstAid.cases.heatStroke.do.three"),
        t("firstAid.cases.heatStroke.do.four"),
      ];
    }
    return [
      t("firstAid.cases.heatStroke.dont.one"),
      t("firstAid.cases.heatStroke.dont.two"),
      t("firstAid.cases.heatStroke.dont.three"),
    ];
  }
  if (id === "heatExhaustion") {
    if (field === "signs") {
      return [
        t("firstAid.cases.heatExhaustion.signs.one"),
        t("firstAid.cases.heatExhaustion.signs.two"),
        t("firstAid.cases.heatExhaustion.signs.three"),
        t("firstAid.cases.heatExhaustion.signs.four"),
      ];
    }
    if (field === "do") {
      return [
        t("firstAid.cases.heatExhaustion.do.one"),
        t("firstAid.cases.heatExhaustion.do.two"),
        t("firstAid.cases.heatExhaustion.do.three"),
        t("firstAid.cases.heatExhaustion.do.four"),
      ];
    }
    return [
      t("firstAid.cases.heatExhaustion.dont.one"),
      t("firstAid.cases.heatExhaustion.dont.two"),
      t("firstAid.cases.heatExhaustion.dont.three"),
    ];
  }
  if (id === "heatCramps") {
    if (field === "signs") {
      return [
        t("firstAid.cases.heatCramps.signs.one"),
        t("firstAid.cases.heatCramps.signs.two"),
        t("firstAid.cases.heatCramps.signs.three"),
      ];
    }
    if (field === "do") {
      return [
        t("firstAid.cases.heatCramps.do.one"),
        t("firstAid.cases.heatCramps.do.two"),
        t("firstAid.cases.heatCramps.do.three"),
      ];
    }
    return [t("firstAid.cases.heatCramps.dont.one"), t("firstAid.cases.heatCramps.dont.two")];
  }
  if (id === "dehydration") {
    if (field === "signs") {
      return [
        t("firstAid.cases.dehydration.signs.one"),
        t("firstAid.cases.dehydration.signs.two"),
        t("firstAid.cases.dehydration.signs.three"),
        t("firstAid.cases.dehydration.signs.four"),
      ];
    }
    if (field === "do") {
      return [
        t("firstAid.cases.dehydration.do.one"),
        t("firstAid.cases.dehydration.do.two"),
        t("firstAid.cases.dehydration.do.three"),
      ];
    }
    return [t("firstAid.cases.dehydration.dont.one"), t("firstAid.cases.dehydration.dont.two")];
  }
  if (id === "heatSyncope") {
    if (field === "signs") {
      return [
        t("firstAid.cases.heatSyncope.signs.one"),
        t("firstAid.cases.heatSyncope.signs.two"),
        t("firstAid.cases.heatSyncope.signs.three"),
      ];
    }
    if (field === "do") {
      return [
        t("firstAid.cases.heatSyncope.do.one"),
        t("firstAid.cases.heatSyncope.do.two"),
        t("firstAid.cases.heatSyncope.do.three"),
      ];
    }
    return [
      t("firstAid.cases.heatSyncope.dont.one"),
      t("firstAid.cases.heatSyncope.dont.two"),
      t("firstAid.cases.heatSyncope.dont.three"),
    ];
  }
  if (field === "signs") {
    return [
      t("firstAid.cases.heatRash.signs.one"),
      t("firstAid.cases.heatRash.signs.two"),
      t("firstAid.cases.heatRash.signs.three"),
    ];
  }
  if (field === "do") {
    return [
      t("firstAid.cases.heatRash.do.one"),
      t("firstAid.cases.heatRash.do.two"),
      t("firstAid.cases.heatRash.do.three"),
    ];
  }
  return [t("firstAid.cases.heatRash.dont.one"), t("firstAid.cases.heatRash.dont.two")];
}
