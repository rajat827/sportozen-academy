import Link from "next/link";
export default function Home() {
  return (
    <main className="secure-entry">
      <div className="secure-wordmark">
        Sportozen <span>ACADEMY</span>
      </div>
      <h1>One team. A different development path for every player.</h1>
      <p>
        Independent football academies, personalised player plans and clear
        parent development reports. No rankings.
      </p>
      <Link className="button primary" href="/owner/dashboard">
        Open academy demo
      </Link>
      <Link className="button secondary" href="/coach/dashboard">
        Coach demo
      </Link>
      <Link className="button secondary" href="/parent/home">
        Parent demo
      </Link>
      <p className="muted">
        No sign-in needed. Explore with fictional players and families. Use the
        role switcher to try the owner, coach and parent experiences.
      </p>
    </main>
  );
}
