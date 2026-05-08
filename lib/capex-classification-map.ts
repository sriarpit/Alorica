/**
 * Maps each CapEx Classification to its allowed Sub-Classifications.
 * Source: requirement document Phase 2 CapEx Classification table.
 */
export const CLASSIFICATION_TO_SUB: Record<string, string[]> = {
  Growth:            ["Growthsub"],
  Maintenance:       ["CapitalLabor", "Compliance", "CriticalEquipment", "Infrastructure", "LHI", "Maintenancesub", "Miscellaneous"],
  Technology:        ["TechnologySub", "Compliancesub"],
  Relocation:        ["Relocationsub"],
  NewLogo:           [],
  NewLOB:            [],
  RampExistingLOB:   [],
  SeasonalRamp:      [],
  SiteBuildExpansion:[],
  ClientRetention:   [],
  Internal:          [],
  Operations:        [],
  Others:            [],
};

/** Returns allowed sub-classifications for a given classification. */
export function getAllowedSubClassifications(classification: string | null | undefined): string[] {
  if (!classification) return [];
  return CLASSIFICATION_TO_SUB[classification] ?? [];
}

/** Returns true when the sub-classification is valid for the given classification. */
export function isValidSubClassification(
  classification: string | null | undefined,
  subClassification: string | null | undefined
): boolean {
  if (!classification || !subClassification) return true;
  const allowed = getAllowedSubClassifications(classification);
  if (allowed.length === 0) return true; // no restriction defined
  return allowed.includes(subClassification);
}

export const PROJECT_TYPES = [
  "NewLogo",
  "NewLOB",
  "RampExistingLOB",
  "SeasonalRamp",
  "SiteBuildExpansion",
  "ClientRetention",
  "Internal",
  "Operations",
  "Others",
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];
