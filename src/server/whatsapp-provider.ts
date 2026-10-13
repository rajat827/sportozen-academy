import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { MessagingProvider } from "@/services/communication/provider";
import type { CommunicationSettings } from "@/domain/communication";
import {
  weeklyTemplateBody,
  monthlyTemplateBody,
} from "@/services/communication/whatsapp-templates";
export class ProviderFailure extends Error {
  constructor(
    public outcome: "TRANSIENT" | "PERMANENT" | "UNKNOWN",
    message: string,
  ) {
    super(message);
  }
}
const secretSchema = z.object({
  academyId: z.string(),
  phoneNumberId: z.string().regex(/^\d+$/),
  wabaId: z.string().regex(/^\d+$/),
  token: z.string().min(1),
  appSecret: z.string().min(1),
  verifyToken: z.string().min(1),
  graphVersion: z.string().regex(/^v\d+\.0$/),
});
export function senderSecret(s: CommunicationSettings) {
  // A server environment reference is bound to academy AND business sender identity.
  if (!/^SPORTOZEN_WA_[A-Z0-9_]+$/.test(s.credentialRef))
    throw new ProviderFailure(
      "PERMANENT",
      "Sender credential reference is not configured.",
    );
  let value: unknown;
  try {
    value = JSON.parse(process.env[s.credentialRef] ?? "{}");
  } catch {
    throw new ProviderFailure(
      "PERMANENT",
      "Invalid server sender configuration.",
    );
  }
  const parsed = secretSchema.safeParse(value);
  if (
    !parsed.success ||
    parsed.data.academyId !== s.academyId ||
    parsed.data.phoneNumberId !== s.phoneNumberId ||
    parsed.data.wabaId !== s.wabaId
  )
    throw new ProviderFailure(
      "PERMANENT",
      "Sender credential binding does not match academy identity.",
    );
  return parsed.data;
}
export class MetaWhatsAppProvider implements MessagingProvider {
  readonly channel = "whatsapp" as const;
  constructor(
    private settings: CommunicationSettings,
    private transport: typeof fetch = fetch,
  ) {}
  private async graph(path: string, body?: unknown) {
    const secret = senderSecret(this.settings);
    let response: Response;
    try {
      response = await this.transport(
        `https://graph.facebook.com/${secret.graphVersion}/${path}`,
        {
          method: body ? "POST" : "GET",
          headers: {
            Authorization: `Bearer ${secret.token}`,
            "Content-Type": "application/json",
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(15000),
          cache: "no-store",
        },
      );
    } catch {
      throw new ProviderFailure(
        body ? "UNKNOWN" : "TRANSIENT",
        "Provider request outcome could not be confirmed.",
      );
    }
    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw new ProviderFailure(
        body ? "UNKNOWN" : "TRANSIENT",
        "Provider response could not be confirmed.",
      );
    }
    if (!response.ok) {
      const err = z
        .object({
          error: z
            .object({
              code: z.number().optional(),
              is_transient: z.boolean().optional(),
            })
            .optional(),
        })
        .safeParse(json);
      // Only explicit rejection is retryable; do not retry an ambiguous 5xx acceptance.
      const confirmed = err.success && !!err.data.error;
      throw new ProviderFailure(
        !confirmed && body
          ? "UNKNOWN"
          : response.status === 429 ||
              (err.success && err.data.error?.is_transient)
            ? "TRANSIENT"
            : "PERMANENT",
        `Provider rejected request (HTTP ${response.status}${err.success && err.data.error?.code ? `, code ${err.data.error.code}` : ""}).`,
      );
    }
    return json;
  }
  async verify() {
    const phones = z
      .object({
        data: z.array(
          z.object({ id: z.string(), status: z.string().optional() }),
        ),
      })
      .parse(
        await this.graph(
          `${this.settings.wabaId}/phone_numbers?fields=id,status`,
        ),
      );
    if (
      !phones.data.some(
        (p) => p.id === this.settings.phoneNumberId && p.status === "CONNECTED",
      )
    )
      throw new ProviderFailure(
        "PERMANENT",
        "Business phone is not connected to the configured WABA.",
      );
    for (const [name, body] of [
      [this.settings.weeklyTemplate, weeklyTemplateBody],
      [this.settings.monthlyTemplate, monthlyTemplateBody],
    ]) {
      const templates = z
        .object({
          data: z.array(
            z.object({
              name: z.string(),
              language: z.string(),
              status: z.string(),
              components: z.array(
                z.object({ type: z.string(), text: z.string().optional() }),
              ),
            }),
          ),
        })
        .parse(
          await this.graph(
            `${this.settings.wabaId}/message_templates?name=${encodeURIComponent(name)}&fields=name,language,status,components`,
          ),
        );
      const t = templates.data.find(
        (t) =>
          t.name === name &&
          t.language === this.settings.language &&
          t.status === "APPROVED",
      );
      if (
        !t ||
        t.components.length !== 1 ||
        t.components[0].type !== "BODY" ||
        t.components[0].text !== body
      )
        throw new ProviderFailure(
          "PERMANENT",
          "Provider template is not approved with the expected language and exact body.",
        );
    }
    return true;
  }
  async deliver(request: Parameters<MessagingProvider["deliver"]>[0]) {
    if (
      process.env.SPORTOZEN_WHATSAPP_SEND_ENABLED !== "true" ||
      process.env.NODE_ENV === "test" ||
      process.env.CI
    )
      throw new ProviderFailure(
        "PERMANENT",
        "External sending disabled by server.",
      );
    if (this.settings.mode === "TEST") {
      const allow = (process.env.SPORTOZEN_WHATSAPP_TEST_RECIPIENTS ?? "")
        .split(",")
        .map((s) => s.trim());
      if (!allow.includes(request.verifiedGuardianContact))
        throw new ProviderFailure(
          "PERMANENT",
          "Recipient is not authorised in the test allowlist.",
        );
    } else if (process.env.SPORTOZEN_WHATSAPP_LIVE_ENABLED !== "true")
      throw new ProviderFailure(
        "PERMANENT",
        "Live sending disabled by server.",
      );
    if (
      !request.consentRecordId ||
      !request.communicationPreferenceId ||
      !request.approvedAt ||
      !/^\+[1-9]\d{7,14}$/.test(request.verifiedGuardianContact)
    )
      throw new ProviderFailure(
        "PERMANENT",
        "Verified contact, consent and approval are required.",
      );
    const t = request.template;
    if (
      !request.replyText &&
      (!t ||
        ![this.settings.weeklyTemplate, this.settings.monthlyTemplate].includes(
          t.name,
        ) ||
        t.language !== this.settings.language ||
        t.parameters.some(
          (p) => !p.trim() || /[\r\n\t]/.test(p) || p.length > 400,
        ))
    )
      throw new ProviderFailure(
        "PERMANENT",
        "Approved template parameters are invalid.",
      );
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: request.verifiedGuardianContact.slice(1),
      biz_opaque_callback_data: request.correlationId,
      type: request.replyText ? "text" : "template",
      ...(request.replyText
        ? { text: { body: request.replyText, preview_url: false } }
        : {
            template: {
              name: t!.name,
              language: { code: t!.language },
              components: [
                {
                  type: "body",
                  parameters: t!.parameters.map((text) => ({
                    type: "text",
                    text,
                  })),
                },
              ],
            },
          }),
    };
    const parsed = z
      .object({ messages: z.array(z.object({ id: z.string().min(1) })).min(1) })
      .safeParse(
        await this.graph(`${this.settings.phoneNumberId}/messages`, payload),
      );
    if (!parsed.success)
      throw new ProviderFailure(
        "UNKNOWN",
        "Provider acceptance receipt missing.",
      );
    return { providerReference: parsed.data.messages[0].id };
  }
}
export function validSignature(
  raw: string,
  signature: string | null,
  appSecret: string,
) {
  if (!signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", appSecret).update(raw).digest();
  return timingSafeEqual(expected, Buffer.from(signature.slice(7), "hex"));
}
