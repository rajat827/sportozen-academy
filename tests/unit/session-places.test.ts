import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth", () => ({
  WorkspaceError: class extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
}));
import {
  createGooglePlacesClient,
  placesConfigured,
  verifyPlaceConfirmation,
} from "@/server/google-places";
import { randomUUID } from "node:crypto";
const config = {
  enabled: true,
  apiKey: "synthetic-key-never-sent",
  signingSecret: "synthetic-signing-secret-for-fixture-only",
};
const scope = { academyId: "synthetic-academy", userId: "synthetic-coach" };
function transport(body: unknown, status = 200) {
  return vi.fn<typeof fetch>().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}
describe("optional Google Places boundary with fake transport only", () => {
  it("blocks external transport when disabled or missing credentials", async () => {
    const fake = transport({});
    expect(placesConfigured({ ...config, enabled: false })).toBe(false);
    expect(placesConfigured({ ...config, apiKey: undefined })).toBe(false);
    expect(placesConfigured({ ...config, signingSecret: "short" })).toBe(false);
    await expect(
      createGooglePlacesClient({ ...config, enabled: false }, fake).search(
        "Synthetic",
        randomUUID(),
        "IN",
      ),
    ).rejects.toThrow(/configuration-blocked/);
    expect(fake).not.toHaveBeenCalled();
  });
  it("uses bounded Places New autocomplete fields and the same session token", async () => {
    const fake = transport({
      suggestions: [
        {
          placePrediction: {
            placeId: "synthetic-place-id",
            text: { text: "Synthetic Football Ground" },
          },
        },
      ],
    });
    const token = randomUUID();
    const suggestions = await createGooglePlacesClient(config, fake).search(
      "Synthetic",
      token,
      "IN",
    );
    expect(suggestions).toEqual([
      {
        placeId: "synthetic-place-id",
        description: "Synthetic Football Ground",
      },
    ]);
    expect(fake.mock.calls[0][0]).toBe(
      "https://places.googleapis.com/v1/places:autocomplete",
    );
    const options = fake.mock.calls[0][1]!;
    expect(JSON.parse(String(options.body))).toEqual({
      input: "Synthetic",
      sessionToken: token,
      includedRegionCodes: ["in"],
    });
    expect(options.headers).toEqual(
      expect.objectContaining({
        "X-Goog-FieldMask":
          "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text",
      }),
    );
    await expect(
      createGooglePlacesClient(config, fake).search("ab", token, "IN"),
    ).rejects.toThrow();
    expect(fake).toHaveBeenCalledTimes(1);
  });
  it("keeps zero results explicit and fails safely on outage or incomplete response", async () => {
    expect(
      await createGooglePlacesClient(config, transport({})).search(
        "Synthetic",
        randomUUID(),
        "IN",
      ),
    ).toEqual([]);
    await expect(
      createGooglePlacesClient(
        config,
        transport({ secret: "never echo" }, 500),
      ).search("Synthetic", randomUUID(), "IN"),
    ).rejects.toThrow(/temporarily unavailable/);
    await expect(
      createGooglePlacesClient(
        config,
        transport({ suggestions: "broken" }),
      ).search("Synthetic", randomUUID(), "IN"),
    ).rejects.toThrow(/incomplete response/);
    const failed = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("provider-secret-do-not-leak"));
    await expect(
      createGooglePlacesClient(config, failed).search(
        "Synthetic",
        randomUUID(),
        "IN",
      ),
    ).rejects.toThrow(
      "Google Maps is temporarily unavailable. Your manual location is still usable.",
    );
  });
  it("confirms only complete matching details, with no invented coordinates", async () => {
    const fake = transport({
      id: "synthetic-place-id",
      displayName: { text: "Synthetic Ground" },
      formattedAddress: "Synthetic address fixture",
      attributions: [
        {
          provider: "Synthetic provider",
          providerUri: "https://example.test/provider",
        },
      ],
    });
    const token = randomUUID();
    const selected = await createGooglePlacesClient(
      config,
      fake,
      () => 1000,
    ).select(
      "synthetic-place-id",
      token,
      scope,
      "Academy supplied operating label",
    );
    expect(selected.location).toBe("Academy supplied operating label");
    expect(selected.attributions).toEqual([
      {
        provider: "Synthetic provider",
        providerUri: "https://example.test/provider",
      },
    ]);
    const signed = Buffer.from(
      selected.confirmation.split(".")[0],
      "base64url",
    ).toString("utf8");
    expect(signed).not.toContain("Synthetic Ground");
    expect(signed).not.toContain("Synthetic address fixture");
    expect(selected).not.toHaveProperty("latitude");
    expect(
      verifyPlaceConfirmation(
        selected.confirmation,
        scope,
        selected.location,
        config,
        1001,
      ),
    ).toBe("synthetic-place-id");
    const request = new URL(String(fake.mock.calls[0][0]));
    expect(request.pathname).toBe("/v1/places/synthetic-place-id");
    expect(request.searchParams.get("sessionToken")).toBe(token);
    expect(fake.mock.calls[0][1]?.headers).toEqual(
      expect.objectContaining({
        "X-Goog-FieldMask": "id,displayName,formattedAddress,attributions",
      }),
    );
    expect(() =>
      verifyPlaceConfirmation(
        selected.confirmation,
        { ...scope, academyId: "other" },
        selected.location,
        config,
        1001,
      ),
    ).toThrow(/expired or changed/);
    expect(() =>
      verifyPlaceConfirmation(
        selected.confirmation,
        { ...scope, userId: "other" },
        selected.location,
        config,
        1001,
      ),
    ).toThrow(/expired or changed/);
    expect(() =>
      verifyPlaceConfirmation(
        selected.confirmation,
        scope,
        "edited location",
        config,
        1001,
      ),
    ).toThrow(/expired or changed/);
    expect(() =>
      verifyPlaceConfirmation(
        selected.confirmation + "tampered",
        scope,
        selected.location,
        config,
        1001,
      ),
    ).toThrow(/expired or changed/);
    expect(() =>
      verifyPlaceConfirmation(
        selected.confirmation,
        scope,
        selected.location,
        config,
        1000 + 15 * 60000,
      ),
    ).toThrow(/expired or changed/);
    await expect(
      createGooglePlacesClient(
        config,
        transport({
          id: "synthetic-place-id",
          displayName: { text: "Synthetic" },
        }),
      ).select(
        "synthetic-place-id",
        randomUUID(),
        scope,
        "Academy supplied operating label",
      ),
    ).rejects.toThrow(/incomplete/);
    await expect(
      createGooglePlacesClient(
        config,
        transport({
          id: "different-id",
          displayName: { text: "Synthetic" },
          formattedAddress: "Fixture",
        }),
      ).select(
        "synthetic-place-id",
        randomUUID(),
        scope,
        "Academy supplied operating label",
      ),
    ).rejects.toThrow(/incomplete/);
  });
});
