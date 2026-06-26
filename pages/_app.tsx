import type { AppProps } from 'next/app';
import Script from 'next/script';
import Header from '../components/Header';
import Footer from '../components/Footer';
import '../app/globals.css';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      {GA_ID ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}');
            `}
          </Script>
        </>
      ) : null}
      <Header />
      <Component {...pageProps} />
      <Footer />
    </>
  );
}
