"use client";

import AppShell, { type ShellNavGroup } from "../AppShell";
import { Icon } from "../Icons";

const NAV: ShellNavGroup[] = [
  {
    group: "Operação",
    items: [
      { ic: "chart", label: "Dashboard", active: true },
      { ic: "moto", label: "Entregadores" },
      { ic: "shield", label: "Aprovações" },
      { ic: "pkg", label: "Entregas", badge: "em breve", disabled: true },
    ],
  },
  {
    group: "Financeiro",
    items: [{ ic: "money", label: "Financeiro", badge: "em breve", disabled: true }],
  },
];

export default function AdminPanel() {
  return (
    <AppShell title="Operação" nav={NAV} demo="admin" noMap>
      <div className="panel">
        <div className="kpis">
          <div className="kpi">
            <div className="ic">
              <Icon name="pkg" />
            </div>
            <div className="v">37</div>
            <div className="l">Entregas hoje</div>
          </div>
          <div className="kpi">
            <div className="ic">
              <Icon name="money" />
            </div>
            <div className="v">528</div>
            <div className="l">Faturado R$</div>
          </div>
          <div className="kpi">
            <div className="ic">
              <Icon name="moto" />
            </div>
            <div className="v">9</div>
            <div className="l">Online</div>
          </div>
        </div>

        <div className="card">
          <div className="card-h">
            <Icon name="moto" />
            <h3>Entregadores</h3>
            <span className="right">verificação</span>
          </div>
          <table>
            <tbody>
              <tr>
                <th>Nome</th>
                <th>Veículo</th>
                <th>Status</th>
              </tr>
              <tr>
                <td className="td-name">Lucas Mendes</td>
                <td>Moto</td>
                <td>
                  <span className="status-pill s-live">
                    <Icon name="moto" /> Em rota
                  </span>
                </td>
              </tr>
              <tr>
                <td className="td-name">Rafael Sousa</td>
                <td>Moto</td>
                <td>
                  <span className="status-pill s-ok">
                    <Icon name="checkThin" /> Verificado
                  </span>
                </td>
              </tr>
              <tr>
                <td className="td-name">Bruno Lima</td>
                <td>Carro</td>
                <td>
                  <span className="status-pill s-ok">
                    <Icon name="checkThin" /> Verificado
                  </span>
                </td>
              </tr>
              <tr>
                <td className="td-name">Diego Alves</td>
                <td>Moto</td>
                <td>
                  <span className="status-pill s-pend">
                    <Icon name="spinner" /> Antecedentes
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-h">
            <Icon name="shield" />
            <h3>Fila de aprovação</h3>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "9px 0",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <div>
              <div className="td-name" style={{ fontSize: 13.5 }}>
                Diego Alves
              </div>
              <div style={{ color: "var(--muted)", fontSize: 11.5, marginTop: 2 }}>
                CNH OK · CRLV OK · antecedentes em análise
              </div>
            </div>
            <span className="status-pill s-pend">
              <Icon name="clock" /> Pendente
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0 2px" }}>
            <div>
              <div className="td-name" style={{ fontSize: 13.5 }}>
                Marina Reis
              </div>
              <div style={{ color: "var(--go-dark)", fontSize: 11.5, marginTop: 2 }}>
                Antecedentes OK · CNH OK · pronta
              </div>
            </div>
            <button className="btn btn-go" style={{ width: "auto", padding: "8px 15px", fontSize: 12.5 }}>
              <Icon name="checkThin" /> Aprovar
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-h">
            <Icon name="bolt" />
            <h3>Diferencial</h3>
          </div>
          <div className="trust-banner">
            <Icon name="shield" />
            <div>
              Nenhum concorrente local (TôNoLucro, apps de comida, transportadoras) checa antecedentes.{" "}
              <b>É o que torna a APPDELYVERY confiável para encomenda de empresa.</b>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
