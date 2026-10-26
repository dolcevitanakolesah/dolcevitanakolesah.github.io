/* Italian Finds V6
   Add/remove cars in cars.json. Asset folders use each car's prefix (for example assets/AlfaGTJunior/).
   Images: assets/NN/PREFIX-Main.jpg or .webp and PREFIX-01.jpg/.webp, PREFIX-02.jpg/.webp...
   Optional videos: PREFIX-video-01.mp4, PREFIX-video-02.mp4...
*/
let cars = [];
const grid=document.getElementById('carGrid'),dialog=document.getElementById('galleryDialog'),galleryGrid=document.getElementById('galleryGrid'),lightbox=document.getElementById('lightbox'),lightboxContent=document.getElementById('lightboxContent');
let activeItems=[],activeIndex=0;
function path(car,file){return `assets/${car.folder}/${file}`}
function descriptionParts(car){
 const lines=(Array.isArray(car.description)?car.description:[car.description||'']).map(line=>String(line||'').trim());
 const firstBlank=lines.findIndex(line=>!line);
 const topLines=(firstBlank>=0?lines.slice(0,firstBlank):lines).filter(Boolean);
 const narrative=(firstBlank>=0?lines.slice(firstBlank+1):[]).filter(Boolean);
 return {topLines, full:narrative.join('\n\n').trim()};
}
function loadImage(src){return new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(true);img.onerror=()=>resolve(false);img.src=src})}
async function discoverSequence(car,extension,start=1,max=250){
 const found=[];
 for(let n=start;n<=max;n++){
  let src='';
  for(const ext of (extension==='jpg'||extension==='webp'?['jpg','webp']:[extension])){
   const candidate=path(car,`${car.prefix}-${String(n).padStart(2,'0')}.${ext}`);
   if(await loadImage(candidate)){src=candidate;break;}
  }
  if(!src) break;
  found.push({src,number:n});
 }
 return found;
}
function makeCard(car,index){
 const card=document.createElement('article');card.className='car-card';card.tabIndex=0;card.setAttribute('role','button');
 const wrap=document.createElement('div');wrap.className='car-image-wrap';
 const img=document.createElement('img');img.className='car-image';img.src=path(car,car.prefix+'-Main.jpg');img.alt=car.imageAlt;img.loading=index<3?'eager':'lazy';
 let triedMainWebp=false;
 img.onerror=()=>{if(!triedMainWebp){triedMainWebp=true;img.src=path(car,car.prefix+'-Main.webp')}else{card.remove()}};wrap.appendChild(img);
 const title=document.createElement('p');title.className='car-title';
 const fullTitle=String(car.title||'');
 const separator=fullTitle.indexOf(':');
 if(separator>=0){
  const intro=document.createElement('span');intro.className='car-title-intro';intro.textContent=fullTitle.slice(0,separator+1).trim();
  const carName=document.createElement('span');carName.className='car-title-name';carName.textContent=fullTitle.slice(separator+1).trim();
  title.append(intro,carName);
 }else{title.textContent=fullTitle;}
 card.append(wrap,title);card.addEventListener('click',()=>openGallery(car));card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openGallery(car)}});return card;
}
// Check whether a video file exists without relying on browser media metadata/codecs.
// Some valid MP4s never fire loadedmetadata in the current browser, but can still be served.
async function videoFileExists(src){
 try{
  const head=await fetch(src,{method:'HEAD',cache:'no-store'});
  if(head.ok)return true;
  // Some static hosts do not support HEAD; try a tiny ranged GET in that case.
  if(head.status!==405&&head.status!==501)return false;
 }catch(_){/* Fall back to a ranged GET below. */}
 try{
  const response=await fetch(src,{headers:{Range:'bytes=0-0'},cache:'no-store'});
  return response.ok||response.status===206;
 }catch(_){return false;}
}
async function openGallery(car){
 const galleryTitle=document.getElementById('galleryTitle');
 const fullTitle=String(car.title||'');
 const separator=fullTitle.indexOf(':');
 galleryTitle.replaceChildren();
 if(separator>=0){
  const intro=document.createElement('span');intro.className='gallery-title-intro';intro.textContent=fullTitle.slice(0,separator+1).trim();
  const carName=document.createElement('span');carName.className='gallery-title-name';carName.textContent=fullTitle.slice(separator+1).trim();
  galleryTitle.append(intro,carName);
 }else{galleryTitle.textContent=fullTitle;}
 const description=descriptionParts(car);
 const specs=document.getElementById('gallerySpecs');
 specs.innerHTML='';
 description.topLines.forEach((line,index)=>{
  const item=document.createElement('div');
  item.className='gallery-spec-item';
  item.textContent=line;
  specs.appendChild(item);
 });
 document.getElementById('galleryDescription').textContent=description.full;
 galleryGrid.innerHTML='<p class="gallery-loading">Loading photographs…</p>';
 activeItems=[];
 if(!dialog.open)dialog.showModal();

 let foundPhotos=0;
 // Load photos one by one and add each to the gallery immediately,
 // instead of waiting for the entire sequence before showing anything.
 for(let n=1;n<=250;n++){
  let src='';
  // Try both formats for each number, so mixed JPG/WebP sequences stay in order.
  for(const ext of ['jpg','webp']){
   const candidate=path(car,`${car.prefix}-${String(n).padStart(2,'0')}.${ext}`);
   if(await loadImage(candidate)){src=candidate;break;}
  }
  if(!src) break;

  if(foundPhotos===0) galleryGrid.innerHTML='';
  const item={type:'image',src,title:''};
  activeItems.push(item);
  const fig=document.createElement('figure');
  fig.className='gallery-item';
  const img=document.createElement('img');
  img.src=src;
  img.alt='';
  img.loading='eager';
  img.decoding='async';
  img.addEventListener('click',()=>showLightbox(activeItems.indexOf(item)));
  fig.appendChild(img);
  galleryGrid.appendChild(fig);
  foundPhotos++;
 }

 // Discover video files by URL availability, not by loadedmetadata. A metadata/codec
 // error must not hide an existing file or prevent later numbered videos from appearing.
 const videoChecks=await Promise.all(Array.from({length:30},async(_,index)=>{
  const n=index+1;
  const src=path(car,`${car.prefix}-video-${String(n).padStart(2,'0')}.mp4`);
  return await videoFileExists(src)?{n,src}:null;
 }));
 for(const video of videoChecks.filter(Boolean).sort((a,b)=>a.n-b.n)){
  const {src}=video;
  const item={type:'video',src,title:''};
  activeItems.push(item);
  const fig=document.createElement('figure');
  fig.className='gallery-item';
  const v=document.createElement('video');
  v.className='gallery-video';
  v.src=src;
  v.controls=true;
  v.preload='metadata';
  v.playsInline=true;
  fig.appendChild(v);
  const open=document.createElement('button');
  open.className='video-open';
  open.type='button';
  open.textContent='Open video';
  open.addEventListener('click',()=>showLightbox(activeItems.indexOf(item)));
  fig.appendChild(open);
  galleryGrid.appendChild(fig);
 }

 if(!activeItems.length){
  galleryGrid.innerHTML='<p>No numbered JPG or WebP photographs found. Check the folder, prefix, and filenames.</p>';
 }
}
function showLightbox(i){activeIndex=i;renderLightbox();if(!lightbox.open)lightbox.showModal()}
function renderLightbox(){const item=activeItems[activeIndex];if(!item)return;lightboxContent.innerHTML='';if(item.type==='video'){const v=document.createElement('video');v.src=item.src;v.controls=true;v.autoplay=true;v.playsInline=true;lightboxContent.appendChild(v)}else{const img=document.createElement('img');img.src=item.src;img.alt=item.title;lightboxContent.appendChild(img)}document.getElementById('lightboxCounter').textContent=`${activeIndex+1} / ${activeItems.length}`}
function move(d){if(!activeItems.length)return;activeIndex=(activeIndex+d+activeItems.length)%activeItems.length;renderLightbox()}
document.getElementById('closeGallery').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});document.getElementById('closeLightbox').addEventListener('click',()=>lightbox.close());document.getElementById('prevImage').addEventListener('click',()=>move(-1));document.getElementById('nextImage').addEventListener('click',()=>move(1));lightbox.addEventListener('click',e=>{if(e.target===lightbox)lightbox.close()});document.addEventListener('keydown',e=>{if(!lightbox.open)return;if(e.key==='ArrowLeft')move(-1);if(e.key==='ArrowRight')move(1)});
fetch('cars.json').then(r=>{if(!r.ok)throw new Error('cars.json could not be loaded');return r.json()}).then(data=>{cars=data;cars.forEach((c,i)=>grid.appendChild(makeCard(c,i)))}).catch(err=>{grid.innerHTML='<p>Could not load the car catalogue. Check that cars.json is at the website root.</p>';console.error(err)});
