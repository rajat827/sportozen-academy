// Future contract only. No implementation, credentials, connection, or delivery calls exist.
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
  }): Promise<{ providerReference: string }>;
}
