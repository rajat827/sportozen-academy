"use client";
import { useState } from "react";
import { useAcademy } from "@/hooks/use-academy";
import {
  Avatar,
  Badge,
  Button,
  Card,
  PageTitle,
  Sheet,
} from "@/components/ui/primitives";
export function Fees() {
  const { data, update } = useAcademy();
  const [playerId, setPlayerId] = useState("");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("4500");
  const [error, setError] = useState("");
  const charged = data.charges.reduce((sum, c) => sum + c.amount, 0);
  const paid = data.payments.reduce((sum, p) => sum + p.amount, 0);
  const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  return (
    <>
      <PageTitle
        title="Fees & payments"
        description="Demo financial record keeping · payment processing is Not Connected."
      />
      <div className="profile-stats">
        <Card>
          <span>Total charges</span>
          <strong className="big-number">{money(charged)}</strong>
        </Card>
        <Card>
          <span>Amount recorded paid</span>
          <strong className="big-number">{money(paid)}</strong>
        </Card>
        <Card>
          <span>Outstanding amount</span>
          <strong className="big-number">{money(charged - paid)}</strong>
        </Card>
        <Card>
          <span>Fee plan</span>
          <h3>Monthly youth programme</h3>
          <p>₹4,500 per player</p>
        </Card>
      </div>
      <Card>
        <div className="table-wrap fee-table">
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>Plan / upcoming charge</th>
                <th>Paid</th>
                <th>Outstanding</th>
                <th>Record</th>
              </tr>
            </thead>
            <tbody>
              {data.players.map((p) => {
                const charges = data.charges
                  .filter((c) => c.playerId === p.id)
                  .reduce((n, c) => n + c.amount, 0);
                const payments = data.payments
                  .filter((c) => c.playerId === p.id)
                  .reduce((n, c) => n + c.amount, 0);
                return (
                  <tr key={p.id}>
                    <td>
                      <span className="player-cell">
                        <Avatar name={p.name} />
                        {p.name}
                      </span>
                    </td>
                    <td>
                      October · {money(charges)}
                      <small>Due 10 October</small>
                    </td>
                    <td>{money(payments)}</td>
                    <td>
                      <Badge tone={charges > payments ? "amber" : "green"}>
                        {money(charges - payments)}
                      </Badge>
                    </td>
                    <td>
                      <Button
                        variant="secondary"
                        disabled={charges <= payments}
                        onClick={() => {
                          setPlayerId(p.id);
                          setAmount(String(charges - payments));
                          setReference("");
                          setError("");
                        }}
                      >
                        Record reference
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <h2>Payment history · demo records</h2>
        {data.payments.map((p) => (
          <div className="list-row" key={p.id}>
            <strong>
              {data.players.find((x) => x.id === p.playerId)?.name}
            </strong>
            <span>{money(p.amount)}</span>
            <span>{p.reference}</span>
            <Badge>Receipt · Not Connected</Badge>
          </div>
        ))}
      </Card>
      <Sheet
        open={!!playerId}
        onOpenChange={() => setPlayerId("")}
        title="Record a demo payment"
      >
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            const remaining =
              data.charges
                .filter((c) => c.playerId === playerId)
                .reduce((n, c) => n + c.amount, 0) -
              data.payments
                .filter((p) => p.playerId === playerId)
                .reduce((n, p) => n + p.amount, 0);
            if (
              !reference.trim() ||
              Number(amount) <= 0 ||
              Number(amount) > remaining
            ) {
              setError(
                "Enter a reference and an amount within the outstanding balance.",
              );
              return;
            }
            update((s) => ({
              ...s,
              payments: [
                ...s.payments,
                {
                  id: crypto.randomUUID(),
                  academyId: s.academy.id,
                  playerId,
                  amount: Number(amount),
                  reference,
                  date: "2026-10-07",
                },
              ],
              players: s.players.map((p) =>
                p.id === playerId && Number(amount) === remaining
                  ? { ...p, feeStatus: "Paid" }
                  : p,
              ),
            }));
            setPlayerId("");
          }}
        >
          <Badge tone="amber">Record only · no money is collected</Badge>
          <label>
            Payment reference
            <input
              required
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </label>
          <label>
            Amount
            <input
              required
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <Button type="submit">Save demo record</Button>
        </form>
      </Sheet>
    </>
  );
}
