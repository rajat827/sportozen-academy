export interface SessionPlaceSuggestion {
  placeId: string;
  description: string;
}
export interface SessionPlaceChoice {
  placeId: string;
  name: string;
  address: string;
  location: string;
  attributions?: { provider: string; providerUri?: string }[];
  confirmation: string;
}
export type SessionPlacesStatus = "AVAILABLE" | "CONFIGURATION_BLOCKED";
