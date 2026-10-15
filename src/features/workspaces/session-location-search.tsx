"use client";
import { useState } from "react";
import { Button } from "@/components/ui/primitives";
import type { SessionPlaceChoice } from "@/domain/session-location";
import { useSessionLocation } from "@/hooks/use-session-location";

export function SessionLocationSearch({
  academyId,
  squadId,
  operationalLocation,
  onSelect,
}: {
  academyId: string;
  squadId: string;
  operationalLocation: string;
  onSelect: (place: SessionPlaceChoice) => void;
}) {
  const places = useSessionLocation(academyId, squadId, operationalLocation);
  const [query, setQuery] = useState("");
  return (
    <details>
      <summary>Find a location with Google Maps · optional</summary>
      {places.status === "CONFIGURATION_BLOCKED" ? (
        <p role="status">
          Google Maps is configuration-blocked. Choose an academy venue or enter
          the training location manually.
        </p>
      ) : (
        <>
          <p>
            Enter your academy’s training location above in your own words. Map
            results are shown here for this lookup; the saved location stays as
            you entered it.
          </p>
          <label>
            Google Maps location search
            <input
              maxLength={120}
              value={query}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void places.search(query);
                }
              }}
              onChange={(event) => {
                setQuery(event.target.value);
                places.clear();
              }}
            />
          </label>
          <Button
            type="button"
            variant="secondary"
            disabled={places.busy || places.status === "LOADING" || !squadId}
            onClick={() => places.search(query)}
          >
            {places.busy ? "Searching…" : "Search locations"}
          </Button>
          {places.notice && <p role="status">{places.notice}</p>}
          {(places.suggestions.length > 0 || places.choice) && (
            <div className="session-location-results">
              <span className="session-maps-attribution" translate="no">
                Google Maps
              </span>
              <ul aria-label="Google Maps place suggestions">
                {places.suggestions.map((place) => (
                  <li key={place.placeId}>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={places.busy}
                      onClick={() => places.select(place.placeId)}
                    >
                      {place.description}
                    </Button>
                  </li>
                ))}
              </ul>
              {places.choice && (
                <>
                  <p>
                    <strong>{places.choice.name}</strong>
                    <br />
                    {places.choice.address}
                  </p>
                  {places.choice.attributions?.map((credit) => (
                    <p key={credit.provider}>
                      {credit.providerUri &&
                      /^https?:\/\//i.test(credit.providerUri) ? (
                        <a
                          href={credit.providerUri}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          {credit.provider}
                        </a>
                      ) : (
                        credit.provider
                      )}
                    </p>
                  ))}
                  <Button
                    type="button"
                    disabled={
                      places.choice.location !== operationalLocation.trim()
                    }
                    onClick={() => {
                      onSelect(places.choice!);
                      places.clear(true);
                    }}
                  >
                    Confirm map selection
                  </Button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </details>
  );
}
