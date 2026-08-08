import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";

import { SessionProvider, useSession } from "@/lib/auth";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SessionProvider>
      <RootNavigator />
      <StatusBar style="dark" />
    </SessionProvider>
  );
}

function RootNavigator() {
  const { token, isLoading } = useSession();

  // Esconde o splash só depois que o token terminou de carregar do storage.
  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  if (isLoading) return null; // splash ainda visível

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Área autenticada: só existe quando há token. */}
      <Stack.Protected guard={!!token}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      {/* Login: só existe quando NÃO há token. */}
      <Stack.Protected guard={!token}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}
