export default function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <strong>ShareWay Pro</strong>
        <p>Portal independiente para trenes, autobuses y transfers.</p>
      </div>
      <nav className="footer-links" aria-label="Enlaces del pie de pagina">
        <a href="/rutas">Rutas</a>
        <a href="/traslados">Transfers</a>
        <a href="/trenes">Trenes</a>
        <a href="/autobuses">Autobuses</a>
      </nav>
    </footer>
  );
}
