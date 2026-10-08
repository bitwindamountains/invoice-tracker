import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="state-page">
      <h1>This page isn’t here.</h1>
      <p>Check the address or head back to the start.</p>
      <Link className="button primary" href="/">
        Go home
      </Link>
    </main>
  );
}
