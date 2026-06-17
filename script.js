const $ = (id) => document.getElementById(id);
const { jsPDF } = window.jspdf;

const materiaisBase = {
  N1: { 'Poste/concreto': 1, 'Cruzeta MT': 1, 'Isolador pino': 3, 'Parafuso 16x250 mm': 2, 'Arruela': 4 },
  N2: { 'Poste/concreto': 1, 'Cruzeta MT': 2, 'Isolador ancoragem': 3, 'Parafuso 16x250 mm': 4, 'Arruela': 8 },
  N3: { 'Poste/concreto': 1, 'Cruzeta MT': 2, 'Isolador pino': 3, 'Isolador ancoragem': 3, 'Parafuso 16x250 mm': 4, 'Arruela': 8 },
  S1: { 'Armação simples': 1, 'Parafuso 16x250 mm': 1, 'Isolador roldana': 1, 'Arruela': 1 },
  S3: { 'Parafuso olhal 16x250 mm': 1, 'Arruela': 2 },
  S4: { 'Parafuso olhal 16x250 mm': 1, 'Arruela': 2, 'Porca olhal': 1 }
};

let pontos = JSON.parse(localStorage.getItem('redecal_pontos') || '[]');
let map, layerGroup;

function initMap() {
  map = L.map('map').setView([-6.078696, -42.735803], 16);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 22,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  layerGroup = L.layerGroup().addTo(map);
  map.on('click', (e) => adicionarPonto(e.latlng.lat, e.latlng.lng));
  renderizar();
}

function estadoAtual() {
  return {
    tipoRede: $('tipoRede').value,
    caboMT: $('caboMT').value,
    caboBT: $('caboBT').value,
    estrutura: $('estrutura').value
  };
}

function adicionarPonto(lat, lng) {
  const cfg = estadoAtual();
  pontos.push({ lat, lng, ...cfg, criadoEm: new Date().toISOString() });
  salvar();
  renderizar();
}

function salvar() { localStorage.setItem('redecal_pontos', JSON.stringify(pontos)); }

function distanciaMetros(a, b) {
  const R = 6371000;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
}

function distanciaTotal() {
  let total = 0;
  for (let i=1;i<pontos.length;i++) total += distanciaMetros(pontos[i-1], pontos[i]);
  return total;
}

function fmtM(v) { return v >= 1000 ? `${(v/1000).toFixed(2)} km` : `${v.toFixed(1)} m`; }

function renderizar() {
  layerGroup.clearLayers();
  if (pontos.length) {
    const bounds = [];
    pontos.forEach((p, i) => {
      bounds.push([p.lat, p.lng]);
      const icon = L.divIcon({ className: '', html: `<div class="marker-label">${i+1}</div>`, iconSize: [26,26], iconAnchor:[13,13] });
      L.marker([p.lat,p.lng], { icon }).bindPopup(`<b>Ponto ${i+1}</b><br>${p.estrutura}<br>${p.tipoRede}<br>${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`).addTo(layerGroup);
    });
    for (let i=1;i<pontos.length;i++) desenharTrecho(pontos[i-1], pontos[i]);
    map.fitBounds(bounds, { padding: [40,40], maxZoom: 18 });
  }
  atualizarTabelas();
}

function desenharTrecho(a,b) {
  const coords = [[a.lat,a.lng],[b.lat,b.lng]];
  const tipo = b.tipoRede || a.tipoRede;
  if (tipo === 'MT' || tipo === 'MTBT') L.polyline(coords, { color:'red', weight:4, dashArray:'10,8' }).addTo(layerGroup);
  if (tipo === 'BT' || tipo === 'MTBT') {
    L.polyline(coords, { color:'red', weight:4 }).addTo(layerGroup);
    L.polyline(coords, { color:'#006fe6', weight:3, opacity:.95 }).addTo(layerGroup);
  }
}

function atualizarTabelas() {
  $('qtdPontos').textContent = pontos.length;
  $('distTotal').textContent = fmtM(distanciaTotal());
  $('tbodyPontos').innerHTML = pontos.map((p,i)=>{
    const d = i === 0 ? '-' : fmtM(distanciaMetros(pontos[i-1], p));
    return `<tr><td>${i+1}</td><td>${p.estrutura}</td><td>${p.tipoRede}</td><td>${d}</td></tr>`;
  }).join('');
  const mats = calcularMateriais();
  $('tbodyMateriais').innerHTML = Object.entries(mats).map(([m,q])=>`<tr><td>${m}</td><td>${q}</td></tr>`).join('');
}

function calcularMateriais() {
  const mat = {};
  function add(nome,qtd){ mat[nome] = (mat[nome] || 0) + qtd; }
  pontos.forEach((p)=> Object.entries(materiaisBase[p.estrutura] || {}).forEach(([m,q])=>add(m,q)));
  let mt = 0, bt = 0;
  for (let i=1;i<pontos.length;i++) {
    const d = distanciaMetros(pontos[i-1], pontos[i]);
    const tipo = pontos[i].tipoRede || pontos[i-1].tipoRede;
    if (tipo === 'MT' || tipo === 'MTBT') mt += d;
    if (tipo === 'BT' || tipo === 'MTBT') bt += d;
  }
  if (mt > 0) add(`Cabo MT ${$('caboMT').value} (m)`, Math.ceil(mt * 1.05));
  if (bt > 0) add(`Cabo BT ${$('caboBT').value} (m)`, Math.ceil(bt * 1.05));
  return mat;
}

function usarGps() {
  if (!navigator.geolocation) return alert('GPS não suportado neste navegador.');
  navigator.geolocation.getCurrentPosition(
    pos => adicionarPonto(pos.coords.latitude, pos.coords.longitude),
    err => alert('Não foi possível obter GPS: ' + err.message),
    { enableHighAccuracy:true, timeout:15000, maximumAge:0 }
  );
}

function abrirManual() {
  if (!$('manualDialog')) document.body.appendChild($('manualDialogTpl').content.cloneNode(true));
  const dlg = $('manualDialog');
  $('confirmManual').onclick = (e) => {
    e.preventDefault();
    const lat = Number($('latManual').value), lng = Number($('lngManual').value);
    if (Number.isFinite(lat) && Number.isFinite(lng)) { adicionarPonto(lat,lng); dlg.close(); }
  };
  dlg.showModal();
}

function projetarPontosPdf(w, h, margin=18) {
  if (!pontos.length) return [];
  const minLat = Math.min(...pontos.map(p=>p.lat)), maxLat = Math.max(...pontos.map(p=>p.lat));
  const minLng = Math.min(...pontos.map(p=>p.lng)), maxLng = Math.max(...pontos.map(p=>p.lng));
  const latSpan = Math.max(maxLat-minLat, 0.0001), lngSpan = Math.max(maxLng-minLng, 0.0001);
  return pontos.map(p => ({
    ...p,
    x: margin + ((p.lng-minLng)/lngSpan)*(w-2*margin),
    y: margin + (1-(p.lat-minLat)/latSpan)*(h-2*margin)
  }));
}

function gerarPdf() {
  const doc = new jsPDF({ orientation:'landscape', unit:'mm', format:'a4' });
  const pageW = 297, pageH = 210;
  doc.setDrawColor(0); doc.setLineWidth(.5); doc.rect(8,8,pageW-16,pageH-16);
  doc.setFont('helvetica','bold'); doc.setFontSize(15); doc.text('PRANCHA DO PROJETO DE REDE ELÉTRICA - REDECAL PRO', 12, 18);
  doc.setFont('helvetica','normal'); doc.setFontSize(9);
  doc.text(`Projeto: ${$('nomeProjeto').value}`, 12, 25);
  doc.text(`Local: ${$('localProjeto').value}`, 12, 30);
  doc.text(`Responsável: ${$('responsavel').value}`, 12, 35);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}  |  Pontos: ${pontos.length}  |  Distância total: ${fmtM(distanciaTotal())}`, 12, 40);

  doc.setFont('helvetica','bold'); doc.text('PLANTA ESQUEMÁTICA', 12, 49);
  doc.setDrawColor(40); doc.rect(12,52,180,128);
  const pp = projetarPontosPdf(180,128,14).map(p=>({ ...p, x:p.x+12, y:p.y+52 }));
  for (let i=1;i<pp.length;i++) {
    const a=pp[i-1], b=pp[i], tipo=b.tipoRede||a.tipoRede;
    if (tipo==='MT'||tipo==='MTBT') { doc.setDrawColor(220,0,0); doc.setLineDashPattern([4,3],0); doc.setLineWidth(1); doc.line(a.x,a.y,b.x,b.y); }
    if (tipo==='BT'||tipo==='MTBT') { doc.setLineDashPattern([],0); doc.setDrawColor(220,0,0); doc.setLineWidth(1); doc.line(a.x,a.y,b.x,b.y); doc.setDrawColor(0,90,220); doc.setLineWidth(.8); doc.line(a.x,a.y+1.5,b.x,b.y+1.5); }
  }
  doc.setLineDashPattern([],0);
  pp.forEach((p,i)=>{ doc.setFillColor(15,39,71); doc.circle(p.x,p.y,3,'F'); doc.setTextColor(255); doc.setFontSize(7); doc.text(String(i+1),p.x-1.2,p.y+1.2); doc.setTextColor(0); doc.setFontSize(6); doc.text(p.estrutura,p.x+4,p.y-2); });
  doc.setFontSize(8); doc.text('Legenda: MT = vermelho tracejado | BT = vermelho contínuo | Cabo baixa tensão = azul contínuo', 12, 186);

  doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.text('LISTA DE PONTOS', 200, 49);
  let y = 55; doc.setFont('helvetica','normal'); doc.setFontSize(7);
  pontos.slice(0,18).forEach((p,i)=>{ const d=i===0?'-':fmtM(distanciaMetros(pontos[i-1],p)); doc.text(`${i+1}. ${p.estrutura} | ${p.tipoRede} | ${d} | ${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`,200,y); y+=5; });

  doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.text('LISTA DE MATERIAIS', 200, 151);
  y = 157; doc.setFont('helvetica','normal'); doc.setFontSize(7);
  Object.entries(calcularMateriais()).slice(0,28).forEach(([m,q])=>{ doc.text(`${m}: ${q}`,200,y); y+=4.5; });

  doc.setFontSize(7); doc.text('Gerado no RedeCal Pro GPS - GitHub Pages', 12, 198);
  doc.save((($('nomeProjeto').value || 'redecal-pro').replace(/[^a-z0-9]/gi,'_').toLowerCase()) + '.pdf');
}

$('btnGps').onclick = usarGps;
$('btnManual').onclick = abrirManual;
$('btnDesfazer').onclick = () => { pontos.pop(); salvar(); renderizar(); };
$('btnLimpar').onclick = () => { if(confirm('Limpar todos os pontos do projeto?')) { pontos=[]; salvar(); renderizar(); } };
$('btnSalvarPdf').onclick = gerarPdf;

initMap();
