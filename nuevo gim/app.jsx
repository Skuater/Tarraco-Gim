import { useState, useEffect, useRef } from "react";

const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {} };
const load = (key, def) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch(e) { return def; } };

// Parse "4×10" → { sets: 4, reps: 10, isTime: false }
// Parse "3×40s" → { sets: 3, reps: 40, isTime: true }
// Parse "25 min" → { sets: 1, reps: 25, isTime: true }
const parseSets = (s) => {
  const m = s.match(/^(\d+)×(\d+)(s?)$/);
  if (m) return { sets: parseInt(m[1]), reps: parseInt(m[2]), isTime: m[3]==="s" };
  const t = s.match(/^(\d+)\s*min/);
  if (t) return { sets: 1, reps: parseInt(t[1]), isTime: true };
  return { sets: 3, reps: 10, isTime: false };
};

// Auto recommendation logic
const getRecommendation = (seriesArr, targetReps, isTime) => {
  if (!seriesArr || seriesArr.length === 0) return null;
  const filled = seriesArr.filter(s => s.kg && s.reps);
  if (filled.length === 0) return null;
  if (isTime) return null;
  const avgReps = filled.reduce((a,b) => a + parseInt(b.reps||0), 0) / filled.length;
  const allSameKg = filled.every(s => s.kg === filled[0].kg);
  const kg = filled[0].kg;
  if (avgReps >= targetReps + 2) return { text: `⬆️ Sube peso — haces ${Math.round(avgReps)} reps de media (objetivo ${targetReps})`, color:"#4ade80" };
  if (avgReps >= targetReps - 1) return { text: `✅ Mantén ${kg}kg — estás en el objetivo (${Math.round(avgReps)} reps)`, color:"#fbbf24" };
  if (avgReps < targetReps - 2) return { text: `⬇️ Baja peso — solo ${Math.round(avgReps)} reps de media (objetivo ${targetReps})`, color:"#f97316" };
  return { text: `🎯 Cerca del objetivo — sigue con ${kg}kg`, color:"#60a5fa" };
};

const weeks = [
  { num:1, label:"S1", focus:"Adaptación", rir:"RIR 3", color:"#4ade80",
    days:[
      { day:"Lunes", tag:"PUSH 💪", warmup:"5 min bici + rotaciones hombro + band pull-aparts 2×15", cooldown:"Pectoral en marco 2×30s + soleo escalón 3×40s + foam roller lumbares",
        exercises:[
          {n:"Press banca inclinado (barra)",s:"4×10",note:"Codos a 45° — protege hombro"},
          {n:"Press mancuernas plano",s:"3×12",note:"Agarre neutro"},
          {n:"Aperturas en polea baja",s:"3×15",note:""},
          {n:"Press Arnold",s:"3×12",note:"Alt. segura al press militar"},
          {n:"Elevaciones laterales cable",s:"3×15",note:""},
          {n:"Tríceps polea (cuerda)",s:"3×15",note:""},
          {n:"Kickbacks mancuerna",s:"2×15",note:""},
        ]},
      { day:"Martes", tag:"PULL 🔙", warmup:"5 min cinta + rotaciones cadera + activación glúteo banda", cooldown:"Dorsal en barra 2×20s + soleo 3×40s + movilidad cadera 2×30s",
        exercises:[
          {n:"Jalón agarre neutro",s:"4×10",note:"Menos carga en hombro operado"},
          {n:"Remo máquina Hammer",s:"4×10",note:"Escápulas juntas"},
          {n:"Remo mancuerna 1 brazo",s:"3×12",note:""},
          {n:"Face pulls con cuerda",s:"3×20",note:"⭐ SIEMPRE — salud hombro"},
          {n:"Curl barra EZ",s:"3×12",note:""},
          {n:"Curl martillo",s:"3×12",note:""},
        ]},
      { day:"Jueves", tag:"LEGS 🦵", warmup:"5 min bici + goblet 2×15 + activación glúteo banda", cooldown:"SOLEO: 3×45s + psoas zancada 2×30s + foam roller lumbares",
        exercises:[
          {n:"Sentadilla Smith",s:"4×10",note:"Pies ligeramente adelantados"},
          {n:"Prensa 45°",s:"4×12",note:"Rodillas alineadas"},
          {n:"Extensión cuádriceps",s:"3×15",note:"Rango 0-60°"},
          {n:"Curl femoral tumbado",s:"4×12",note:""},
          {n:"Hip thrust con barra",s:"4×12",note:"Glúteo apretado arriba"},
          {n:"Gemelo sentado",s:"4×15",note:"Rango completo"},
        ]},
      { day:"Viernes", tag:"FULL + CARDIO 🔥", warmup:"5 min remo o elíptica + movilidad general", cooldown:"SOLEO completo + isquiotibiales 2×30s + respiración 2 min",
        exercises:[
          {n:"Peso muerto rumano (RDL)",s:"4×10",note:"Bisagra de cadera pura"},
          {n:"Press mancuernas neutro",s:"3×12",note:""},
          {n:"Jalón agarre neutro",s:"3×12",note:""},
          {n:"Zancadas caminando",s:"3×12",note:"Sin peso S1"},
          {n:"Plancha abdominal",s:"3×40s",note:"Lumbares neutras"},
          {n:"CARDIO LISS — Cinta inclinada",s:"25 min",note:"5-6 km/h, inclinación 8-12%"},
        ]},
    ]},
  { num:2, label:"S2", focus:"Sobrecarga", rir:"RIR 2", color:"#60a5fa",
    days:[
      { day:"Lunes", tag:"PUSH 💪", warmup:"Igual S1", cooldown:"S1 + 1 serie extra soleo",
        exercises:[
          {n:"Press banca inclinado",s:"4×10",note:"+2,5 kg vs S1"},
          {n:"Press mancuernas plano",s:"3×12",note:"+1 kg/mancuerna"},
          {n:"Aperturas polea baja",s:"3×15",note:"+1 paso polea"},
          {n:"Press Arnold",s:"3×12",note:"+1 kg"},
          {n:"Elevaciones laterales",s:"3×15",note:""},
          {n:"Tríceps polea",s:"4×15",note:"+1 serie"},
          {n:"Kickbacks",s:"3×12",note:"+0,5 kg"},
        ]},
      { day:"Martes", tag:"PULL 🔙", warmup:"Igual S1", cooldown:"Igual S1",
        exercises:[
          {n:"Jalón agarre neutro",s:"4×10",note:"+2,5 kg"},
          {n:"Remo máquina",s:"4×10",note:"+2,5 kg"},
          {n:"Remo mancuerna",s:"3×12",note:"+1 kg"},
          {n:"Face pulls",s:"4×20",note:"+1 serie"},
          {n:"Curl barra EZ",s:"3×12",note:"+2,5 kg"},
          {n:"Curl martillo",s:"3×12",note:"+1 kg"},
        ]},
      { day:"Jueves", tag:"LEGS 🦵", warmup:"Igual S1", cooldown:"SOLEO + variante de pie en pared 3×40s",
        exercises:[
          {n:"Sentadilla Smith",s:"4×10",note:"+5 kg"},
          {n:"Prensa 45°",s:"4×12",note:"+5 kg"},
          {n:"Extensión cuádriceps",s:"4×15",note:"+1 serie"},
          {n:"Curl femoral",s:"4×12",note:"+2,5 kg"},
          {n:"Hip thrust",s:"4×12",note:"+5 kg"},
          {n:"Gemelo sentado",s:"4×15",note:"+2,5 kg"},
        ]},
      { day:"Viernes", tag:"FULL + CARDIO 🔥", warmup:"Igual S1", cooldown:"Igual S1",
        exercises:[
          {n:"Peso muerto rumano",s:"4×10",note:"+5 kg"},
          {n:"Press mancuernas neutro",s:"3×12",note:"+1 kg"},
          {n:"Jalón agarre neutro",s:"3×12",note:"+2,5 kg"},
          {n:"Zancadas + mancuernas",s:"3×12",note:"5 kg/mano"},
          {n:"Plancha abdominal",s:"3×50s",note:"+10s"},
          {n:"CARDIO LISS",s:"30 min",note:"+5 min vs S1"},
        ]},
    ]},
  { num:3, label:"S3", focus:"Intensif.", rir:"RIR 1-2", color:"#f97316",
    days:[
      { day:"Lunes", tag:"PUSH 💪", warmup:"S1 + 2 series band pull-aparts extra", cooldown:"S1 + 5 min respiración nasal",
        exercises:[
          {n:"Press banca inclinado",s:"4×8",note:"+2,5 kg, -2 reps"},
          {n:"Press mancuernas plano",s:"4×10",note:"+1 serie"},
          {n:"Aperturas polea",s:"3×15",note:"Más cerca del fallo"},
          {n:"Press Arnold",s:"4×10",note:"+1 serie"},
          {n:"Elevaciones laterales",s:"4×15",note:"+1 serie"},
          {n:"Tríceps polea",s:"4×12",note:"Pausa en extensión"},
          {n:"Kickbacks",s:"3×15",note:""},
        ]},
      { day:"Martes", tag:"PULL 🔙", warmup:"Igual S1", cooldown:"Igual S1",
        exercises:[
          {n:"Jalón agarre neutro",s:"4×8",note:"+2,5 kg, -2 reps"},
          {n:"Remo máquina",s:"4×10",note:"+2,5 kg"},
          {n:"Remo mancuerna",s:"4×10",note:"+1 serie"},
          {n:"Face pulls",s:"4×20",note:"Inamovible"},
          {n:"Curl barra EZ",s:"4×10",note:"+1 serie"},
          {n:"Curl martillo",s:"3×15",note:""},
        ]},
      { day:"Jueves", tag:"LEGS 🦵", warmup:"S1 + movilidad tobillo 2×10", cooldown:"SOLEO INTENSIVO: 4×45s + foam roller plantar 2 min",
        exercises:[
          {n:"Sentadilla Smith",s:"4×8",note:"+5 kg, -2 reps"},
          {n:"Prensa 45°",s:"5×12",note:"+1 serie"},
          {n:"Extensión cuádriceps",s:"4×15",note:"Cerca del fallo"},
          {n:"Curl femoral",s:"4×10",note:"+2,5 kg"},
          {n:"Hip thrust",s:"5×10",note:"+5 kg +1 serie"},
          {n:"Gemelo sentado",s:"5×15",note:"+1 serie"},
        ]},
      { day:"Viernes", tag:"FULL + CARDIO 🔥", warmup:"Igual S1", cooldown:"SOLEO + estiramiento completo 10 min",
        exercises:[
          {n:"Peso muerto rumano",s:"4×8",note:"+5 kg"},
          {n:"Press mancuernas neutro",s:"4×10",note:"+1 serie"},
          {n:"Jalón agarre neutro",s:"3×12",note:"+2,5 kg"},
          {n:"Zancadas mancuernas",s:"3×12",note:"+2,5 kg/mano"},
          {n:"Plancha + elevación pierna",s:"3×12",note:"Progresión"},
          {n:"CARDIO LISS",s:"35 min",note:"+5 min vs S2"},
        ]},
    ]},
  { num:4, label:"S4", focus:"Deload", rir:"RIR 4-5", color:"#a78bfa",
    days:[
      { day:"Lunes", tag:"PUSH DELOAD 🔄", warmup:"Normal", cooldown:"20 min movilidad completa",
        exercises:[
          {n:"Press banca inclinado",s:"3×8",note:"50% peso S3"},
          {n:"Press mancuernas",s:"2×10",note:""},
          {n:"Aperturas polea",s:"2×15",note:""},
          {n:"Press Arnold",s:"2×10",note:""},
          {n:"Elevaciones laterales",s:"2×15",note:""},
          {n:"Tríceps polea",s:"2×15",note:""},
        ]},
      { day:"Martes", tag:"PULL DELOAD 🔄", warmup:"Normal", cooldown:"15 min movilidad + soleo",
        exercises:[
          {n:"Jalón agarre neutro",s:"3×8",note:"50% peso S3"},
          {n:"Remo máquina",s:"2×10",note:""},
          {n:"Face pulls",s:"3×20",note:"No se reduce nunca"},
          {n:"Curl barra EZ",s:"2×10",note:""},
        ]},
      { day:"Jueves", tag:"LEGS DELOAD 🔄", warmup:"Normal", cooldown:"SOLEO completo + 10 min stretching",
        exercises:[
          {n:"Sentadilla Smith",s:"3×8",note:"50% peso S3"},
          {n:"Prensa 45°",s:"2×12",note:""},
          {n:"Hip thrust",s:"3×10",note:""},
          {n:"Gemelo sentado",s:"3×15",note:""},
        ]},
      { day:"Viernes", tag:"CARDIO + MOV. 🧘", warmup:"No aplica", cooldown:"Respiración diafragmática 5 min",
        exercises:[
          {n:"Caminata inclinada LISS",s:"40 min",note:"Baja intensidad"},
          {n:"Movilidad completa",s:"20 min",note:"Soleo + lumbares + cadera + hombro"},
        ]},
    ]},
];

const mobilityGroups = [
  { id:"soleo", label:"Soleo", icon:"🦶", color:"#f97316", tag:"DIARIO OBLIGATORIO", exercises:[
    {n:"Soleo escalón (rodilla flex.)",d:"3×45s/pierna",k:"Rodilla SIEMPRE doblada 45°. Talón cae por debajo del escalón. Si la estiras, trabajas gastrocnemio, no soleo."},
    {n:"Soleo en pared (de pie)",d:"2×40s/pierna",k:"Punta del pie en pared, rodilla doblada. Empuja cadera hacia la pared. Variante más profunda."},
    {n:"Soleo sentado con toalla",d:"2×40s/pierna",k:"Rodilla ligeramente flexionada. Tira de la toalla. Ideal por la mañana antes de levantarte."},
    {n:"Movilidad tobillo en pared",d:"2×10 reps/pierna",k:"Mide tu progreso: ¿a qué distancia sin levantar el talón? Debe aumentar cada semana."},
    {n:"Círculos de tobillo activos",d:"2×10 cada dirección",k:"Siempre antes de sentadillas. Maximiza el rango en cada dirección."},
    {n:"⭐ Excéntrico soleo escalón",d:"3×15/pierna",k:"Sube con 2 piernas, baja con 1 en 4 segundos. ALARGA el soleo estructuralmente. El más importante."},
  ]},
  { id:"lumbares", label:"Lumbares", icon:"🔙", color:"#60a5fa", tag:"3-4x SEMANA", exercises:[
    {n:"Foam roller lumbares (lateral)",d:"2-3 min",k:"NUNCA en las vértebras. Solo músculos laterales. Para en puntos de tensión 20-30s."},
    {n:"Rodillas al pecho",d:"2×45s cada + ambas",k:"Descomprime los discos. Hazlo al levantarte con rigidez. Mece suave de lado a lado."},
    {n:"Rotación lumbar (windshield wiper)",d:"2×10/lado",k:"3-4 segundos por lado. Hombro contrario en el suelo siempre."},
    {n:"Cat-cow (gato-vaca)",d:"2×15 lentas",k:"Inhala en vaca (lumbar abajo), exhala en gato (arriba). Coordinado con respiración."},
    {n:"Child's pose + lateral",d:"2×45s + 30s/lado",k:"Con cada exhale intenta hundirte más. Variante lateral estira el cuadrado lumbar."},
    {n:"Activación transverso (hollowing)",d:"3×10, 5s",k:"Ombligo hacia columna SIN contener la respiración. Corsé natural de la columna."},
  ]},
  { id:"cadera", label:"Cadera", icon:"🔄", color:"#4ade80", tag:"3-4x SEMANA", exercises:[
    {n:"⭐ Hip 90/90 estático",d:"3×60s/lado",k:"Ambas rodillas a 90°. El lado que más cuesta = más necesitado. Prioriza pierna izquierda trasera."},
    {n:"Hip 90/90 rotación activa",d:"2×10/lado",k:"Levanta rodilla trasera del suelo solo con la cadera. Debilidad en rotación interna es normal."},
    {n:"⭐ Pigeon pose (paloma)",d:"3×60s — izq. primero",k:"Rey del estiramiento de piriforme. Normal que el lado izquierdo duela más."},
    {n:"Lizard pose (lagartija baja)",d:"2×45s/lado",k:"Psoas, aductores y rotadores a la vez. Codo al suelo si puedes."},
    {n:"Psoas en zancada (couch stretch)",d:"2×45s/lado",k:"El psoas acortado fuerza la lordosis lumbar. Pelvis neutra."},
    {n:"Frog stretch (rana)",d:"2×60s",k:"Apertura en abducción. Complementa el 90/90 perfectamente."},
    {n:"Círculos cadera cuadrupedia",d:"2×10 cada dir.",k:"Movilidad articular activa. Estabiliza el torso."},
  ]},
  { id:"gluteo", label:"Glúteo", icon:"🦵", color:"#a78bfa", tag:"ANTES DE PIERNAS", exercises:[
    {n:"⭐ Foam roller glúteo fig. 4",d:"3 min izq / 2 min der",k:"SIEMPRE primero. El punto más doloroso = quedarse 20-30s. Libera antes de estirar."},
    {n:"⭐ Piriforme figura 4 tumbado",d:"3×45s izq / 2×45s der",k:"Siempre DESPUÉS del foam roller. El tejido liberado acepta mejor el estiramiento."},
    {n:"Clamshell con banda",d:"3×20/lado",k:"Si lo sientes en la lumbar estás compensando. Debe arder en lateral de cadera."},
    {n:"Puente glúteo isométrico",d:"3×15, 2s arriba",k:"Aprieta glúteos AL MÁXIMO 2s arriba. 3s bajando. Lento = glúteo. Rápido = lumbares."},
    {n:"Donkey kick con banda",d:"3×15/lado",k:"Activación, no fuerza. SIENTE el glúteo en cada rep."},
  ]},
  { id:"completa", label:"Completa", icon:"✨", color:"#fbbf24", tag:"POST ENTRENO", exercises:[
    {n:"BLOQUE 1 — Foam roller",d:"5 min",k:"Orden: glúteo izq 2min → glúteo der 1min → lumbares laterales 1min → soleo 1min/pierna (rodilla doblada)."},
    {n:"BLOQUE 2 — Cadena posterior",d:"6 min",k:"Orden: piriforme fig.4 (45s izq, 30s der) → rodillas al pecho 45s → cat-cow 10 reps → child's pose 45s."},
    {n:"BLOQUE 3 — Cadera",d:"7 min",k:"Orden: hip 90/90 60s/lado → lizard 40s/lado → psoas zancada 40s/lado → windshield wiper 10/lado."},
    {n:"BLOQUE 4 — Soleo y tobillo",d:"5 min",k:"Orden: soleo escalón 45s/pierna ×2 → movilidad tobillo en pared 10/pierna → círculos tobillo."},
    {n:"CIERRE — Respiración diafragmática",d:"3-5 min",k:"Inhala 4s (abdomen sube) → mantén 2s → exhala 6-8s. Activa el sistema parasimpático. No es opcional."},
  ]},
];

const week0Days = [
  { day:"Lun", full:"Lunes", tag:"Liberación Miofascial 🌊", color:"#f97316", items:[
    "Foam roller lumbares laterales — 2 min","Foam roller glúteo izq (fig. 4) — 3 min 🔴","Foam roller glúteo derecho — 2 min","Foam roller soleo/pantorrilla — 2 min/pierna","Piriforme figura 4 — 3×45s izq, 2×45s der","Soleo en escalón — 3×45s/pierna","Psoas en zancada — 2×40s/lado","Isquiotibiales con toalla — 2×40s/pierna","Respiración diafragmática 4-6-8 — 10 reps",
  ]},
  { day:"Mar", full:"Martes", tag:"Activación Glútea + Cadera ⚡", color:"#4ade80", items:[
    "Clamshell con banda — 3×20/lado (empieza izq)","Puente glúteo sin peso — 3×15","Puente unilateral — 3×12/lado","Bird-dog — 3×10/lado (lumbares neutras)","Dead bug — 3×8/lado","Hip 90/90 estático — 3×45s/lado","Hip 90/90 rotación interna — 2×10/lado","Lizard pose — 2×45s/lado","Círculos cadera cuadrupedia — 2×10/dirección","Movilidad tobillo en pared — 2×10/pierna",
  ]},
  { day:"Mié", full:"Miércoles", tag:"Descanso Activo 🧘", color:"#a78bfa", items:[
    "Foam roller glúteo izquierdo — 3 min","Piriforme figura 4 — 2×45s lado izquierdo","Soleo en escalón — 2×45s/pierna","Hip 90/90 estático — 2×45s/lado","Respiración diafragmática — 5 min",
  ]},
  { day:"Jue", full:"Jueves", tag:"Fuerza Suave + Movilidad 💪", color:"#60a5fa", items:[
    "Sentadilla goblet ligera (10-12 kg) — 3×12","RDL mancuernas ligero (10 kg) — 3×12","Step-up escalón bajo sin peso — 3×12/pierna","Plancha abdominal — 3×30s","Superman — 3×12","Hip 90/90 + inclinación lateral — 3×45s/lado","Pigeon pose — 2×60s/lado","Soleo en pared — 3×45s/pierna","Windshield wiper tumbado — 2×10/lado",
  ]},
  { day:"Vie", full:"Viernes", tag:"Test de Movimiento 🎯", color:"#fbbf24", items:[
    "✅ TEST: Sentadilla peso corporal — 10 reps lentas","✅ TEST: Hip thrust corporal — 15 reps (¿glúteo izq igual?)","Foam roller completo — 10 min","Hip 90/90 — 3×60s/lado","Pigeon pose — 3×60s/lado","Soleo en escalón — 3×45s/pierna","Psoas en zancada — 2×45s/lado","Respiración diafragmática — 8 min",
  ]},
];

// ── MINI SVG WEIGHT CHART ──────────────────────────────
function WeightChart({ data }) {
  if (!data || data.length < 2) return (
    <div style={{ textAlign:"center", padding:"20px 0", color:"#333", fontSize:12 }}>
      Añade al menos 2 registros para ver la gráfica
    </div>
  );
  const W = 320, H = 120, PAD = 28;
  const vals = data.map(d => d.kg);
  const min = Math.min(...vals) - 1;
  const max = Math.max(...vals) + 1;
  const range = max - min || 1;
  const toX = (i) => PAD + (i / (data.length - 1)) * (W - PAD * 2);
  const toY = (v) => PAD + (1 - (v - min) / range) * (H - PAD * 2);
  const pts = data.map((d, i) => `${toX(i)},${toY(d.kg)}`).join(" ");
  const areaBase = `${toX(0)},${H - PAD} ${pts} ${toX(data.length-1)},${H - PAD}`;
  const trend = vals[vals.length-1] - vals[0];
  const trendColor = trend < 0 ? "#4ade80" : trend > 0 ? "#f97316" : "#fbbf24";

  return (
    <div style={{ position:"relative" }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow:"visible" }}>
        {/* Grid lines */}
        {[0, 0.5, 1].map((t, i) => {
          const y = PAD + t * (H - PAD * 2);
          const v = (max - t * range).toFixed(1);
          return (
            <g key={i}>
              <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="#1e1e2e" strokeWidth="1" />
              <text x={PAD - 4} y={y + 4} fill="#444" fontSize="9" textAnchor="end">{v}</text>
            </g>
          );
        })}
        {/* Area fill */}
        <polygon points={areaBase} fill="#4ade8010" />
        {/* Line */}
        <polyline points={pts} fill="none" stroke={trendColor} strokeWidth="2" strokeLinejoin="round" />
        {/* Dots + labels */}
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={toX(i)} cy={toY(d.kg)} r="4" fill={trendColor} />
            <text x={toX(i)} y={toY(d.kg) - 8} fill="#aaa" fontSize="8.5" textAnchor="middle">{d.kg}</text>
          </g>
        ))}
        {/* X labels */}
        {data.map((d, i) => (
          <text key={i} x={toX(i)} y={H - 4} fill="#444" fontSize="8" textAnchor="middle">
            {d.label || d.date?.slice(5)}
          </text>
        ))}
      </svg>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:11 }}>
        <span style={{ color:"#555" }}>Inicio: <strong style={{color:"#aaa"}}>{vals[0]} kg</strong></span>
        <span style={{ color:trendColor, fontWeight:"bold" }}>
          {trend < 0 ? "▼" : trend > 0 ? "▲" : "="} {Math.abs(trend).toFixed(1)} kg total
        </span>
        <span style={{ color:"#555" }}>Ahora: <strong style={{color:"#aaa"}}>{vals[vals.length-1]} kg</strong></span>
      </div>
    </div>
  );
}

// ── SERIES TRACKER COMPONENT ──────────────────────────
function SeriesTracker({ exKey, exName, setsStr, color, seriesData, setSeriesDataFn }) {
  const { sets, reps: targetReps, isTime } = parseSets(setsStr);
  const key = exKey;
  const current = seriesData[key] || Array.from({length: sets}, () => ({ kg:"", reps:"" }));

  const update = (si, field, val) => {
    const updated = current.map((s, i) => i === si ? { ...s, [field]: val } : s);
    setSeriesDataFn(prev => ({ ...prev, [key]: updated }));
  };

  const rec = getRecommendation(current, targetReps, isTime);

  return (
    <div style={{ padding:"6px 14px 12px", borderTop:"1px solid #0f0f1a" }}>
      {/* Series rows */}
      <div style={{ display:"flex", gap:4, marginBottom:6, alignItems:"center" }}>
        <div style={{ width:20, fontSize:9, color:"#444", fontFamily:"monospace" }}>S</div>
        <div style={{ flex:1, fontSize:9, color:"#444", textAlign:"center" }}>{isTime ? "tiempo (s)" : "kg"}</div>
        {!isTime && <div style={{ flex:1, fontSize:9, color:"#444", textAlign:"center" }}>reps</div>}
        <div style={{ width:28 }}></div>
      </div>
      {current.map((s, si) => (
        <div key={si} style={{ display:"flex", gap:4, marginBottom:4, alignItems:"center" }}>
          <div style={{ width:20, height:26, borderRadius:4, background:`${color}22`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:color, fontWeight:"bold", flexShrink:0 }}>{si+1}</div>
          <input
            value={s.kg}
            onChange={e => update(si, "kg", e.target.value)}
            placeholder={isTime ? "s" : "kg"}
            type="number"
            style={{ flex:1, background:"#0a0a14", border:`1px solid ${s.kg?"#2a3a2a":"#1a1a2e"}`, borderRadius:6, padding:"4px 6px", color:"#e0d8cc", fontSize:12, fontFamily:"monospace", outline:"none", textAlign:"center", height:26 }}
          />
          {!isTime && (
            <input
              value={s.reps}
              onChange={e => update(si, "reps", e.target.value)}
              placeholder={`/${targetReps}`}
              type="number"
              style={{ flex:1, background:"#0a0a14", border:`1px solid ${s.reps?(parseInt(s.reps)>=targetReps?"#2a3a2a":"#3a1a1a"):"#1a1a2e"}`, borderRadius:6, padding:"4px 6px", color: s.reps?(parseInt(s.reps)>=targetReps?"#4ade80":"#f97316"):"#888", fontSize:12, fontFamily:"monospace", outline:"none", textAlign:"center", height:26 }}
            />
          )}
          <div style={{ width:28, height:26, borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color: s.kg&&(isTime||s.reps)?(parseInt(isTime?s.kg:s.reps)>=(isTime?targetReps:targetReps)?"#4ade80":"#f97316"):"#333" }}>
            {s.kg && (isTime || s.reps) ? (parseInt(isTime ? s.kg : s.reps) >= targetReps ? "✓" : "·") : "○"}
          </div>
        </div>
      ))}
      {/* Recommendation */}
      {rec && (
        <div style={{ marginTop:6, padding:"6px 10px", background:`${rec.color}15`, border:`1px solid ${rec.color}44`, borderRadius:6, fontSize:11, color:rec.color, lineHeight:1.4 }}>
          {rec.text}
        </div>
      )}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────
export default function App() {
  const [nav, setNav] = useState("week0");
  const [activeWeek, setActiveWeek] = useState(0);
  const [activeDay, setActiveDay] = useState(0);
  const [activeW0Day, setActiveW0Day] = useState(0);
  const [activeMob, setActiveMob] = useState(0);
  const [expandedEx, setExpandedEx] = useState(null);
  const [showWarmup, setShowWarmup] = useState(false);
  const [expandedSeries, setExpandedSeries] = useState(null);

  const [checked, setChecked] = useState(() => load("checked", {}));
  const [seriesData, setSeriesData] = useState(() => load("seriesData", {}));
  const [bodyWeight, setBodyWeight] = useState(() => load("bodyWeight", [
    { date: new Date().toISOString().split("T")[0], label:"Hoy", kg: 100 }
  ]));
  const [newBW, setNewBW] = useState("");
  const [newBWLabel, setNewBWLabel] = useState("");

  useEffect(() => save("checked", checked), [checked]);
  useEffect(() => save("seriesData", seriesData), [seriesData]);
  useEffect(() => save("bodyWeight", bodyWeight), [bodyWeight]);

  const toggleCheck = (k) => setChecked(p => ({ ...p, [k]: !p[k] }));
  const setSeriesDataFn = (updater) => setSeriesData(updater);

  const week = weeks[activeWeek];
  const day = week.days[activeDay];
  const mob = mobilityGroups[activeMob];
  const w0 = week0Days[activeW0Day];

  const navItems = [
    { id:"week0", icon:"🔧", label:"Sem.0" },
    { id:"plan", icon:"📅", label:"Plan" },
    { id:"mobility", icon:"🧘", label:"Mov." },
    { id:"progress", icon:"📊", label:"Progreso" },
    { id:"nutrition", icon:"🥗", label:"Nutri." },
  ];

  const doneCount = (prefix, total) =>
    Object.keys(checked).filter(k => k.startsWith(prefix) && checked[k]).length + "/" + total;

  // Biweekly summary for chart
  const biweeklyData = (() => {
    if (bodyWeight.length <= 1) return bodyWeight;
    // Show max 8 points spaced out
    const step = Math.max(1, Math.floor(bodyWeight.length / 8));
    const pts = [];
    for (let i = 0; i < bodyWeight.length; i += step) pts.push(bodyWeight[i]);
    if (pts[pts.length-1] !== bodyWeight[bodyWeight.length-1]) pts.push(bodyWeight[bodyWeight.length-1]);
    return pts;
  })();

  return (
    <div style={{ fontFamily:"'Georgia',serif", background:"#07070f", height:"100vh", height:"100dvh", color:"#e0d8cc", display:"flex", flexDirection:"column", maxWidth:500, margin:"0 auto" }}>

      {/* HEADER */}
      <div style={{ background:"linear-gradient(135deg,#0f0a1a,#0a140f)", borderBottom:"1px solid #1e1e2e", padding:"11px 14px", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
        <div style={{ width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,#4ade80,#22c55e)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0 }}>⚡</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:9,fontFamily:"monospace",color:"#4ade80",letterSpacing:2 }}>MI ENTRENADOR PERSONAL</div>
          <div style={{ fontSize:13,fontWeight:"bold",color:"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
            {nav==="week0"&&"Semana 0 · Recuperación"}
            {nav==="plan"&&`${week.label} · ${week.focus} · ${week.rir}`}
            {nav==="mobility"&&"Biblioteca de Movilidad"}
            {nav==="progress"&&"Mi Progreso"}
            {nav==="nutrition"&&"Nutrición · 2.200 kcal"}
          </div>
        </div>
        <div style={{ fontSize:11,background:"#4ade8022",border:"1px solid #4ade8044",borderRadius:6,padding:"3px 8px",color:"#4ade80",fontFamily:"monospace",flexShrink:0 }}>
          {bodyWeight[bodyWeight.length-1]?.kg} kg
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch" }}>

        {/* ── SEMANA 0 ── */}
        {nav==="week0" && (
          <div style={{ padding:12 }}>
            <div style={{ background:"#1a0800",border:"1px solid #f9731633",borderRadius:10,padding:"10px 12px",marginBottom:12,fontSize:12,color:"#aaa",lineHeight:1.6 }}>
              ⚠️ <strong style={{color:"#f97316"}}>Prioridad antes del plan de 4 semanas.</strong> Libera el glúteo izq, activa cadera y alarga el soleo.
            </div>
            <div style={{ display:"flex",gap:6,marginBottom:12,overflowX:"auto",paddingBottom:2 }}>
              {week0Days.map((d,i)=>(
                <button key={i} onClick={()=>setActiveW0Day(i)} style={{ flexShrink:0,background:activeW0Day===i?d.color:"#111120",border:`1px solid ${activeW0Day===i?d.color:"#2a2a3a"}`,borderRadius:8,padding:"6px 12px",cursor:"pointer",color:activeW0Day===i?"#000":"#888",fontSize:12,fontWeight:activeW0Day===i?"bold":"normal" }}>{d.day}</button>
              ))}
            </div>
            <div style={{ background:"#111120",border:`1px solid ${w0.color}33`,borderRadius:12,overflow:"hidden",marginBottom:12 }}>
              <div style={{ background:`linear-gradient(135deg,${w0.color}20,transparent)`,padding:"11px 14px",borderBottom:`1px solid ${w0.color}22` }}>
                <div style={{ fontSize:14,fontWeight:"bold",color:"#fff" }}>{w0.tag}</div>
                <div style={{ fontSize:11,color:"#555",marginTop:2 }}>{doneCount(`w0-${activeW0Day}-`,w0.items.length)} completados</div>
              </div>
              {w0.items.map((item,i)=>{
                const k=`w0-${activeW0Day}-${i}`;
                return (
                  <div key={i} onClick={()=>toggleCheck(k)} style={{ display:"flex",gap:10,padding:"10px 14px",borderTop:"1px solid #1a1a2e",cursor:"pointer",background:checked[k]?`${w0.color}0e`:"transparent" }}>
                    <div style={{ width:20,height:20,borderRadius:"50%",border:`2px solid ${w0.color}`,background:checked[k]?w0.color:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#000",fontWeight:"bold",marginTop:1 }}>{checked[k]?"✓":""}</div>
                    <div style={{ fontSize:12,color:checked[k]?"#444":"#ccc",textDecoration:checked[k]?"line-through":"none",lineHeight:1.5 }}>{item}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ background:"#0a1a0a",border:"1px solid #4ade8033",borderRadius:10,padding:"10px 12px" }}>
              <div style={{ fontSize:9,fontFamily:"monospace",color:"#4ade80",letterSpacing:2,marginBottom:8 }}>✅ TEST DEL VIERNES — ¿Paso a Semana 1?</div>
              {["Dolor lumbar en reposo ≤1/10","Sentadilla peso corporal sin dolor","Glúteo izq trabaja igual en hip bridge","Mejoría en apertura del 90/90","Rutina diaria ≥5 de 7 días"].map((t,i)=>(
                <div key={i} onClick={()=>toggleCheck(`test-${i}`)} style={{ display:"flex",gap:10,padding:"7px 0",borderTop:"1px solid #1a2a1a",cursor:"pointer",alignItems:"center" }}>
                  <div style={{ width:18,height:18,border:"2px solid #4ade80",borderRadius:4,flexShrink:0,background:checked[`test-${i}`]?"#4ade80":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#000",fontWeight:"bold" }}>{checked[`test-${i}`]?"✓":""}</div>
                  <div style={{ fontSize:12,color:checked[`test-${i}`]?"#444":"#ccc",textDecoration:checked[`test-${i}`]?"line-through":"none" }}>{t}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PLAN ── */}
        {nav==="plan" && (
          <div style={{ padding:12 }}>
            <div style={{ display:"flex",gap:6,marginBottom:10,overflowX:"auto",paddingBottom:2 }}>
              {weeks.map((w,i)=>(
                <button key={i} onClick={()=>{setActiveWeek(i);setActiveDay(0);setShowWarmup(false);setExpandedSeries(null);}} style={{ flexShrink:0,background:activeWeek===i?w.color:"#111120",border:`1px solid ${activeWeek===i?w.color:"#2a2a3a"}`,borderRadius:8,padding:"5px 11px",cursor:"pointer",color:activeWeek===i?"#000":"#888",fontSize:11,fontWeight:activeWeek===i?"bold":"normal",textAlign:"center" }}>
                  <div>{w.label}</div><div style={{fontSize:9,marginTop:1,opacity:0.8}}>{w.focus}</div>
                </button>
              ))}
            </div>
            <div style={{ display:"flex",gap:6,marginBottom:12,overflowX:"auto",paddingBottom:2 }}>
              {week.days.map((d,i)=>(
                <button key={i} onClick={()=>{setActiveDay(i);setShowWarmup(false);setExpandedSeries(null);}} style={{ flexShrink:0,background:activeDay===i?week.color:"#111120",border:`1px solid ${activeDay===i?week.color:"#2a2a3a"}`,borderRadius:8,padding:"6px 12px",cursor:"pointer",color:activeDay===i?"#000":"#888",fontSize:12,fontWeight:activeDay===i?"bold":"normal" }}>{d.day}</button>
              ))}
            </div>
            <button onClick={()=>setShowWarmup(v=>!v)} style={{ width:"100%",background:showWarmup?"#0f1f0f":"#111120",border:`1px solid ${showWarmup?"#4ade80":"#2a2a3a"}`,borderRadius:8,padding:"8px",cursor:"pointer",color:showWarmup?"#4ade80":"#666",fontSize:12,marginBottom:12 }}>
              🔥 {showWarmup?"Ocultar":"Ver"} Calentamiento & Enfriamiento
            </button>
            {showWarmup&&(
              <div style={{ marginBottom:12 }}>
                <div style={{ background:"#0f1f0f",border:"1px solid #4ade8033",borderRadius:10,padding:"10px 12px",marginBottom:8 }}>
                  <div style={{ fontSize:9,fontFamily:"monospace",color:"#4ade80",letterSpacing:2,marginBottom:4 }}>🔥 CALENTAMIENTO</div>
                  <div style={{ fontSize:12,color:"#aaa",lineHeight:1.5 }}>{day.warmup}</div>
                </div>
                <div style={{ background:"#0f0f1f",border:"1px solid #60a5fa33",borderRadius:10,padding:"10px 12px" }}>
                  <div style={{ fontSize:9,fontFamily:"monospace",color:"#60a5fa",letterSpacing:2,marginBottom:4 }}>❄️ ENFRIAMIENTO</div>
                  <div style={{ fontSize:12,color:"#aaa",lineHeight:1.5 }}>{day.cooldown}</div>
                </div>
              </div>
            )}
            <div style={{ background:"#111120",border:`1px solid ${week.color}33`,borderRadius:12,overflow:"hidden" }}>
              <div style={{ background:`linear-gradient(135deg,${week.color}15,transparent)`,padding:"10px 14px",borderBottom:`1px solid ${week.color}20` }}>
                <div style={{ fontSize:9,fontFamily:"monospace",color:week.color,letterSpacing:2 }}>{day.tag}</div>
                <div style={{ fontSize:11,color:"#555",marginTop:2 }}>{doneCount(`ex-${activeWeek}-${activeDay}-`,day.exercises.length)} · {week.rir}</div>
              </div>
              {day.exercises.map((ex,i)=>{
                const k=`ex-${activeWeek}-${activeDay}-${i}`;
                const exKey=`series-${activeWeek}-${activeDay}-${i}`;
                const isDone=checked[k];
                const isOpen=expandedSeries===i;
                const { sets } = parseSets(ex.s);
                const sd = seriesData[exKey] || [];
                const filledSets = sd.filter(s=>s.kg).length;

                return (
                  <div key={i} style={{ borderTop:"1px solid #1a1a2e", background:isDone?`${week.color}08`:"transparent" }}>
                    {/* Exercise header row */}
                    <div style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 14px 6px" }}>
                      <div onClick={()=>toggleCheck(k)} style={{ width:22,height:22,borderRadius:"50%",border:`2px solid ${week.color}`,background:isDone?week.color:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#000",fontWeight:"bold",cursor:"pointer" }}>{isDone?"✓":""}</div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:13,color:isDone?"#555":"#e0d8cc",textDecoration:isDone?"line-through":"none" }}>{ex.n}</div>
                        {ex.note&&<div style={{ fontSize:11,color:"#555",fontStyle:"italic",marginTop:1 }}>💡 {ex.note}</div>}
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        <div style={{ fontSize:12,color:week.color,fontFamily:"monospace",fontWeight:"bold" }}>{ex.s}</div>
                        {filledSets>0&&<div style={{ fontSize:9,color:"#555",marginTop:1 }}>{filledSets}/{sets} series</div>}
                      </div>
                    </div>
                    {/* Toggle series tracker */}
                    <div onClick={()=>setExpandedSeries(isOpen?null:i)} style={{ display:"flex",alignItems:"center",gap:6,padding:"4px 14px 8px",cursor:"pointer" }}>
                      <div style={{ fontSize:10,color:isOpen?week.color:"#444",fontFamily:"monospace",letterSpacing:1 }}>
                        {isOpen?"▲ Ocultar series":"▼ Registrar series"}
                      </div>
                      {filledSets>0&&!isOpen&&(
                        <div style={{ display:"flex",gap:3 }}>
                          {(seriesData[exKey]||[]).map((s,si)=>(
                            <div key={si} style={{ fontSize:10,background:"#1a1a2e",borderRadius:4,padding:"1px 5px",color:"#666",fontFamily:"monospace" }}>
                              {s.kg?`${s.kg}kg`:"·"}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Series tracker panel */}
                    {isOpen&&(
                      <SeriesTracker
                        exKey={exKey}
                        exName={ex.n}
                        setsStr={ex.s}
                        color={week.color}
                        seriesData={seriesData}
                        setSeriesDataFn={setSeriesDataFn}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── MOVILIDAD ── */}
        {nav==="mobility" && (
          <div style={{ padding:12 }}>
            <div style={{ display:"flex",gap:6,marginBottom:12,overflowX:"auto",paddingBottom:2 }}>
              {mobilityGroups.map((g,i)=>(
                <button key={i} onClick={()=>{setActiveMob(i);setExpandedEx(null);}} style={{ flexShrink:0,background:activeMob===i?g.color:"#111120",border:`1px solid ${activeMob===i?g.color:"#2a2a3a"}`,borderRadius:8,padding:"5px 10px",cursor:"pointer",color:activeMob===i?"#000":"#888",fontSize:11,fontWeight:activeMob===i?"bold":"normal",textAlign:"center" }}>
                  <div>{g.icon}</div><div style={{marginTop:2}}>{g.label}</div>
                </button>
              ))}
            </div>
            <div style={{ background:`${mob.color}11`,border:`1px solid ${mob.color}33`,borderRadius:8,padding:"7px 12px",marginBottom:10,fontSize:9,fontFamily:"monospace",color:mob.color,letterSpacing:2 }}>{mob.tag} · Toca para ver la clave técnica</div>
            {mob.exercises.map((ex,i)=>{
              const isOpen=expandedEx===i;
              return (
                <div key={i} onClick={()=>setExpandedEx(isOpen?null:i)} style={{ background:"#111120",border:`1px solid ${isOpen?mob.color+"77":"#1e1e2e"}`,borderRadius:10,marginBottom:8,overflow:"hidden",cursor:"pointer" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:10,padding:"11px 14px" }}>
                    <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:"bold",color:"#e0d8cc" }}>{ex.n}</div></div>
                    <div style={{ textAlign:"right",flexShrink:0 }}>
                      <div style={{ fontSize:11,color:mob.color,fontFamily:"monospace",fontWeight:"bold" }}>{ex.d}</div>
                      <div style={{ fontSize:10,color:"#333",marginTop:1 }}>{isOpen?"▲":"▼"}</div>
                    </div>
                  </div>
                  {isOpen&&(
                    <div style={{ borderTop:`1px solid ${mob.color}33`,padding:"10px 14px",background:`${mob.color}08` }}>
                      <div style={{ fontSize:9,fontFamily:"monospace",color:mob.color,letterSpacing:2,marginBottom:5 }}>🎯 CLAVE TÉCNICA</div>
                      <div style={{ fontSize:12,color:"#ccc",lineHeight:1.7 }}>{ex.k}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── PROGRESO ── */}
        {nav==="progress" && (
          <div style={{ padding:12 }}>

            {/* Chart card */}
            <div style={{ background:"#111120",border:"1px solid #4ade8033",borderRadius:12,padding:14,marginBottom:12 }}>
              <div style={{ fontSize:9,fontFamily:"monospace",color:"#4ade80",letterSpacing:2,marginBottom:12 }}>📈 EVOLUCIÓN DE PESO</div>
              <WeightChart data={biweeklyData} />
            </div>

            {/* Add weight */}
            <div style={{ background:"#111120",border:"1px solid #4ade8022",borderRadius:12,padding:12,marginBottom:12 }}>
              <div style={{ fontSize:9,fontFamily:"monospace",color:"#4ade80",letterSpacing:2,marginBottom:10 }}>⚖️ REGISTRAR PESO</div>
              <div style={{ display:"flex",gap:8,marginBottom:8 }}>
                <input value={newBWLabel} onChange={e=>setNewBWLabel(e.target.value)} placeholder="Etiqueta (ej: S1, S3...)" style={{ flex:1.2,background:"#0a0a14",border:"1px solid #2a2a3a",borderRadius:8,padding:"7px 10px",color:"#e0d8cc",fontSize:12,outline:"none",fontFamily:"monospace" }} />
                <input value={newBW} onChange={e=>setNewBW(e.target.value)} placeholder="kg" type="number" style={{ flex:0.8,background:"#0a0a14",border:"1px solid #2a2a3a",borderRadius:8,padding:"7px 10px",color:"#e0d8cc",fontSize:13,outline:"none",fontFamily:"monospace",textAlign:"center" }} />
                <button onClick={()=>{if(newBW){setBodyWeight(p=>[...p,{date:new Date().toISOString().split("T")[0],label:newBWLabel||new Date().toISOString().split("T")[0].slice(5),kg:parseFloat(newBW)}]);setNewBW("");setNewBWLabel("");}}} style={{ background:"linear-gradient(135deg,#4ade80,#22c55e)",border:"none",borderRadius:8,padding:"7px 12px",cursor:"pointer",color:"#000",fontSize:13,fontWeight:"bold",flexShrink:0 }}>+</button>
              </div>
              <div style={{ fontSize:10,color:"#444",marginBottom:8 }}>💡 Registra cada 2 semanas para ver tendencia clara</div>
              {/* History list */}
              <div style={{ maxHeight:160,overflowY:"auto" }}>
                {bodyWeight.slice().reverse().map((e,i,arr)=>{
                  const prev=arr[i+1];
                  const diff=prev?e.kg-prev.kg:null;
                  return (
                    <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderTop:"1px solid #1a2a1a",fontSize:12 }}>
                      <span style={{ color:"#4ade80",fontFamily:"monospace",fontSize:11 }}>{e.label||e.date?.slice(5)}</span>
                      <span style={{ color:"#555",fontFamily:"monospace",fontSize:10 }}>{e.date}</span>
                      <span style={{ color:"#e0d8cc",fontWeight:"bold",fontFamily:"monospace" }}>{e.kg} kg</span>
                      {diff!==null&&<span style={{ color:diff<0?"#4ade80":diff>0?"#f97316":"#555",fontSize:11,fontFamily:"monospace" }}>{diff<0?"▼":"▲"} {Math.abs(diff).toFixed(1)}</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Series history summary */}
            <div style={{ background:"#111120",border:"1px solid #60a5fa22",borderRadius:12,padding:12,marginBottom:12 }}>
              <div style={{ fontSize:9,fontFamily:"monospace",color:"#60a5fa",letterSpacing:2,marginBottom:10 }}>💪 RESUMEN DE SERIES REGISTRADAS</div>
              {(() => {
                const rows = [];
                weeks.forEach((w,wi) => w.days.forEach((d,di) => d.exercises.forEach((ex,ei) => {
                  const key = `series-${wi}-${di}-${ei}`;
                  const sd = seriesData[key];
                  if (!sd) return;
                  const filled = sd.filter(s=>s.kg);
                  if (filled.length === 0) return;
                  const avgKg = (filled.reduce((a,b)=>a+parseFloat(b.kg||0),0)/filled.length).toFixed(1);
                  rows.push({ name:ex.n, week:`S${wi+1}`, day:d.day, avg:avgKg, sets:filled.length, total:sd.length });
                })));
                if(rows.length===0) return <div style={{fontSize:12,color:"#333",textAlign:"center",padding:"16px 0"}}>Registra series en la pestaña Plan 📅</div>;
                return rows.slice(-10).reverse().map((r,i)=>(
                  <div key={i} style={{ padding:"7px 0",borderTop:"1px solid #1a1a2e" }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline" }}>
                      <span style={{ fontSize:12,color:"#e0d8cc" }}>{r.name}</span>
                      <span style={{ fontSize:10,color:"#60a5fa",fontFamily:"monospace" }}>{r.week} · {r.day}</span>
                    </div>
                    <div style={{ fontSize:11,color:"#666",marginTop:2 }}>Media: <strong style={{color:"#aaa"}}>{r.avg}kg</strong> · {r.sets}/{r.total} series completadas</div>
                  </div>
                ));
              })()}
            </div>

            {/* Prompt */}
            <div style={{ background:"#1a1020",border:"1px solid #a78bfa",borderRadius:12,padding:12 }}>
              <div style={{ fontSize:9,fontFamily:"monospace",color:"#a78bfa",letterSpacing:2,marginBottom:8 }}>📋 PROMPT SEMANAL — Copia en claude.ai</div>
              <div style={{ background:"#0f0a1a",borderRadius:8,padding:"10px",fontSize:11,color:"#ccc",lineHeight:1.8,fontFamily:"monospace",whiteSpace:"pre-wrap",userSelect:"all",WebkitUserSelect:"all" }}>
{`Semana [X] completada:

⚖️ Peso: ${bodyWeight[bodyWeight.length-1]?.kg} kg
✅ Sesiones: [X/4]
💪 Series registradas (copia de la app):
   Press inclinado S1: [kg] · Reps: [X,X,X,X]
   Jalón neutro S1: [kg] · Reps: [X,X,X,X]
   Sentadilla Smith S1: [kg] · Reps: [X,X,X,X]
   Hip thrust S1: [kg] · Reps: [X,X,X,X]

📊 Sensaciones (1-10):
   Energía: [X]
   Hombro: [X/sin molestias]
   Lumbares: [X/sin molestias]
   Soleo: [X/7 días hecho]

🍽️ Nutrición: [bien/mal]
😴 Sueño: [X h]
❓ Dudas: [texto libre]`}
              </div>
              <div style={{ fontSize:10,color:"#555",marginTop:6,textAlign:"center" }}>Mantén pulsado para seleccionar y copiar</div>
            </div>
          </div>
        )}

        {/* ── NUTRICIÓN ── */}
        {nav==="nutrition" && (
          <div style={{ padding:12 }}>

            {/* Alergia alert */}
            <div style={{ background:"#1a0a00",border:"1px solid #f9731688",borderRadius:10,padding:"8px 12px",marginBottom:12,fontSize:12,color:"#f97316" }}>
              🚫 <strong>Alergia:</strong> Sin pescado ni marisco — solo atún en conserva permitido
            </div>

            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12 }}>
              <div style={{ gridColumn:"1/-1",background:"linear-gradient(135deg,#0f1a0f,#080f08)",border:"1px solid #4ade8044",borderRadius:12,padding:14,textAlign:"center" }}>
                <div style={{ fontSize:28,fontWeight:"bold",color:"#4ade80",fontFamily:"monospace" }}>2.200</div>
                <div style={{ fontSize:11,color:"#555",marginTop:2 }}>kcal/día · déficit ~600 kcal · ~0,5 kg grasa/semana</div>
              </div>
              {[
                {l:"Proteína",v:"200g",c:"#f97316",d:"2g/kg · músculo protegido"},
                {l:"Carbos",v:"185g",c:"#60a5fa",d:"Pre/post entreno"},
                {l:"Grasas",v:"65g",c:"#fbbf24",d:"Huevos, frutos secos, aceite"},
                {l:"Agua",v:"2.5-3L",c:"#4ade80",d:"Discos y fascia"},
              ].map((m,i)=>(
                <div key={i} style={{ background:"#111120",border:`1px solid ${m.c}33`,borderRadius:10,padding:10,textAlign:"center" }}>
                  <div style={{ fontSize:18,fontWeight:"bold",color:m.c,fontFamily:"monospace" }}>{m.v}</div>
                  <div style={{ fontSize:11,color:m.c,marginTop:1 }}>{m.l}</div>
                  <div style={{ fontSize:10,color:"#444",marginTop:2 }}>{m.d}</div>
                </div>
              ))}
            </div>

            {/* Meals */}
            <div style={{ background:"#111120",border:"1px solid #2a2a3a",borderRadius:12,padding:12,marginBottom:10 }}>
              <div style={{ fontSize:9,fontFamily:"monospace",color:"#fbbf24",letterSpacing:2,marginBottom:10 }}>🍽️ DISTRIBUCIÓN DIARIA SIN PESCADO</div>
              {[
                {t:"Desayuno",s:"~450 kcal",e:"4 huevos revueltos + avena 50g + 1 manzana · Sin lácteos si no toleras"},
                {t:"Media mañana",s:"~200 kcal",e:"Puñado almendras (20g) + 1 pieza fruta · proteína extra si hay entreno"},
                {t:"Pre-entreno (1h antes)",s:"~300 kcal",e:"Batido proteico (30g) + plátano · carbos de absorción rápida"},
                {t:"Post-entreno (30 min)",s:"~500 kcal",e:"Pechuga pollo 200g + arroz blanco 80g o batata · o atún en conserva 2 latas + arroz"},
                {t:"Comida",s:"~500 kcal",e:"Pechuga pavo 200g o ternera magra 150g + legumbres 100g + verduras + aceite oliva"},
                {t:"Cena",s:"~250 kcal",e:"Tortilla 3 huevos + verduras salteadas · o pavo 150g + ensalada"},
              ].map((m,i)=>(
                <div key={i} style={{ padding:"8px 0",borderTop:"1px solid #1a1a2e" }}>
                  <div style={{ display:"flex",justifyContent:"space-between" }}>
                    <span style={{ fontSize:12,fontWeight:"bold",color:"#e0d8cc" }}>{m.t}</span>
                    <span style={{ fontSize:11,color:"#fbbf24",fontFamily:"monospace" }}>{m.s}</span>
                  </div>
                  <div style={{ fontSize:11,color:"#555",marginTop:2,lineHeight:1.4 }}>{m.e}</div>
                </div>
              ))}
            </div>

            {/* Protein sources */}
            <div style={{ background:"#111120",border:"1px solid #f9731622",borderRadius:12,padding:12,marginBottom:10 }}>
              <div style={{ fontSize:9,fontFamily:"monospace",color:"#f97316",letterSpacing:2,marginBottom:10 }}>🥩 TUS FUENTES DE PROTEÍNA (sin pescado/marisco)</div>
              {[
                {f:"Pechuga de pollo",p:"31g/100g",n:"Base diaria. Versátil. Plancha, horno, hervida."},
                {f:"Pechuga de pavo",p:"29g/100g",n:"Alternativa al pollo. Aún más magra."},
                {f:"Atún en conserva ✅",p:"25g/lata",n:"Tu única fuente de pescado permitida. 2 latas = 50g proteína."},
                {f:"Huevos enteros",p:"6g/huevo",n:"4 huevos = 24g proteína + grasas saludables."},
                {f:"Clara de huevo",p:"11g/100ml",n:"Complementa los huevos enteros para subir proteína sin grasas."},
                {f:"Ternera magra (97%)",p:"22g/100g",n:"2-3 veces/semana. Creatina natural + hierro."},
                {f:"Batido de proteína whey",p:"22-25g/scoop",n:"Herramienta, no sustituto. Pre/post entreno o en ayunas."},
                {f:"Requesón / queso cottage",p:"12g/100g",n:"Caseína lenta. Ideal antes de dormir."},
                {f:"Legumbres (lentejas)",p:"9g/100g cocidas",n:"Proteína + carbos + fibra. 2x semana mínimo."},
              ].map((f,i)=>(
                <div key={i} style={{ display:"flex",gap:10,padding:"7px 0",borderTop:"1px solid #1a1a2e",alignItems:"flex-start" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12,color:"#e0d8cc",fontWeight:"bold" }}>{f.f}</div>
                    <div style={{ fontSize:11,color:"#555",marginTop:1 }}>{f.n}</div>
                  </div>
                  <div style={{ fontSize:12,color:"#f97316",fontFamily:"monospace",fontWeight:"bold",flexShrink:0 }}>{f.p}</div>
                </div>
              ))}
            </div>

            {/* Rules */}
            <div style={{ background:"#0a1a0a",border:"1px solid #4ade8033",borderRadius:12,padding:12 }}>
              <div style={{ fontSize:9,fontFamily:"monospace",color:"#4ade80",letterSpacing:2,marginBottom:8 }}>💡 REGLAS CLAVE</div>
              {[
                "🕐 30-40g proteína ANTES del entreno — batido + plátano",
                "😴 7-8h sueño — sin esto la grasa no se va (GH nocturna)",
                "📅 Refeed 1x/semana: +60-80g carbos el día de piernas",
                "☕ Cafeína 30 min pre-entreno — mejora rendimiento y quema",
                "🥚 Si no llegas a 200g proteína, sube huevos y batido",
              ].map((t,i)=>(
                <div key={i} style={{ fontSize:12,color:"#ccc",padding:"6px 0",borderTop:"1px solid #1a2a1a",lineHeight:1.5 }}>{t}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div style={{ background:"#0a0a14",borderTop:"1px solid #1e1e2e",display:"flex",flexShrink:0,paddingBottom:"env(safe-area-inset-bottom)" }}>
        {navItems.map(item=>(
          <button key={item.id} onClick={()=>setNav(item.id)} style={{ flex:1,background:"none",border:"none",cursor:"pointer",padding:"9px 4px 7px",display:"flex",flexDirection:"column",alignItems:"center",gap:2,WebkitTapHighlightColor:"transparent" }}>
            <div style={{ fontSize:18 }}>{item.icon}</div>
            <div style={{ fontSize:9,fontFamily:"monospace",color:nav===item.id?"#4ade80":"#444" }}>{item.label}</div>
            {nav===item.id&&<div style={{ width:12,height:2,background:"#4ade80",borderRadius:2 }} />}
          </button>
        ))}
      </div>
    </div>
  );
}
