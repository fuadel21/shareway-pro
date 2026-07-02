export default function Footer() {
  return (
    <footer className="site-footer pro-footer">
      <div className="footer-brand">
        <strong>ShareWay Pro</strong>
        <p>Portal independiente para trenes, autobuses y transfers.</p>
      </div>

      <nav className="footer-links" aria-label="Enlaces principales">
        <a href="/rutas">Rutas</a>
        <a href="/trenes">Trenes</a>
        <a href="/autobuses">Autobuses</a>
        <a href="/traslados">Transfers</a>
        <a href="/contacto">Contacto</a>
      </nav>

      <nav className="footer-links footer-legal" aria-label="Enlaces informativos">
        <a href="/aviso-legal">Aviso legal</a>
        <a href="/privacidad">Privacidad</a>
        <a href="/cookies">Cookies</a>
      </nav>
    </footer>
  );
}
