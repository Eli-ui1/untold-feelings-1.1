window.onload = () => {

// ===== Anonymous User =====
let user = localStorage.getItem("anon");
if(!user){
  user = "anon_" + Math.random().toString(36).slice(2,7);
  localStorage.setItem("anon", user);
}

// ===== Map =====
const map = L.map('map', {zoomControl:true}).setView([20,0],2);

// Dark tiles
const darkTiles = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_dark/{z}/{x}/{y}{r}.png', {
  maxZoom: 20, attribution:'&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
}).addTo(map);

// ===== Heatmap =====
let heatLayer; let heatOn=false;

// ===== Pins Storage =====
let pins = []; // memory pins
let liked = JSON.parse(localStorage.getItem("liked")||"{}");

// ===== Load pins =====
async function loadPins(){
  try{
    const res = await fetch("data.json");
    pins = await res.json();
    drawPins();
  } catch(e){ pins=[]; }
}

// ===== Draw Pins =====
function drawPins(){
  if(heatLayer) map.removeLayer(heatLayer);
  pins.forEach(p=>{
    const m = L.circleMarker([p.lat,p.lng], {
      radius:8, 
      color:p.color, 
      className:"glow",
      fillOpacity:0.8,
      weight:2
    }).addTo(map);
    m.bindPopup(`
      <b>${p.user}</b><br>${p.msg}<br>
      ${p.image?`<img src="${p.image}" width="100%">`:''}
      <div class="like" onclick="likePin('${p.id}')">❤️ ${p.likes||0}</div>
      <div class="report" onclick="reportPin('${p.id}')">Report</div>
    `);
  });

  if(heatOn){
    const heatData = pins.map(p=>[p.lat,p.lng,0.5]);
    heatLayer = L.heatLayer(heatData).addTo(map);
  }
}

// ===== Add Pin =====
map.on('click', e=>{
  const popup = L.popup().setLatLng(e.latlng).setContent(`
    <div class="popup">
      <textarea id="msg" placeholder="Your memory…"></textarea>
      <select id="color">
        <option value="blue">Calm</option>
        <option value="red">Love</option>
        <option value="green">Nature</option>
        <option value="purple">Pain</option>
      </select>
      <input type="file" id="img">
      <button onclick="savePin(${e.lat},${e.lng})">Post</button>
    </div>
  `).openOn(map);
});

// ===== Save Pin =====
async function savePin(lat,lng){
  const msg = document.getElementById("msg").value;
  const color = document.getElementById("color").value;
  const file = document.getElementById("img").files[0];

  // Simple moderation
  const banned = ["kill","suicide","rape","sex","hate"];
  if(banned.some(w=>msg.toLowerCase().includes(w))) { alert("Content blocked"); return; }

  let imageURL = "";
  if(file){
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "unsigned_preset"); // unsigned_preset
    const res = await fetch("https://api.cloudinary.com/v1_1/dluucrgrh/upload",{
      method:"POST", body: formData
    });
    const data = await res.json();
    imageURL = data.secure_url;
  }

  const newPin = {
    id:"pin_"+Date.now(),
    user,
    msg,
    lat,
    lng,
    color,
    image: imageURL,
    likes:0,
    timestamp: Date.now()
  };

  pins.push(newPin);
  drawPins();

  // Save JSON back to data.json (Vercel deployment)
  await fetch("data.json",{
    method:"PUT",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(pins)
  });

  map.closePopup();
}

// ===== Likes =====
function likePin(id){
  if(liked[id]) return;
  liked[id]=1;
  localStorage.setItem("liked",JSON.stringify(liked));
  const pin = pins.find(p=>p.id===id);
  pin.likes++;
  drawPins();
}

// ===== Report =====
function reportPin(id){ alert("Reported"); }

// ===== Heatmap & Dark Mode =====
function toggleHeat(){ heatOn=!heatOn; drawPins(); }
function toggleDark(){ document.body.classList.toggle("dark"); document.body.classList.toggle("light"); }

// ===== Initialize =====
loadPins();

};
