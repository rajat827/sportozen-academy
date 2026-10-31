import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type {
  SessionPlaceChoice,
  SessionPlaceSuggestion,
} from "@/domain/session-location";
import { WorkspaceError } from "./auth";

const placeId = z
  .string()
  .trim()
  .min(1)
  .max(300)
  .regex(/^[A-Za-z0-9_-]+$/);
const receipt = z.object({
  academyId: z.string(),
  userId: z.string(),
  placeId,
  location: z.string().min(1).max(2000),
  expiresAt: z.number(),
});
export interface GooglePlacesConfig {
  enabled: boolean;
  apiKey?: string;
  signingSecret?: string;
}
export function googlePlacesConfig(): GooglePlacesConfig {
  return {
    enabled: process.env.SPORTOZEN_GOOGLE_PLACES_ENABLED === "1",
    apiKey: process.env.SPORTOZEN_GOOGLE_PLACES_API_KEY,
    signingSecret: process.env.SPORTOZEN_GOOGLE_PLACES_SIGNING_SECRET,
  };
}
export function placesConfigured(config = googlePlacesConfig()) {
  return Boolean(
    config.enabled &&
    config.apiKey?.trim() &&
    (config.signingSecret?.length ?? 0) >= 32,
  );
}
function signature(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest("base64url");
}
export function verifyPlaceConfirmation(
  token: string,
  scope: { academyId: string; userId: string },
  location: string,
  config = googlePlacesConfig(),
  now = Date.now(),
) {
  if (!placesConfigured(config))
    throw new WorkspaceError(
      400,
      "Google Maps selection is unavailable. Use the manual location field.",
    );
  try {
    const parts = token.split(".");
    if (parts.length !== 2) throw new Error();
    const expected = Buffer.from(signature(parts[0], config.signingSecret!));
    const actual = Buffer.from(parts[1]);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
      throw new Error();
    const selected = receipt.parse(
      JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")),
    );
    if (
      selected.academyId !== scope.academyId ||
      selected.userId !== scope.userId ||
      selected.location !== location.trim() ||
      selected.expiresAt <= now
    )
      throw new Error();
    return selected.placeId;
  } catch {
    throw new WorkspaceError(
      400,
      "The selected Google Maps place expired or changed. Select it again, or use a manual location.",
    );
  }
}
/** Fixed, minimal Places (New) endpoints only. Transport injection is for tests. */
export function createGooglePlacesClient(
  config: GooglePlacesConfig,
  transport: typeof fetch = fetch,
  now: () => number = Date.now,
) {
  async function request(url: string, init: RequestInit) {
    if (!placesConfigured(config))
      throw new WorkspaceError(
        503,
        "Google Maps is configuration-blocked. Enter the training location manually.",
      );
    try {
      const response = await transport(url, {
        ...init,
        cache: "no-store",
        signal: AbortSignal.timeout(7000),
      });
      if (!response.ok) throw new Error();
      return await response.json();
    } catch {
      // Provider payloads can contain credentials or internal diagnostics: never echo them.
      throw new WorkspaceError(
        503,
        "Google Maps is temporarily unavailable. Your manual location is still usable.",
      );
    }
  }
  const headers = {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": config.apiKey ?? "",
  };
  return {
    async search(
      input: string,
      sessionToken: string,
      country: string,
    ): Promise<SessionPlaceSuggestion[]> {
      const body = z
        .object({
          input: z.string().trim().min(3).max(120),
          sessionToken: z.uuid(),
          country: z.string().length(2),
        })
        .parse({ input, sessionToken, country });
      const data = await request(
        "https://places.googleapis.com/v1/places:autocomplete",
        {
          method: "POST",
          headers: {
            ...headers,
            "X-Goog-FieldMask":
              "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text",
          },
          body: JSON.stringify({
            input: body.input,
            sessionToken: body.sessionToken,
            includedRegionCodes: [body.country.toLowerCase()],
          }),
        },
      );
      const parsed = z
        .object({
          suggestions: z
            .array(
              z.object({
                placePrediction: z
                  .object({
                    placeId,
                    text: z.object({ text: z.string().min(1).max(1000) }),
                  })
                  .optional(),
              }),
            )
            .default([]),
        })
        .safeParse(data);
      if (!parsed.success)
        throw new WorkspaceError(
          503,
          "Google Maps returned an incomplete response. Use a manual location.",
        );
      return parsed.data.suggestions
        .flatMap((item) =>
          item.placePrediction
            ? [
                {
                  placeId: item.placePrediction.placeId,
                  description: item.placePrediction.text.text,
                },
              ]
            : [],
        )
        .slice(0, 5);
    },
    async select(
      id: string,
      sessionToken: string,
      scope: { academyId: string; userId: string },
      operationalLocation: string,
    ): Promise<SessionPlaceChoice> {
      const selectedId = placeId.parse(id);
      // Google POI name/address stays transient. The operational session label
      // comes independently from the academy's existing manual field.
      const location = z
        .string()
        .trim()
        .min(1)
        .max(2000)
        .parse(operationalLocation);
      z.uuid().parse(sessionToken);
      const url = new URL(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(selectedId)}`,
      );
      url.searchParams.set("sessionToken", sessionToken);
      const data = await request(url.toString(), {
        method: "GET",
        headers: {
          ...headers,
          "X-Goog-FieldMask": "id,displayName,formattedAddress,attributions",
        },
      });
      const parsed = z
        .object({
          id: placeId,
          displayName: z.object({ text: z.string().trim().min(1).max(400) }),
          formattedAddress: z.string().trim().min(1).max(1400),
          attributions: z
            .array(
              z.object({
                provider: z.string().max(400),
                providerUri: z.string().max(2000).optional(),
              }),
            )
            .max(20)
            .default([]),
        })
        .safeParse(data);
      if (!parsed.success || parsed.data.id !== selectedId)
        throw new WorkspaceError(
          503,
          "The place has incomplete location details. Confirm a manual training location instead.",
        );
      const body = Buffer.from(
        JSON.stringify({
          ...scope,
          placeId: selectedId,
          location,
          expiresAt: now() + 15 * 60000,
        }),
      ).toString("base64url");
      return {
        placeId: selectedId,
        name: parsed.data.displayName.text,
        address: parsed.data.formattedAddress,
        attributions: parsed.data.attributions,
        location,
        confirmation: `${body}.${signature(body, config.signingSecret!)}`,
      };
    },
  };
}
