import SearchForm from '@/components/SearchForm';

export default function AutobusesPage() {
  return <main className="page-wrap"><section className="page-hero"><p className="eyebrow">Autobuses</p><h1>Busca autobuses.</h1><p>Consulta rutas desde ShareWay Pro.</p></section><SearchForm defaultMode="autobus" /></main>;
}
