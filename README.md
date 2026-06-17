# RedeCal Pro GPS

Aplicativo web para GitHub Pages com:

- Mapa interativo com Leaflet/OpenStreetMap
- Marcação de pontos por clique, GPS ou coordenadas manuais
- Desenho de rede MT com linha vermelha tracejada
- Desenho de rede BT com linha vermelha contínua
- Cabo de baixa tensão com linha azul contínua
- Medição de distância entre pontos e distância total
- Seleção de cabo MT: 2 AWG, 1/0 AWG, 4/0 AWG, 336 MCM
- Seleção de cabo BT multiplexado
- Estruturas MT e BT, incluindo S1, S3 e S4
- Lista automática de materiais
- Exportação somente em PDF
- Salvamento local do projeto no navegador

## Como publicar no GitHub Pages

1. Extraia o arquivo ZIP.
2. Envie `index.html`, `style.css`, `script.js` e `README.md` para o repositório.
3. No GitHub, acesse **Settings > Pages**.
4. Em **Build and deployment**, selecione:
   - Source: Deploy from a branch
   - Branch: main
   - Folder: /root
5. Clique em Save.

## Observações

- O GPS só funciona em HTTPS, por isso funciona no GitHub Pages.
- O PDF é gerado sem depender de captura do mapa, evitando erro comum em celulares e WebView.
