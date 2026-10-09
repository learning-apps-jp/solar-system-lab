// Camera changes do not alter orbital position or elapsed simulation time.
let cameraAU=32,zoom=null,spinView='compare';
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
function cameraSpan(now=performance.now()){
  if(!zoom)return cameraAU;
  const t=Math.min(1,Math.max(0,(now-zoom.start)/zoom.duration));
  const eased=t*t*(3-2*t);
  cameraAU=Math.exp(Math.log(zoom.from)+(Math.log(zoom.to)-Math.log(zoom.from))*eased);
  if(t===1){cameraAU=zoom.to;zoom=null;}
  return cameraAU;
}
function zoomTo(view){
  const from=cameraSpan(),to=view==='inner'?1.85:32;
  orbitView=view;
  zoom=Math.abs(from-to)<.001?null:{from,to,start:performance.now(),duration:reducedMotion.matches?160:1600};
  update();
}
const controls=document.createElement('div');controls.id='spinControls';controls.hidden=true;
controls.innerHTML='<button data-spin="compare" class="on">地球と比較</button><button data-spin="focus">1回転を追う</button>';
$('.toolbar').append(controls);
const scaleBadge=document.createElement('div');scaleBadge.id='zoomScale';$('#stage').append(scaleBadge);
const motionUpdate=update;
update=function(){
  motionUpdate();
  controls.hidden=mode!=='spin';scaleBadge.hidden=mode!=='orbit';
  document.querySelectorAll('[data-spin]').forEach(b=>{b.classList.toggle('on',b.dataset.spin===spinView);b.setAttribute('aria-pressed',b.dataset.spin===spinView)});
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===orbitView));
  if(mode==='spin'){
    $('#badge').textContent=spinView==='focus'?'拡大観察 · 1回転をゆっくり再現（観察用の速さ）':'地球と同じ時間で比較 · 球の大きさはそろえて表示';
    $('#stageTip').textContent='オレンジの目印を追おう。裏側では隠れます。';
    if(spinView==='focus')$('#speedOut').textContent=[40,25,15,10,6][$('#speed').value]+'秒 / 1回転';
    $('#selectedCycle').textContent='選んだ惑星が1回転 ＋';
  }
};
const motionSetMode=setMode;
setMode=function(m){motionSetMode(m);if(m==='orbit'){if(selected>3)orbitView='all';cameraAU=orbitView==='inner'?1.85:32;zoom=null;}if(m==='spin'){$('#speed').value=2;spinView='compare';}update();};
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>zoomTo(b.dataset.view));
document.querySelectorAll('[data-spin]').forEach(b=>b.onclick=()=>{spinView=b.dataset.spin;if(spinView==='focus'){days=0;playing=true;}update();});
document.querySelectorAll('#planets button').forEach((b,i)=>b.onclick=()=>{selected=i;if(mode==='orbit'&&i>3)zoomTo('all');if(mode==='spin'&&spinView==='focus'){days=0;playing=true;}update();});
const motionRenderTask=renderTask;
renderTask=function(){motionRenderTask();document.querySelectorAll('#answers button').forEach(b=>{const pick=b.onclick;b.onclick=()=>{const before=orbitView;pick();if(mode==='orbit'&&orbitView!==before)zoomTo(orbitView);if(mode==='spin'){spinView='compare';days=0;playing=false;update();}};});};
drawOrbit=function(){
  const span=cameraSpan(),detail=Math.min(1,Math.max(0,Math.log(32/span)/Math.log(32/1.85)));
  const cx=w*.5,cy=h*.52,outer=Math.min(w*.43,h*.34),scale=outer/span;
  halo(cx,cy,12);
  ctx.save();ctx.strokeStyle='#a1b3cf44';ctx.lineWidth=Math.max(1,Math.min(7,scale*.12));ctx.beginPath();ctx.arc(cx,cy,2.7*scale,0,Math.PI*2);ctx.stroke();ctx.restore();
  // Keep all eight orbits in the same scene; the outer planets leave the view as it expands.
  P.forEach((p,i)=>{
    const r=p.au*scale;
    if(r>Math.hypot(w,h))return;
    ctx.strokeStyle=i===selected?'#b7f3dc99':'#617ca166';ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
    const a=.25+i*.68+days/p.year*Math.PI*2,x=cx+Math.cos(a)*r,y=cy-Math.sin(a)*r;
    if(x<-30||x>w+30||y<-30||y>h+30)return;
    const pr=i<4?2.5+detail*([7,9,10,8][i]-2.5):[12,10,8,8][i-4];
    sphere(x,y,pr,p.color,i);if(i===selected)ringSelect(x,y,pr);
    if(i<4&&detail>.25){
      ctx.save();ctx.globalAlpha=(detail-.25)/.75;
      const lx=w<650?w*(i%2===0?.25:.75):w*.83,ly=w<650?h-75+Math.floor(i/2)*30:75+i*50;
      if(w>=650)line(x+pr,y,lx-50,ly-5,p.color+'44');
      text(p.name+' '+(Math.round(days/p.year*10)/10).toFixed(1)+'周',lx,ly,p.color,w<500?12:15);
      ctx.restore();
    }else if(i>=4){text(p.name,x,y+pr+21,p.color,w<500?12:15);}
    hits.push({x,y,r:Math.max(22,pr+8),i});
  });
  text('太陽',cx,cy+34,'#ffcf78',13);
  if(detail<.5){ctx.save();ctx.globalAlpha=1-detail*2;text('内側4惑星',cx-70,cy-40,'#c0d1e7',13);line(cx-40,cy-30,cx-8,cy-7);ctx.restore();}
  // The same pixel ruler changes its AU label continuously during the zoom.
  line(22,h-43,92,h-43,'#b7f3dc',2);line(22,h-48,22,h-38,'#b7f3dc');line(92,h-48,92,h-38,'#b7f3dc');
  text((70/scale).toFixed(2)+' AU',57,h-54,'#b7f3dc',12);
  scaleBadge.textContent=(zoom?'拡大・縮小中　':'')+'全体から '+(32/span).toFixed(1)+'倍';
  if(zoom){$('#badge').textContent='同じ太陽を中心にズーム · 時間はそのまま';$('#stageTip').textContent='';}
  else{$('#badge').textContent=(orbitView==='inner'?'内側4惑星':'太陽系全体')+' · 北側から · 距離比は実際、惑星は拡大';$('#stageTip').textContent=orbitView==='all'?'「内側を拡大」で、同じ場所を大きく見る':'';}
};
function spinGlobe(i,x,y,r){
  const p=P[i],theta=days*24/Math.abs(p.hours)*Math.PI*2,tilt=p.tilt*Math.PI/180;
  ctx.save();ctx.translate(x,y);ctx.rotate(-tilt);
  sphere(0,0,r,p.color,i===2?-1:i,0);
  ctx.save();ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.clip();
  line(-r,0,r,0,'#eff6ff88',2);
  // One highlighted meridian and a surface marker make each revolution identifiable.
  for(let n=0;n<4;n++){
    const a=theta+n*Math.PI/2;
    if(Math.cos(a)>0){ctx.strokeStyle=n===0?'#fff0c1bb':'#e0f0ff55';ctx.lineWidth=n===0?2:1;ctx.beginPath();ctx.ellipse(0,0,Math.max(.5,Math.abs(Math.sin(a))*r),r,0,-Math.PI/2,Math.PI/2,Math.sin(a)<0);ctx.stroke();}
  }
  if(i===2){ctx.fillStyle='#83c7a3';for(let k=0;k<3;k++){const a=theta+k*2;if(Math.cos(a)>0){ctx.beginPath();ctx.ellipse(Math.sin(a)*r*.8,(k-1)*r*.35,Math.max(1,Math.cos(a)*r*.2),r*.14,0,0,Math.PI*2);ctx.fill();}}}
  if(Math.cos(theta)>0){const mx=Math.sin(theta)*r;ctx.fillStyle='#ffb348';ctx.strokeStyle='#fff4da';ctx.lineWidth=2;ctx.beginPath();ctx.arc(mx,0,Math.max(6,r*.075),0,Math.PI*2);ctx.fill();ctx.stroke();}
  ctx.restore();line(0,-r-18,0,r+18,'#b7f3dc',3);ctx.fillStyle='#b7f3dc';ctx.beginPath();ctx.arc(0,-r-18,5,0,Math.PI*2);ctx.fill();
  ctx.restore();text('N',x-Math.sin(tilt)*(r+21)+12,y-Math.cos(tilt)*(r+21)-4,'#b7f3dc',13);
  text(p.name,x,y+r+40,p.color,20);
  const hours=Math.abs(p.hours),duration=hours<48?hours.toFixed(1)+'時間':(hours/24).toFixed(1)+'日';
  text(duration+' / 1回転',x,y+r+66,'#dce8fa',15);
  text('軸 '+p.tilt+'°'+(p.hours<0?' · 逆向き':''),x,y+r+89,'#a8bfd9',13);
  hits.push({x,y,r:r+22,i});
}
drawSpin=function(){
  const pair=spinView==='focus'?[selected]:selected===2?[2,4]:[2,selected];
  const cy=h*.41,r=Math.min(spinView==='focus'?w*.25:w*.16,(h-170)/2.3,115);
  pair.forEach((i,j)=>spinGlobe(i,w*(pair.length===1?.5:j===0?.27:.73),cy,r));
  if(spinView==='compare')text('同じ時間',w*.5,65,'#b7f3dc',14);
  else text((Math.min(1,days*24/Math.abs(P[selected].hours))*360).toFixed(0)+'° / 360°',w*.5,52,'#b7f3dc',16);
};
// Comparison uses a shared simulated clock. Focus mode shows just one body at a deliberately adjusted rate.
rates.spin=[.01,.025,.05,.1,.2];
frame=function(now){
  const dt=last?Math.min((now-last)/1000,.08):0;last=now;
  cameraSpan(now);
  if(playing&&(mode==='orbit'||mode==='spin')&&!(mode==='orbit'&&zoom)){
    const focus=mode==='spin'&&spinView==='focus';
    const rate=focus?Math.abs(P[selected].hours)/24/[40,25,15,10,6][$('#speed').value]:(mode==='spin'?rates.spin:rates.orbit)[$('#speed').value];
    days+=dt*rate;
    if(focus&&days>=Math.abs(P[selected].hours)/24){days=Math.abs(P[selected].hours)/24;playing=false;update();}
  }
  draw();requestAnimationFrame(frame);
};
// Replay a focused turn after it has finished.
$('#play').onclick=()=>{if(mode==='spin'&&spinView==='focus'&&!playing&&days>=Math.abs(P[selected].hours)/24)days=0;playing=!playing;update();};
$('#speed').oninput=()=>update();
update();renderTask();
