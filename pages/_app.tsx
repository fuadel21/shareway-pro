import type { AppProps } from 'next/app';
import Header from '../components/Header';
import Footer from '../components/Footer';
import '../app/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Header />
      <Component {...pageProps} />
      <Footer />
    </>
  );
}
