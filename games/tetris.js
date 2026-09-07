(function(){
"use strict";
window.SJGames=window.SJGames||{};
const W=10,H=20,CELL=28;
const SHAPES={I:[[0,1],[1,1],[2,1],[3,1]],O:[[1,0],[2,0],[1,1],[2,1]],T:[[1,0],[0,1],[1,1],[2,1]],S:[[1,0],[2,0],[0,1],[1,1]],Z:[[0,0],[1,0],[1,1],[2,1]],J:[[0,0],[0,1],[1,1],[2,1]],L:[[2,0],[0,1],[1,1],[2,1]]};
const TYPES=Object.keys(SHAPES),COLORS={I:"#5ce1ff",O:"#ffe14a",T:"#b57cff",S:"#66e08a",Z:"#ff687b",J:"#638cff",L:"#ffae57"};
function mount(root,api){
  root.innerHTML=`<div class="tt-layout"><div class="tt-main"><canvas id="tt-canvas" width="${W*CELL}" height="${H*CELL}" aria-label="Tetris"></canvas><div class="tt-side"><div class="tt-meta"><span>Puntos <strong id="tt-score">0</strong></span><span>Líneas <strong id="tt-lines">0</strong></span><span>Nivel <strong id="tt-level">1</strong></span></div><div class="tt-next"><span>Siguiente</span><canvas id="tt-next" width="112" height="84"></canvas></div></div></div><p id="tt-status" class="status-line">Flechas, espacio y swipe. Tap = girar.</p><p class="hint">← → mover · ↓ bajar · ↑/tap girar · espacio/swipe ↑ caída fuerte</p></div>`;
  const canvas=root.querySelector("#tt-canvas"),ctx=canvas.getContext("2d"),nextCv=root.querySelector("#tt-next"),nctx=nextCv.getContext("2d"),scoreEl=root.querySelector("#tt-score"),linesEl=root.querySelector("#tt-lines"),levelEl=root.querySelector("#tt-level"),status=root.querySelector("#tt-status");
  let board,piece,nextType,bag,score,lines,level,running,over,last,acc,raf=0,touch=null;
  function empty(){return Array.from({length:H},()=>Array(W).fill(""))}
  function refill(){bag=TYPES.slice();for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]]}}
  function take(){if(!bag.length)refill();return bag.pop()}
  function cells(p=piece){return p.shape.map(([x,y])=>[x+p.x,y+p.y])}
  function collides(p){return cells(p).some(([x,y])=>x<0||x>=W||y>=H||(y>=0&&board[y][x]))}
  function spawn(){const type=nextType||take();nextType=take();piece={type,shape:SHAPES[type].map(v=>v.slice()),x:3,y:-1};drawNext();if(collides(piece)){over=true;running=false;status.textContent="Game over. Nueva partida para revancha.";status.className="status-line bad"}}
  function rotateShape(shape){return shape.map(([x,y])=>[3-y,x])}
  function rotate(){if(over)return;const rotated=rotateShape(piece.shape);for(const kick of [0,-1,1,-2,2]){const p={...piece,x:piece.x+kick,shape:rotated};if(!collides(p)){piece=p;return}}}
  function move(dx,dy){if(over)return false;const p={...piece,x:piece.x+dx,y:piece.y+dy};if(collides(p))return false;piece=p;return true}
  function drop(){if(!move(0,1)){lock();return false}score+=1;updateMeta();return true}
  function hardDrop(){if(over)return;let d=0;while(move(0,1))d++;score+=d*2;lock()}
  function lock(){for(const [x,y] of cells())if(y>=0)board[y][x]=piece.type;clearLines();spawn()}
  function clearLines(){let n=0;for(let y=H-1;y>=0;y--){if(board[y].every(Boolean)){board.splice(y,1);board.unshift(Array(W).fill(""));n++;y++}}if(n){const points=[0,100,300,500,800][n]||1200;score+=points*level;lines+=n;level=1+Math.floor(lines/10);updateMeta()}}
  function updateMeta(){scoreEl.textContent=score;linesEl.textContent=lines;levelEl.textContent=level}
  function ghostY(){let y=piece.y;while(!collides({...piece,y:y+1}))y++;return y}
  function drawBlock(c,x,y,size=CELL,alpha=1){c.save();c.globalAlpha=alpha;c.fillStyle=COLORS[piece?.type]||"#aaa";c.fillRect(x*size+1,y*size+1,size-2,size-2);c.strokeStyle="rgba(255,255,255,.28)";c.strokeRect(x*size+2,y*size+2,size-4,size-4);c.restore()}
  function draw(){ctx.fillStyle="#080b16";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.strokeStyle="rgba(255,255,255,.035)";for(let x=0;x<=W;x++){ctx.beginPath();ctx.moveTo(x*CELL,0);ctx.lineTo(x*CELL,H*CELL);ctx.stroke()}for(let y=0;y<=H;y++){ctx.beginPath();ctx.moveTo(0,y*CELL);ctx.lineTo(W*CELL,y*CELL);ctx.stroke()}
    for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(board[y][x]){const old=piece;piece={type:board[y][x]};drawBlock(ctx,x,y);piece=old}
    if(piece&&!over){const gy=ghostY();for(const [x,y] of piece.shape){const px=x+piece.x,py=y+gy;if(py>=0)drawBlock(ctx,px,py,CELL,.18)}for(const [x,y] of cells())if(y>=0)drawBlock(ctx,x,y)}
  }
  function drawNext(){nctx.fillStyle="#080b16";nctx.fillRect(0,0,nextCv.width,nextCv.height);const shape=SHAPES[nextType],s=21,ox=12,oy=6;const old=piece;piece={type:nextType};for(const [x,y] of shape)drawBlock(nctx,x+ox/s,y+oy/s,s,1);piece=old}
  function interval(){return Math.max(90,720-(level-1)*55)}
  function frame(ts){if(!running)return;if(!last)last=ts;const dt=ts-last;last=ts;acc+=dt;if(acc>=interval()){acc=0;if(!move(0,1))lock()}draw();raf=requestAnimationFrame(frame)}
  function startLoop(){cancelAnimationFrame(raf);last=0;acc=0;running=true;raf=requestAnimationFrame(frame)}
  function reset(){cancelAnimationFrame(raf);board=empty();bag=[];score=0;lines=0;level=1;over=false;nextType=take();spawn();updateMeta();status.textContent="Flechas, espacio y swipe. Tap = girar.";status.className="status-line";startLoop();draw()}
  function onKey(e){if(!root.isConnected)return;const k=e.key.toLowerCase();if(["arrowleft","a"].includes(k)){move(-1,0);e.preventDefault()}else if(["arrowright","d"].includes(k)){move(1,0);e.preventDefault()}else if(["arrowdown","s"].includes(k)){drop();e.preventDefault()}else if(["arrowup","w"].includes(k)){rotate();e.preventDefault()}else if(k===" "){hardDrop();e.preventDefault()}draw()}
  function onTouchStart(e){const t=e.changedTouches[0];touch={x:t.clientX,y:t.clientY,lastX:t.clientX,lastY:t.clientY,moved:false};e.preventDefault()}
  function onTouchMove(e){if(!touch)return;const t=e.changedTouches[0],dx=t.clientX-touch.lastX,dy=t.clientY-touch.lastY;const threshold=24;if(Math.abs(dx)>=threshold&&Math.abs(dx)>Math.abs(dy)){move(dx>0?1:-1,0);touch.lastX=t.clientX;touch.lastY=t.clientY;touch.moved=true}else if(dy>=threshold&&Math.abs(dy)>Math.abs(dx)){move(0,1);touch.lastX=t.clientX;touch.lastY=t.clientY;touch.moved=true}e.preventDefault();draw()}
  function onTouchEnd(e){if(!touch)return;const t=e.changedTouches[0],dx=t.clientX-touch.x,dy=t.clientY-touch.y;if(dy<-32&&Math.abs(dy)>Math.abs(dx))hardDrop();else if(!touch.moved&&Math.hypot(dx,dy)<18)rotate();touch=null;e.preventDefault();draw()}
  window.addEventListener("keydown",onKey);canvas.addEventListener("touchstart",onTouchStart,{passive:false});canvas.addEventListener("touchmove",onTouchMove,{passive:false});canvas.addEventListener("touchend",onTouchEnd,{passive:false});
  const btn=api.addToolbarButton("Nueva partida",reset,"btn-primary");reset();
  return()=>{cancelAnimationFrame(raf);window.removeEventListener("keydown",onKey);canvas.removeEventListener("touchstart",onTouchStart);canvas.removeEventListener("touchmove",onTouchMove);canvas.removeEventListener("touchend",onTouchEnd);btn.remove()};
}
window.SJGames.tetris={mount};
})();
