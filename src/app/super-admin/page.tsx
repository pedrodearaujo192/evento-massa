import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Calendar, Users } from "lucide-react";

async function getStats() {
    const adminsQuery = query(collection(db, "usuarios"), where("tipo", "==", "adm_evento"));
    const eventsQuery = collection(db, "eventos");
    
    const [adminsSnapshot, eventsSnapshot] = await Promise.all([
        getDocs(adminsQuery),
        getDocs(eventsQuery)
    ]);
    
    return {
        adminCount: adminsSnapshot.size,
        eventCount: eventsSnapshot.size
    };
}


export default async function SuperAdminDashboard() {
  const { adminCount, eventCount } = await getStats();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-headline text-3xl md:text-4xl">Painel Super Admin</h1>
        <p className="text-muted-foreground">Visão geral do sistema EventoMassa.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Admins de Eventos
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminCount}</div>
            <p className="text-xs text-muted-foreground">
              Total de administradores cadastrados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Eventos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eventCount}</div>
            <p className="text-xs text-muted-foreground">
              Eventos criados na plataforma
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Em breve</div>
            <p className="text-xs text-muted-foreground">
              Total de participantes
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
