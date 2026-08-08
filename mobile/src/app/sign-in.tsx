import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, ApiError } from "@/lib/api";
import { useSession } from "@/lib/auth";

export default function SignIn() {
  const { signIn } = useSession();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [whatsapp, setWhatsapp] = useState("");
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.otpEnviar(whatsapp.trim());
      setNome(res.nome);
      setDevCode(res.devCode ?? null);
      setStep("code");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Falha ao enviar o código.");
    } finally {
      setLoading(false);
    }
  }

  async function verificar() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.otpVerificar(whatsapp.trim(), codigo.trim());
      signIn(res.token); // dispara o redirecionamento pro (app) via Stack.Protected
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Código incorreto.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <View style={styles.brand}>
          <Text style={styles.logo}>Smart Doctor</Text>
          <Text style={styles.subtitle}>
            {step === "phone"
              ? "Entre com seu WhatsApp para continuar"
              : `Oi, ${nome.split(" ")[0]}! Digite o código enviado`}
          </Text>
        </View>

        {step === "phone" ? (
          <View style={styles.form}>
            <Text style={styles.label}>WhatsApp</Text>
            <TextInput
              style={styles.input}
              placeholder="(21) 90000-0000"
              placeholderTextColor="#9aa5b1"
              keyboardType="phone-pad"
              autoFocus
              value={whatsapp}
              onChangeText={setWhatsapp}
              editable={!loading}
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <PrimaryButton label="Enviar código" onPress={enviar} loading={loading} disabled={whatsapp.trim().length < 8} />
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>Código de 6 dígitos</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="000000"
              placeholderTextColor="#9aa5b1"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              value={codigo}
              onChangeText={setCodigo}
              editable={!loading}
            />
            {devCode && (
              <Text style={styles.devHint}>
                Modo dev — seu código é <Text style={styles.devCode}>{devCode}</Text>
              </Text>
            )}
            {error && <Text style={styles.error}>{error}</Text>}
            <PrimaryButton label="Entrar" onPress={verificar} loading={loading} disabled={codigo.trim().length !== 6} />
            <Pressable onPress={() => { setStep("phone"); setCodigo(""); setError(null); }} disabled={loading}>
              <Text style={styles.link}>Trocar número</Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        (disabled || loading) && styles.buttonDisabled,
        pressed && styles.buttonPressed,
      ]}
    >
      {loading ? <ActivityIndicator color="#0a1420" /> : <Text style={styles.buttonText}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f6f8f7" },
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 28, gap: 40 },
  brand: { alignItems: "center", gap: 8 },
  logo: { fontSize: 30, fontWeight: "800", color: "#07845a", letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: "#52606d", textAlign: "center" },
  form: { gap: 12 },
  label: { fontSize: 13, fontWeight: "600", color: "#3e4c59" },
  input: {
    borderWidth: 1,
    borderColor: "#d7dde3",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    color: "#0a1420",
    backgroundColor: "#fff",
  },
  codeInput: { textAlign: "center", fontSize: 28, letterSpacing: 8, fontWeight: "700" },
  button: {
    backgroundColor: "#3fce3c",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.45 },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: "#0a1420", fontSize: 16, fontWeight: "700" },
  error: { color: "#c0392b", fontSize: 14 },
  link: { color: "#07845a", fontSize: 14, textAlign: "center", marginTop: 8, fontWeight: "600" },
  devHint: { color: "#52606d", fontSize: 13, textAlign: "center" },
  devCode: { fontWeight: "800", color: "#07845a", fontSize: 15 },
});
