import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de cookies',
  description: 'Política de cookies de ShareWay Pro.'
};

export default function CookiesPage() {
  return (
    <main className="page-wrap legal-page">
      <h1>Política de cookies</h1>
      <p>Última actualización: 23 de junio de 2026.</p>
      <p>Esta versión no instala cookies propias de analítica por defecto. Si se añade Google Analytics, Meta Pixel, herramientas de afiliación o mapas externos, esta política debe actualizarse.</p>
      <h2>Cookies de terceros</h2>
      <p>Los enlaces de afiliado y plataformas externas pueden usar sus propias cookies o tecnologías de seguimiento según sus políticas.</p>
    </main>
  );
}
