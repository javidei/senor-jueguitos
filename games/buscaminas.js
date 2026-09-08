(function(){
"use strict";
window.SJGames=window.SJGames||{};
const LEVELS={facil:{label:"Fácil",w:9,h:9,mines:10},medio:{label:"Medio",w:16,h:16,mines:40},dificil:{label:"Difícil",w:30,h:16,mines:99}};
function mount(root,api){
  let level="facil",cfg=LEVELS[level],cells=[],started=false,over=false,opened=0,flags=0,timer=0,timerId=0,longTimer=0,press=null,flagMode=false,suppressClickUntil=0,suppressContextUntil=0;
  const LONG_PRESS_MS=460,MOVE_TOLERANCE=12;
  root.innerHTML=`<div class="ms-wrap">
    <div class="ms-controls">
      <label>Dificultad <select id="ms-level"><option value="facil">Fácil 9×9 · 10</option><option value="medio">Medio 16×16 · 40</option><option value="dificil">Difícil 30×16 · 99</option></select></label>
      <button type="button" id="ms-flag-mode" class="ms-flag-toggle" aria-pressed="false">🚩 Modo bandera: OFF</button>
    </div>
    <div class="ms-meta"><span>⏱ <strong id="ms-time">0</strong>s</span><span>🚩 <strong id="ms-flags">0</strong>/<strong id="ms-mines">10</strong></span><span>🏆 <strong id="ms-best">—</strong></span></div>
    <div class="ms-scroll"><div id="ms-board" class="ms-board" role="grid" aria-label="Buscaminas"></div></div>
    <p id="ms-status" class="status-line"></p>
  </div>`;
  const board=root.querySelector("#ms-board"),sel=root.querySelector("#ms-level"),flagBtn=root.querySelector("#ms-flag-mode"),timeEl=root.querySelector("#ms-time"),flagsEl=root.querySelector("#ms-flags"),minesEl=root.querySelector("#ms-mines"),bestEl=root.querySelector("#ms-best"),status=root.querySelector("#ms-status");
  function idx(x,y){return y*cfg.w+x}
  function xy(i){return {x:i%cfg.w,y:Math.floor(i/cfg.w)}}
  function neigh(i){const {x,y}=xy(i),a=[];for(let yy=y-1;yy<=y+1;yy++)for(let xx=x-1;xx<=x+1;xx++)if(xx>=0&&yy>=0&&xx<cfg.w&&yy<cfg.h&&(xx!==x||yy!==y))a.push(idx(xx,yy));return a}
  function bestKey(){return `sj-buscaminas-best-${level}`}
  function updateBest(){const v=Number(localStorage.getItem(bestKey())||0);bestEl.textContent=v?`${v}s`:"—"}
  function stopTimer(){if(timerId){clearInterval(timerId);timerId=0}}
  function startTimer(){if(timerId)return;timerId=setInterval(()=>{timer++;timeEl.textContent=timer},1000)}
  function defaultStatus(){return level==="dificil"?"Primer clic seguro. Desplaza el tablero si lo necesitas. Pulsación larga o modo 🚩 = bandera.":"Primer clic seguro. Clic derecho, pulsación larga o modo 🚩 = bandera."}
  function resetPress(){clearTimeout(longTimer);longTimer=0;press=null}
  function setFlagMode(on){flagMode=!!on;flagBtn.classList.toggle("active",flagMode);flagBtn.setAttribute("aria-pressed",String(flagMode));flagBtn.textContent=flagMode?"🚩 Modo bandera: ON":"🚩 Modo bandera: OFF"}
  function makeBoard(){stopTimer();resetPress();cfg=LEVELS[level];cells=Array.from({length:cfg.w*cfg.h},()=>({mine:false,n:0,open:false,flag:false}));started=false;over=false;opened=0;flags=0;timer=0;suppressClickUntil=0;suppressContextUntil=0;timeEl.textContent="0";flagsEl.textContent="0";minesEl.textContent=cfg.mines;updateBest();status.textContent=defaultStatus();status.className="status-line";board.style.setProperty("--ms-cols",cfg.w);board.dataset.level=level;board.setAttribute("aria-rowcount",cfg.h);board.setAttribute("aria-colcount",cfg.w);board.innerHTML="";
    for(let i=0;i<cells.length;i++){const {x,y}=xy(i),b=document.createElement("button");b.type="button";b.className="ms-cell";b.dataset.i=i;b.setAttribute("role","gridcell");b.setAttribute("aria-rowindex",y+1);b.setAttribute("aria-colindex",x+1);b.setAttribute("aria-label","Casilla cerrada");board.appendChild(b)}
    render();
  }
  function placeMines(first){const avoid=new Set([first,...neigh(first)]),pool=[];for(let i=0;i<cells.length;i++)if(!avoid.has(i))pool.push(i);if(pool.length<cfg.mines){pool.length=0;for(let i=0;i<cells.length;i++)if(i!==first)pool.push(i)}
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}for(let i=0;i<cfg.mines;i++)cells[pool[i]].mine=true;for(let i=0;i<cells.length;i++)if(!cells[i].mine)cells[i].n=neigh(i).filter(n=>cells[n].mine).length;started=true;startTimer()}
  function openCell(i){if(over)return;const c=cells[i];if(c.open||c.flag)return;if(!started)placeMines(i);if(c.mine){c.open=true;lose();return}const q=[i],seen=new Set();while(q.length){const n=q.shift();if(seen.has(n))continue;seen.add(n);const z=cells[n];if(z.open||z.flag||z.mine)continue;z.open=true;opened++;if(z.n===0)for(const nb of neigh(n))if(!seen.has(nb))q.push(nb)}checkWin();render()}
  function toggleFlag(i){if(over)return;const c=cells[i];if(c.open)return;c.flag=!c.flag;flags+=c.flag?1:-1;flagsEl.textContent=flags;render()}
  function lose(){over=true;stopTimer();for(const c of cells)if(c.mine)c.open=true;status.textContent="💥 Has pisado una mina. Nueva partida y al lío.";status.className="status-line bad";render()}
  function checkWin(){if(opened!==cells.length-cfg.mines)return;over=true;stopTimer();for(const c of cells)if(c.mine)c.flag=true;flags=cfg.mines;flagsEl.textContent=flags;const old=Number(localStorage.getItem(bestKey())||0);if(!old||timer<old)localStorage.setItem(bestKey(),String(timer));updateBest();status.textContent=`🎉 Limpio en ${timer}s.`;status.className="status-line ok"}
  function render(){[...board.children].forEach((b,i)=>{const c=cells[i];b.className="ms-cell"+(c.open?" open":"")+(c.flag?" flag":"")+(c.open&&c.mine?" mine":"");b.textContent=c.flag&&!c.open?"⚑":c.open?(c.mine?"✹":c.n||""):"";if(c.open&&c.n)b.dataset.n=c.n;else delete b.dataset.n;b.disabled=over&&c.open;b.setAttribute("aria-label",c.flag&&!c.open?"Casilla con bandera":c.open?(c.mine?"Mina":c.n?`Casilla abierta, ${c.n} minas alrededor`:"Casilla abierta, vacía"):"Casilla cerrada")})}
  function cellFromEvent(e){const b=e.target.closest?.(".ms-cell");return b&&board.contains(b)?Number(b.dataset.i):null}
  function onClick(e){const i=cellFromEvent(e);if(i==null||Date.now()<suppressClickUntil)return;if(flagMode)toggleFlag(i);else openCell(i)}
  function onContext(e){const i=cellFromEvent(e);if(i==null)return;e.preventDefault();const now=Date.now();if(now<suppressContextUntil){resetPress();return}resetPress();suppressClickUntil=now+450;suppressContextUntil=now+450;toggleFlag(i)}
  function onPointerDown(e){const i=cellFromEvent(e);if(i==null||e.pointerType==="mouse"||e.button!==0||flagMode)return;resetPress();press={i,id:e.pointerId,x:e.clientX,y:e.clientY,triggered:false};longTimer=setTimeout(()=>{if(!press||press.id!==e.pointerId||press.i!==i)return;press.triggered=true;const now=Date.now();suppressClickUntil=now+750;suppressContextUntil=now+900;toggleFlag(i);if(navigator.vibrate)navigator.vibrate(25)},LONG_PRESS_MS)}
  function onPointerMove(e){if(!press||press.id!==e.pointerId)return;if(Math.hypot(e.clientX-press.x,e.clientY-press.y)>MOVE_TOLERANCE)resetPress()}
  function onPointerEnd(e){if(!press||press.id!==e.pointerId)return;const triggered=press.triggered;resetPress();if(triggered){const now=Date.now();suppressClickUntil=Math.max(suppressClickUntil,now+450);suppressContextUntil=Math.max(suppressContextUntil,now+600)}}
  function onFlagMode(){setFlagMode(!flagMode)}
  function onLevelChange(){level=sel.value;makeBoard()}
  board.addEventListener("click",onClick);board.addEventListener("contextmenu",onContext);board.addEventListener("pointerdown",onPointerDown);board.addEventListener("pointermove",onPointerMove);board.addEventListener("pointerup",onPointerEnd);board.addEventListener("pointercancel",onPointerEnd);
  flagBtn.addEventListener("click",onFlagMode);sel.addEventListener("change",onLevelChange);
  const newBtn=api.addToolbarButton("Nueva partida",makeBoard,"btn-primary");setFlagMode(false);makeBoard();
  return()=>{stopTimer();resetPress();board.removeEventListener("click",onClick);board.removeEventListener("contextmenu",onContext);board.removeEventListener("pointerdown",onPointerDown);board.removeEventListener("pointermove",onPointerMove);board.removeEventListener("pointerup",onPointerEnd);board.removeEventListener("pointercancel",onPointerEnd);flagBtn.removeEventListener("click",onFlagMode);sel.removeEventListener("change",onLevelChange);newBtn.remove()};
}
window.SJGames.buscaminas={mount};
})();
