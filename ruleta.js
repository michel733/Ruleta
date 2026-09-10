// ========================
//  RULETA INTERACTIVA
// ========================

const COLORES = [
  '#e91e63', '#9c27b0', '#3f51b5', '#2196f3',
  '#009688', '#4caf50', '#ff9800', '#ff5722',
  '#607d8b', '#f44336', '#00bcd4', '#8bc34a',
  '#ffc107', '#673ab7', '#795548', '#03a9f4',
];

// Nombres con mayor probabilidad (invisible para los demás)
const FAVORITOS  = ['osvaldo', 'miky', 'alisson'];
// Nombres con menor probabilidad
const PENALIZADOS = ['yajaira', 'temo', 'michel', 'michael'];

const PESO_FAVORITO   = 2;   // el doble de probabilidad, no tan obvio
const PESO_NORMAL     = 1;
const PESO_PENALIZADO = 0.5; // la mitad, tampoco tan raro que salgan

const canvas        = document.getElementById('ruletaCanvas');
const ctx           = canvas.getContext('2d');
const inputNombre   = document.getElementById('inputNombre');
const btnAgregar    = document.getElementById('btnAgregar');
const btnGirar      = document.getElementById('btnGirar');
const listaPersonas = document.getElementById('listaPersonas');
const resultado     = document.getElementById('resultado');
const ganadorEl     = document.getElementById('ganador');

let personas = []; // { nombre, color }
let angulo   = 0;
let girando  = false;

// ─── Peso de una persona (oculto) ────────────────────────────
function pesoDe(persona) {
  const nombre = persona.nombre.toLowerCase().trim();
  if (FAVORITOS.includes(nombre))   return PESO_FAVORITO;
  if (PENALIZADOS.includes(nombre)) return PESO_PENALIZADO;
  return PESO_NORMAL;
}

function pesoTotal() {
  return personas.reduce((sum, p) => sum + pesoDe(p), 0);
}

// ─── Elegir ganador ponderado (invisible) ────────────────────
function elegirGanador() {
  const total = pesoTotal();
  let rand    = Math.random() * total;
  for (let i = 0; i < personas.length; i++) {
    rand -= pesoDe(personas[i]);
    if (rand <= 0) return i;
  }
  return personas.length - 1;
}

// ─── Agregar persona ──────────────────────────────────────────
function agregarPersona() {
  const nombre = inputNombre.value.trim();
  if (!nombre) return;
  if (personas.some(p => p.nombre.toLowerCase() === nombre.toLowerCase())) {
    sacudir(inputNombre);
    return;
  }

  const color = COLORES[personas.length % COLORES.length];
  personas.push({ nombre, color });
  inputNombre.value = '';
  inputNombre.focus();

  renderLista();
  dibujarRuleta();
  actualizarBotonGirar();
}

// ─── Eliminar persona ─────────────────────────────────────────
function eliminarPersona(index) {
  personas.splice(index, 1);
  renderLista();
  dibujarRuleta();
  actualizarBotonGirar();
  ocultarResultado();
}

// ─── Render lista lateral ────────────────────────────────────
function renderLista() {
  listaPersonas.innerHTML = '';
  personas.forEach((p, i) => {
    const li = document.createElement('li');
    li.style.background = hexToRgba(p.color, 0.18);
    li.style.border     = `1px solid ${hexToRgba(p.color, 0.4)}`;

    // Se ve exactamente igual para todos
    li.innerHTML = `
      <span class="nombre-persona">
        <span class="punto" style="background:${p.color}"></span>
        ${escapeHtml(p.nombre)}
      </span>
      <button class="eliminar" title="Eliminar" onclick="eliminarPersona(${i})">✕</button>
    `;
    listaPersonas.appendChild(li);
  });
}

// ─── Dibujar ruleta (sectores iguales visualmente) ───────────
function dibujarRuleta() {
  const cx = canvas.width  / 2;
  const cy = canvas.height / 2;
  const r  = cx - 10;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (personas.length === 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = 'bold 18px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText('Agrega personas', cx, cy - 10);
    ctx.fillText('para comenzar', cx, cy + 18);
    return;
  }

  // Todos los sectores se ven del mismo tamaño
  const n      = personas.length;
  const sector = (Math.PI * 2) / n;

  personas.forEach((p, i) => {
    const desde = angulo + sector * i;
    const hasta = desde + sector;

    // Sector
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, desde, hasta);
    ctx.closePath();
    ctx.fillStyle = p.color;
    ctx.fill();

    // Borde
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, desde, hasta);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Texto
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(desde + sector / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur  = 4;

    const fontSize = Math.max(10, Math.min(18, Math.floor(r / n * 1.2)));
    ctx.font = `bold ${fontSize}px Segoe UI`;

    const maxLen = 14;
    const texto  = p.nombre.length > maxLen ? p.nombre.slice(0, maxLen - 1) + '…' : p.nombre;
    ctx.fillText(texto, r - 15, fontSize / 3);
    ctx.restore();
  });

  // Círculo central
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1a2e';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 3;
  ctx.stroke();
}

// ─── Animación de giro ───────────────────────────────────────
function girarRuleta() {
  if (girando || personas.length < 2) return;
  girando = true;
  ocultarResultado();
  btnGirar.disabled = true;

  // Ganador elegido con pesos ocultos
  const indiceGanador = elegirGanador();

  // La ruleta se dibuja con sectores iguales, así que el cálculo
  // del ángulo final usa sector uniforme (nadie nota diferencia)
  const n      = personas.length;
  const sector = (Math.PI * 2) / n;

  let anguloFinal = -Math.PI / 2 - sector * (indiceGanador + 0.5);
  anguloFinal = ((anguloFinal % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

  const anguloActualNorm = ((angulo % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

  let diff = anguloFinal - anguloActualNorm;
  if (diff <= 0) diff += Math.PI * 2;

  const vueltasCompletas = (5 + Math.floor(Math.random() * 4)) * Math.PI * 2;
  const giroTotal        = vueltasCompletas + diff;

  const duracion     = 4000 + Math.random() * 2000;
  const inicio       = performance.now();
  const anguloInicio = angulo;

  function paso(ahora) {
    const elapsed  = ahora - inicio;
    const progreso = Math.min(elapsed / duracion, 1);
    const ease     = 1 - Math.pow(1 - progreso, 3);
    angulo         = anguloInicio + giroTotal * ease;

    dibujarRuleta();

    if (progreso < 1) {
      requestAnimationFrame(paso);
    } else {
      angulo            = anguloInicio + giroTotal;
      girando           = false;
      btnGirar.disabled = false;
      mostrarGanadorFijo(indiceGanador);
    }
  }

  requestAnimationFrame(paso);
}

// ─── Mostrar ganador ─────────────────────────────────────────
function mostrarGanadorFijo(indice) {
  const persona = personas[indice];
  ganadorEl.textContent = `🎉 ${persona.nombre} 🎉`;
  resultado.classList.remove('oculto');

  const items = listaPersonas.querySelectorAll('li');
  items.forEach((li, i) => {
    li.style.transform = i === indice ? 'scale(1.04)' : 'scale(1)';
    li.style.boxShadow = i === indice ? `0 0 18px ${persona.color}` : 'none';
  });
}

function ocultarResultado() {
  resultado.classList.add('oculto');
  listaPersonas.querySelectorAll('li').forEach(li => {
    li.style.transform = '';
    li.style.boxShadow = '';
  });
}

// ─── Estado del botón girar ───────────────────────────────────
function actualizarBotonGirar() {
  btnGirar.disabled = personas.length < 2;
}

// ─── Helpers ─────────────────────────────────────────────────
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sacudir(el) {
  void el.offsetWidth;
  el.style.border = '2px solid #ff5555';
  setTimeout(() => { el.style.border = ''; }, 600);
}

// ─── Eventos ─────────────────────────────────────────────────
btnAgregar.addEventListener('click', agregarPersona);
btnGirar.addEventListener('click', girarRuleta);
inputNombre.addEventListener('keydown', e => {
  if (e.key === 'Enter') agregarPersona();
});

dibujarRuleta();
