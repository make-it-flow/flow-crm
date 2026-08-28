import { randomUUID } from "node:crypto";
import { z } from "zod";
import { fetchWithTimeout } from "@open-mercato/shared/lib/http/fetchWithTimeout";
import type { ResearchRequest } from "./researchRequest";

export const RESEARCH_PROMPT_NOTION_URL =
  "https://www.notion.so/makeitflow/Prompt-research-firmy-do-ResearchBrief-3ca9e64056588145b44dee5c7fcd3a23";

const CURSOR_AGENTS_URL = "https://api.cursor.com/v1/agents";
// Creating an agent has been measured returning well past 20s even though the agent itself is
// live within seconds. A short timeout only produces retries and orphaned agents.
const CREATE_AGENT_TIMEOUT_MS = 60_000;
const AGENT_STATUS_TIMEOUT_MS = 15_000;

const createAgentResponseSchema = z.object({
  id: z.string().min(1).optional(),
  agent: z.object({ id: z.string().min(1) }).optional(),
  run: z.object({ id: z.string().min(1) }).optional(),
});

const agentStatusResponseSchema = z.object({
  id: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
});

export type CursorCloudConfig = {
  apiKey: string;
  environmentName: string;
  model: string | null;
};

export type CursorAgentDispatch = {
  agentId: string;
  providerRunId: string | null;
  alreadyExisted: boolean;
};

/**
 * `working` means the provider confirmed the agent is still running, which is the only state
 * that earns a deadline extension. `finished` covers every terminal state; `unknown` means the
 * provider could not tell us, which must not be mistaken for liveness.
 */
export type CursorAgentLiveness = "working" | "finished" | "unknown";

/** Thrown for transient failures where retrying the same agentId is the correct response. */
export class CursorCloudTransientError extends Error {}

/** Thrown when the provider rejected the request in a way that retrying cannot fix. */
export class CursorCloudPermanentError extends Error {}

function readTrimmedEnv(name: string): string | null {
  const value = process.env[name];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function resolveCursorCloudConfig(): CursorCloudConfig | null {
  const apiKey = readTrimmedEnv("RESEARCH_CURSOR_API_KEY");
  const environmentName = readTrimmedEnv("RESEARCH_CURSOR_ENVIRONMENT");
  if (!apiKey || !environmentName) return null;
  return {
    apiKey,
    environmentName,
    model: readTrimmedEnv("RESEARCH_CURSOR_MODEL"),
  };
}

export function describeMissingCursorCloudConfig(): string {
  const missing: string[] = [];
  if (!readTrimmedEnv("RESEARCH_CURSOR_API_KEY"))
    missing.push("RESEARCH_CURSOR_API_KEY");
  if (!readTrimmedEnv("RESEARCH_CURSOR_ENVIRONMENT"))
    missing.push("RESEARCH_CURSOR_ENVIRONMENT");
  return `Cursor Cloud nie jest skonfigurowany. Brakuje: ${missing.join(", ")}`;
}

/**
 * The provider accepts a client-supplied id and answers a repeated create with a conflict rather
 * than a second agent, so generating it here makes dispatch idempotent across queue retries.
 */
export function newCursorAgentId(): string {
  return `bc-${randomUUID()}`;
}

function buildResearchPrompt(params: {
  runId: string;
  company: ResearchRequest;
}): string {
  const { runId, company } = params;

  return [
    "Przeczytaj instrukcję researchu i wykonaj ją do końca. Nie szukaj innej instrukcji.",
    RESEARCH_PROMPT_NOTION_URL,
    "",
    "Wejście z CRM:",
    `  runId:  ${runId}`,
    `  firma:  ${company.companyName}`,
    `  branza: ${company.industry ?? ""}`,
    `  strona: ${company.websiteUrl ?? ""}`,
    "",
    "ODSTĘPSTWO NA TEN PRZEBIEG: NIE MA CALLBACKU.",
    "CRM stoi na localhoście, a ty jesteś poza tą siecią, więc nie masz jak go zawołać.",
    "Faza 8 nie obowiązuje: nie wołasz /complete ani /fail i nie korzystasz",
    "z MERCATO_BASE_URL ani MERCATO_API_KEY. Z listy w sekcji 12 pomijasz ostatni",
    "punkt, ten o callbacku. Cała reszta sekcji 12 obowiązuje bez zmian.",
    "",
    "Twoim wyjściem jest rekord w bazie Briefy, zgodnie z Fazą 9 i sekcją 13.",
    "W kolumnę Run wpisujesz runId z wejścia, bez zmian.",
    "",
    "DODATKOWO: SUROWY JSON W TREŚCI STRONY.",
    "W treści utworzonej strony briefu, czyli w body, a nie we właściwościach,",
    "umieszczasz blok kodu json z płaskim obiektem ResearchBrief, dokładnie takim,",
    "jaki poszedłby w ciele POST na /complete. To materiał do walidacji przez",
    "developera, więc trzymasz się tego co do znaku:",
    "  - obiekt waliduje się wobec schematu z sekcji 3,",
    "  - pola nieudowodnione zostają jako null, nie znikają i nie stają się pustym stringiem,",
    "  - bez koperty i bez pola runId w środku, tak jak wymaga /complete,",
    "  - bez komentarzy i bez tekstu w środku bloku.",
    "Nad blokiem dajesz jedną linię nagłówka: Payload do /complete (walidacja).",
    "Poza tym nagłówkiem i tym blokiem nic więcej do treści strony nie dopisujesz.",
    "",
    "Jeśli researchu nie da się dokończyć, i tak tworzysz rekord: firmografia",
    "wypełniona, główny insight pusty, powód opisany w Notatka z przebiegu,",
    "Status szkic, a w bloku JSON to samo z nullami. Nie ma ścieżki,",
    "w której nie powstaje nic.",
    "",
    "Nie wypisuj wartości żadnych zmiennych środowiskowych.",
    "Nie modyfikuj żadnych plików ani repozytoriów.",

    // # Full integration version below
    // 'Przeczytaj instrukcję researchu i wykonaj ją do końca. Nie szukaj innej instrukcji.',
    // RESEARCH_PROMPT_NOTION_URL,
    // '',
    // 'Wejście z CRM:',
    // `  runId:  ${runId}`,
    // `  firma:  ${company.companyName}`,
    // `  branza: ${company.industry ?? ''}`,
    // `  strona: ${company.websiteUrl ?? ''}`,
    // '',
    // 'Adres CRM i klucz masz w MERCATO_BASE_URL oraz MERCATO_API_KEY.',
    // 'Nigdy nie wypisuj wartości MERCATO_API_KEY.',
    // 'Nie modyfikuj żadnych plików ani repozytoriów.',
  ].join("\n");
}

async function callCursor(
  url: string,
  init: { method: string; apiKey: string; body?: string; timeoutMs: number },
): Promise<{ status: number; raw: string }> {
  const headers: Record<string, string> = {
    authorization: `Bearer ${init.apiKey}`,
  };
  if (init.body) headers["content-type"] = "application/json";
  let response: Response;
  try {
    response = await fetchWithTimeout(url, {
      method: init.method,
      headers,
      body: init.body,
      timeoutMs: init.timeoutMs,
    });
  } catch (error) {
    throw new CursorCloudTransientError(
      error instanceof Error
        ? error.message
        : "[internal] Cursor Cloud request failed",
    );
  }
  return { status: response.status, raw: await response.text() };
}

export async function createCursorResearchAgent(params: {
  config: CursorCloudConfig;
  agentId: string;
  runId: string;
  company: ResearchRequest;
}): Promise<CursorAgentDispatch> {
  const { config, agentId, runId, company } = params;
  const body: Record<string, unknown> = {
    agentId,
    name: `research-${company.companyName}`.slice(0, 100),
    prompt: { text: buildResearchPrompt({ runId, company }) },
    // A named cloud environment is what injects MERCATO_BASE_URL and MERCATO_API_KEY into the
    // agent shell. Without it the provider starts a no-repo agent with no secrets at all.
    env: { type: "cloud", name: config.environmentName },
    autoCreatePR: false,
  };
  if (config.model) body.model = { id: config.model };

  const { status, raw } = await callCursor(CURSOR_AGENTS_URL, {
    method: "POST",
    apiKey: config.apiKey,
    body: JSON.stringify(body),
    timeoutMs: CREATE_AGENT_TIMEOUT_MS,
  });

  // A conflict means our own earlier attempt already created this agent. Retrying after a lost
  // response must not be an error, otherwise we fail runs that are in fact under way.
  if (status === 409) {
    return { agentId, providerRunId: null, alreadyExisted: true };
  }
  if (status >= 500 || status === 429) {
    throw new CursorCloudTransientError(
      `Cursor Cloud odpowiedział ${status} przy tworzeniu agenta: ${raw.slice(0, 300)}`,
    );
  }
  if (status < 200 || status >= 300) {
    throw new CursorCloudPermanentError(
      `Cursor Cloud odrzucił zlecenie researchu (HTTP ${status}): ${raw.slice(0, 300)}`,
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    throw new CursorCloudPermanentError(
      "[internal] Cursor Cloud returned a non-JSON create response",
    );
  }
  const parsed = createAgentResponseSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new CursorCloudPermanentError(
      "[internal] Unexpected Cursor Cloud create response shape",
    );
  }

  return {
    agentId: parsed.data.agent?.id ?? parsed.data.id ?? agentId,
    providerRunId: parsed.data.run?.id ?? null,
    alreadyExisted: false,
  };
}

// Listing terminal states instead of live ones is deliberate: mistaking a live agent for a
// finished one fails a run that is still producing a brief, while the opposite only costs one
// extra deadline extension. Any status we do not recognise therefore counts as still working.
// `idle` and `archived` are how the provider reports an agent that stopped working, so they belong
// here even though neither word sounds terminal. The deadline check only runs 15 minutes after
// dispatch, long past the moment a freshly created agent could still be idle.
const TERMINAL_AGENT_STATUSES = new Set([
  "finished",
  "completed",
  "cancelled",
  "canceled",
  "stopped",
  "failed",
  "error",
  "expired",
  "idle",
  "archived",
]);

export async function getCursorAgentLiveness(params: {
  config: CursorCloudConfig;
  agentId: string;
}): Promise<CursorAgentLiveness> {
  const { config, agentId } = params;
  let result: { status: number; raw: string };
  try {
    result = await callCursor(
      `${CURSOR_AGENTS_URL}/${encodeURIComponent(agentId)}`,
      {
        method: "GET",
        apiKey: config.apiKey,
        timeoutMs: AGENT_STATUS_TIMEOUT_MS,
      },
    );
  } catch {
    // The provider being unreachable says nothing about the agent, so refuse to guess.
    return "unknown";
  }

  if (result.status === 404) return "finished";
  if (result.status < 200 || result.status >= 300) return "unknown";

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(result.raw);
  } catch {
    return "unknown";
  }
  const parsed = agentStatusResponseSchema.safeParse(parsedJson);
  if (!parsed.success || !parsed.data.status) return "unknown";
  return TERMINAL_AGENT_STATUSES.has(parsed.data.status.toLowerCase())
    ? "finished"
    : "working";
}
