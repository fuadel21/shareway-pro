import Link from 'next/link';

export default function Header() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="ShareWay Pro inicio">
        <span className="brand-mark">S</span>
        <span><strong>ShareWay</strong><small>Pro</small></span>
      </Link>
      <nav className="nav" aria-label="Navegación principal">
        <Link href="/trenes">Trenes</Link>
        <Link href="/autobuses">Autobuses</Link>
        <Link href="/transfers">Transfers</Link>
        <Link href="/contacto">Contacto</Link>
      </nav>
    </header>
  );
}
