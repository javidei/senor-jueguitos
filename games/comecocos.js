/** Señor Jueguitos v0.3.0 · Comecocos en raíles */
(function(){
"use strict";
window.SJGames=window.SJGames||{};
const MAP=[
"###################",
"#........#........#",
"#o##.###.#.###.##o#",
"#.................#",
"#.##.#.#####.#.##.#",
"#....#...#...#....#",
"####.###.#.###.####",
"----#.........#----",
"####.#.##=##.#.####",
".....#.#GGG#.#.....",
"####.#.#####.#.####",
"----#.........#----",
"####.#.#####.#.####",
"#........#........#",
"#.##.###.#.###.##.#",
"#o.#.....P.....#.o#",
"##.#.#.#####.#.#.##",
"#....#...#...#....#",
"#.######.#.######.#",
"#.................#",
"###################"];
const COLS=19,ROWS=21,TILE=22,SPEED=6.2,GSPD=5.3,FSPD=3.7,FRIGHT=7000,SWIPE=24,EPS=.035;
const DIR={left:{x:-1,y:0},right:{x:1,y:0},up:{x:0,y:-1},down:{x:0,y:1}},NAMES=["left","right","up","down"],OPP={left:"right",right:"left",up:"down",down:"up"};
const GDEF=[{c:"#ff5c5c",p:"chase"},{c:"#ff9ad5",p:"ambush"},{c:"#5ce1ff",p:"flank"},{c:"#ffb347",p:"scatter"}];
function parse(){const pellets=new Set(),powers=new Set(),gs=[];let ps={x:9,y:15},door={x:9,y:8};for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){const c=MAP[y][x];if(c===".")pellets.add(`${x},${y}`);else if(c==="o")powers.add(`${x},${y}`);else if(c==="P")ps={x,y};else if(c==="G")gs.push({x,y});else if(c==="=")door={x,y}}while(gs.length<4)gs.push({...gs[gs.length-1]});return{pellets,powers,gs,ps,door}}
function mount(root,api){
 const base=parse(),W=COLS*TILE,H=ROWS*TILE;
 root.innerHTML=`<div class="cc-layout"><div class="cc-meta"><span>Puntos: <strong id="cc-score">0</strong></span><span>Vidas: <strong id="cc-lives">3</strong></span><span>Récord: <strong id="cc-best">0</strong></span></div><canvas id="cc-canvas" width="${W}" height="${H}" aria-label="Comecocos"></canvas><div class="dpad" aria-label="Controles"><button class="btn up" data-dir="up">▲</button><button class="btn left" data-dir="left">◀</button><button class="btn down" data-dir="down">▼</button><button class="btn right" data-dir="right">▶</button></div><p id="cc-status" class="status-line">Pulsa Jugar o desliza para empezar.</p><p class="hint">Swipe o flechas/WASD · la línea rosa es la puerta de los fantasmas.</p></div>`;
 const cv=root.querySelector("#cc-canvas"),ctx=cv.getContext("2d"),scoreEl=root.querySelector("#cc-score"),livesEl=root.querySelector("#cc-lives"),bestEl=root.querySelector("#cc-best"),status=root.querySelector("#cc-status");
 let pellets,powers,player,ghosts,score=0,lives=3,best=Number(localStorage.getItem("sj-comecocos-best")||0),running=false,paused=false,dead=false,won=false,frightUntil=0,streak=0,last=0,raf=0,mouth=0,touch=null;
 bestEl.textContent=best;
 function setStatus(t,k=""){status.textContent=t;status.className=`status-line ${k}`.trim()}
 function ch(x,y){return x>=0&&y>=0&&x<COLS&&y<ROWS?MAP[y][x]:"#"}
 function walkable(x,y,type){if(y<0||y>=ROWS)return false;if(x<0)return MAP[y][0]==="-";if(x>=COLS)return MAP[y][COLS-1]==="-";const c=ch(x,y);if(c==="#")return false;if(type==="player"&&(c==="="||c==="G"))return false;return true}
 function actor(x,y,d){return{x,y,dir:d,nextDir:d}}
 function center(a){return Math.abs(a.x-Math.round(a.x))<EPS&&Math.abs(a.y-Math.round(a.y))<EPS}
 function snap(a){a.x=Math.round(a.x);a.y=Math.round(a.y)}
 function rail(a){const d=DIR[a.dir];if(d.x)a.y=Math.round(a.y);else a.x=Math.round(a.x)}
 function tryTurn(a,name,type){if(!DIR[name]||!center(a))return false;snap(a);const d=DIR[name];if(!walkable(a.x+d.x,a.y+d.y,type))return false;a.dir=name;rail(a);return true}
 function nextCenter(a){const d=DIR[a.dir];if(d.x>0)return{x:Math.floor(a.x+EPS)+1,y:Math.round(a.y)};if(d.x<0)return{x:Math.ceil(a.x-EPS)-1,y:Math.round(a.y)};if(d.y>0)return{x:Math.round(a.x),y:Math.floor(a.y+EPS)+1};return{x:Math.round(a.x),y:Math.ceil(a.y-EPS)-1}}
 function wrap(a){if(a.x<=-1+EPS)a.x=COLS-1;else if(a.x>=COLS-EPS)a.x=0}
 function move(a,dt,spd,type){let left=Math.max(0,spd*dt),guard=0;while(left>.0001&&guard++<10){rail(a);if(center(a)){snap(a);if(a.nextDir&&a.nextDir!==a.dir)tryTurn(a,a.nextDir,type);const d=DIR[a.dir];if(!walkable(a.x+d.x,a.y+d.y,type))break}const t=nextCenter(a),dist=Math.hypot(t.x-a.x,t.y-a.y),step=Math.min(left,dist),d=DIR[a.dir];a.x+=d.x*step;a.y+=d.y*step;left-=step;if(Math.abs(step-dist)<.0001){a.x=t.x;a.y=t.y;wrap(a)}}rail(a)}
 function resetActors(){player=actor(base.ps.x,base.ps.y,"left");ghosts=GDEF.map((g,i)=>{const s=base.gs[i];return{...g,x:s.x,y:s.y,dir:i%2?"right":"left",nextDir:i%2?"right":"left",inHouse:true,eaten:false,leave:i*.7}});frightUntil=0;streak=0;mouth=0}
 function reset(full=true){cancelAnimationFrame(raf);running=false;paused=false;dead=false;won=false;pellets=new Set(base.pellets);powers=new Set(base.powers);resetActors();if(full){score=0;lives=3}sync();setStatus("Pulsa Jugar o desliza para empezar.");draw(performance.now())}
 function sync(){scoreEl.textContent=score;livesEl.textContent=lives;if(score>best){best=score;bestEl.textContent=best;localStorage.setItem("sj-comecocos-best",String(best))}}
 function start(){if(won||(dead&&lives<=0))reset(true);else if(dead){dead=false;resetActors()}if(running&&!paused)return;running=true;paused=false;last=0;setStatus("¡A comer pellets!");cancelAnimationFrame(raf);raf=requestAnimationFrame(frame)}
 function toggle(){if(!running||won||(dead&&lives<=0)){start();return}paused=!paused;setStatus(paused?"Pausa.":"¡A comer pellets!",paused?"warn":"");if(!paused)last=0}
 function want(name){if(!DIR[name])return;if(!running||paused)start();if(OPP[player.dir]===name){player.dir=name;player.nextDir=name;rail(player);return}player.nextDir=name;if(center(player))tryTurn(player,name,"player")}
 function d2(ax,ay,bx,by){return(ax-bx)**2+(ay-by)**2}
 function target(g){if(g.eaten)return base.gs[1];if(performance.now()<frightUntil)return{x:g.x+(Math.random()-.5)*10,y:g.y+(Math.random()-.5)*10};const p=DIR[player.dir];if(g.p==="ambush")return{x:player.x+p.x*4,y:player.y+p.y*4};if(g.p==="flank")return{x:player.x+p.x*2-(ghosts[0].x-player.x),y:player.y+p.y*2-(ghosts[0].y-player.y)};if(g.p==="scatter"&&d2(g.x,g.y,player.x,player.y)<49)return{x:1,y:ROWS-2};return{x:player.x,y:player.y}}
 function choose(g){if(!center(g))return;snap(g);let opts=NAMES.filter(n=>{const d=DIR[n];return walkable(g.x+d.x,g.y+d.y,"ghost")});if(!g.eaten&&opts.length>1){const nr=opts.filter(n=>n!==OPP[g.dir]);if(nr.length)opts=nr}if(!opts.length){g.nextDir=OPP[g.dir];return}const t=target(g),fright=performance.now()<frightUntil&&!g.eaten;let bestN=opts[0],bestV=Infinity;for(const n of opts){const d=DIR[n],nx=g.x+d.x,ny=g.y+d.y;let v=d2(nx,ny,t.x,t.y);if(fright)v=-v+Math.random()*4;else v+=Math.random()*.15;if(v<bestV){bestV=v;bestN=n}}g.nextDir=bestN;tryTurn(g,bestN,"ghost")}
 function house(g,dt){const door=base.door;if(g.leave>0){g.leave-=dt;return}if(Math.abs(g.x-door.x)>.04)g.nextDir=g.x<door.x?"right":"left";else{if(center(g))g.x=door.x;g.nextDir="up"}if(center(g))tryTurn(g,g.nextDir,"ghost");move(g,dt,GSPD,"ghost");if(g.y<door.y-.08){g.inHouse=false;g.nextDir=Math.random()<.5?"left":"right"}}
 function updateGhosts(dt){const now=performance.now();for(const g of ghosts){if(g.inHouse&&!g.eaten){house(g,dt);continue}choose(g);g.nextDir=g.nextDir||g.dir;move(g,dt,g.eaten?8.8:(now<frightUntil?FSPD:GSPD),"ghost");if(g.eaten){const h=base.gs[1];if(d2(g.x,g.y,h.x,h.y)<.18){g.x=h.x;g.y=h.y;g.eaten=false;g.inHouse=true;g.leave=.45;g.dir="up";g.nextDir="up"}}}}
 function collide(){const now=performance.now(),px=Math.round(player.x),py=Math.round(player.y),k=`${px},${py}`;if(Math.abs(player.x-px)<.32&&Math.abs(player.y-py)<.32){if(pellets.delete(k)){score+=10;sync()}if(powers.delete(k)){score+=50;frightUntil=now+FRIGHT;streak=0;for(const g of ghosts)if(!g.inHouse&&!g.eaten){g.dir=OPP[g.dir];g.nextDir=g.dir}sync();setStatus("¡Power! Ahora los fantasmas son merienda.")}}
  for(const g of ghosts){if(d2(player.x,player.y,g.x,g.y)<.42){if(g.eaten)continue;if(now<frightUntil&&!g.inHouse){g.eaten=true;streak++;score+=200*2**(streak-1);sync()}else if(!g.inHouse){lose();return}}}if(!pellets.size&&!powers.size)win()}
 function lose(){lives--;sync();dead=true;running=false;cancelAnimationFrame(raf);setStatus(lives?`Te quedan ${lives} vida${lives===1?"":"s"}. Pulsa Jugar.`:`Game over · ${score} puntos.`,lives?"warn":"bad");draw(performance.now())}
 function win(){won=true;running=false;cancelAnimationFrame(raf);sync();setStatus(`¡Laberinto limpio! ${score} puntos.`,"ok");draw(performance.now())}
 function walls(){for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(ch(x,y)==="#"){const px=x*TILE,py=y*TILE;ctx.fillStyle="#111a55";ctx.fillRect(px+1,py+1,TILE-2,TILE-2);ctx.strokeStyle="#3157ff";ctx.strokeRect(px+2,py+2,TILE-4,TILE-4)}const d=base.door;ctx.fillStyle="#ff9ad5";ctx.fillRect(d.x*TILE+2,d.y*TILE+TILE*.43,TILE-4,3)}
 function dots(){ctx.fillStyle="#f6e7c9";for(const k of pellets){const[x,y]=k.split(",").map(Number);ctx.beginPath();ctx.arc(x*TILE+TILE/2,y*TILE+TILE/2,2.3,0,Math.PI*2);ctx.fill()}for(const k of powers){const[x,y]=k.split(",").map(Number);ctx.beginPath();ctx.arc(x*TILE+TILE/2,y*TILE+TILE/2,5.8,0,Math.PI*2);ctx.fill()}}
 function pac(){const x=player.x*TILE+TILE/2,y=player.y*TILE+TILE/2,a={right:0,down:Math.PI/2,left:Math.PI,up:-Math.PI/2}[player.dir],m=.16+Math.abs(Math.sin(mouth))*0.42;ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle="#ffe14a";ctx.beginPath();ctx.arc(0,0,TILE*.42,m,Math.PI*2-m);ctx.lineTo(0,0);ctx.fill();ctx.restore()}
 function ghost(g,ts){const x=g.x*TILE+TILE/2,y=g.y*TILE+TILE/2,r=TILE*.38,fr=ts<frightUntil&&!g.eaten;ctx.fillStyle=g.eaten?"transparent":fr?"#3457ff":g.c;if(!g.eaten){ctx.beginPath();ctx.arc(x,y-2,r,Math.PI,0);ctx.lineTo(x+r,y+r*.75);ctx.lineTo(x+r*.35,y+r*.55);ctx.lineTo(x,y+r*.78);ctx.lineTo(x-r*.35,y+r*.55);ctx.lineTo(x-r,y+r*.75);ctx.closePath();ctx.fill()}const d=DIR[g.dir]||{x:0,y:0};for(const ox of[-.32,.32]){ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(x+ox*r,y-r*.2,2.7,0,Math.PI*2);ctx.fill();ctx.fillStyle="#2240d8";ctx.beginPath();ctx.arc(x+ox*r+d.x*1.2,y-r*.2+d.y*1.2,1.3,0,Math.PI*2);ctx.fill()}}
 function draw(ts){ctx.fillStyle="#03050d";ctx.fillRect(0,0,W,H);walls();dots();for(const g of ghosts)ghost(g,ts);pac();if(paused){ctx.fillStyle="rgba(0,0,0,.45)";ctx.fillRect(0,0,W,H);ctx.fillStyle="#fff";ctx.font="bold 22px sans-serif";ctx.textAlign="center";ctx.fillText("PAUSA",W/2,H/2)}}
 function frame(ts){if(!running)return;if(!last)last=ts;let dt=Math.min(.05,(ts-last)/1000);last=ts;if(!paused&&!dead&&!won){move(player,dt,SPEED,"player");mouth+=dt*10;updateGhosts(dt);collide()}draw(ts);if(running)raf=requestAnimationFrame(frame)}
 function keydown(e){const k=e.key.toLowerCase();if(["arrowup","w"].includes(k)){want("up");e.preventDefault()}else if(["arrowdown","s"].includes(k)){want("down");e.preventDefault()}else if(["arrowleft","a"].includes(k)){want("left");e.preventDefault()}else if(["arrowright","d"].includes(k)){want("right");e.preventDefault()}else if([" ","p","enter"].includes(k)){toggle();e.preventDefault()}}
 function tstart(e){const t=e.changedTouches[0];touch={x:t.clientX,y:t.clientY};e.preventDefault()}
 function tmove(e){if(!touch)return;const t=e.changedTouches[0],dx=t.clientX-touch.x,dy=t.clientY-touch.y;if(Math.hypot(dx,dy)>=SWIPE){want(Math.abs(dx)>Math.abs(dy)?(dx>0?"right":"left"):(dy>0?"down":"up"));touch={x:t.clientX,y:t.clientY}}e.preventDefault()}
 function tend(e){if(!touch)return;const t=e.changedTouches[0],dx=t.clientX-touch.x,dy=t.clientY-touch.y;if(Math.hypot(dx,dy)>=SWIPE)want(Math.abs(dx)>Math.abs(dy)?(dx>0?"right":"left"):(dy>0?"down":"up"));touch=null;e.preventDefault()}
 root.querySelectorAll(".dpad .btn").forEach(b=>b.addEventListener("click",()=>want(b.dataset.dir)));window.addEventListener("keydown",keydown);cv.addEventListener("touchstart",tstart,{passive:false});cv.addEventListener("touchmove",tmove,{passive:false});cv.addEventListener("touchend",tend,{passive:false});
 const play=api.addToolbarButton("Jugar / Pausa",toggle,"btn-ok"),fresh=api.addToolbarButton("Nueva partida",()=>reset(true),"btn-primary");reset(true);
 return()=>{cancelAnimationFrame(raf);window.removeEventListener("keydown",keydown);cv.removeEventListener("touchstart",tstart);cv.removeEventListener("touchmove",tmove);cv.removeEventListener("touchend",tend);play.remove();fresh.remove()};
}
window.SJGames.comecocos={mount};
})();
