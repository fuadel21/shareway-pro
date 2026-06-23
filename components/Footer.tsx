import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <strong>ShareWay Pro</strong>
        <p>Portal independiente para comparar trenes, autobuses y solicitar transfers.</p>
      </div>
      <nav aria-label="Enlaces legales">
        <Link href="/aviso-legal">Aviso legal</Link>
        <Link href="/privacidad">Privacidad</Link>
        <Link href="/cookies">Cookies</Link>
      </nav>
    </footer>
  );
}
