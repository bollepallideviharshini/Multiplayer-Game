const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer, WebSocket } = require('ws');
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const rooms = new Map();
const COLORS = ['red','blue','green','yellow','purple','orange'];
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json'};
const server = http.createServer();
const wss=new WebSocketServer({server,maxPayload:1024});
const send=(ws,obj)=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(obj))};
const publicState=r=>({room:r.code,round:r.round,phase:r.phase,players:r.players.map(p=>p?{id:p.id,name:p.name,score:p.score}:null),finished:r.finished});
function broadcast(r,obj){for(const p of r.players)if(p?.ws)send(p.ws,obj)}
function announce(r){broadcast(r,{type:'state',state:publicState(r)})}
function randomCode(){let c;do{c=crypto.randomBytes(3).toString('hex').slice(0,4).toUpperCase()}while(rooms.has(c));return c}
function cleanup(r){if(r.timer)clearTimeout(r.timer);if(r.tick)clearInterval(r.tick);if(r.startTimer)clearTimeout(r.startTimer)}
function startRound(r){if(r.players.some(p=>!p)||r.finished)return;cleanup(r);r.round++;r.phase='countdown';r.target=COLORS[Math.floor(Math.random()*COLORS.length)];r.tiles=[...COLORS].sort(()=>Math.random()-.5);r.taps=new Set();announce(r);broadcast(r,{type:'round',state:publicState(r),target:r.target,tiles:r.tiles});r.startTimer=setTimeout(()=>{r.phase='playing';const started=Date.now();r.tick=setInterval(()=>{const left=Math.max(0,10000-(Date.now()-started));broadcast(r,{type:'tick',left});if(!left)resolve(r,null,'Time ran out — no point this round.')},100);r.timer=setTimeout(()=>resolve(r,null,'Time ran out — no point this round.'),10000)},2200)}
function resolve(r,winner,text){if(r.phase!=='playing')return;cleanup(r);r.phase='result';if(winner!==null)r.players[winner].score++;broadcast(r,{type:'roundResult',text,state:publicState(r)});const winning=r.players.find(p=>p.score>=5);if(winning){r.finished=true;r.phase='finished';setTimeout(()=>broadcast(r,{type:'gameOver',winner:winning.id,state:publicState(r)}),1500);return}if(r.round>=10){const a=r.players[0],b=r.players[1];if(a.score===b.score){r.round=9;r.phase='sudden';setTimeout(()=>startRound(r),1900)}else{r.finished=true;r.phase='finished';setTimeout(()=>broadcast(r,{type:'gameOver',winner:a.score>b.score?a.id:b.id,state:publicState(r)}),1500)}return}setTimeout(()=>startRound(r),1900)}
function detach(ws){if(!ws.player)return;const {room,index}=ws.player;const r=rooms.get(room);if(!r)return;r.players[index]=null;ws.player=null;if(!r.finished){cleanup(r);r.phase='waiting';r.round=Math.max(0,r.round-1);broadcast(r,{type:'notice',message:'Your rival disconnected. Waiting for them to return…'});announce(r)}if(!r.players.some(Boolean))rooms.delete(room)}
wss.on('connection',ws=>{ws.on('message',raw=>{let m;try{m=JSON.parse(raw)}catch{return}if(!m||typeof m.type!=='string')return;
  if(m.type==='create'||m.type==='join'){
    if(ws.player)return;let code,name=String(m.name||'Player').replace(/[<>\x00-\x1f]/g,'').trim().slice(0,16)||'Player';
    if(m.type==='create'){code=randomCode();rooms.set(code,{code,players:[null,null],round:0,phase:'waiting',finished:false})}else code=String(m.room||'').toUpperCase().slice(0,4);
    const r=rooms.get(code);if(!r)return send(ws,{type:'error',message:'Room not found. Check the code and try again.'});if(r.finished)return send(ws,{type:'error',message:'That game is over. Start a new room.'});const index=r.players.findIndex(p=>p===null);if(index<0)return send(ws,{type:'error',message:'This room is full. Ask your friend for a new room.'});const id=crypto.randomUUID();r.players[index]={id,name,score:0,ws};ws.player={room:code,index};send(ws,{type:'joined',id,state:publicState(r)});announce(r);if(r.players.every(Boolean)){r.phase='ready';announce(r);r.startTimer=setTimeout(()=>startRound(r),1400)}return;
  }
  if(!ws.player)return;const r=rooms.get(ws.player.room);if(!r)return;
  if(m.type==='tap'){if(r.phase!=='playing'||r.taps.has(ws.player.index))return;r.taps.add(ws.player.index);const valid=m.color===r.target&&r.tiles.includes(m.color);if(valid){const text=`${r.players[ws.player.index].name} spotted it first! +1`;resolve(r,ws.player.index,text)}else{const opponent=1-ws.player.index;const text=`Wrong color! Point to ${r.players[opponent].name}.`;resolve(r,opponent,text)}return}
  if(m.type==='rematch'&&r.finished){r.players.forEach(p=>{if(p)p.score=0});r.round=0;r.finished=false;r.phase='ready';broadcast(r,{type:'reset',state:publicState(r)});if(r.players.every(Boolean))r.startTimer=setTimeout(()=>startRound(r),1400)}
 });ws.on('close',()=>detach(ws));});
module.exports = server;
