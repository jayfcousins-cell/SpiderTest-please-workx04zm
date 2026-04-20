import type { Feature } from '../types.ts';

// Explicit patterns keep this reviewable. Arabic variants included because
// Maadi listings mix English and Arabic inside the same description block.
const GARDEN_RE =
  /\b(garden(?:\s+apartment|\s+access)?|private\s+garden|yard|حديقة)\b/i;
const GARDEN_POSITION_RE =
  /\b(ground\s+floor\s+with\s+garden|with\s+(?:a\s+)?garden|garden\s+(?:view|access|level))\b/i;
const ROOFTOP_RE =
  /\b(roof(?:top)?(?:\s+access)?|terrace|penthouse|سطح)\b/i;
// The brief's spec contains the literal string "dور أرضي" (mixed-script
// typo). We match both that and the correct Arabic "دور أرضي" to be safe.
const GROUND_RE =
  /(\bground\s+floor\b|الدور\s+الأرضي|د[وو]ر\s+أرضي)/i;

// Descriptions under this length are almost always scraped teasers with no
// feature signal. Flag them as "too vague" rather than guessing.
const MIN_DESCRIPTION_LEN = 40;

export type FeatureResult = {
  features: Feature[];
  tone: Feature;
  vague: boolean;
};

export function classifyFeatures(
  title: string,
  description: string,
): FeatureResult {
  const text = `${title}\n${description}`;
  const vague = description.trim().length < MIN_DESCRIPTION_LEN;

  const hasGarden =
    GARDEN_RE.test(text) &&
    // Require position language to avoid false positives from "garden city"
    // or "overlooking the garden" when the unit itself has none.
    (GARDEN_POSITION_RE.test(text) || /\bgarden\s+apartment\b/i.test(text));
  const hasRooftop = ROOFTOP_RE.test(text);
  const hasGround = GROUND_RE.test(text);

  const features: Feature[] = [];
  if (hasGarden) features.push('garden');
  if (hasRooftop) features.push('rooftop');
  if (hasGround) features.push('ground');

  // Tone is the dominant feature for the card's visual treatment. Precedence:
  // garden beats rooftop beats ground, which matches how the frontend
  // currently picks an accent colour.
  const tone: Feature = hasGarden ? 'garden' : hasRooftop ? 'rooftop' : 'ground';

  return { features, tone, vague };
}
