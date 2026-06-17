let map;
let pontos = [];
let marcadores = [];
let linhasMT = [];
let linhasBT = [];

const materiaisEstruturas = {
  S1: [
    "1 armação simples",
    "1 parafuso 16x250 mm",
    "1 isolador roldana",
    "1 arruela"
  ],
  S3: [
    "1 parafuso olhal 16x250 mm",
    "2 arruelas"
  ],
  S4: [
    "1 parafuso olhal 16x250 mm",
    "2 arruelas",
    "1 porca olhal"
  ],
  N1: ["Estrutura primária N1"],
  CE2: ["Estrutura CE2"]
};

window.addEventListener("load", iniciarMapa);

function iniciarMapa() {
  map = L.map("map").setView([-6.078696, -42.735803], 16);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 22,
    attribution: "© OpenStreetMap"
  }).addTo(map);

  map.on("click", function (e) {
    adicionarPonto(e.latlng.lat, e.latlng.lng);
  });

  carregarProjetoLocal();
}

function adicionarPontoGPS() {
  if (!navigator.geolocation) {
    alert("GPS não disponível neste aparelho.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    function (pos) {
      adicionarPonto(pos.coords.latitude, pos.coords.longitude);
      map.setView([pos.coords.latitude, pos.coords.longitude], 18);
    },
    function () {
      alert("Não foi possível obter a localização GPS.");
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

function adicionarPontoManual() {
  alert("Toque no mapa no local onde deseja adicionar o ponto.");
}

function adicionarPonto(lat, lng) {
  const numero = pontos.length + 1;
  const nome = document.getElementById("nomePonto").value.trim() || `P${numero}`;

  const ponto = {
    nome,
    lat,
    lng,
    tipoRede: document.getElementById("tipoRede").value,
    caboMT: document.getElementById("caboMT").value,
    estrutura: document.getElementById("estrutura").value,
    tipoPoste: document.getElementById("tipoPoste").value.trim() || "-",
    distanciaAnterior: 0
  };

  if (pontos.length > 0) {
    const anterior = pontos[pontos.length - 1];
    ponto.distanciaAnterior = calcularDistancia(anterior.lat, anterior.lng, ponto.lat, ponto.lng);
  }

  pontos.push(ponto);
  document.getElementById("nomePonto").value = "";

  atualizarProjeto();
}

function atualizarProjeto() {
  desenharMarcadores();
  desenharRede();
  atualizarListaPontos();
  atualizarDistanciaTotal();
  salvarProjetoLocal();
}

function desenharMarcadores() {
  marcadores.forEach(marcador => map.removeLayer(marcador));
  marcadores = [];

  pontos.forEach((ponto, index) => {
    const marcador = L.marker([ponto.lat, ponto.lng]).addTo(map);
    marcador.bindPopup(`
      <strong>${ponto.nome}</strong><br>
      Rede: ${ponto.tipoRede}<br>
      Estrutura: ${ponto.estrutura}<br>
      Poste: ${ponto.tipoPoste}<br>
      Cabo MT: ${ponto.caboMT}<br>
      Distância anterior: ${ponto.distanciaAnterior.toFixed(2)} m
    `);
    marcadores.push(marcador);
  });
}

function limparLinhasRede() {
  linhasMT.forEach(linha => map.removeLayer(linha));
  linhasBT.forEach(linha => map.removeLayer(linha));
  linhasMT = [];
  linhasBT = [];
}

function desenharRede() {
  limparLinhasRede();

  if (!pontos || pontos.length < 2) return;

  for (let i = 0; i < pontos.length - 1; i++) {
    const p1 = pontos[i];
    const p2 = pontos[i + 1];

    const coords = [
      [p1.lat, p1.lng],
      [p2.lat, p2.lng]
    ];

    const temMT =
      p1.tipoRede === "MT" ||
      p2.tipoRede === "MT" ||
      p1.tipoRede === "MT+BT" ||
      p2.tipoRede === "MT+BT";

    const temBT =
      p1.tipoRede === "BT" ||
      p2.tipoRede === "BT" ||
      p1.tipoRede === "MT+BT" ||
      p2.tipoRede === "MT+BT";

    if (temMT) {
      const linhaMT = L.polyline(coords, {
        color: "red",
        weight: 4,
        dashArray: "10, 10",
        opacity: 0.9
      }).addTo(map);
      linhasMT.push(linhaMT);
    }

    if (temBT) {
      const linhaBT = L.polyline(coords, {
        color: "blue",
        weight: 4,
        opacity: 0.9
      }).addTo(map);
      linhasBT.push(linhaBT);
    }
  }
}

function atualizarListaPontos() {
  const lista = document.getElementById("listaPontos");

  if (pontos.length === 0) {
    lista.innerHTML = "Nenhum ponto adicionado.";
    return;
  }

  lista.innerHTML = pontos.map((p, i) => `
    <div class="item-ponto">
      <strong>${i + 1}. ${p.nome}</strong><br>
      Rede: ${p.tipoRede} | Estrutura: ${p.estrutura} | Poste: ${p.tipoPoste}<br>
      Cabo MT: ${p.caboMT}<br>
      Coordenadas: ${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}<br>
      Distância anterior: ${p.distanciaAnterior.toFixed(2)} m
    </div>
  `).join("");
}

function atualizarDistanciaTotal() {
  const total = pontos.reduce((soma, p) => soma + Number(p.distanciaAnterior || 0), 0);
  document.getElementById("distanciaTotal").textContent = `${total.toFixed(2)} m`;
}

function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function gerarListaMateriais() {
  const materiais = {};

  pontos.forEach(ponto => {
    const itens = materiaisEstruturas[ponto.estrutura] || [];
    itens.forEach(item => {
      materiais[item] = (materiais[item] || 0) + 1;
    });
  });

  return materiais;
}

async function salvarPDF() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p", "mm", "a4");

  const margem = 15;
  let y = 18;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("RedeCalc Pro GPS", margem, y);

  y += 8;
  pdf.setFontSize(12);
  pdf.text("Memorial Descritivo do Projeto", margem, y);

  y += 10;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, margem, y);

  y += 7;
  const distanciaTotal = pontos.reduce((soma, p) => soma + Number(p.distanciaAnterior || 0), 0);
  pdf.text(`Distância total: ${distanciaTotal.toFixed(2)} m`, margem, y);

  y += 10;
  pdf.setFont("helvetica", "bold");
  pdf.text("Legenda:", margem, y);
  y += 6;
  pdf.setFont("helvetica", "normal");
  pdf.text("MT: linha vermelha tracejada", margem, y);
  y += 5;
  pdf.text("BT: linha azul contínua", margem, y);

  y += 10;
  pdf.setFont("helvetica", "bold");
  pdf.text("Pontos do Projeto", margem, y);
  y += 8;

  if (pontos.length === 0) {
    pdf.setFont("helvetica", "normal");
    pdf.text("Nenhum ponto cadastrado.", margem, y);
  } else {
    pontos.forEach((ponto, index) => {
      if (y > 270) {
        pdf.addPage();
        y = 18;
      }

      pdf.setFont("helvetica", "bold");
      pdf.text(`${index + 1}. ${ponto.nome}`, margem, y);
      y += 5;

      pdf.setFont("helvetica", "normal");
      pdf.text(`Rede: ${ponto.tipoRede} | Estrutura: ${ponto.estrutura} | Poste: ${ponto.tipoPoste}`, margem, y);
      y += 5;
      pdf.text(`Cabo MT: ${ponto.caboMT}`, margem, y);
      y += 5;
      pdf.text(`Coordenadas: ${ponto.lat.toFixed(6)}, ${ponto.lng.toFixed(6)}`, margem, y);
      y += 5;
      pdf.text(`Distância do ponto anterior: ${ponto.distanciaAnterior.toFixed(2)} m`, margem, y);
      y += 8;
    });
  }

  if (y > 230) {
    pdf.addPage();
    y = 18;
  }

  y += 5;
  pdf.setFont("helvetica", "bold");
  pdf.text("Lista de Materiais Consolidada", margem, y);
  y += 8;

  const materiais = gerarListaMateriais();
  pdf.setFont("helvetica", "normal");

  if (Object.keys(materiais).length === 0) {
    pdf.text("Nenhum material calculado.", margem, y);
  } else {
    Object.entries(materiais).forEach(([item, qtd]) => {
      if (y > 275) {
        pdf.addPage();
        y = 18;
      }
      pdf.text(`${qtd}x - ${item}`, margem, y);
      y += 6;
    });
  }

  pdf.save("memorial-redecalc-pro-gps.pdf");
}

function salvarProjetoLocal() {
  localStorage.setItem("redecalc_pontos", JSON.stringify(pontos));
}

function carregarProjetoLocal() {
  const salvo = localStorage.getItem("redecalc_pontos");
  if (salvo) {
    pontos = JSON.parse(salvo);
    atualizarProjeto();

    if (pontos.length > 0) {
      const ultimo = pontos[pontos.length - 1];
      map.setView([ultimo.lat, ultimo.lng], 17);
    }
  } else {
    atualizarListaPontos();
  }
}

function limparProjeto() {
  if (!confirm("Deseja apagar todo o projeto?")) return;
  pontos = [];
  localStorage.removeItem("redecalc_pontos");
  atualizarProjeto();
}
