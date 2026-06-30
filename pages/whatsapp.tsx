import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async ({ query }) => {
  const base = process.env.WHATSAPP_TRANSFER_URL;
  const text = typeof query.text === 'string' ? query.text : 'Hola, quiero solicitar un presupuesto de transfer en ShareWay Pro.';

  if (!base) {
    return {
      redirect: {
        destination: '/traslados?whatsapp=missing',
        permanent: false
      }
    };
  }

  const separator = base.includes('?') ? '&' : '?';

  return {
    redirect: {
      destination: `${base}${separator}text=${encodeURIComponent(text)}`,
      permanent: false
    }
  };
};

export default function WhatsappRedirectPage() {
  return null;
}
