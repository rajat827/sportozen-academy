"use client";
import { useState } from "react";
import Link from "next/link";
import { Building2, MapPin, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAcademy } from "@/hooks/use-academy";
import {
  Badge,
  Button,
  Card,
  PageTitle,
  SectionTitle,
} from "@/components/ui/primitives";
const schema = z.object({
  name: z.string().min(3),
  email: z.email(),
  city: z.string().min(2),
  tagline: z.string().min(3),
});
export function AcademySetup({ section }: { section?: string }) {
  const { data, update } = useAcademy();
  const [tab, setTab] = useState(
    section === "branches"
      ? "Branches"
      : section === "programs"
        ? "Sports & programs"
        : "Overview",
  );
  const [branchName, setBranchName] = useState("");
  const [address, setAddress] = useState("");
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: data.academy,
  });
  return (
    <>
      <PageTitle
        eyebrow="A STRONG FOUNDATION FOR DEVELOPMENT"
        title="Academy setup"
        description="Your academy, your programmes, your identity."
      />
      <div className="tabs" role="tablist" aria-label="Academy sections">
        {[
          "Overview",
          "Branches",
          "Venues",
          "Sports & programs",
          "Staff",
          "Roles & permissions",
          "Documents",
          "Branding",
        ].map((t) => (
          <button
            role="tab"
            aria-selected={tab === t}
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={tab}>
        {tab === "Overview" || tab === "Branding" ? (
          <div className="two-columns">
            <Card>
              <SectionTitle
                title={
                  tab === "Branding" ? "Academy identity" : "Academy overview"
                }
              />
              <form
                className="form-stack"
                onSubmit={form.handleSubmit((values) =>
                  update((s) => ({
                    ...s,
                    academy: { ...s.academy, ...values },
                  })),
                )}
              >
                <label>
                  Academy name
                  <input {...form.register("name")} />
                </label>
                <label>
                  Contact email
                  <input type="email" {...form.register("email")} />
                </label>
                <label>
                  City
                  <input {...form.register("city")} />
                </label>
                <label>
                  Tagline
                  <input {...form.register("tagline")} />
                </label>
                {Object.keys(form.formState.errors).length > 0 && (
                  <p role="alert" className="error">
                    Enter a valid academy name, email, city and tagline.
                  </p>
                )}
                <Button type="submit">Save academy</Button>
              </form>
            </Card>
            <Card>
              <div className="academy-identity">
                <span className="crest large">SFC</span>
                <h2>{data.academy.name}</h2>
                <p>{data.academy.tagline}</p>
                <Badge tone="green">Youth development · Football</Badge>
              </div>
              <dl className="details">
                <dt>Location</dt>
                <dd>{data.academy.city}</dd>
                <dt>Branches</dt>
                <dd>{data.branches.length}</dd>
                <dt>Players</dt>
                <dd>{data.players.length}</dd>
              </dl>
            </Card>
          </div>
        ) : tab === "Branches" ? (
          <Card>
            <SectionTitle title="Branches" />
            {data.branches.map((b) => (
              <div className="list-row" key={b.id}>
                <Building2 size={23} />
                <div>
                  <h3>{b.name}</h3>
                  <p>{b.address}</p>
                </div>
                <Badge tone="green">Active</Badge>
              </div>
            ))}
            <form
              className="form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                if (!branchName.trim() || !address.trim()) return;
                update((s) => ({
                  ...s,
                  branches: [
                    ...s.branches,
                    {
                      id: crypto.randomUUID(),
                      academyId: s.academy.id,
                      name: branchName,
                      address,
                    },
                  ],
                }));
                setBranchName("");
                setAddress("");
              }}
            >
              <label>
                New branch name
                <input
                  required
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                />
              </label>
              <label>
                Address
                <input
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </label>
              <Button type="submit">Add branch</Button>
            </form>
          </Card>
        ) : tab === "Venues" ? (
          <Card>
            {data.venues.map((v) => (
              <div className="list-row" key={v.id}>
                <MapPin size={24} />
                <div>
                  <h3>{v.name}</h3>
                  <p>{data.branches.find((b) => b.id === v.branchId)?.name}</p>
                </div>
              </div>
            ))}
          </Card>
        ) : tab === "Sports & programs" ? (
          <Card>
            <SectionTitle title="Youth development programmes" />
            {data.programs.map((p) => (
              <div className="list-row" key={p.id}>
                <strong>{p.name}</strong>
                <Badge tone="green">Football</Badge>
              </div>
            ))}
            <p className="muted">
              Additional sport configurations are future work. Shared entities
              use sportId.
            </p>
            {data.squads.map((s) => (
              <div className="list-row" key={s.id}>
                <Users size={18} />
                <strong>{s.name}</strong>
                <span>
                  {data.coaches.find((c) => c.id === s.coachId)?.name}
                </span>
              </div>
            ))}
          </Card>
        ) : tab === "Staff" ? (
          <Staff />
        ) : tab === "Roles & permissions" ? (
          <Card>
            <h2>Demo roles</h2>
            {[
              ["Owner", "Academy configuration and operational views"],
              ["Coach", "Training, observations and coach review"],
              ["Parent", "Linked player and reviewed public records"],
            ].map(([role, desc]) => (
              <div className="list-row" key={role}>
                <strong>{role}</strong>
                <p>{desc}</p>
              </div>
            ))}
            <p className="notice amber">
              Demo role switching is not authentication. Server-side
              authorisation is required before production use.
            </p>
          </Card>
        ) : (
          <Card>
            <h2>Documents</h2>
            <p className="empty">Document upload and storage · Not Connected</p>
            <Button disabled>Upload · Not Connected</Button>
          </Card>
        )}
      </div>
    </>
  );
}
export function Staff() {
  const { data } = useAcademy();
  return (
    <Card>
      <SectionTitle
        title="Coaching team"
        subtitle="The people behind purposeful practice"
      />
      {data.coaches.map((c) => (
        <div className="list-row" key={c.id}>
          <span className="attention-icon green">
            <Users size={21} />
          </span>
          <div>
            <h3>{c.name}</h3>
            <p>
              {data.squads
                .filter((s) => s.coachId === c.id)
                .map((s) => s.name)
                .join(" · ")}
            </p>
          </div>
          <Badge tone="green">Coach</Badge>
        </div>
      ))}
    </Card>
  );
}
export function Squads() {
  const { data } = useAcademy();
  return (
    <>
      <PageTitle
        title="My squads"
        description="Coach Rahul’s training groups and current player priorities."
      />
      <div className="two-columns">
        {data.squads
          .filter((s) => s.coachId === "c1")
          .map((squad) => (
            <Card key={squad.id}>
              <SectionTitle
                title={squad.name}
                subtitle={`${data.players.filter((p) => p.squad === squad.name).length} players · Coach Rahul`}
              />
              {data.players
                .filter((p) => p.squad === squad.name)
                .map((p) => (
                  <Link
                    className="list-row"
                    key={p.id}
                    href={`/coach/players/${p.id}`}
                  >
                    <div>
                      <h3>{p.name}</h3>
                      <p>{p.goal}</p>
                    </div>
                    <Badge tone={p.status === "On Track" ? "green" : "amber"}>
                      {p.status}
                    </Badge>
                  </Link>
                ))}
            </Card>
          ))}
      </div>
    </>
  );
}
