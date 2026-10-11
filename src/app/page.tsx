import Link from "next/link";
export default function Home() {
  return (
    <main className="secure-entry">
      <div className="secure-wordmark">
        Sportozen <span>ACADEMY</span>
      </div>
      <h1>One platform. Every football academy’s own workspace.</h1>
      <p>
        Independent football academies, personalised player plans and clear
        parent development reports. No rankings.
      </p>
      <Link className="button primary" href="/workspace">
        Open your workspace
      </Link>
      <Link className="button secondary" href="/owner/dashboard">
        Explore fictional demo
      </Link>
      <p className="muted">
        The local authenticated foundation is under validation for commercial
        use. The browser demo contains fictional records only.
      </p>
    </main>
  );
}
