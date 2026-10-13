// External transport is server-only; approval/publication remain separate services.
export interface MessagingProvider {
  channel: "whatsapp" | "email" | "sms" | "push";
  deliver(request: {
    draftId: string;
    body: string;
    approvedAt: string;
    verifiedGuardianContact: string;
    consentRecordId: string;
    communicationPreferenceId: string;
    approvedTemplateReference?: string;
    template?: { name: string; language: string; parameters: string[] };
    replyText?: string;
    correlationId?: string;
  }): Promise<{ providerReference: string }>;
}
