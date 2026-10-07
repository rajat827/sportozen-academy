import Link from 'next/link';
export default function NotFound() { return <div className="empty"><h1>Page not found</h1><p>This route is not part of the current demo.</p><Link className="button primary" href="/owner/dashboard">Return to dashboard</Link></div>; }
