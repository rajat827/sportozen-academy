"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Plus, SlidersHorizontal, ArrowUpRight } from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAcademy } from "@/hooks/use-academy";
import type { Player } from "@/domain/entities";
import { football } from "@/config/sports/football";
import {
  Avatar,
  Badge,
  Button,
  Card,
  PageTitle,
  Sheet,
} from "@/components/ui/primitives";
const schema = z.object({
  name: z.string().min(3, "Enter at least 3 characters"),
  age: z.number().min(6).max(19),
  position: z.string().min(1),
  squad: z.string().min(1),
  branch: z.string().min(1),
});
type Form = z.infer<typeof schema>;
export function PlayerDirectory({ coach = false }: { coach?: boolean }) {
  const { data, update } = useAcademy();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Player | null>(null);
  const root = coach ? "/coach" : "/owner";
  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      age: 12,
      position: "Midfielder",
      squad: "U-13",
      branch: "Indiranagar",
    },
  });
  const filtered = useMemo(
    () =>
      data.players.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) &&
          (!filters.branch || p.branch === filters.branch) &&
          (!filters.squad || p.squad === filters.squad) &&
          (!filters.age ||
            (filters.age === "Under 13" ? p.age < 13 : p.age >= 13)) &&
          (!filters.position || p.position === filters.position) &&
          (!filters.status || p.status === filters.status) &&
          (!filters.fee || p.feeStatus === filters.fee) &&
          (!filters.attendance ||
            (p.attendance !== null &&
              (filters.attendance === "90% and above"
                ? p.attendance >= 90
                : p.attendance < 90))),
      ),
    [data.players, search, filters],
  );
  const columns = useMemo<ColumnDef<Player>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Player",
        cell: ({ row }) => (
          <button
            className="player-cell"
            onClick={() => setSelected(row.original)}
          >
            <Avatar name={row.original.name} />
            <span>
              <strong>{row.original.name}</strong>
              <small>{row.original.branch}</small>
            </span>
          </button>
        ),
      },
      {
        accessorKey: "squad",
        header: "Squad",
        cell: ({ getValue }) => <Badge>{String(getValue())}</Badge>,
      },
      { accessorKey: "age", header: "Age" },
      { accessorKey: "position", header: "Position" },
      {
        accessorKey: "attendance",
        header: "Attendance",
        cell: ({ row }) =>
          row.original.attendance === null
            ? "Not Recorded"
            : `${row.original.attendance}%`,
      },
      { accessorKey: "goal", header: "Current goal" },
      {
        accessorKey: "status",
        header: "Development",
        cell: ({ row }) => (
          <Badge tone={row.original.status === "On Track" ? "green" : "amber"}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: "feeStatus",
        header: "Fees",
        cell: ({ row }) => (
          <Badge tone={row.original.feeStatus === "Paid" ? "green" : "amber"}>
            {row.original.feeStatus}
          </Badge>
        ),
      },
      {
        id: "action",
        header: "",
        cell: ({ row }) => (
          <Link
            aria-label={`Open ${row.original.name} profile`}
            className="icon-button"
            href={`${root}/players/${row.original.id}`}
          >
            <ArrowUpRight size={18} />
          </Link>
        ),
      },
    ],
    [root],
  );
  // TanStack manages its own mutable table model; do not compiler-memoize it.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  function submit(values: Form) {
    const id = `p-${crypto.randomUUID()}`;
    update((s) => ({
      ...s,
      players: [
        ...s.players,
        {
          ...values,
          id,
          academyId: "stallions",
          sportId: football.id,
          dominantSide: "Right",
          guardianId: `g-${id}`,
          attendance: null,
          status: "On Track",
          feeStatus: "Outstanding",
          goal: "Not Recorded",
        },
      ],
      plans: [
        ...s.plans,
        {
          id: `${id}-plan`,
          academyId: s.academy.id,
          sportId: football.id,
          playerId: id,
          goalIds: [],
          coachId: "c1",
          weeklyPlan: "",
        },
      ],
      paths: [
        ...s.paths,
        {
          id: `${id}-path`,
          academyId: s.academy.id,
          sportId: football.id,
          playerId: id,
          stages: s.paths[0].stages.map((stage) => ({
            title: stage.title,
            status: "Not Started" as const,
          })),
        },
      ],
      accounts: [
        ...s.accounts,
        {
          id: `${id}-account`,
          academyId: s.academy.id,
          playerId: id,
          plan: "Monthly · ₹4,500",
        },
      ],
      charges: [
        ...s.charges,
        {
          id: `${id}-charge`,
          academyId: s.academy.id,
          playerId: id,
          amount: 4500,
          dueDate: "2026-10-10",
          label: "October youth programme",
        },
      ],
    }));
    setOpen(false);
    form.reset();
  }
  return (
    <>
      <PageTitle
        eyebrow="THE PEOPLE BEHIND THE PROGRESS"
        title="Players"
        description="Every player has a story. Give each one a clear next step."
      >
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} />
          Add player
        </Button>
      </PageTitle>
      <div className="directory-summary">
        <span>
          <strong>{data.players.length}</strong> active players
        </span>
        <span>
          <strong>{data.squads.length}</strong> squads
        </span>
        <span>
          <strong>{data.branches.length}</strong> branches
        </span>
        <span>
          <strong>
            {data.players.filter((p) => p.status === "Review Due").length}
          </strong>{" "}
          reviews due
        </span>
      </div>
      <Card>
        <div className="filters">
          <label className="search">
            <Search size={18} />
            <input
              aria-label="Search players"
              placeholder="Search players…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <span className="filter-label">
            <SlidersHorizontal size={16} /> Filters
          </span>
          {(
            [
              ["branch", "Branch", ["Indiranagar", "Whitefield"]],
              ["squad", "Squad", data.squads.map((s) => s.name)],
              ["age", "Age group", ["Under 13", "13 and above"]],
              ["position", "Position", football.positions],
              ["status", "Development", ["On Track", "Review Due"]],
              ["attendance", "Attendance", ["90% and above", "Below 90%"]],
              ["fee", "Fee status", ["Paid", "Outstanding"]],
            ] as [string, string, string[]][]
          ).map(([key, label, options]) => (
            <label key={key}>
              <span className="sr-only">{label} filter</span>
              <select
                aria-label={`${label} filter`}
                value={filters[key] ?? ""}
                onChange={(e) =>
                  setFilters({ ...filters, [key]: e.target.value })
                }
              >
                <option value="">All {label.toLowerCase()}</option>
                {options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
          ))}
          <Button
            variant="ghost"
            onClick={() => {
              setFilters({});
              setSearch("");
            }}
          >
            Clear
          </Button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              {table.getHeaderGroups().map((g) => (
                <tr key={g.id}>
                  {g.headers.map((h) => (
                    <th key={h.id}>
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mobile-player-cards">
          {filtered.map((p) => (
            <Link
              className="mobile-player-card"
              href={`${root}/players/${p.id}`}
              key={p.id}
            >
              <div className="inline">
                <Avatar name={p.name} />
                <strong>{p.name}</strong>
                <ArrowUpRight size={16} />
              </div>
              <p>
                {p.squad} · {p.position} · {p.branch}
              </p>
              <div className="inline">
                <Badge tone="green">{p.status}</Badge>
                <span>
                  {p.attendance === null
                    ? "Not Recorded"
                    : `${p.attendance}% attendance`}
                </span>
              </div>
              <p>{p.goal}</p>
            </Link>
          ))}
        </div>
        <div className="table-footer">
          Showing {filtered.length} of {data.players.length} players · Demo Data
        </div>
        {filtered.length === 0 && (
          <p className="empty">No players match these filters.</p>
        )}
      </Card>
      <Sheet open={open} onOpenChange={setOpen} title="Add a player">
        <form onSubmit={form.handleSubmit(submit)} className="form-stack">
          <label>
            Player name
            <input {...form.register("name")} />
          </label>
          {form.formState.errors.name && (
            <p className="error">{form.formState.errors.name.message}</p>
          )}
          <label>
            Age
            <input
              type="number"
              {...form.register("age", { valueAsNumber: true })}
            />
          </label>
          {form.formState.errors.age && (
            <p className="error">Enter an age between 6 and 19.</p>
          )}
          <label>
            Position
            <select {...form.register("position")}>
              {football.positions.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label>
            Squad
            <select {...form.register("squad")}>
              {data.squads.map((s) => (
                <option key={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <label>
            Branch
            <select {...form.register("branch")}>
              {data.branches.map((b) => (
                <option key={b.id}>{b.name}</option>
              ))}
            </select>
          </label>
          <Button type="submit">Save demo player</Button>
        </form>
      </Sheet>
      <Sheet
        open={!!selected}
        onOpenChange={() => setSelected(null)}
        title={selected?.name ?? "Player"}
      >
        {selected && (
          <>
            <div className="profile-mini">
              <Avatar name={selected.name} large />
              <Badge tone="green">{selected.status}</Badge>
              <p>
                {selected.squad} · {selected.position}
              </p>
            </div>
            <h3>Current focus</h3>
            <p>{selected.goal}</p>
            <p className="muted">
              Attendance:{" "}
              {selected.attendance === null
                ? "Not Recorded"
                : `${selected.attendance}%`}
            </p>
            <Link
              className="button primary"
              href={`${root}/players/${selected.id}`}
            >
              Open full profile <ArrowUpRight size={16} />
            </Link>
          </>
        )}
      </Sheet>
    </>
  );
}
