'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Certificate } from '@/lib/types';
import { Navbar } from '@/components/navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Award, Download, Loader2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function MyCertificatesPage() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'certificados'), where('userId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Certificate));
      setCertificates(data.sort((a, b) => b.dataEmissao.toMillis() - a.dataEmissao.toMillis()));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />
      <main className="container mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <Award className="h-8 w-8 text-secondary" />
          <h1 className="text-3xl font-bold">Meus Certificados</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : certificates.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border-2 border-dashed">
            <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-30" />
            <p className="text-muted-foreground text-lg mb-4">Você ainda não possui certificados emitidos.</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Os certificados são liberados automaticamente após a confirmação da sua presença no evento.
            </p>
            <Link href="/meus-eventos">
              <Button variant="outline">Ver Meus Eventos</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificates.map((cert) => (
              <Card key={cert.id} className="group hover:shadow-lg transition-all border-none shadow-md overflow-hidden">
                <div className="h-2 bg-secondary" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg line-clamp-2">{cert.tituloEvento}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Emitido em: {format(cert.dataEmissao.toDate(), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-md text-center">
                    <Award className="h-12 w-12 mx-auto text-secondary mb-2" />
                    <p className="font-semibold text-sm">{cert.nomeParticipante}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button className="w-full bg-secondary hover:bg-secondary/90" asChild>
                      <a href={cert.urlPdf} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-2 h-4 w-4" />
                        Baixar PDF
                      </a>
                    </Button>
                    <Button variant="outline" size="icon" asChild title="Ver detalhes">
                       <Link href={`/certificados/${cert.id}`}>
                         <ExternalLink className="h-4 w-4" />
                       </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
