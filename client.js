const $ = (id) => document.getElementById(id);
const COLORS = ['red','blue','green','yellow','purple','orange'];
let socket, state, myId, canTap = false, reconnecting = false, toastTimer;
const params = new URLSearchParams(location.search);
if (params.has('room')) $('roomInput').value = params.get('room').toUpperCase().slice(0,4);
function send(type, data={}) { if(socket?.readyState===WebSocket.OPEN) socket.send(JSON.stringify({type,...data})); }
function connect(type, room) {
  if(socket && socket.readyState < 2) socket.close();
  $('lobbyStatus').textContent='Connecting to the game…';
  const scheme=location.protocol==='https:'?'wss:':'ws:';
  socket=new WebSocket(`${scheme}//${location.host}/api/ws`);
  socket.onopen=()=>send(type,{name:$('nameInput').value.trim()||'Player',room});
  socket.onmessage=(ev)=>{let msg;try{msg=JSON.parse(ev.data)}catch{return} handle(msg)};
  socket.onerror=()=>{if(!$('game').classList.contains('hidden')) $('gameStatus').textContent='Connection problem. Trying to reconnect…';else $('lobbyStatus').textContent='Could not connect. Please try again.'};
  socket.onclose=()=>{if(state&&!state.finished&&!reconnecting){reconnecting=true;setTimeout(()=>{reconnecting=false;if(state?.room)connect('join',state.room)},1200)}};
}
function handle(m){
  if(m.type==='error'){ $('lobbyStatus').textContent=m.message;return }
  if(m.type==='joined'){myId=m.id;state=m.state;$('lobby').classList.add('hidden');$('game').classList.remove('hidden');history.replaceState({},'',`?room=${state.room}`);render();return}
  if(m.type==='state'){state=m.state;render();return}
  if(m.type==='round'){state=m.state;render();startRound(m);return}
  if(m.type==='tick'){const bar=$('timer').firstElementChild;bar.style.transition='none';bar.style.width=`${Math.max(0,m.left/10000*100)}%`;bar.offsetHeight;bar.style.transition='width .12s linear';$('arenaHint').textContent='TAP THE MATCHING COLOR';return}
  if(m.type==='roundResult'){state=m.state;canTap=false;disableTiles(true);$('result').textContent=m.text;render();return}
  if(m.type==='gameOver'){state=m.state;canTap=false;disableTiles(true);$('prompt').textContent=m.winner===myId?'YOU WIN!':'RIVAL WINS';$('prompt').classList.remove('target');$('result').textContent='The duel is over.';$('arenaHint').textContent='FINAL SCORE';$('endActions').classList.remove('hidden');render();return}
  if(m.type==='reset'){state=m.state;$('endActions').classList.add('hidden');render();return}
  if(m.type==='notice'){$('gameStatus').textContent=m.message}
}
function render(){if(!state)return;$('roomCode').textContent=state.room;$('roundNum').textContent=state.round;state.players.forEach((p,i)=>{if(!p)return;const card=$(`player${i}`);card.querySelector('.player-name').textContent=p.name+(p.id===myId?' (you)':'');card.querySelector('.player-score').textContent=p.score});if(!state.players[1])$('gameStatus').textContent='Share the invite link. Your rival will appear here.';else $('gameStatus').textContent=state.phase==='waiting'?'Both players are in. Get ready!':'';}
function startRound(m){canTap=true;$('endActions').classList.add('hidden');$('result').textContent='';$('arenaHint').textContent='GET READY';$('prompt').innerHTML='';$('timer').firstElementChild.style.width='100%';disableTiles(true);let n=3;$('countdown').classList.remove('hidden');$('countdown').textContent=n;const interval=setInterval(()=>{n--;if(n>0){$('countdown').textContent=n;return}clearInterval(interval);$('countdown').classList.add('hidden');if(!canTap)return;$('arenaHint').textContent='TAP THE MATCHING COLOR';$('prompt').innerHTML=`<span class="target">${m.target}</span>`;drawTiles(m.tiles);disableTiles(false)},700)}
function drawTiles(tiles){$('tiles').replaceChildren(...tiles.map(color=>{const b=document.createElement('button');b.className=`tile ${color}`;b.setAttribute('aria-label',`${color} tile`);b.addEventListener('click',()=>{if(!canTap)return;canTap=false;b.classList.add('pressed');disableTiles(true);send('tap',{color})});return b}))}
function disableTiles(disabled){document.querySelectorAll('.tile').forEach(b=>b.disabled=disabled)}
$('createBtn').onclick=()=>connect('create');$('joinBtn').onclick=()=>connect('join',$('roomInput').value.trim().toUpperCase());$('roomInput').addEventListener('input',e=>e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4));$('nameInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('createBtn').click()});$('roomInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('joinBtn').click()});
$('copyLink').onclick=async()=>{try{await navigator.clipboard.writeText(`${location.origin}/?room=${state.room}`);showToast('Invite link copied!')}catch{showToast(`Room code: ${state.room}`)}};
$('rematchBtn').onclick=()=>send('rematch');$('leaveBtn').onclick=()=>{state=null;socket?.close();$('game').classList.add('hidden');$('lobby').classList.remove('hidden');$('lobbyStatus').textContent='';history.replaceState({},'',location.pathname)};
function showToast(s){const t=$('toast');t.textContent=s;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2200)}
