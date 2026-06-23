import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description: 'Política de privacidad de ShareWay Pro.'
};

export default function PrivacidadPage() {
  return (
    <main className="page-wrap legal-page">
      <h1>Política de privacidad</h1>
      <p>Última actualización: 23 de junio de 2026.</p>
      <p>Esta plantilla debe revisarse y completarse con los datos reales del responsable del tratamiento antes de publicar campañas o formularios avanzados.</p>
      <h2>Datos tratados</h2>
      <p>En la versión inicial, el contacto se realiza mediante email. Los datos enviados se utilizarán para responder a solicitudes de información, transfers o acuerdos comerciales.</p>
      <h2>Afiliación</h2>
      <p>Cuando el usuario accede a un partner externo, la gestión de la reserva y el tratamiento posterior de datos quedan sujetos a la política del proveedor correspondiente.</p>
    </main>
  );
}
