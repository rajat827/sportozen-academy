"use client";
import type { ScreenProps as Props } from "./types";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { previewRoute } from "./catalog";
import { previewAdapter, usePreviewState } from "./adapter";
import { money, resolvedAcademy } from "./fixtures";
import { Button, Card, Badge, Go, Head, Field, Check } from "./ui";
export function FeeScreen({ screen: s }: Props) {
  const state = usePreviewState(),
    academy = resolvedAcademy(state.academyId, state.profiles),
    p = state.players.find((p) => p.id === state.playerId)!,
    [reference, setReference] = useState(state.manualReference),
    [verified, setVerified] = useState(false);
  const charge = academy.monthlyFee - academy.discount,
    paid =
      state.payment === "paid"
        ? charge
        : state.payment === "partial"
          ? academy.partPayment
          : 0;
  return (
    <div className="dp-grid">
      <Card>
        <Head
          title={`${p.name} · October training fee`}
          note={`${academy.name} receives this training fee. Software billing is separate.`}
        />
        <div className="dp-ledger">
          <div>
            <span>Monthly batch fee</span>
            <strong>{money(academy, academy.monthlyFee)}</strong>
          </div>
          <div>
            <span>Recorded scholarship</span>
            <strong>−{money(academy, academy.discount)}</strong>
          </div>
          <div>
            <span>Verified payment</span>
            <strong>{money(academy, paid)}</strong>
          </div>
          <div className="total">
            <span>Remaining balance</span>
            <strong>{money(academy, charge - paid)}</strong>
          </div>
        </div>
        <p className="dp-note">
          Invoice TRAIN-OCT-001 · October 2026 · Due 10 October · Currency{" "}
          {academy.currency}
        </p>
        {["manual-payment", "reconciliation"].includes(s.id) && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              previewAdapter.save({
                manualReference: reference,
                payment: "pending-verification",
                notice:
                  "Fictional reference submitted; pending verification, balance unchanged.",
              });
            }}
          >
            <Field
              label="Fictional payment reference"
              value={reference}
              onChange={setReference}
            />
            <p className="dp-note">
              Use a synthetic reference such as PREVIEW-001. Do not enter real
              bank/card/UPI information.
            </p>
            <Button type="submit" disabled={!reference.trim()}>
              Submit reference for review
            </Button>
            <Badge>Pending verification</Badge>
            {s.id === "reconciliation" && (
              <>
                <Check
                  label="I matched the fictional reference and amount for this invoice"
                  checked={verified}
                  onChange={setVerified}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!verified || !state.manualReference}
                  onClick={() =>
                    previewAdapter.save({
                      payment: "paid",
                      notice:
                        "Fictional payment reconciled; receipt design available. No money moved.",
                    })
                  }
                >
                  Record verified prototype payment
                </Button>
              </>
            )}
          </form>
        )}
        {s.id === "refund-review" && (
          <>
            <p className="dp-alert">
              Refund proposed: {money(academy, academy.partPayment)}. Review the
              recorded reason and payment; no refund is executed.
            </p>
            <Check
              label="Review recorded invoice and verified payment"
              checked={verified}
              onChange={setVerified}
            />
            <Button
              disabled={!verified}
              onClick={() =>
                previewAdapter.save({
                  notice:
                    "Refund-review decision saved as a design scenario. No funds transferred.",
                })
              }
            >
              Save refund-review decision
            </Button>
          </>
        )}
        <div className="dp-actions">
          <Go to={s.next ?? "player-account"}>Continue fee workflow</Go>
          <Go to="discounts">Scholarship decision</Go>
          <Go to="manual-payment">Manual reference</Go>
        </div>
      </Card>
      <Card>
        <Head title="Invoice and attempt history" />
        <div className="dp-row">
          <div className="dp-copy">
            <strong>TRAIN-OCT-001</strong>
            <p>Charge and scholarship recorded · no currencies combined</p>
          </div>
          <Badge>{state.payment}</Badge>
        </div>
        {state.manualReference && (
          <div className="dp-row">
            <div className="dp-copy">
              <strong>{state.manualReference}</strong>
              <p>
                Parent-submitted reference · pending until separately reconciled
              </p>
            </div>
          </div>
        )}
        <Go to="payment-query">Ask about this invoice</Go>
        <br />
        <Go to="refund-review">Refund review design</Go>
      </Card>
    </div>
  );
}

export function PaymentScreen({ screen: s }: Props) {
  const state = usePreviewState(),
    academy = resolvedAcademy(state.academyId, state.profiles),
    p = state.players.find((p) => p.id === state.playerId)!,
    router = useRouter(),
    [method, setMethod] = useState(
      academy.currency === "INR" ? "Proposed UPI" : "Proposed card",
    ),
    [reference, setReference] = useState("");
  const charge = academy.monthlyFee - academy.discount;
  const phase =
    s.id === "payment-paid"
      ? "paid"
      : s.id === "payment-partial"
        ? "partial"
        : s.id === "payment-failed"
          ? "failed"
          : s.id === "payment-cancelled"
            ? "cancelled"
            : s.id === "payment-processing"
              ? "processing"
              : state.payment;
  const paid =
    phase === "paid" ? charge : phase === "partial" ? academy.partPayment : 0;
  if (s.id === "receipt" && paid === 0)
    return (
      <Card>
        <Head title="Receipt not yet available" />
        <p>No verified fictional payment is recorded for this invoice.</p>
        <p className="dp-note">
          A pending reference or failed attempt does not produce a paid receipt.
        </p>
        <Go to="checkout">Review the payment simulation</Go>
      </Card>
    );
  function outcome(value: "paid" | "failed" | "cancelled" | "partial") {
    previewAdapter.save({
      payment: value,
      notice: `Simulated payment outcome: ${value}. No money processed.`,
    });
    router.push(previewRoute(`payment-${value}`));
  }
  return (
    <div className="dp-grid">
      <Card>
        <Head
          title={
            s.id === "receipt"
              ? "Fictional academy receipt"
              : `October invoice · ${p.name}`
          }
          note={`${academy.name} · Academy training fee · ${academy.currency}`}
        />
        <div className="dp-amount">
          <small>
            {s.id === "receipt"
              ? "Amount recorded in the design scenario"
              : "Remaining academy fee"}
          </small>
          <p className="dp-metric">
            {money(academy, s.id === "receipt" ? paid : charge - paid)}
          </p>
          <small>TRAIN-OCT-001 · October 2026 · {p.batch}</small>
        </div>
        <div className="dp-ledger">
          <div>
            <span>Original charge</span>
            <strong>{money(academy, academy.monthlyFee)}</strong>
          </div>
          <div>
            <span>Scholarship</span>
            <strong>−{money(academy, academy.discount)}</strong>
          </div>
          <div>
            <span>Scenario paid amount</span>
            <strong>{money(academy, paid)}</strong>
          </div>
          <div className="total">
            <span>Balance</span>
            <strong>{money(academy, charge - paid)}</strong>
          </div>
        </div>
        {s.id === "payment-method" && (
          <>
            <Field
              label="Proposed payment method"
              value={method}
              onChange={setMethod}
              options={
                academy.currency === "INR"
                  ? ["Proposed UPI", "Proposed card", "Manual reference"]
                  : [
                      "Proposed card",
                      "Proposed bank transfer",
                      "Manual reference",
                    ]
              }
            />
            <p className="dp-note">
              These are proposed designs only. Merchant/provider support is not
              configured.
            </p>
          </>
        )}
        {s.id === "checkout" && (
          <p className="dp-alert">
            Review only: the academy would receive {money(academy, charge)}. No
            payment details are collected and no provider is called.
          </p>
        )}
        {s.id === "payment-processing" ? (
          <div className="dp-actions">
            <Button onClick={() => outcome("paid")}>Simulate paid</Button>
            <Button variant="secondary" onClick={() => outcome("failed")}>
              Simulate failed
            </Button>
            <Button variant="secondary" onClick={() => outcome("cancelled")}>
              Simulate cancelled
            </Button>
            <Button variant="secondary" onClick={() => outcome("partial")}>
              Simulate partial payment
            </Button>
          </div>
        ) : (
          <div className="dp-actions">
            {s.id === "checkout" ? (
              <Button
                onClick={() => {
                  previewAdapter.save({ payment: "processing" });
                  router.push(previewRoute("payment-processing"));
                }}
              >
                Start payment simulation
              </Button>
            ) : (
              s.next && <Go to={s.next}>Continue payment preview</Go>
            )}
            <Go to="payment-query">Ask about this invoice</Go>
          </div>
        )}
        {s.id === "parent-fees" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              previewAdapter.save({
                manualReference: reference,
                payment: "pending-verification",
                notice:
                  "Reference pending verification. Outstanding balance remains unchanged.",
              });
            }}
          >
            <Field
              label="Submit a fictional payment reference"
              value={reference}
              onChange={setReference}
            />
            <Button
              type="submit"
              variant="secondary"
              disabled={!reference.trim()}
            >
              Submit reference
            </Button>
            <p className="dp-note">
              Pending verification, not automatically paid.
            </p>
          </form>
        )}
      </Card>
      <Card>
        <Head title={`Design outcome: ${phase}`} note="No money is processed" />
        <p>
          {phase === "failed"
            ? "The simulated attempt failed. No verified payment is recorded; the amount due remains."
            : phase === "cancelled"
              ? "This simulated attempt was cancelled. Return to the invoice when ready."
              : phase === "partial"
                ? `Simulated part payment ${money(academy, academy.partPayment)} leaves ${money(academy, charge - academy.partPayment)} due.`
                : phase === "paid"
                  ? "A fictional success receipt is available. This does not establish real reconciliation."
                  : phase === "pending-verification"
                    ? "The submitted reference is awaiting an independent academy check."
                    : "An explicit fictional simulation shows the processing and result states."}
        </p>
        <div className="dp-actions">
          <Go to="checkout">Review checkout</Go>
          <Go to="receipt">Receipt design</Go>
          <Go to="payment-failed">Failed example</Go>
        </div>
        <p className="dp-note">
          Academy-to-Sportozen software invoices never share this balance.
        </p>
      </Card>
    </div>
  );
}
