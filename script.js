
let viewer, anno;
let canvases = [];
let currentIndex = 0;
let annotations = [];

async function loadViewer() {
  const manifestUrl = document.getElementById('manifestUrl').value;
  const res = await fetch(manifestUrl);
  const data = await res.json();
  canvases = data.sequences[0].canvases;
  currentIndex = 0;
  loadPage();
}

function loadPage() {
  if (anno) anno.destroy();
  if (viewer) viewer.destroy();

  const canvasData = canvases[currentIndex];
  const infoJson = canvasData.images[0].resource.service['@id'] + '/info.json';

  viewer = OpenSeadragon({
    id: 'viewer',
    prefixUrl: 'https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/',
    tileSources: infoJson,
    showNavigator: false,
    showNavigationControl: false
  });

  viewer.addHandler('open', () => {
    // Initialize Annotorious
    anno = Annotorious(viewer, {
      allowEmpty: false,
      locale: 'ja'
    });
    
    // Enable rectangle drawing by default
    anno.setDrawingTool('rect');
    anno.setDrawingEnabled(true);

    // Listen for annotation creation
    anno.on('createAnnotation', annotation => {
      // Extract xywh from IIIF selector
      const selector = annotation.target.selector.value; 
      const coords = selector.split('=')[1].replace('pixel:', '').split(',').map(Number);
      const [x, y, w, h] = coords;
      const text = annotation.body[0].value;
      const service = canvasData.images[0].resource.service['@id'];
      const iiif_url = service + `/${x},${y},${w},${h}/full/0/default.jpg`;
      const pageId = canvasData['@id'].split('/').pop();

      annotations.push({ page: pageId, x, y, w, h, annotation: text, iiif_url });
      document.getElementById('output').textContent = JSON.stringify(annotations, null, 2);
    });
  });
}

function prevPage() {
  if (currentIndex > 0) {
    currentIndex--;
    loadPage();
  }
}

function nextPage() {
  if (currentIndex < canvases.length - 1) {
    currentIndex++;
    loadPage();
  }
}

function exportToCSV() {
  if (!annotations.length) return alert('注釈がありません');
  const headers = ['page','x','y','w','h','annotation','iiif_url'];
  const rows = annotations.map(a => [
    a.page, a.x, a.y, a.w, a.h, `"${a.annotation}"`, a.iiif_url
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'annotations.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
