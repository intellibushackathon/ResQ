import {
  type DamageType,
  type DamageTypeOption,
  type DepartmentFilter,
  type ReportAIAnalysis,
  type Severity,
} from "./reporting";
import { clampConfidence } from "./confidence";

type AnalyzeIncidentInput = {
  imageDataUrl: string | null;
  selectedDamageType: DamageTypeOption;
  description?: string;
  location?: {
    lat?: number;
    lng?: number;
  };
  urgentAssist?: boolean;
};

type ParsedAiPayload = {
  damageType?: string;
  severity?: string;
  confidence?: number;
  summary?: string;
  rationale?: string;
  hazards?: string[];
  suggestedActions?: string[];
  suggestedDepartment?: string;
};

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_OPENROUTER_MODEL = "anthropic/claude-sonnet-4";

const damageTypeKeywords: Array<{
  damageType: DamageType;
  severity: Severity;
  department: DepartmentFilter;
  patterns: RegExp[];
}> = [
  {
    damageType: "Flooding",
    severity: "High",
    department: "ODPEM",
    patterns: [/flood/i, /water/i, /overflow/i, /inundat/i],
  },
  {
    damageType: "Roof Collapse",
    severity: "High",
    department: "ODPEM",
    patterns: [/collapse/i, /roof/i, /ceiling/i, /structural/i],
  },
  {
    damageType: "Debris/Tree",
    severity: "Medium",
    department: "NWA",
    patterns: [/tree/i, /debris/i, /blocked/i, /landslide/i],
  },
  {
    damageType: "Utility Damage",
    severity: "Medium",
    department: "JPS",
    patterns: [/power/i, /utility/i, /wire/i, /pole/i, /electric/i],
  },
];

function sanitizeStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const items = value.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.trim());
  return items.length > 0 ? items.slice(0, 3) : fallback;
}

function normalizeDamageType(value: string | undefined, fallback: DamageType): DamageType {
  switch (value?.trim().toLowerCase()) {
    case "flooding":
      return "Flooding";
    case "roof collapse":
    case "roof_collapse":
      return "Roof Collapse";
    case "debris/tree":
    case "debris_tree":
    case "debris":
    case "tree":
      return "Debris/Tree";
    case "utility damage":
    case "utility_damage":
      return "Utility Damage";
    case "other":
      return "Other";
    default:
      return fallback;
  }
}

function normalizeSeverity(value: string | undefined, fallback: Severity): Severity {
  switch (value?.trim().toLowerCase()) {
    case "critical":
      return "Critical";
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
    default:
      return fallback;
  }
}

function normalizeDepartment(value: string | undefined, fallback: DepartmentFilter): DepartmentFilter {
  switch (value?.trim().toLowerCase()) {
    case "nwa":
      return "NWA";
    case "jps":
      return "JPS";
    case "odpem":
      return "ODPEM";
    case "none":
      return "None";
    default:
      return fallback;
  }
}

function extractJsonBlock(value: string) {
  const match = value.match(/\{[\s\S]*\}/);
  return match?.[0] ?? value;
}

function parseAiResponseText(payload: unknown) {
  if (typeof payload === "string") return payload;

  if (Array.isArray(payload)) {
    return payload
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
          return part.text;
        }
        return "";
      })
      .join("\n");
  }

  return "";
}

function buildPrompt(input: AnalyzeIncidentInput) {
  const description = input.description?.trim() || "No extra description provided.";
  const selectedDamageType =
    input.selectedDamageType === "Auto/AI"
      ? "Use the image and text to determine the damage type."
      : `Citizen-selected damage type: ${input.selectedDamageType}.`;
  const urgency = input.urgentAssist ? "Urgent assist was requested." : "Urgent assist was not requested.";
  const location =
    input.location?.lat != null && input.location?.lng != null
      ? `Coordinates: ${input.location.lat.toFixed(6)}, ${input.location.lng.toFixed(6)}.`
      : "Coordinates unavailable.";

  return [
    "Classify this disaster incident and return strict JSON only.",
    'JSON shape: {"damageType":"Flooding|Roof Collapse|Debris/Tree|Utility Damage|Other","severity":"Critical|High|Medium|Low","confidence":0-100,"summary":"...","rationale":"...","hazards":["..."],"suggestedActions":["..."],"suggestedDepartment":"NWA|JPS|ODPEM|None"}',
    selectedDamageType,
    urgency,
    location,
    `Reporter description: ${description}`,
  ].join("\n");
}

function buildSimulationFallback(
  input: AnalyzeIncidentInput,
  errorMessage?: string | null,
): ReportAIAnalysis {
  const description = input.description?.trim() ?? "";
  const matchedRule =
    damageTypeKeywords.find((rule) => rule.patterns.some((pattern) => pattern.test(description))) ?? null;

  const manualDamageType =
    input.selectedDamageType !== "Auto/AI" ? input.selectedDamageType : matchedRule?.damageType ?? "Other";

  const inferredDamageType = matchedRule?.damageType ?? manualDamageType;
  const inferredDepartment = matchedRule?.department ?? (manualDamageType === "Other" ? "ODPEM" : "None");

  const urgentSeverity: Severity =
    input.urgentAssist || /injur|trapp|severe|emergency|collapse/i.test(description) ? "Critical" : matchedRule?.severity ?? "Medium";

  const bucketSource = `${description}:${manualDamageType}:${input.location?.lat ?? ""}:${input.location?.lng ?? ""}`;
  let hash = 0;
  for (const char of bucketSource) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0;
  }
  const bucket = Math.abs(hash % 16);

  const confidence = clampConfidence((81 + bucket) / 100);

  return {
    damageType: inferredDamageType,
    severity: urgentSeverity,
    confidence,
    summary:
      urgentSeverity === "Critical"
        ? "Potentially severe incident requiring rapid verification and response."
        : "Incident classified through local fallback heuristics while live AI was unavailable.",
    rationale: matchedRule
      ? "Keyword matching and urgency cues were used to classify the incident."
      : "No strong keyword match was found, so a deterministic fallback bucket was used.",
    hazards:
      urgentSeverity === "Critical"
        ? ["Immediate public safety exposure", "Access disruption risk", "Escalation likely without intervention"]
        : ["Localized hazard", "Monitor changing conditions"],
    suggestedActions:
      urgentSeverity === "Critical"
        ? ["Prioritize field verification", "Dispatch nearest available crew", "Issue caution notice if needed"]
        : ["Queue for responder review", "Monitor for updated reports"],
    suggestedDepartment: inferredDepartment,
    provider: "simulation",
    model: "local-heuristic-fallback",
    analyzedAt: new Date().toISOString(),
    rawError: errorMessage ?? null,
  };
}

function normalizeParsedAnalysis(input: AnalyzeIncidentInput, parsed: ParsedAiPayload, provider: ReportAIAnalysis["provider"], model: string) {
  const fallback = buildSimulationFallback(input);
  return {
    damageType: normalizeDamageType(parsed.damageType, fallback.damageType),
    severity: normalizeSeverity(parsed.severity, fallback.severity),
    confidence: clampConfidence(
      typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
        ? parsed.confidence > 1
          ? parsed.confidence / 100
          : parsed.confidence
        : fallback.confidence,
    ),
    summary: parsed.summary?.trim() || fallback.summary,
    rationale: parsed.rationale?.trim() || fallback.rationale,
    hazards: sanitizeStringArray(parsed.hazards, fallback.hazards),
    suggestedActions: sanitizeStringArray(parsed.suggestedActions, fallback.suggestedActions),
    suggestedDepartment: normalizeDepartment(parsed.suggestedDepartment, fallback.suggestedDepartment),
    provider,
    model,
    analyzedAt: new Date().toISOString(),
    rawError: null,
  } satisfies ReportAIAnalysis;
}

async function parseAiHttpResponse(response: Response) {
  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: unknown;
      };
    }>;
    result?: unknown;
  };

  const content = payload.choices?.[0]?.message?.content ?? payload.result ?? "";
  const parsedText = parseAiResponseText(content);
  return JSON.parse(extractJsonBlock(parsedText)) as ParsedAiPayload;
}

async function analyzeWithOpenRouter(input: AnalyzeIncidentInput): Promise<ReportAIAnalysis> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OpenRouter API key is not configured.");
  }

  const model = import.meta.env.VITE_OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL;
  const siteUrl = import.meta.env.VITE_OPENROUTER_SITE_URL?.trim();
  const siteName = import.meta.env.VITE_OPENROUTER_SITE_NAME?.trim() || "ResQ Disaster Intelligence";

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(siteUrl ? { "HTTP-Referer": siteUrl } : {}),
      ...(siteName ? { "X-Title": siteName } : {}),
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: buildPrompt(input),
            },
            ...(input.imageDataUrl
              ? [
                  {
                    type: "image_url",
                    image_url: {
                      url: input.imageDataUrl,
                    },
                  },
                ]
              : []),
          ],
        },
      ],
      max_tokens: 512,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter analysis failed with ${response.status}`);
  }

  const parsed = await parseAiHttpResponse(response);
  return normalizeParsedAnalysis(input, parsed, "openrouter", model);
}

async function analyzeWithProxy(input: AnalyzeIncidentInput): Promise<ReportAIAnalysis> {
  const proxyUrl = import.meta.env.VITE_AI_PROXY_URL?.trim();
  if (!proxyUrl) {
    throw new Error("AI proxy URL is not configured.");
  }

  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      imageDataUrl: input.imageDataUrl,
      description: input.description,
      location: input.location,
      urgentAssist: input.urgentAssist,
      selectedDamageType: input.selectedDamageType,
    }),
  });

  if (!response.ok) {
    throw new Error(`Proxy analysis failed with ${response.status}`);
  }

  const parsed = await parseAiHttpResponse(response);
  return normalizeParsedAnalysis(input, parsed, "proxy", "proxy");
}

export async function analyzeIncident(input: AnalyzeIncidentInput): Promise<ReportAIAnalysis> {
  try {
    if (import.meta.env.VITE_AI_PROXY_URL?.trim()) {
      return await analyzeWithProxy(input);
    }

    if (import.meta.env.VITE_OPENROUTER_API_KEY?.trim()) {
      return await analyzeWithOpenRouter(input);
    }

    return buildSimulationFallback(input);
  } catch (error) {
    return buildSimulationFallback(input, error instanceof Error ? error.message : "AI analysis failed.");
  }
}
