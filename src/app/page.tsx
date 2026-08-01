import Link from "next/link";
import { SPulse } from "@/components/SPulse";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Portal() {
  return (
    <div className="portal">
      <div className="portal-topbar">
        <ThemeToggle />
      </div>
      <div className="portal-hero">
        <div className="portal-mark"><SPulse /></div>
        <h1>Smart Doctor</h1>
        <p className="slogan">Inteligência que cuida.</p>
        <p className="note">Demo navegável · escolha um perfil para explorar</p>
      </div>

      <div className="portal-grid">
        <Link href="/paciente" className="profile-card">
          <span className="profile-emoji">🧑‍💻</span>
          <h2>Paciente</h2>
          <p>Converse com a Clara pelo app, marque consultas, veja sua agenda, saúde e receitas.</p>
          <span className="go">Entrar como paciente →</span>
        </Link>

        <Link href="/medico" className="profile-card">
          <span className="profile-emoji">🩺</span>
          <h2>Médico</h2>
          <p>Dashboard, agenda do dia com resumo da Clara, pacientes e financeiro com repasses.</p>
          <span className="go">Entrar como médico →</span>
        </Link>

        <Link href="/admin" className="profile-card">
          <span className="profile-emoji">🛡️</span>
          <h2>Administrador</h2>
          <p>Visão geral, funil da Clara, GMV, fila de aprovação de médicos e financeiro.</p>
          <span className="go">Entrar como admin →</span>
        </Link>
      </div>
    </div>
  );
}
