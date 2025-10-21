// Interactive Map Tool JavaScript
// Handles drawing, pins, notes, and save/load functionality

let canvas, ctx;
let currentTool = 'cursor';
let isDrawing = false;
let isPanning = false;
let isSpacePressed = false;
let currentMarkerType = 'Danger';
let currentMarkerColor = '#ff4444';
let pins = [];
let drawingHistory = [];
let mapImage = null;
let baseMapImageData = null; // compressed base image
let zoomLevel = 1;
let offsetX = 0;
let offsetY = 0;
let panStart = { x: 0, y: 0 };
let offsetStart = { x: 0, y: 0 };
let saveDebounceId = null;
let selectedMap = 'Farm';

// Shipped base data
let basePins = [];
let baseCategories = [];
let visibleBaseCategories = new Set();
let baseBuildings = [];
let showBuildings = true;
let draftBuildings = [];
let authorAddingBuilding = false;

// Authoring state (always enabled)
let authorMode = true;
let draftBasePins = [];

// Cached project folder handle (not persisted across browser restarts)
let projectFolderHandle = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    canvas = document.getElementById('mapCanvas');
    ctx = canvas.getContext('2d');
    
    // Set up file upload
    document.getElementById('mapUpload').addEventListener('change', handleMapUpload);
    
    // Set up drawing settings
    const bs = document.getElementById('brushSize');
    const doEl = document.getElementById('drawOpacity');
    if (bs) bs.addEventListener('input', function() { const el = document.getElementById('brushSizeValue'); if (el) el.textContent = this.value; });
    if (doEl) doEl.addEventListener('input', function() { const el = document.getElementById('opacityValue'); if (el) el.textContent = this.value; });
    
    // Canvas event listeners
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);

    // Keyboard for pan (Space)
    document.addEventListener('keydown', function(e) { if (e.code === 'Space') isSpacePressed = true; });
    document.addEventListener('keyup', function(e) { if (e.code === 'Space') { isSpacePressed = false; isPanning = false; } });

    // Map selection
    const mapSelect = document.getElementById('mapSelect');
    if (mapSelect) {
        const savedSelected = localStorage.getItem('mapTool:selectedMap');
        if (savedSelected) selectedMap = savedSelected;
        mapSelect.value = selectedMap;
        mapSelect.addEventListener('change', function() {
            saveMapData();
            selectedMap = this.value;
            localStorage.setItem('mapTool:selectedMap', selectedMap);
            pins = [];
            drawingHistory = [];
            mapImage = null;
            baseMapImageData = null;
            canvas.style.display = 'none';
            document.getElementById('noMapMessage').style.display = 'block';
            updatePinsList();
            loadBaseDataForSelectedMap();
            loadMapData();
        });
    }
    
    // Load base shipped data and saved data
    loadBaseDataForSelectedMap();
    loadMapData();
});

// Set active tool
function setTool(tool) {
    currentTool = tool;
    document.querySelectorAll('.tool-button').forEach(btn => { btn.classList.remove('active'); });
    const btnId = 'tool' + tool.charAt(0).toUpperCase() + tool.slice(1);
    const btn = document.getElementById(btnId);
    if (btn) btn.classList.add('active');

    // Update info
    const toolNames = { cursor: 'Hover/click pins to inspect', pin: 'Click to add a pin', draw: 'Click and drag to draw', erase: 'Click and drag to erase' };
    const info = document.getElementById('toolInfo');
    if (info) info.textContent = toolNames[tool] || 'Select a tool';

    // Update cursor
    if (tool === 'draw' || tool === 'erase') canvas.style.cursor = 'crosshair';
    else if (tool === 'pin') canvas.style.cursor = 'pointer';
    else canvas.style.cursor = 'default';
}

// Handle map image upload
function handleMapUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            try {
                const off = document.createElement('canvas');
                off.width = img.width; off.height = img.height;
                const octx = off.getContext('2d'); octx.drawImage(img, 0, 0);
                baseMapImageData = off.toDataURL('image/jpeg', 0.8);
            } catch (err) { baseMapImageData = e.target.result; }
            const baseImg = new Image();
            baseImg.onload = function() {
                mapImage = baseImg;
                canvas.width = baseImg.width; canvas.height = baseImg.height;
                canvas.style.display = 'block';
                document.getElementById('noMapMessage').style.display = 'none';
                renderCanvas();
                saveMapData();
            };
            baseImg.src = baseMapImageData;
        }; img.src = e.target.result;
    }; reader.readAsDataURL(file);
}

// Mouse event handlers
function handleMouseDown(e) {
    if (!mapImage) return;
    if (e && e.stopPropagation) e.stopPropagation();
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    if (isSpacePressed) { isPanning = true; panStart = { x: e.clientX, y: e.clientY }; offsetStart = { x: offsetX, y: offsetY }; }
    else if (currentTool === 'pin') {
        addPin(x, y);
        setTool('cursor');
    } else if (authorMode && authorAddingBuilding) {
        const name = prompt('Building name:','');
        if (name && name.trim()) { draftBuildings.push({ x, y, name: name.trim() }); renderCanvas(); autoSave(); }
        authorAddingBuilding = false;
    } else if (currentTool === 'draw' || currentTool === 'erase') {
        isDrawing = true;
        drawingHistory.push({ tool: currentTool, color: document.getElementById('drawColor').value, size: parseInt(document.getElementById('brushSize').value), opacity: parseInt(document.getElementById('drawOpacity').value) / 100, points: [{x, y}] });
    }
}

function handleMouseMove(e) {
    if (!mapImage) return;
    if (e && e.stopPropagation) e.stopPropagation();
    if (isPanning) { const dx = e.clientX - panStart.x; const dy = e.clientY - panStart.y; offsetX = offsetStart.x + dx; offsetY = offsetStart.y + dy; applyZoom(); return; }
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const currentDrawing = drawingHistory[drawingHistory.length - 1]; currentDrawing.points.push({x, y});
    renderCanvas();
    if (saveDebounceId) clearTimeout(saveDebounceId);
    saveDebounceId = setTimeout(() => { saveMapData(); }, 750);
}

function handleMouseUp(e) { if (e && e.stopPropagation) e.stopPropagation(); if (isPanning) { isPanning = false; return; } if (isDrawing) { isDrawing = false; saveMapData(); } }

// Add a pin (user pins)
function addPin(x, y) {
    const note = prompt('Add a note for this pin (optional):');
    const pin = { id: Date.now(), x, y, type: currentMarkerType, color: currentMarkerColor, note: note || '' };
    pins.push(pin); updatePinsList(); renderCanvas(); saveMapData();
}

// Update pins list in sidebar
function updatePinsList() {
    const pinsList = document.getElementById('pinsList'); if (!pinsList) return;
    const pc = document.getElementById('pinCount'); if (pc) pc.textContent = pins.length;
    if (pins.length === 0) { pinsList.innerHTML = '<p style="color: #666; font-size: 0.85rem; text-align: center;">No pins yet</p>'; return; }
    pinsList.innerHTML = pins.map(pin => `
        <div class="pin-item" style="--pin-color: ${pin.color}" onclick="focusPin(${pin.id})">
            <div class="pin-item-header">
                <span class="pin-type">${pin.type}</span>
                <button class="delete-btn" onclick="event.stopPropagation(); deletePin(${pin.id})">Delete</button>
            </div>
            ${pin.note ? `<div class="pin-note">${escapeHtml(pin.note)}</div>` : ''}
        </div>
    `).join('');
}

function focusPin(pinId) { const pin = pins.find(p => p.id === pinId); if (!pin) return; renderCanvas(); ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(pin.x, pin.y, 30, 0, Math.PI * 2); ctx.stroke(); }
function deletePin(pinId) { pins = pins.filter(p => p.id !== pinId); updatePinsList(); renderCanvas(); saveMapData(); }

// Clear drawing/pins
function clearAllPins() { if (pins.length === 0) return; if (confirm('Clear all pins?')) { pins = []; updatePinsList(); renderCanvas(); saveMapData(); } }
function clearDrawing() { if (drawingHistory.length === 0) return; if (confirm('Clear all drawings?')) { drawingHistory = []; renderCanvas(); saveMapData(); } }

// Render the entire canvas
function renderCanvas() {
    if (!mapImage) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;

    // Buildings
    drawBuildings();
    // Base pins
    drawBasePins();

    // Draw drawings
    drawingHistory.forEach(d => {
        if (d.points.length < 2) return;
        ctx.strokeStyle = d.tool === 'erase' ? 'rgba(0,0,0,1)' : d.color;
        ctx.lineWidth = d.size; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = d.tool === 'erase' ? 1 : d.opacity; ctx.globalCompositeOperation = d.tool === 'erase' ? 'destination-out' : 'source-over';
        ctx.beginPath(); ctx.moveTo(d.points[0].x, d.points[0].y);
        for (let i=1;i<d.points.length;i++) ctx.lineTo(d.points[i].x, d.points[i].y);
        ctx.stroke(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    });

    // User pins
    pins.forEach(pin => {
        ctx.fillStyle = pin.color; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(pin.x, pin.y, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(pin.x, pin.y, 12, 0, Math.PI * 2); ctx.stroke();
        if (pin.note) { ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'; ctx.fillRect(pin.x + 15, pin.y - 10, 20, 20); ctx.fillStyle = '#fff'; ctx.font = '12px Arial'; ctx.fillText('📝', pin.x + 17, pin.y + 5); }
    });

    // Draft base pins on top
    drawDraftBasePinsOnTop();
}

// Draw base pins (shipped)
function drawBasePins() {
    if (!basePins || basePins.length === 0) return;
    const categoryColor = { 'Keys': '#ffaa00', 'Spawns': '#44ff44', 'Extracts': '#00d4ff' };
    basePins.forEach(pin => {
        const cat = pin.category || pin.type || 'Misc';
        if (visibleBaseCategories.size > 0 && !visibleBaseCategories.has(cat)) return;
        const color = pin.color || categoryColor[cat] || '#cccccc';
        ctx.save(); ctx.translate(pin.x, pin.y); ctx.fillStyle = color; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(10, 0); ctx.lineTo(0, 10); ctx.lineTo(-10, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
        if (pin.label) { ctx.fillStyle = '#fff'; ctx.font = `${pin.labelSize || 12}px Arial`; ctx.fillText(pin.label, pin.x + 14, pin.y + 4); }
    });
}

// Draw buildings
function drawBuildings() {
    if (!showBuildings) return; if (!baseBuildings || baseBuildings.length === 0) return;
    ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font = 'bold 18px Segoe UI, Roboto, Arial';
    baseBuildings.forEach(b => { const name=b.name||b.label||''; if (!name) return; ctx.fillStyle='rgba(0,0,0,0.55)'; for(let dx=-2;dx<=2;dx++) for(let dy=-2;dy<=2;dy++){ if(dx===0&&dy===0) continue; ctx.fillText(name,b.x+dx,b.y+dy);} ctx.fillStyle='#66b3ff'; ctx.fillText(name,b.x,b.y); });
    ctx.restore();
}

function drawDraftBasePinsOnTop() {
    if (!draftBasePins || draftBasePins.length === 0) return;
    const categoryColor = { 'Keys': '#ffaa00', 'Spawns': '#44ff44', 'Extracts': '#00d4ff', 'Loot':'#44ff44','Vantage':'#44ffff','Danger':'#ff4444' };
    draftBasePins.forEach(pin => {
        const color = categoryColor[pin.category] || '#cccccc';
        ctx.beginPath(); ctx.arc(pin.x, pin.y, 14, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
        if (pin.label) { ctx.fillStyle = '#fff'; ctx.font = `${pin.labelSize || 12}px Arial`; ctx.fillText(pin.label, pin.x + 20, pin.y + 6); }
    });
}

// Zoom functions
function zoomIn() { zoomLevel *= 1.2; applyZoom(); }
function zoomOut() { zoomLevel /= 1.2; if (zoomLevel < 0.5) zoomLevel = 0.5; applyZoom(); }
function resetZoom() { zoomLevel = 1; offsetX = 0; offsetY = 0; applyZoom(); }
function applyZoom() { canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${zoomLevel})`; const label = document.getElementById('zoomLabel'); if (label) label.textContent = Math.round(zoomLevel * 100) + '%'; }

// Save map data to localStorage
function getStorageKey() { return 'mapToolData:' + selectedMap; }
function saveMapData() {
    const data = { pins: pins, drawings: drawingHistory, baseMapImageData: baseMapImageData };
    try { localStorage.setItem(getStorageKey(), JSON.stringify(data)); } catch (e) { console.error('Failed to save map data:', e); }
}

// Load map data from localStorage
function loadMapData() {
    try {
        const saved = localStorage.getItem(getStorageKey());
        if (!saved) { loadDefaultMapImage(); updatePinsList(); return; }
        const data = JSON.parse(saved);
        pins = data.pins || []; drawingHistory = data.drawings || []; baseMapImageData = data.baseMapImageData || null;
        if (baseMapImageData) { const img = new Image(); img.onload = function(){ mapImage = img; canvas.width=img.width; canvas.height=img.height; canvas.style.display='block'; document.getElementById('noMapMessage').style.display='none'; renderCanvas(); updatePinsList(); }; img.src = baseMapImageData; }
        else { loadDefaultMapImage(); updatePinsList(); }
    } catch (e) { console.error('Failed to load map data:', e); }
}

// Default image loader
function loadDefaultMapImage() {
    const slug = getMapSlug(selectedMap); const path = `assets/maps/${slug}.png`;
    const img = new Image(); img.onload = function(){ try{ const off=document.createElement('canvas'); off.width=img.width; off.height=img.height; const octx=off.getContext('2d'); octx.drawImage(img,0,0); baseMapImageData=off.toDataURL('image/jpeg',0.8);}catch(err){ baseMapImageData=path; } const baseImg=new Image(); baseImg.onload=function(){ mapImage=baseImg; canvas.width=baseImg.width; canvas.height=baseImg.height; canvas.style.display='block'; document.getElementById('noMapMessage').style.display='none'; renderCanvas(); saveMapData(); }; baseImg.src=baseMapImageData; }; img.onerror=function(){ alert('Default image not found at ' + path + '.'); }; img.src=path; }

function getMapSlug(name) { const mapToSlug = { 'Farm': 'farm', 'Valley': 'valley', 'Northridge': 'northridge', 'Armory': 'armory', 'TV Station': 'tv-station' }; return mapToSlug[name] || name.toLowerCase().replace(/\s+/g, '-'); }

// Project folder selection
(function wireProjectFolderSetter(){ document.addEventListener('DOMContentLoaded', () => { const btn=document.getElementById('setProjectFolderBtn'); if(!btn) return; btn.addEventListener('click', async()=>{ try{ if(!('showDirectoryPicker'in window)){ alert('Use a Chromium-based browser.'); return;} alert('Select the project folder (contains index.html).'); projectFolderHandle = await window.showDirectoryPicker(); const hasIndex=await projectFolderHandle.getFileHandle('index.html').then(()=>true).catch(()=>false); if(!hasIndex) alert('Selected folder does not contain index.html.'); else alert('Project folder set.'); }catch(err){ console.error(err); alert('Failed to set project folder: '+err.message);} }); }); })();

async function getProjectFolderHandleOrPrompt(message) { if (projectFolderHandle) return projectFolderHandle; if (!('showDirectoryPicker' in window)) throw new Error('Browser does not support folder selection.'); if (message) alert(message); const dir = await window.showDirectoryPicker(); projectFolderHandle = dir; return dir; }

// Author image attach
(function wireAuthorImageAttach(){ document.addEventListener('DOMContentLoaded', () => { const attachBtn=document.getElementById('attachImageBtn'); const fileInput=document.getElementById('authorImageInput'); if(!attachBtn||!fileInput) return; attachBtn.addEventListener('click', async()=>{ if (draftBasePins.length===0) { alert('Create a pin first.'); return; } fileInput.click(); }); fileInput.addEventListener('change', async(e)=>{ const file=e.target.files&&e.target.files[0]; if(!file) return; try{ const dirHandle=await getProjectFolderHandleOrPrompt('Select project folder. Image will be copied to assets/maps/images/.'); const hasIndex=await dirHandle.getFileHandle('index.html').then(()=>true).catch(()=>false); if(!hasIndex){ const proceed=confirm('Selected folder does not contain index.html. Continue?'); if(!proceed) return; } const assetsDir=await dirHandle.getDirectoryHandle('assets',{create:true}); const mapsDir=await assetsDir.getDirectoryHandle('maps',{create:true}); const imagesDir=await mapsDir.getDirectoryHandle('images',{create:true}); const targetName=`${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`; const fileHandle=await imagesDir.getFileHandle(targetName,{create:true}); const writable=await fileHandle.createWritable(); await writable.write(file); await writable.close(); const last=draftBasePins[draftBasePins.length-1]; last.image=`assets/maps/images/${targetName}`; renderCanvas(); await autoSave(); }catch(err){ console.error(err); alert('Attach failed: '+err.message);} finally{ fileInput.value=''; } }); }); })();

// Export base pins JSON (used by auto-save)
async function exportBasePinsJSON() {
    const merged = (basePins || []).concat(draftBasePins || []);
    const usedCats = new Set((baseCategories && baseCategories.length ? baseCategories : ['Keys','Spawns','Extracts']));
    merged.forEach(p => usedCats.add(p.category || p.type || 'Misc'));
    const payload = { map: selectedMap, image: `assets/maps/${getMapSlug(selectedMap)}.png`, categories: Array.from(usedCats), buildings: (baseBuildings || []).concat(draftBuildings || []), basePins: merged };
    try { localStorage.setItem(getShippedDataKey(), JSON.stringify(payload)); } catch(_) {}
    const dirHandle = await getProjectFolderHandleOrPrompt('Select the project folder (contains index.html). The tool will write into assets/maps/data/.');
    const hasIndex = await dirHandle.getFileHandle('index.html').then(() => true).catch(() => false);
    if (!hasIndex) { const proceed = confirm('Selected folder does not contain index.html. Continue anyway?'); if (!proceed) return; }
    const assetsDir = await dirHandle.getDirectoryHandle('assets', { create: true });
    const mapsDir = await assetsDir.getDirectoryHandle('maps', { create: true });
    const dataDir = await mapsDir.getDirectoryHandle('data', { create: true });
    const fileName = `${getMapSlug(selectedMap)}.json`;
    const fileHandle = await dataDir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable(); await writable.write(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })); await writable.close();
    basePins = merged; baseBuildings = payload.buildings; draftBasePins = []; draftBuildings = []; renderCanvas();
}

async function autoSave() { try { await exportBasePinsJSON(); } catch (e) { console.error('Auto-save failed:', e); } }

// Shipped data cache key
function getShippedDataKey() { return 'mapTool:shippedData:' + getMapSlug(selectedMap); }

// Load base data
function loadBaseDataForSelectedMap() {
    const slug = getMapSlug(selectedMap);
    const url = `assets/maps/data/${slug}.json?t=${Date.now()}`; // cache-bust
    basePins = []; baseCategories = []; baseBuildings = [];
    const togglesRoot = document.getElementById('baseLayerToggles'); const section = document.getElementById('baseLayersSection');
    if (togglesRoot) togglesRoot.innerHTML = ''; if (section) section.style.display = 'block';
    if (togglesRoot) { const bwrap=document.createElement('div'); bwrap.style.display='flex'; bwrap.style.alignItems='center'; bwrap.style.gap='0.5rem'; bwrap.style.marginBottom='0.5rem'; bwrap.style.padding='0.5rem'; bwrap.style.borderRadius='6px'; bwrap.style.backgroundColor='rgba(100, 180, 255, 0.08)'; bwrap.style.border='1px solid rgba(100, 180, 255, 0.3)'; const binput=document.createElement('input'); binput.type='checkbox'; binput.id='bl-buildings'; binput.checked=showBuildings; binput.style.transform='scale(1.2)'; binput.style.accentColor='#66b3ff'; const blabel=document.createElement('label'); blabel.htmlFor='bl-buildings'; blabel.textContent='🏢 Building Names'; blabel.style.color='#b8d9ff'; blabel.style.fontWeight='600'; blabel.style.cursor='pointer'; binput.addEventListener('change',()=>{ showBuildings=!!binput.checked; renderCanvas();}); bwrap.appendChild(binput); bwrap.appendChild(blabel); togglesRoot.appendChild(bwrap);} 
    const applyData = (data) => {
        if (!data) return false;
        basePins = Array.isArray(data.basePins) ? data.basePins : [];
        baseCategories = Array.isArray(data.categories) ? data.categories : [];
        baseBuildings = Array.isArray(data.buildings) ? data.buildings : [];
        const visKey = 'mapTool:visibleCats:' + selectedMap;
        const saved = localStorage.getItem(visKey);
        if (saved) { try { visibleBaseCategories = new Set(JSON.parse(saved)); } catch (_) { visibleBaseCategories = new Set(baseCategories); } }
        else visibleBaseCategories = new Set(baseCategories);
        if (section && togglesRoot) { section.style.display='block'; baseCategories.forEach(cat=>{ const id='bl-'+cat.replace(/[^a-z0-9]/ig,'').toLowerCase(); const wrapper=document.createElement('div'); wrapper.style.display='flex'; wrapper.style.alignItems='center'; wrapper.style.gap='0.5rem'; wrapper.style.marginBottom='0.5rem'; wrapper.style.padding='0.5rem'; wrapper.style.borderRadius='6px'; wrapper.style.backgroundColor='rgba(68, 255, 68, 0.1)'; wrapper.style.border='1px solid rgba(68, 255, 68, 0.3)'; const input=document.createElement('input'); input.type='checkbox'; input.id=id; input.checked=visibleBaseCategories.has(cat); input.style.transform='scale(1.2)'; input.style.accentColor='#44ff44'; const label=document.createElement('label'); label.htmlFor=id; const categoryEmojis={ 'Keys':'🔑','Spawns':'📍','Extracts':'🚪' }; label.textContent=`${categoryEmojis[cat]||'📍'} ${cat}`; label.style.color='#88cc88'; label.style.fontWeight='600'; label.style.cursor='pointer'; input.addEventListener('change',()=>{ if(input.checked) visibleBaseCategories.add(cat); else visibleBaseCategories.delete(cat); localStorage.setItem(visKey, JSON.stringify(Array.from(visibleBaseCategories))); renderCanvas(); }); wrapper.appendChild(input); wrapper.appendChild(label); togglesRoot.appendChild(wrapper); }); }
        renderCanvas(); return true;
    };
    fetch(url, { cache: 'no-store' }).then(r=>r.ok?r.json():null).then(data=>{ if (data) { applyData(data); try{ localStorage.setItem(getShippedDataKey(), JSON.stringify(data)); }catch(_){} return; } try{ const cached=localStorage.getItem(getShippedDataKey()); if(cached){ const parsed=JSON.parse(cached); if(applyData(parsed)) return; } }catch(_){} console.warn('No base data found for', slug); }).catch(()=>{ try{ const cached=localStorage.getItem(getShippedDataKey()); if(cached){ const parsed=JSON.parse(cached); applyData(parsed); } }catch(_){} });
}

// Tooltip hover for pins (always on hover or click)
(function wirePinTooltip(){
    document.addEventListener('DOMContentLoaded', () => {
        const container = document.querySelector('.map-canvas-container'); const tooltip = document.getElementById('pinTooltip'); if (!container || !tooltip) return;
        const pickNearestPin = (e) => {
            const rect = canvas.getBoundingClientRect(); const mxScreen = e.clientX - rect.left; const myScreen = e.clientY - rect.top; const scaleX = rect.width / canvas.width; const scaleY = rect.height / canvas.height;
            let best = null; let bestD2 = Infinity; const consider = [];
            (draftBasePins || []).forEach(p => consider.push({ x:p.x, y:p.y, title:p.label || p.category || 'Pin', notes:p.notes || '', image:p.image || '', type: 'draft', category: p.category, noteSize: p.noteSize }));
            (basePins || []).forEach(p => { const cat=p.category||p.type||'Misc'; if(visibleBaseCategories.size>0 && !visibleBaseCategories.has(cat)) return; consider.push({ x:p.x, y:p.y, title:p.label || cat, notes:p.notes || p.description || '', image:p.image || '', type:'base', category:cat, noteSize: p.noteSize }); });
            (pins || []).forEach(p => consider.push({ x:p.x, y:p.y, title:p.type || 'Pin', notes:p.note || '', image:'', type:'user' }));
            consider.forEach(p=>{ const px=p.x*scaleX, py=p.y*scaleY; const dx=px-mxScreen, dy=py-myScreen; const d2=dx*dx+dy*dy; if(d2<bestD2){bestD2=d2; best=p;} });
            if (best && bestD2 <= (36*36)) return best; return null;
        };
        const buildTooltip = (hit) => {
            let content = '<div class="title">' + escapeHtml(hit.title) + '</div>';
            if (hit.category) content += '<div class="category" style="color:#ffaa44; font-size:0.9rem; margin-bottom:0.5rem;">📌 ' + escapeHtml(hit.category) + '</div>';
            const sizeStyle = hit.noteSize ? ` style=\"font-size:${parseInt(hit.noteSize,10)}px\"` : '';
            if (hit.notes && hit.notes.trim()) content += `<div class="notes"${sizeStyle}>` + escapeHtml(hit.notes) + '</div>'; else content += '<div class="notes" style="color:#888; font-style:italic;">No additional details available</div>';
            if (hit.image && hit.image.trim()) content += '<img class="preview" src="' + hit.image + '" alt="preview"/>';
            return content;
        };
        container.addEventListener('mousemove', (e) => {
            if (!canvas) return; const hit = pickNearestPin(e); if (hit) { tooltip.style.display=''; tooltip.innerHTML = buildTooltip(hit); const crect=container.getBoundingClientRect(); const cx=e.clientX - crect.left; const cy=e.clientY - crect.top; tooltip.style.left=cx+'px'; tooltip.style.top=(cy-10)+'px'; } else { tooltip.style.display='none'; }
        });
        container.addEventListener('mouseleave', () => { if (tooltip) tooltip.style.display='none'; });
        let lastClickedKey=null, tooltipVisible=false;
        container.addEventListener('click', (e) => { if (!canvas) return; const hit = pickNearestPin(e); if (hit) { const key=(hit.type||'pin')+':' +(hit.category||'')+':'+(Math.round(hit.x)+','+Math.round(hit.y))+':'+(hit.title||''); if (lastClickedKey===key && tooltipVisible) { tooltip.style.display='none'; tooltipVisible=false; lastClickedKey=null; } else { tooltip.style.display=''; tooltip.innerHTML = buildTooltip(hit); const crect=container.getBoundingClientRect(); const cx=e.clientX - crect.left; const cy=e.clientY - crect.top; tooltip.style.left=cx+'px'; tooltip.style.top=(cy-10)+'px'; tooltipVisible=true; lastClickedKey=key; } } else { tooltip.style.display='none'; tooltipVisible=false; lastClickedKey=null; } });
    });
})();

// Context menu logic and auto-save
(function wireContextMenu(){
    document.addEventListener('DOMContentLoaded', () => {
        const container = document.querySelector('.map-canvas-container'); const menu = document.getElementById('pinContextMenu'); const tooltip = document.getElementById('pinTooltip'); if (!container || !menu) return;
        let ctxTarget = null;
        const positionMenu = (e) => { const rect=container.getBoundingClientRect(); menu.style.left=(e.clientX-rect.left)+'px'; menu.style.top=(e.clientY-rect.top)+'px'; };
        const hitTest = (e) => { const rect=canvas.getBoundingClientRect(); const mx=(e.clientX-rect.left)*(canvas.width/rect.width); const my=(e.clientY-rect.top)*(canvas.height/rect.height); const all=[]; (draftBasePins||[]).forEach((p,i)=>all.push({src:'draft',i,x:p.x,y:p.y,p})); (basePins||[]).forEach((p,i)=>all.push({src:'base',i,x:p.x,y:p.y,p})); (pins||[]).forEach((p,i)=>all.push({src:'user',i,x:p.x,y:p.y,p})); let best=null,bestD2=Infinity; all.forEach(it=>{ const dx=it.x-mx,dy=it.y-my; const d2=dx*dx+dy*dy; if(d2<bestD2){bestD2=d2; best=it;} }); if (best && bestD2 <= 40*40) return best; return { src:'empty', x:mx, y:my } };
        container.addEventListener('contextmenu', (e) => { if (!canvas) return; e.preventDefault(); tooltip&&(tooltip.style.display='none'); ctxTarget = hitTest(e); positionMenu(e); menu.style.display=''; });
        document.addEventListener('click', (e) => { if (menu.contains(e.target)) return; menu.style.display='none'; });
        const ensureProject = async () => { try { await getProjectFolderHandleOrPrompt('Select the project folder (contains index.html).'); } catch(_) {} };
        const addPinAt = async (category, x, y) => { const title=prompt('Title:', '')||''; const notes=prompt('Notes/details:', '')||''; draftBasePins.push({ x, y, category, label:title, notes, image:'', labelSize:12, noteSize:14 }); renderCanvas(); await ensureProject(); await autoSave(); };
        const editPin = async (target) => { if (!target || target.src==='empty') return; const p = target.p; const newTitle = prompt('Edit title:', p.label || p.type || ''); if (newTitle === null) return; const newNotes = prompt('Edit notes:', p.notes || p.note || ''); if (target.src==='draft'||target.src==='base') { p.label = newTitle; p.notes = newNotes || ''; } else if (target.src==='user') { p.note = newNotes || ''; p.type = newTitle || p.type; } renderCanvas(); await ensureProject(); await autoSave(); };
        const adjustNoteSize = async (target, delta) => { if (!target || target.src==='empty') return; const p=target.p; let size = p.noteSize || 14; size = Math.max(10, Math.min(32, size + delta)); p.noteSize = size; renderCanvas(); await ensureProject(); await autoSave(); };
        const adjustLabelSize = async (target, delta) => { if (!target || target.src==='empty') return; const p=target.p; let size = p.labelSize || 12; size = Math.max(10, Math.min(32, size + delta)); p.labelSize = size; renderCanvas(); await ensureProject(); await autoSave(); };
        const doDelete = async (target) => { if (!target) return; if (target.src === 'draft') { draftBasePins.splice(target.i,1); } else if (target.src === 'base') { basePins.splice(target.i,1); } else if (target.src === 'user') { pins.splice(target.i,1); } renderCanvas(); await ensureProject(); await autoSave(); };
        const doMove = async (target) => { if (!target || target.src==='empty') return; alert('Click the new location.'); let moving=true; const onClick=async(ev)=>{ if(!moving) return; moving=false; const rect=canvas.getBoundingClientRect(); const nx=(ev.clientX-rect.left)*(canvas.width/rect.width); const ny=(ev.clientY-rect.top)*(canvas.height/rect.height); if (target.src==='draft') { draftBasePins[target.i].x=nx; draftBasePins[target.i].y=ny; } else if (target.src==='base') { basePins[target.i].x=nx; basePins[target.i].y=ny; } else if (target.src==='user') { pins[target.i].x=nx; pins[target.i].y=ny; } renderCanvas(); await ensureProject(); await autoSave(); container.removeEventListener('click', onClick, true); }; container.addEventListener('click', onClick, true); };
        menu.addEventListener('click', async (e) => { const btn = e.target.closest('button[data-act]'); if (!btn) return; const act=btn.getAttribute('data-act'); const t=ctxTarget; ctxTarget=null; menu.style.display='none'; if (act.startsWith('add-')) { const catMap={ 'add-keys':'Keys','add-spawns':'Spawns','add-extracts':'Extracts','add-loot':'Loot','add-vantage':'Vantage','add-danger':'Danger' }; const cat=catMap[act]; await addPinAt(cat, t.x, t.y); return; } if (act==='add-building') { const name=prompt('Building name:',''); if(name&&name.trim()){ draftBuildings.push({x:t.x,y:t.y,name:name.trim()}); renderCanvas(); await ensureProject(); await autoSave(); } return; } if (act==='delete') { await doDelete(t); return; } if (act==='move') { await doMove(t); return; } if (act==='show') { /* tooltip shows on hover/click */ return; } if (act==='edit') { await editPin(t); return; } if (act==='note-plus') { await adjustNoteSize(t, +2); return; } if (act==='note-minus') { await adjustNoteSize(t, -2); return; } if (act==='label-plus') { await adjustLabelSize(t, +2); return; } if (act==='label-minus') { await adjustLabelSize(t, -2); return; } });
    });
})();

