// URL base da API (o backend Next.js do Smart Doctor).
//
// Em dev, o celular NÃO enxerga "localhost" — precisa do IP da máquina na rede.
// Defina EXPO_PUBLIC_API_URL em mobile/.env (já criado apontando pro IP atual).
// Ao rodar em outro Wi-Fi, troque o IP lá. Em produção, aponte pro domínio real.
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:3080";
