const START_HOUR = 0;
const END_HOUR = 24;
const SNAP = 5;
const MIN_DURATION = 15;
const palette = { Faith:'#8B5CF6', Health:'#22C55E', 'Lead Generation':'#F97316', Business:'#38BDF8', Family:'#EC4899', Kids:'#FACC15', Admin:'#94A3B8', Personal:'#14B8A6', Growth:'#A3E635' };
const ghostSeed = [
  { id:'faith', title:'Faith', category:'Faith', start:390, duration:30, color:palette.Faith },
  { id:'walk', title:'Walk', category:'Health', start:435, duration:35, color:palette.Health },
  { id:'prospecting', title:'Prospecting', category:'Lead Generation', start:540, duration:90, color:palette['Lead Generation'] },
  { id:'follow-up', title:'Follow Up', category:'Business', start:660, duration:60, color:palette.Business },
  { id:'kids', title:'Kids', category:'Kids', start:930, duration:90, color:palette.Kids },
  { id:'recovery', title:'Recovery', category:'Personal', start:1230, duration:45, color:palette.Personal },
];
const reusable = ['Prospecting','Follow Up','Swim','Walk','Reading','Client Call','Listing Presentation','Workout'];
let state = { tab:'Today', today: ghostSeed.map(x => ({...x, id:`today-${x.id}`})), ghost: ghostSeed.map(x => ({...x})), editing:null, pxPerMin: Math.max(.72, Math.min(1.05, (innerHeight - 220) / 600)) };
const app = document.getElementById('app');
const snap = value => Math.round(value / SNAP) * SNAP;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const timeLabel = minutes => { const h=Math.floor(minutes/60), m=minutes%60, hour=((h+11)%12)+1; return `${hour}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`; };
const clockValue = minutes => `${String(Math.floor(clamp(snap(minutes), 0, 1425)/60)).padStart(2,'0')}:${String(clamp(snap(minutes), 0, 1425)%60).padStart(2,'0')}`;
const parseClock = (value, fallback) => { const match=value.trim().match(/^(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?$/i); if(!match) return fallback; let h=Number(match[1]); const m=Number(match[2]??0), s=match[3]?.toLowerCase(); if(Number.isNaN(h)||Number.isNaN(m)||m>59) return fallback; if(s==='pm'&&h<12) h+=12; if(s==='am'&&h===12) h=0; return clamp(h*60+m,0,1425); };
const parseDuration = (value, fallback) => { const next=Number(value.replace(/[^0-9]/g,'')); return Number.isFinite(next)&&next>0?next:fallback; };
const newActivity = (title,start,duration,category='Personal') => ({ id:`${title}-${Date.now()}-${Math.round(Math.random()*1000)}`, title, category, start, duration, color:palette[category]??palette.Personal });
const setState = patch => { state = { ...state, ...patch }; render(); };
const schedule = () => state.tab === 'Ghost' ? state.ghost : state.today;
const setSchedule = data => state.tab === 'Ghost' ? setState({ ghost:data }) : setState({ today:data });
function render(){
  app.innerHTML = `<header class="header"><div class="kicker">Daily Rock V5.1</div><h1>${state.tab}</h1></header><section id="content"></section><nav class="nav">${['Today','Ghost','Lists','Settings'].map(t=>`<button class="navItem ${state.tab===t?'navActive':''}" data-tab="${t}"><span>${t==='Today'?'◷':t==='Ghost'?'▣':t==='Lists'?'☰':'⚙'}</span><small>${t}</small></button>`).join('')}</nav>`;
  app.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>setState({tab:b.dataset.tab}));
  renderContent(document.getElementById('content'));
  renderModal();
}
function renderContent(root){
  if(state.tab==='Lists'){ root.className='panel'; root.innerHTML=reusable.map(x=>`<button class="listItem" data-template="${x}"><span><b>${x}</b><small>Tap to choose start time and duration</small></span><em>＋</em></button>`).join(''); root.querySelectorAll('[data-template]').forEach(b=>b.onclick=()=>setState({editing:{mode:'template',title:b.dataset.template,start:540,duration:30}})); return; }
  if(state.tab==='Settings'){ root.className='panel'; root.innerHTML=['Settings placeholder','Dark theme enabled','5-minute snapping','Pinch timeline to zoom'].map(x=>`<div class="setting"><b>${x}</b><em>✓</em></div>`).join(''); return; }
  root.className='';
  root.innerHTML = `${state.tab==='Ghost'?`<div class="copyBar"><b>Permanent template day</b><button id="copyGhost">Copy Ghost → Today</button></div>`:''}<div class="scroller"><div class="timelineWrap"></div></div>`;
  if(state.tab==='Ghost') document.getElementById('copyGhost').onclick=()=>{ if(confirm('Copy Ghost to Today and replace the current live schedule?')) setState({today:state.ghost.map(x=>({...x,id:`copy-${x.id}-${Date.now()}`}))}); };
  const wrap=root.querySelector('.timelineWrap'), ppm=state.pxPerMin, data=schedule(); wrap.style.height=`${1440*ppm+80}px`;
  for(let h=0;h<=24;h++) wrap.insertAdjacentHTML('beforeend', `<div class="hourRow" style="top:${h*60*ppm}px"><span>${timeLabel(h*60)}</span><i></i></div>`);
  wrap.insertAdjacentHTML('beforeend', `<div class="windowHint" style="top:${420*ppm}px"><span>Default day view starts here</span></div>`);
  if(state.tab==='Today'){ const d=new Date(), now=d.getHours()*60+d.getMinutes(); wrap.insertAdjacentHTML('beforeend', `<div class="nowLine" style="top:${now*ppm}px"><i></i><span>NOW</span></div>`); }
  data.forEach(item=>tile(wrap,item));
  root.querySelector('.scroller').scrollTop = 420*ppm-8;
  wrap.onclick=e=>{ if(e.target!==wrap) return; setState({editing:{mode:'activity',schedule:state.tab.toLowerCase(),draft:newActivity(state.tab==='Ghost'?'New Template':'New Activity',clamp(snap(e.offsetY/ppm),0,1425),30)}}); };
  wrap.onwheel=e=>{ if(e.ctrlKey){ e.preventDefault(); setState({pxPerMin:clamp(state.pxPerMin + (e.deltaY<0?.08:-.08),.65,2.6)}); } };
}
function tile(wrap,item){ const ppm=state.pxPerMin; const el=document.createElement('button'); el.className='tile'; el.style.cssText=`top:${item.start*ppm}px;height:${item.duration*ppm}px;border-color:${item.color}`; el.innerHTML=`<i style="background:${item.color}"></i><b>${item.title}</b><small>${timeLabel(item.start)} • ${item.duration} min • ${item.category}</small><span class="resize"></span>`; wrap.appendChild(el); let mode, startY, origin;
  el.onclick=()=>setState({editing:{mode:'activity',schedule:state.tab.toLowerCase(),id:item.id,draft:{...item}}});
  el.onpointerdown=e=>{ mode=e.target.className==='resize'?'resize':'drag'; startY=e.clientY; origin={...item}; el.setPointerCapture(e.pointerId); };
  el.onpointermove=e=>{ if(!mode) return; e.preventDefault(); const delta=snap((e.clientY-startY)/ppm), data=schedule(); const next=mode==='drag'?{...origin,start:clamp(origin.start+delta,0,1440-origin.duration)}:{...origin,duration:clamp(snap(origin.duration+delta),MIN_DURATION,1440-origin.start)}; state[state.tab==='Ghost'?'ghost':'today']=data.map(x=>x.id===item.id?next:x); render(); };
  el.onpointerup=()=>{ mode=null; };
}
function renderModal(){ if(!state.editing) return; const e=state.editing, isTemplate=e.mode==='template', draft=isTemplate?newActivity(e.title,e.start,e.duration):e.draft; const modal=document.createElement('div'); modal.className='modalShade'; modal.innerHTML=`<div class="modalCard"><div class="modalKicker">${isTemplate?'Insert into Today':`Edit ${e.schedule==='ghost'?'Ghost':'Today'} Activity`}</div><input class="textField" id="title" value="${draft.title}">${!isTemplate?`<label>Category</label><input class="compactField" id="category" value="${draft.category}"><div class="chipGrid">${Object.keys(palette).map(c=>`<button class="chip ${draft.category===c?'chipActive':''}" data-cat="${c}" style="border-color:${palette[c]}"><i style="background:${palette[c]}"></i>${c}</button>`).join('')}</div><label>Color</label><div class="colorRow">${Object.entries(palette).map(([n,c])=>`<button aria-label="${n} color" class="colorChip ${draft.color===c?'colorChipActive':''}" data-color="${c}" style="background:${c}"></button>`).join('')}</div>`:''}<p>${timeLabel(draft.start)} • ${draft.duration} min</p><div class="timeEditorRow"><span><label>Start time</label><input class="compactField" id="start" value="${clockValue(draft.start)}"></span><span><label>Duration</label><input class="compactField" id="duration" value="${draft.duration}"></span></div><div class="modalActions"><button id="cancel">Cancel</button>${!isTemplate?'<button id="delete" class="deleteBtn">Delete</button>':''}<button id="save" class="saveBtn">${isTemplate?'Insert':'Save'}</button></div></div>`; document.body.appendChild(modal);
  const close=()=>{state.editing=null; render();}; modal.querySelector('#cancel').onclick=close; modal.querySelector('#save').onclick=()=>{ const next={...draft,title:modal.querySelector('#title').value,start:parseClock(modal.querySelector('#start').value,draft.start),duration:parseDuration(modal.querySelector('#duration').value,draft.duration)}; if(!isTemplate){ next.category=modal.querySelector('#category').value; next.color=next.color||palette[next.category]||palette.Personal; } isTemplate?setState({today:[...state.today,next],editing:null}):setState({[e.schedule]:state[e.schedule].map(x=>x.id===e.id?next:x),editing:null}); };
  modal.querySelector('#delete')?.addEventListener('click',()=>setState({[e.schedule]:state[e.schedule].filter(x=>x.id!==e.id),editing:null})); modal.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{draft.category=b.dataset.cat; draft.color=palette[draft.category];}); modal.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{draft.color=b.dataset.color;});
}
render();
