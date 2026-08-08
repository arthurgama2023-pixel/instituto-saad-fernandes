import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

import { api, ApiError, type Consulta, type PacienteHome } from "@/lib/api";
import { useSession } from "@/lib/auth";

export default function Home() {
  const { token, signOut } = useSession();
  const [data, setData] = useState<PacienteHome | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      setData(await api.home(token));
    } catch (e) {
      // Token expirado/revogado → volta pro login.
      if (e instanceof ApiError && e.status === 401) {
        signOut();
        return;
      }
      setError(e instanceof ApiError ? e.message : "Falha ao carregar.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, signOut]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function logout() {
    if (token) {
      try {
        await api.logout(token);
      } catch {
        // mesmo se falhar no servidor, limpamos localmente
      }
    }
    signOut();
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#07845a" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor="#07845a"
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.hi}>Olá,</Text>
            <Text style={styles.name}>{data?.name ?? "Paciente"}</Text>
          </View>
          <Pressable onPress={logout} hitSlop={10}>
            <Text style={styles.logout}>Sair</Text>
          </Pressable>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        {data?.healthSummary ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>{data.healthSummary}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Próximas consultas</Text>
        {data && data.upcoming.length > 0 ? (
          data.upcoming.map((c) => <ConsultaCard key={c.id} c={c} />)
        ) : (
          <Text style={styles.empty}>Nenhuma consulta agendada.</Text>
        )}

        {data && data.past.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Histórico</Text>
            {data.past.map((c) => (
              <ConsultaCard key={c.id} c={c} past />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ConsultaCard({ c, past }: { c: Consulta; past?: boolean }) {
  const data = new Date(c.startsAt);
  const quando = data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: past ? undefined : "2-digit",
    minute: past ? undefined : "2-digit",
  });
  return (
    <View style={[styles.card, past && styles.cardPast]}>
      <View style={styles.cardRow}>
        <Text style={styles.cardEspec}>{c.especialidade}</Text>
        <Text style={styles.cardPreco}>R$ {(c.priceCents / 100).toFixed(2)}</Text>
      </View>
      <Text style={styles.cardMedico}>{c.medico}</Text>
      <View style={styles.cardRow}>
        <Text style={styles.cardQuando}>{quando}</Text>
        <Text style={styles.cardStatus}>{statusLabel(c.status)}</Text>
      </View>
    </View>
  );
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    CONFIRMADA: "Confirmada",
    AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
    CONCLUIDA: "Concluída",
    CANCELADA: "Cancelada",
  };
  return map[s] ?? s;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f6f8f7" },
  center: { flex: 1, backgroundColor: "#f6f8f7", alignItems: "center", justifyContent: "center" },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  hi: { fontSize: 15, color: "#52606d" },
  name: { fontSize: 24, fontWeight: "800", color: "#0a1420" },
  logout: { color: "#07845a", fontWeight: "700", fontSize: 15 },
  summaryCard: { backgroundColor: "#e7f7ee", borderRadius: 16, padding: 16 },
  summaryText: { color: "#0a3d2a", fontSize: 14, lineHeight: 20 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#0a1420", marginTop: 10 },
  empty: { color: "#7b8794", fontSize: 14, fontStyle: "italic" },
  error: { color: "#c0392b", fontSize: 14 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: "#eceff1",
  },
  cardPast: { opacity: 0.7 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardEspec: { fontSize: 13, fontWeight: "700", color: "#07845a", textTransform: "uppercase", letterSpacing: 0.3 },
  cardPreco: { fontSize: 13, color: "#52606d", fontWeight: "600" },
  cardMedico: { fontSize: 17, fontWeight: "700", color: "#0a1420" },
  cardQuando: { fontSize: 14, color: "#3e4c59" },
  cardStatus: { fontSize: 12, color: "#52606d", fontWeight: "600" },
});
