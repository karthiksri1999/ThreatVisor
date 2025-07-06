import { Header } from '@/components/header';
import { ThreatVisorClient } from '@/components/threat-visor-client';

export default function Home() {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <main className="flex-1 overflow-hidden">
        <ThreatVisorClient />
      </main>
    </div>
  );
}
