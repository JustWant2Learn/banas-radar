export const FIRST_AID_CASE_IDS = [
  "heatStroke",
  "heatExhaustion",
  "heatCramps",
  "dehydration",
  "heatSyncope",
  "heatRash",
] as const;

export type FirstAidCaseId = (typeof FIRST_AID_CASE_IDS)[number];

export type FirstAidUrgency = "emergency" | "urgent" | "watch";

export const FIRST_AID_URGENCY: Record<FirstAidCaseId, FirstAidUrgency> = {
  heatStroke: "emergency",
  heatExhaustion: "urgent",
  heatCramps: "urgent",
  dehydration: "urgent",
  heatSyncope: "emergency",
  heatRash: "watch",
};

export const FIRST_AID_SYMPTOM_IDS = [
  "confused",
  "hotSkin",
  "seizure",
  "heavySweat",
  "dizzy",
  "nauseous",
  "cramps",
  "thirst",
  "fainted",
  "rash",
] as const;

export type FirstAidSymptomId = (typeof FIRST_AID_SYMPTOM_IDS)[number];

export const FIRST_AID_EMERGENCY_SYMPTOMS = ["confused", "seizure"] as const;

const URGENCY_RANK: Record<FirstAidUrgency, number> = {
  emergency: 3,
  urgent: 2,
  watch: 1,
};

type SymptomWeights = Partial<Record<FirstAidCaseId, number>>;

export const FIRST_AID_SYMPTOM_WEIGHTS: Record<FirstAidSymptomId, SymptomWeights> = {
  confused: { heatStroke: 5 },
  hotSkin: { heatStroke: 4, heatExhaustion: 1 },
  seizure: { heatStroke: 5, heatSyncope: 1 },
  heavySweat: { heatExhaustion: 3, heatCramps: 1, dehydration: 1 },
  dizzy: { heatExhaustion: 2, dehydration: 2 },
  nauseous: { heatExhaustion: 3, heatStroke: 1, dehydration: 1 },
  cramps: { heatCramps: 5, heatExhaustion: 1 },
  thirst: { dehydration: 4, heatExhaustion: 1 },
  fainted: { heatSyncope: 5, heatExhaustion: 1, heatStroke: 1 },
  rash: { heatRash: 5 },
};

export interface FirstAidMatch {
  primary: FirstAidCaseId | null;
  scores: Record<FirstAidCaseId, number>;
  emergency: boolean;
}

function emptyScores(): Record<FirstAidCaseId, number> {
  return {
    heatStroke: 0,
    heatExhaustion: 0,
    heatCramps: 0,
    dehydration: 0,
    heatSyncope: 0,
    heatRash: 0,
  };
}

function isSymptomId(value: string): value is FirstAidSymptomId {
  return (FIRST_AID_SYMPTOM_IDS as readonly string[]).includes(value);
}

/** Score ticked signs and pick the most likely heat condition. */
export function matchFirstAid(selected: readonly string[]): FirstAidMatch {
  const unique = [...new Set(selected)].filter(isSymptomId);
  const scores = emptyScores();

  for (const symptom of unique) {
    const weights = FIRST_AID_SYMPTOM_WEIGHTS[symptom];
    for (const caseId of FIRST_AID_CASE_IDS) {
      scores[caseId] += weights[caseId] ?? 0;
    }
  }

  const emergency = unique.some((id) =>
    (FIRST_AID_EMERGENCY_SYMPTOMS as readonly FirstAidSymptomId[]).includes(id),
  );

  if (unique.length === 0) {
    return { primary: null, scores, emergency: false };
  }

  if (emergency) {
    return { primary: "heatStroke", scores, emergency: true };
  }

  let primary: FirstAidCaseId = FIRST_AID_CASE_IDS[0];
  for (const caseId of FIRST_AID_CASE_IDS) {
    const score = scores[caseId];
    const best = scores[primary];
    if (score > best) {
      primary = caseId;
      continue;
    }
    if (
      score === best &&
      URGENCY_RANK[FIRST_AID_URGENCY[caseId]] > URGENCY_RANK[FIRST_AID_URGENCY[primary]]
    ) {
      primary = caseId;
    }
  }

  if (scores[primary] === 0) {
    return { primary: null, scores, emergency: false };
  }

  return { primary, scores, emergency: false };
}
