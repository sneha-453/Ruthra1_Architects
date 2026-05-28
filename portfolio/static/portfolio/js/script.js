/* ============================================================
   STATE & CONSTANTS
============================================================ */
const MAX_FILE_SIZE_MB = 8;

let galleryItems = [];
let pendingFiles = [];
let currentFilter = 'all';
let lightboxIndex = 0;
let visibleItems = [];
let isAdminLoggedIn = false;
let gallerySwiper = null;

/* ============================================================
   CSRF TOKEN HELPER
============================================================ */
function getCSRFToken() {
  // Check the cookie first to get the most up-to-date token
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, 10) === 'csrftoken=') {
        cookieValue = decodeURIComponent(cookie.substring(10));
        break;
      }
    }
  }
  if (cookieValue) return cookieValue;

  // Fallback to meta tag
  const meta = document.querySelector('meta[name="csrf-token"]');
  if (meta) return meta.getAttribute('content');
  
  return null;
}

/* ============================================================
   DATABASE SYNC & BOOTSTRAP
============================================================ */
function loadGallery() {
  try {
    // Read from the bootstrapped JSON data element in the HTML
    const dataEl = document.getElementById('gallery-data');
    if (dataEl && dataEl.textContent.trim()) {
      galleryItems = JSON.parse(dataEl.textContent);
      galleryItems.sort((a,b)=>(a.order||0)-(b.order||0));
    } else {
      galleryItems = [];
    }
  } catch(e) {
    console.error("Error loading bootstrapped gallery data:", e);
    galleryItems = [];
  }
  
  // Render dynamic category filter buttons
  renderCategoryFilters();
}

async function syncGallery() {
  try {
    const res = await fetch('/api/gallery/');
    if (res.ok) {
      galleryItems = await res.json();
      galleryItems.sort((a,b)=>(a.order||0)-(b.order||0));
      renderCategoryFilters();
      renderGallery();
      if (document.getElementById('adminDrawer').classList.contains('open')) {
        renderManageList();
        updateAdminStats();
      }
    }
  } catch(e) {
    console.error("Failed to sync gallery with server: ", e);
  }
}

/* ============================================================
   GALLERY FILTERS (DYNAMIC CATEGORIES)
============================================================ */
function renderCategoryFilters() {
  const filterContainer = document.getElementById('galleryFilters');
  if (!filterContainer) return;

  // Compile unique categories from visible items
  const uniqueCats = ['all', ...new Set(galleryItems.filter(item => item.visible).map(item => item.category))];

  filterContainer.innerHTML = uniqueCats.map(cat => {
    const label = cat === 'all' ? 'All' : catLabel(cat);
    const activeClass = cat === currentFilter ? 'active' : '';
    return `<button class="filter-btn ${activeClass}" data-filter="${cat}" role="tab" aria-selected="${cat === currentFilter}" tabindex="0">${label}</button>`;
  }).join('');

  // Click & Keyboard handlers
  filterContainer.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      const swiperContainer = document.querySelector('.gallery-swiper');
      
      // Client-side fade out/in animation for filtering
      if (swiperContainer) {
        swiperContainer.classList.add('filtering');
      }

      setTimeout(() => {
        currentFilter = filter;
        renderGallery();
        
        filterContainer.querySelectorAll('.filter-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.filter === filter);
          b.setAttribute('aria-selected', b.dataset.filter === filter);
        });

        if (swiperContainer) {
          swiperContainer.classList.remove('filtering');
        }
      }, 300);
    });

    btn.addEventListener('keydown', e => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        btn.click();
      }
    });
  });
}

/* ============================================================
   GALLERY RENDER (SWIPER SLIDER SYSTEM)
============================================================ */
function renderGallery(filter) {
  currentFilter = filter || currentFilter;
  const grid = document.getElementById('galleryGrid');
  const empty = document.getElementById('galleryEmpty');
  const countBadge = document.getElementById('galleryCount');
  
  // Filter visible items
  const filtered = galleryItems.filter(item => {
    const isVisible = item.visible;
    const catMatch = (currentFilter === 'all' || item.category === currentFilter);
    return isVisible && catMatch;
  });
  
  visibleItems = filtered;
  countBadge.textContent = filtered.length+' image'+(filtered.length!==1?'s':'');
  
  if (!filtered.length) { 
    grid.innerHTML=''; 
    empty.style.display='block'; 
    if (gallerySwiper) {
      gallerySwiper.destroy(true, true);
      gallerySwiper = null;
    }
    return; 
  }
  
  empty.style.display='none';
  grid.innerHTML = filtered.map((item,idx)=>`
    <div class="swiper-slide" data-index="${idx}" data-id="${item.id}" tabindex="0" aria-label="Project slide ${idx + 1}">
      <img src="${item.src}" alt="${item.title||catLabel(item.category)}" loading="lazy">
      <div class="slide-overlay">
        <div class="slide-overlay-content">
          <span class="slide-overlay-cat">${catLabel(item.category)}</span>
          ${item.title?`<h3 class="slide-overlay-title">${item.title}</h3>`:''}
          <div class="slide-overlay-meta">
            <span><i class="fas fa-expand-alt"></i> View Details</span>
          </div>
          <div class="slide-overlay-divider"></div>
        </div>
      </div>
    </div>`).join('');
    
  // Initialize/rebuild the premium Swiper slider
  initGallerySwiper();
}

/* ============================================================
   SWIPER INITIALIZATION
============================================================ */
function initGallerySwiper() {
  if (gallerySwiper) {
    gallerySwiper.destroy(true, true);
    gallerySwiper = null;
  }

  const swiperContainer = document.querySelector('.gallery-swiper');
  if (!swiperContainer) return;

  const slideCount = document.querySelectorAll('.gallery-swiper .swiper-slide').length;
  // loop requires a minimum slide count
  const canLoop = slideCount >= 3;

  gallerySwiper = new Swiper('.gallery-swiper', {
    centeredSlides: true,
    loop: canLoop,
    speed: 3000,
    autoplay: {
      delay: 0,
      disableOnInteraction: false,
      pauseOnMouseEnter: true
    },
    navigation: {
      prevEl: '#swiperPrevBtn',
      nextEl: '#swiperNextBtn',
    },
    keyboard: {
      enabled: true,
      onlyInViewport: true,
    },
    a11y: {
      prevSlideMessage: 'Previous project',
      nextSlideMessage: 'Next project',
      firstSlideMessage: 'This is the first project',
      lastSlideMessage: 'This is the last project',
    },
    breakpoints: {
      320: {
        slidesPerView: 1.2,
        spaceBetween: 16
      },
      768: {
        slidesPerView: 1.8,
        spaceBetween: 28
      },
      1024: {
        slidesPerView: 3,
        spaceBetween: 48
      }
    },
    on: {
      slideChange: function() {
        preloadAdjacentImages(this.realIndex);
      }
    }
  });

  // Slide click routing (handles both normal & cloned slides)
  gallerySwiper.on('click', function(swiper, event) {
    const slide = event.target.closest('.swiper-slide');
    if (!slide) return;
    const indexAttr = slide.getAttribute('data-index');
    if (indexAttr !== null) {
      openLightbox(parseInt(indexAttr));
    }
  });

  // Immediate Pause on Hover
  swiperContainer.addEventListener('mouseenter', handleSwiperMouseEnter);
  swiperContainer.addEventListener('mouseleave', handleSwiperMouseLeave);

  // Touch controls for mobile to suspend autoplay
  gallerySwiper.on('touchStart', () => {
    if (gallerySwiper && gallerySwiper.autoplay) gallerySwiper.autoplay.stop();
  });
  gallerySwiper.on('touchEnd', () => {
    if (gallerySwiper && gallerySwiper.autoplay) gallerySwiper.autoplay.start();
  });
}

function handleSwiperMouseEnter() {
  if (gallerySwiper && gallerySwiper.autoplay) {
    gallerySwiper.autoplay.stop();
  }
}

function handleSwiperMouseLeave() {
  if (gallerySwiper && gallerySwiper.autoplay) {
    gallerySwiper.autoplay.start();
  }
}

function catLabel(cat) { 
  return {villas:'Villas',interiors:'Interiors',commercial:'Commercial',renovation:'Renovation'}[cat]||cat; 
}

/* ============================================================
   ADMIN STATS
============================================================ */
function updateAdminStats() {
  document.getElementById('statTotal').textContent=galleryItems.length;
  document.getElementById('statVillas').textContent=galleryItems.filter(i=>i.category==='villas').length;
  document.getElementById('statInteriors').textContent=galleryItems.filter(i=>i.category==='interiors').length;
  document.getElementById('statOther').textContent=galleryItems.filter(i=>i.category==='commercial'||i.category==='renovation').length;
}

/* ============================================================
   MANAGE LIST
============================================================ */
function renderManageList() {
  const list = document.getElementById('manageList');
  if (!galleryItems.length) { 
    list.innerHTML='<div class="manage-empty"><i class="fas fa-images"></i>No images in gallery yet.</div>'; 
    return; 
  }
  
  list.innerHTML = galleryItems.map(item=>`
    <div class="manage-item" data-id="${item.id}">
      <i class="fas fa-grip-vertical manage-drag"></i>
      <img class="manage-thumb" src="${item.src}" alt="">
      <div class="manage-info">
        <div class="manage-title">${item.title||'Untitled'}</div>
        <div class="manage-cat">${catLabel(item.category)}</div>
      </div>
      <div class="manage-actions">
        <button class="manage-toggle ${item.visible?'':'hidden-img'}" data-id="${item.id}" title="${item.visible?'Hide':'Show'}">
          <i class="fas fa-eye${item.visible?'':'-slash'}"></i>
        </button>
        <button class="manage-delete" data-id="${item.id}" title="Delete">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>`).join('');
    
  // Toggle visibility AJAX
  list.querySelectorAll('.manage-toggle').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const id = btn.dataset.id;
      try {
        const res = await fetch('/api/gallery/toggle/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
          },
          body: JSON.stringify({ id: id })
        });
        const data = await res.json();
        if (res.ok && data.status === 'success') {
          const item = galleryItems.find(i=>i.id===id);
          if (item) {
            item.visible = data.visible;
            renderGallery();
            renderManageList();
            updateAdminStats();
            showToast(item.visible ? 'Image visible on site.' : 'Image hidden from site.', 'info');
          }
        } else {
          showToast(data.message || 'Failed to toggle visibility.', 'error');
        }
      } catch(e) {
        showToast('Failed to connect to server.', 'error');
      }
    });
  });
  
  // Delete AJAX
  list.querySelectorAll('.manage-delete').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      if(!confirm('Delete this image permanently from database?')) return;
      const id=btn.dataset.id;
      try {
        const res = await fetch('/api/gallery/delete/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
          },
          body: JSON.stringify({ id: id })
        });
        const data = await res.json();
        if (res.ok && data.status === 'success') {
          galleryItems = galleryItems.filter(i=>i.id!==id);
          renderGallery();
          renderManageList();
          updateAdminStats();
          showToast('Image deleted from database.', 'error');
        } else {
          showToast(data.message || 'Failed to delete image.', 'error');
        }
      } catch(e) {
        showToast('Failed to connect to server.', 'error');
      }
    });
  });
}

/* ============================================================
   FILE INPUT PREVIEWS
============================================================ */
const uploadZone=document.getElementById('uploadZone');
const fileInput=document.getElementById('fileInput');
const previewGrid=document.getElementById('previewGrid');
const uploadForm=document.getElementById('uploadForm');

uploadZone.addEventListener('dragover',e=>{e.preventDefault();uploadZone.classList.add('drag-over');});
uploadZone.addEventListener('dragleave',()=>uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop',e=>{e.preventDefault();uploadZone.classList.remove('drag-over');handleFiles(Array.from(e.dataTransfer.files).filter(f=>f.type.startsWith('image/')));});
fileInput.addEventListener('change',()=>handleFiles(Array.from(fileInput.files)));

function handleFiles(files) {
  if(!files.length) return;
  let valid=files.filter(f=>f.size<=MAX_FILE_SIZE_MB*1024*1024);
  const skip=files.length-valid.length;
  if(skip) showToast(`${skip} file(s) exceed ${MAX_FILE_SIZE_MB}MB and were skipped.`,'error');
  if(!valid.length) return;
  
  valid.forEach(file=>{
    const reader=new FileReader();
    reader.onload=e=>{
      const id='img_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);
      // We store the raw file object alongside the base64 source for preview
      pendingFiles.push({id, src:e.target.result, name:file.name, rawFile: file});
      renderPreview();
    };
    reader.readAsDataURL(file);
  });
  uploadForm.style.display='block';
  fileInput.value='';
}

function renderPreview() {
  previewGrid.innerHTML=pendingFiles.map((f,idx)=>`
    <div class="preview-thumb">
      <img src="${f.src}" alt="">
      <button class="preview-remove" data-idx="${idx}"><i class="fas fa-times"></i></button>
      <div class="preview-cat-badge" id="badge_${idx}">—</div>
    </div>`).join('');
    
  previewGrid.querySelectorAll('.preview-remove').forEach(btn=>{
    btn.addEventListener('click',()=>{ 
      pendingFiles.splice(parseInt(btn.dataset.idx),1); 
      if(!pendingFiles.length){
        previewGrid.innerHTML='';
        uploadForm.style.display='none';
      } else {
        renderPreview();
      }
    });
  });
  updatePreviewBadges();
}

function updatePreviewBadges() {
  const cat=document.getElementById('uploadCategory').value;
  document.querySelectorAll('[id^="badge_"]').forEach(el=>el.textContent=catLabel(cat));
}

document.getElementById('uploadCategory').addEventListener('change',updatePreviewBadges);
document.getElementById('clearPreviewBtn').addEventListener('click',()=>{ pendingFiles=[]; previewGrid.innerHTML=''; uploadForm.style.display='none'; });

/* ============================================================
   UPLOAD AJAX (MULTIPART FORMDATA)
============================================================ */
document.getElementById('uploadBtn').addEventListener('click',async()=>{
  if(!pendingFiles.length){showToast('Please select at least one image.','error');return;}
  const category=document.getElementById('uploadCategory').value;
  const title=document.getElementById('uploadTitle').value.trim();
  const desc=document.getElementById('uploadDesc').value.trim();
  const progressWrap=document.getElementById('progressWrap');
  const progressFill=document.getElementById('progressFill');
  const progressStatus=document.getElementById('progressStatus');
  const btn=document.getElementById('uploadBtn');
  
  btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> UPLOADING...';
  progressWrap.classList.add('show');
  
  const count = pendingFiles.length;
  let successCount = 0;
  let lastError = '';
  
  for(let i=0; i<count; i++){
    const file = pendingFiles[i];
    const formData = new FormData();
    formData.append('image', file.rawFile);
    formData.append('category', category);
    formData.append('title', title || file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
    formData.append('description', desc);
    
    try {
      const res = await fetch('/api/gallery/upload/', {
        method: 'POST',
        headers: {
          'X-CSRFToken': getCSRFToken()
        },
        body: formData
      });
      
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (res.ok && data.status === 'success') {
          successCount++;
        } else {
          console.error("Upload failed for file " + file.name, data);
          lastError = data.message || `Error: ${res.status}`;
        }
      } else {
        const text = await res.text();
        console.error("Received non-JSON response:", text);
        if (res.status === 403) {
          lastError = "Security check failed (CSRF token error). Please log out and log in again.";
        } else if (res.status === 401 || text.includes("login")) {
          lastError = "Session expired or unauthorized. Please log in again.";
        } else {
          lastError = `Server error (${res.status}).`;
        }
      }
    } catch(e) {
      console.error("Network error uploading file " + file.name, e);
      lastError = "Network error or connection lost.";
    }
    
    const pct=Math.round(((i+1)/count)*100);
    progressFill.style.width=pct+'%';
    progressStatus.textContent=`Processing ${i+1} of ${count}...`;
  }
  
  // Sync the client list with database state
  await syncGallery();
  
  pendingFiles=[]; previewGrid.innerHTML=''; uploadForm.style.display='none';
  document.getElementById('uploadTitle').value=''; document.getElementById('uploadDesc').value='';
  progressWrap.classList.remove('show'); progressFill.style.width='0%';
  btn.disabled=false; btn.innerHTML='<i class="fas fa-upload"></i> ADD TO GALLERY';
  
  if (successCount === count) {
    showToast(`${count} image(s) saved to SQL Database!`, 'success');
  } else if (successCount > 0) {
    showToast(`Successfully uploaded ${successCount} of ${count} images. Error: ${lastError}`, 'info');
  } else {
    showToast(`Upload failed: ${lastError}`, 'error');
  }
  switchTab('manage');
  document.querySelector('.filter-btn[data-filter="all"]').click();
});

/* ============================================================
   GALLERY FILTERS
============================================================ */
document.querySelectorAll('.filter-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    renderGallery(btn.dataset.filter);
  });
});

/* ============================================================
   LIGHTBOX
============================================================ */
/* ============================================================
   LIGHTBOX MODAL & PRELOADING
============================================================ */
function openLightbox(idx){
  lightboxIndex=idx;
  const lightbox = document.getElementById('lightbox');
  lightbox.classList.add('active');
  document.body.style.overflow='hidden';
  
  updateLightbox();
  
  // A11y Focus management
  lightbox.focus();
  lightbox.addEventListener('keydown', trapLightboxFocus);
}

function trapLightboxFocus(e) {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox.classList.contains('active')) return;
  
  const focusables = lightbox.querySelectorAll('button, [tabindex="0"]');
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  
  if (e.key === 'Tab') {
    if (e.shiftKey) {
      if (document.activeElement === first) {
        last.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  }
}

function updateLightbox(){
  const item=visibleItems[lightboxIndex];
  if(!item) return;
  
  const img = document.getElementById('lightboxImg');
  const title = document.getElementById('lightboxTitle');
  const cat = document.getElementById('lightboxCat');
  const desc = document.getElementById('lightboxDesc');
  const loc = document.getElementById('lightboxLoc');

  // Trigger cinematic opacity crossfade state
  img.classList.add('changing');
  
  setTimeout(() => {
    img.src = item.src;
    img.alt = item.title || catLabel(item.category);
    
    title.textContent = item.title || 'Untitled Project';
    cat.textContent = catLabel(item.category);
    desc.textContent = item.desc || 'A signature high-end design by Ruthra Design Studio. We carefully craft structural architecture and refined interior layouts.';
    
    // Support dynamic or demo location markers
    if (item.location) {
      loc.style.display = 'flex';
      loc.querySelector('span').textContent = item.location;
    } else {
      const demoLocations = ['India', 'Oman', 'Gulf Region'];
      loc.style.display = 'flex';
      loc.querySelector('span').textContent = demoLocations[lightboxIndex % 3];
    }

    img.onload = () => {
      img.classList.remove('changing');
    };
    
    if (img.complete) {
      img.classList.remove('changing');
    }

    // Preload neighboring elements
    preloadNeighboringImages();
  }, 150);

  document.getElementById('lightboxPrev').style.opacity=lightboxIndex>0?'1':'0.3';
  document.getElementById('lightboxNext').style.opacity=lightboxIndex<visibleItems.length-1?'1':'0.3';
}

function preloadNeighboringImages() {
  if (lightboxIndex > 0 && visibleItems[lightboxIndex - 1]) {
    const prevImg = new Image();
    prevImg.src = visibleItems[lightboxIndex - 1].src;
  }
  if (lightboxIndex < visibleItems.length - 1 && visibleItems[lightboxIndex + 1]) {
    const nextImg = new Image();
    nextImg.src = visibleItems[lightboxIndex + 1].src;
  }
}

function preloadAdjacentImages(realIndex) {
  if (visibleItems[realIndex + 1]) {
    const img = new Image();
    img.src = visibleItems[realIndex + 1].src;
  }
  if (visibleItems[realIndex - 1]) {
    const img = new Image();
    img.src = visibleItems[realIndex - 1].src;
  }
}

function closeLightbox(){
  const lightbox = document.getElementById('lightbox');
  lightbox.classList.remove('active');
  document.body.style.overflow='';
  lightbox.removeEventListener('keydown', trapLightboxFocus);
}

document.getElementById('lightboxClose').addEventListener('click',closeLightbox);
document.getElementById('lightbox').addEventListener('click',e=>{ if(e.target===document.getElementById('lightbox')) closeLightbox(); });
document.getElementById('lightboxPrev').addEventListener('click',()=>{ if(lightboxIndex>0){lightboxIndex--;updateLightbox();} });
document.getElementById('lightboxNext').addEventListener('click',()=>{ if(lightboxIndex<visibleItems.length-1){lightboxIndex++;updateLightbox();} });
document.addEventListener('keydown',e=>{
  const lb=document.getElementById('lightbox');
  if(!lb.classList.contains('active')) return;
  if(e.key==='Escape') closeLightbox();
  if(e.key==='ArrowLeft'&&lightboxIndex>0){lightboxIndex--;updateLightbox();}
  if(e.key==='ArrowRight'&&lightboxIndex<visibleItems.length-1){lightboxIndex++;updateLightbox();}
});

/* ============================================================
   ADMIN TABS
============================================================ */
function switchTab(tab){
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  document.querySelectorAll('.tab-content').forEach(c=>c.classList.toggle('active',c.id==='tab-'+tab));
  if(tab==='manage') renderManageList();
}
document.querySelectorAll('.tab-btn').forEach(btn=>btn.addEventListener('click',()=>switchTab(btn.dataset.tab)));

/* ============================================================
   ADMIN LOGIN & DRAWER (DJANGO SECURE AUTH)
============================================================ */
document.getElementById('adminFabBtn').addEventListener('click',()=>{
  if(isAdminLoggedIn) {
    openDrawer();
  } else { 
    document.getElementById('loginModal').classList.add('active'); 
    setTimeout(()=>document.getElementById('adminUsername').focus(),100); 
  }
});

document.getElementById('loginClose').addEventListener('click',()=>document.getElementById('loginModal').classList.remove('active'));
document.getElementById('loginModal').addEventListener('click',e=>{ if(e.target===document.getElementById('loginModal')) document.getElementById('loginModal').classList.remove('active'); });

async function tryLogin(){
  const username = document.getElementById('adminUsername').value.trim();
  const pw = document.getElementById('adminPassword').value;
  
  if(!username || !pw) {
    showToast('Please fill in both fields.', 'error');
    return;
  }
  
  try {
    const res = await fetch('/api/login/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCSRFToken()
      },
      body: JSON.stringify({ username: username, password: pw })
    });
    
    const data = await res.json();
    if(res.ok && data.status === 'success'){
      isAdminLoggedIn=true;
      document.getElementById('loginModal').classList.remove('active');
      document.getElementById('adminPassword').value='';
      document.getElementById('adminUsername').value='';
      document.getElementById('loginError').classList.remove('show');
      openDrawer(); 
      showToast('Welcome, Admin!','success');
      document.getElementById('adminFabBtn').innerHTML='<span class="admin-fab-label">GALLERY ADMIN</span><i class="fas fa-images"></i>';
      
      // Pull down full list (including hidden items) since we are authenticated
      syncGallery();
    } else {
      document.getElementById('loginError').textContent = data.message || 'Incorrect credentials.';
      document.getElementById('loginError').classList.add('show');
      document.getElementById('adminPassword').select();
    }
  } catch(e) {
    showToast('Server connection failed.', 'error');
  }
}

document.getElementById('loginBtn').addEventListener('click',tryLogin);
document.getElementById('adminPassword').addEventListener('keydown',e=>{ if(e.key==='Enter') tryLogin(); });
document.getElementById('adminUsername').addEventListener('keydown',e=>{ if(e.key==='Enter') document.getElementById('adminPassword').focus(); });

function openDrawer(){
  document.getElementById('adminDrawer').classList.add('open');
  const ov=document.getElementById('drawerOverlay');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9300;pointer-events:all;transition:background .4s;';
  updateAdminStats(); 
  renderManageList();
}

function closeDrawer(){
  document.getElementById('adminDrawer').classList.remove('open');
  const ov=document.getElementById('drawerOverlay');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0);z-index:9300;pointer-events:none;transition:background .4s;';
}

document.getElementById('drawerClose').addEventListener('click',closeDrawer);
document.getElementById('drawerOverlay').addEventListener('click',closeDrawer);

/* ============================================================
   CLEAR ALL AJAX
============================================================ */
document.getElementById('clearAllBtn').addEventListener('click',async ()=>{
  if(!galleryItems.length){showToast('Gallery is already empty.','info');return;}
  if(!confirm(`Delete all ${galleryItems.length} images from SQL database? This cannot be undone.`)) return;
  
  try {
    const res = await fetch('/api/gallery/clear_all/', {
      method: 'POST',
      headers: {
        'X-CSRFToken': getCSRFToken()
      }
    });
    const data = await res.json();
    if(res.ok && data.status==='success') {
      galleryItems=[];
      renderGallery();
      renderManageList();
      updateAdminStats();
      showToast('All database records cleared.','error');
    } else {
      showToast(data.message || 'Failed to clear gallery.', 'error');
    }
  } catch(e) {
    showToast('Failed to connect to server.', 'error');
  }
});

/* ============================================================
   TOAST NOTIFICATION
============================================================ */
function showToast(msg,type='success'){
  const icons={success:'fa-check-circle',error:'fa-exclamation-circle',info:'fa-info-circle'};
  const container=document.getElementById('toastContainer');
  const toast=document.createElement('div');
  toast.className=`toast-item ${type}`;
  toast.innerHTML=`<i class="fas ${icons[type]} toast-icon"></i><span>${msg}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(()=>requestAnimationFrame(()=>toast.classList.add('show')));
  setTimeout(()=>{ toast.classList.remove('show'); setTimeout(()=>toast.remove(),400); },3500);
}

/* ============================================================
   NAVBAR SCROLL & SMOOTH SCROLL
============================================================ */
const nav=document.getElementById('mainNav');
window.addEventListener('scroll',()=>{
  nav.classList.toggle('scrolled',window.scrollY>60);
  const sections=document.querySelectorAll('section[id]');
  let current='';
  sections.forEach(s=>{ if(window.scrollY>=s.offsetTop-100) current=s.id; });
  document.querySelectorAll('.nav-link').forEach(link=>{
    link.classList.remove('active');
    if(link.getAttribute('href')==='#'+current) link.classList.add('active');
  });
});

document.querySelectorAll('a[href^="#"]').forEach(link=>{
  link.addEventListener('click',function(e){
    const target=document.querySelector(this.getAttribute('href'));
    if(target){ 
      e.preventDefault(); 
      target.scrollIntoView({behavior:'smooth',block:'start'}); 
      const collapse=document.querySelector('.navbar-collapse'); 
      if(collapse&&collapse.classList.contains('show')) {
        if (typeof bootstrap !== 'undefined') {
          const bsCollapse = bootstrap.Collapse.getInstance(collapse) || new bootstrap.Collapse(collapse);
          bsCollapse.hide();
        } else {
          // Robust vanilla fallback
          collapse.classList.remove('show');
          const toggler = document.querySelector('.navbar-toggler');
          if (toggler) toggler.classList.add('collapsed');
        }
      }
    }
  });
});

/* ============================================================
   FADE IN SCROLL OBSERVATION
============================================================ */
const observer=new IntersectionObserver(entries=>{
  entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('visible'); });
},{threshold:.1});
document.querySelectorAll('.fade-in').forEach(el=>observer.observe(el));

/* ============================================================
   CONTACT FORM SUBMIT AJAX (DATABASE PERSISTENCE)
============================================================ */
document.getElementById('contactForm').addEventListener('submit', async function(e){
  e.preventDefault();
  const btn=this.querySelector('button[type=submit]');
  const orig=btn.innerHTML;
  
  const name = document.getElementById('contactName').value.trim();
  const email = document.getElementById('contactEmail').value.trim();
  const phone = document.getElementById('contactCountry').value + " " + document.getElementById('contactPhone').value.trim();
  const message = document.getElementById('contactMessage').value.trim();
  
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right: 5px;"></i> SENDING...';
  
  try {
    const res = await fetch('/api/contact/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCSRFToken()
      },
      body: JSON.stringify({ name, email, phone, message })
    });
    
    const data = await res.json();
    if(res.ok && data.status === 'success') {
      btn.innerHTML='SENT! <span class="arrow"><i class="fas fa-check"></i></span>';
      btn.style.background='#2d7d32';
      showToast('Message sent to database!','success');
      setTimeout(()=>{ 
        btn.innerHTML=orig; 
        btn.style.background=''; 
        btn.disabled = false;
        this.reset(); 
      },3000);
    } else {
      showToast(data.message || 'Failed to submit form.', 'error');
      btn.innerHTML=orig;
      btn.disabled = false;
    }
  } catch(e) {
    showToast('Failed to connect to backend server.', 'error');
    btn.innerHTML=orig;
    btn.disabled = false;
  }
});

/* ============================================================
   INIT
============================================================ */
loadGallery();
renderGallery();
updateAdminStats();
