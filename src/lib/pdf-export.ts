/**
 * PDF Export — Borrador de Certificado de Evaluación de Riesgo de Deriva
 *
 * Genera un PDF imprimible via ventana del navegador (sin dependencias externas).
 * El CF-01 oficial debe ser emitido por inspector ICA habilitado — esto es un borrador.
 */

export interface CertificateData {
  finca: {
    nombre: string;
    cultivo?: string;
    latitud: number;
    longitud: number;
    organica?: boolean;
  };
  operador: {
    nombre: string;
    email: string;
  };
  condiciones: {
    windKmh: number;
    humidity: number;
    slopeDeg: number;
    fuente: "NASA POWER" | "Manual";
    fecha: string;
  };
  evaluacion: {
    nivel: string;
    radioKm: string;
    incertidumbreM: number;
    apiarios: number;
    ventana: string;
    horario: string;
  };
}

export function exportCertificatePdf(data: CertificateData): void {
  const {
    finca,
    operador,
    condiciones,
    evaluacion,
  } = data;

  const now = new Date().toLocaleString("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Certificado AgroSync — ${finca.nombre}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: white; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2d7a3e; padding-bottom: 16px; margin-bottom: 24px; }
    .brand { font-size: 22px; font-weight: 700; color: #2d7a3e; letter-spacing: -0.5px; }
    .brand-sub { font-size: 10px; color: #666; margin-top: 2px; }
    .doc-id { text-align: right; font-size: 10px; color: #666; }
    .doc-id strong { display: block; font-size: 13px; color: #1a1a1a; }
    .draft-banner { background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 8px 12px; margin-bottom: 20px; font-size: 11px; color: #856404; }
    h2 { font-size: 14px; font-weight: 600; color: #2d7a3e; border-bottom: 1px solid #e0e0e0; padding-bottom: 6px; margin-bottom: 12px; margin-top: 20px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 16px; }
    .field label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.4px; display: block; margin-bottom: 2px; }
    .field span { font-size: 12px; font-weight: 500; }
    .risk-box { border-radius: 6px; padding: 12px 16px; margin: 16px 0; display: flex; align-items: center; gap: 12px; }
    .risk-box.bajo { background: #d1fae5; border: 1px solid #6ee7b7; }
    .risk-box.medio { background: #fef3c7; border: 1px solid #fcd34d; }
    .risk-box.alto { background: #fef3c7; border: 1px solid #f59e0b; }
    .risk-box.critico { background: #fee2e2; border: 1px solid #fca5a5; }
    .risk-label { font-size: 10px; color: #666; }
    .risk-value { font-size: 20px; font-weight: 700; text-transform: capitalize; }
    .legal { font-size: 10px; color: #555; line-height: 1.6; background: #f8f8f8; border-radius: 4px; padding: 10px 12px; margin-top: 16px; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: flex-end; font-size: 10px; color: #888; }
    .signature-box { border-top: 1px solid #999; width: 200px; padding-top: 4px; margin-top: 40px; }
    @media print {
      body { padding: 20px; }
      @page { size: A4; margin: 20mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">AgroSync</div>
      <div class="brand-sub">Sistema Operativo de Cumplimiento Agroambiental</div>
    </div>
    <div class="doc-id">
      <strong>BORRADOR — RA-03</strong>
      Registro de Aplicación<br/>
      ${now}
    </div>
  </div>

  <div class="draft-banner">
    ⚠ <strong>Documento borrador.</strong> Este reporte es generado automáticamente por AgroSync.
    El Certificado Fitosanitario oficial (CF-01) debe ser emitido por un inspector ICA habilitado
    y registrado en el sistema SISPAP/Afrodita (afrodita.ica.gov.co).
  </div>

  <h2>1. Identificación del Predio</h2>
  <div class="grid">
    <div class="field"><label>Nombre del predio</label><span>${finca.nombre}</span></div>
    <div class="field"><label>Cultivo</label><span>${finca.cultivo ?? "—"}</span></div>
    <div class="field"><label>Coordenadas</label><span>${finca.latitud.toFixed(4)}, ${finca.longitud.toFixed(4)}</span></div>
    <div class="field"><label>Certificación orgánica</label><span>${finca.organica ? "Sí" : "No"}</span></div>
  </div>

  <h2>2. Operador Responsable</h2>
  <div class="grid">
    <div class="field"><label>Nombre</label><span>${operador.nombre}</span></div>
    <div class="field"><label>Correo</label><span>${operador.email}</span></div>
  </div>

  <h2>3. Condiciones Meteorológicas</h2>
  <div class="grid">
    <div class="field"><label>Velocidad del viento</label><span>${condiciones.windKmh} km/h</span></div>
    <div class="field"><label>Humedad relativa</label><span>${condiciones.humidity}%</span></div>
    <div class="field"><label>Pendiente del terreno</label><span>${condiciones.slopeDeg}°</span></div>
    <div class="field"><label>Fuente de datos</label><span>${condiciones.fuente} · ${condiciones.fecha}</span></div>
  </div>

  <h2>4. Evaluación de Riesgo de Deriva</h2>
  <div class="risk-box ${evaluacion.nivel}">
    <div>
      <div class="risk-label">Nivel de riesgo</div>
      <div class="risk-value">Riesgo ${evaluacion.nivel}</div>
    </div>
  </div>
  <div class="grid">
    <div class="field"><label>Radio de dispersión</label><span>${evaluacion.radioKm} km</span></div>
    <div class="field"><label>Margen de incertidumbre</label><span>±${evaluacion.incertidumbreM} m</span></div>
    <div class="field"><label>Apiarios en zona de riesgo</label><span>${evaluacion.apiarios}</span></div>
    <div class="field"><label>Ventana óptima</label><span>${evaluacion.ventana}</span></div>
    ${evaluacion.horario !== "—" ? `<div class="field"><label>Horario recomendado</label><span>${evaluacion.horario}</span></div>` : ""}
  </div>

  <h2>5. Modelo y Fundamento Legal</h2>
  <div class="legal">
    <strong>Modelo de dispersión:</strong> Pluma gaussiana (Pasquill-Gifford clase C, estabilidad neutra)
    adaptado para topografía andina colombiana. Efecto venturi calculado según metodología IDEAM
    para valles interandinos. Coeficiente de variación ±14%–30% según pendiente.<br/><br/>
    <strong>Restricciones de aplicación:</strong> ICA Resolución 740 de 2023, Art. 12 —
    Prohíbe aplicación de plaguicidas organofosforados y neonicotinoides con viento &gt;15 km/h
    en terreno plano o &gt;10 km/h en pendientes &gt;20°. Distancia mínima a apiarios registrados:
    500 m (formulaciones líquidas), 300 m (granulados).<br/><br/>
    <strong>Responsabilidad civil:</strong> ICA Resolución 740 de 2023, Art. 23 —
    El agricultor emisor es responsable solidariamente de daños por deriva química a predios
    vecinos, apiarios registrados o cultivos con certificación orgánica.<br/><br/>
    <strong>Registro obligatorio:</strong> ICA Resolución 740 de 2023, Art. 18 —
    Toda aplicación en predios con certificación de exportación debe registrarse en SISPAP
    dentro de las 24 horas siguientes.
  </div>

  <div class="footer">
    <div>
      <div class="signature-box">Firma inspector ICA habilitado</div>
    </div>
    <div style="text-align:right;">
      AgroSync — Sistema de Cumplimiento Agroambiental<br/>
      Generado: ${now}<br/>
      Ref: ICA Res. 740/2023 · Res. 1806/2004 · LMR Codex/UE
    </div>
  </div>

  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=850,height=1100");
  if (!win) {
    alert("Activa las ventanas emergentes para exportar el PDF.");
    return;
  }
  win.document.write(html);
  win.document.close();
}
