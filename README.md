# ShareWay Pro

Web independiente para `shareway.pro`, separada de `shareway.es`, enfocada en afiliación de trenes/autobuses y captación de solicitudes de transfers.

## Stack

- Next.js 15
- React 19
- TypeScript
- CSS propio
- Preparado para Vercel

## Desarrollo local

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

## Variables de entorno

Copia `.env.example` a `.env.local` y reemplaza el enlace de Omio cuando tengas tu tracking de afiliado:

```bash
NEXT_PUBLIC_SITE_URL=https://shareway.pro
NEXT_PUBLIC_CONTACT_EMAIL=info@shareway.pro
NEXT_PUBLIC_OMIO_AFFILIATE_URL=https://www.omio.es/
```

Si el partner entrega una plantilla de deeplink, usa `NEXT_PUBLIC_OMIO_DEEPLINK_TEMPLATE` con estos tokens:

- `{origin}`
- `{destination}`
- `{date}`
- `{passengers}`
- `{mode}`

## Despliegue en Vercel

1. Importa este repositorio en Vercel.
2. Añade las variables de entorno.
3. Añade los dominios `shareway.pro` y `www.shareway.pro`.
4. Configura los DNS en Nominalia con los valores que muestre Vercel.

## Nota legal

Las páginas legales incluidas son plantillas iniciales. Antes de vender servicios reales o activar campañas, deben revisarse con los datos fiscales y condiciones comerciales reales.
