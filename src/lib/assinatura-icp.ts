// Assinatura digital ICP-Brasil — SIMULADA. Não integra com nenhuma
// Autoridade Certificadora real (ITI, Serasa, Certisign etc.) nem com
// Clicksign/D4Sign. Gera metadados no formato de um certificado A3 só para
// a demonstração ter algo plausível para mostrar; não tem validade jurídica.
export function assinarMock(titular: string) {
  const serial = Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, "0")
  )
    .join(":")
    .toUpperCase();

  return {
    assinaturaIcpEm: new Date(),
    assinaturaIcpTitular: titular,
    assinaturaIcpSerial: serial,
  };
}
