const routes=[['home','Tử Vi','tuvi'],['palm','Xem Chỉ Tay','palm'],['face','Xem Tướng','face'],['astrology','Chiêm Tinh','astro'],['love','Tình Duyên','love'],['numerology','Thần Số Học','num'],['chat','AI Chat','chat'],['ai','Cài Đặt AI','deep'],['fengshui','Phong Thủy','feng'],['tarot','Bói Bài','tarot'],['history','Lịch Sử','history']];
let lastResult='';
const $=id=>document.getElementById(id);
function init(){renderTabs();renderHistory();loadAccount();loadVoicePrefs();initVietnameseVoices();startClock();routeTo(location.hash?.replace('#/','')||'home',false);window.addEventListener('hashchange',()=>routeTo(location.hash.replace('#/','')||'home',false));checkAIStatus();loadAIProviders();}
function tabIcon(icon){return `<span class="holo-icon icon-${icon}"><i></i></span>`}
function renderTabs(){const html=routes.map(([id,name,ico])=>`<button class="tab-card" data-route="${id}" onclick="routeTo('${id}')">${tabIcon(ico)}<span>${name}</span></button>`).join('');$('featureTabs').innerHTML=html;$('sideLinks').innerHTML=routes.concat([['deep','AI phân tích sâu','deep'],['ai','Cài đặt AI','deep'],['account','Tài khoản','account']]).map(([id,name,ico])=>`<button class="link" onclick="routeTo('${id}');toggleMenu(false)">${tabIcon(ico)} <span>${name}</span></button>`).join('')}
function routeTo(route,push=true){
  if(!route)route='home';
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const page=$('page-'+route)||$('page-home');
  page.classList.add('active');
  document.querySelectorAll('.tab-card').forEach(t=>t.classList.toggle('active',t.dataset.route===route));
  document.querySelectorAll('.bottom-nav button').forEach(btn=>btn.classList.remove('active'));
  document.querySelectorAll('.side-menu button.link').forEach(btn=>btn.classList.remove('active'));
  if(push) location.hash='#/'+route;
  requestAnimationFrame(()=>{
    const targetTop=Math.max(0,page.getBoundingClientRect().top+window.pageYOffset-18);
    window.scrollTo({top:targetTop,behavior:'smooth'});
    const scrollers=page.querySelectorAll('.chat-log,.pro-chat-log,.result-panel,.side-menu');
    scrollers.forEach(el=>{try{el.scrollTop=0}catch{}});
  });
}
function toggleMenu(open){$('sideMenu').classList.toggle('open',open);$('menuShade').classList.toggle('open',open)}

function escapeHtml(str=''){return String(str).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]))}
function parseError(e){const raw=String(e?.message||e||'Lỗi không xác định');try{const j=JSON.parse(raw);let msg=j.error||raw;if(Array.isArray(j.attempts)&&j.attempts.length){msg+='\n\nCác chế độ AI đã thử nhưng chưa phản hồi được.'}return msg}catch{return raw.replace(/^Error:\s*/,'')}}
function startClock(){const tick=()=>{const el=$('liveClock');if(el)el.textContent=new Date().toLocaleString('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});};tick();setInterval(tick,30000)}
async function checkAIStatus(){const el=$('aiStatus');if(!el)return;try{const h=await fetch('/api/health').then(r=>r.json());el.textContent=h.hasAIKey?'AI: đã cấu hình':'AI: chưa cấu hình';el.className=h.hasAIKey?'ai-status ok':'ai-status warn'}catch(e){el.textContent='Server AI: chưa kết nối';el.className='ai-status warn'}}

function getCurrentMember(){
  try{return JSON.parse(localStorage.getItem('synam_user')||'null')}catch{return null}
}
function getChatUserLabel(){
  const user=getCurrentMember();
  const name=String(user?.name||user?.email||'').trim();
  if(name) return {icon:'👤',name:name,plan:user?.plan||'Free'};
  return {icon:'👥',name:'Khách',plan:'Guest'};
}
function getChatUserRoleHtml(){
  const u=getChatUserLabel();
  const plan=u.plan && u.plan!=='Guest'?` <small>${escapeHtml(u.plan)}</small>`:'';
  return `<span class="msg-role user-role">${u.icon} ${escapeHtml(u.name)}${plan}</span>`;
}
function stopSpeaking(){
  try{speechSynthesis?.cancel?.()}catch{}
  setVoiceStatus('🔇 Đã khóa mỏ / dừng đọc',false);
  toast('Đã dừng đọc giọng AI');
}
function toggleSpeakReply(){
  const el=$('voiceReplyToggle');
  if(!el) return;
  saveVoicePrefs();
  if(!el.checked){stopSpeaking();}
  updateVoiceToggleLabels();
}
function updateVoiceToggleLabels(){
  const reply=$('voiceReplyToggle');
  const replyText=$('voiceReplyLabelText');
  if(replyText) replyText.textContent=reply?.checked?'🔊 Giọng AI đang bật':'🔇 Giọng AI đã tắt';
  const mic=$('voiceInputToggle');
  const micText=$('voiceInputLabelText');
  if(micText) micText.textContent=mic?.checked?'🎤 Mic nhập giọng đang bật':'🎤 Mic nhập giọng đã tắt';
  updateQuickVoiceButtons();
}
function updateQuickVoiceButtons(){
  const reply=$('voiceReplyToggle');
  const btn=$('voiceReplyQuickBtn');
  if(btn){
    const on=reply?.checked!==false;
    btn.textContent=on?'🔊':'🔇';
    btn.classList.toggle('off',!on);
    btn.title=on?'Giọng AI đang bật - bấm để tắt':'Giọng AI đang tắt - bấm để bật';
  }
}
function toggleQuickSpeakReply(){
  const el=$('voiceReplyToggle');
  if(el){
    el.checked=!el.checked;
    toggleSpeakReply();
  }else{
    stopSpeaking();
  }
  updateQuickVoiceButtons();
}
function toggleVoiceInputEnabled(){
  const el=$('voiceInputToggle');
  localStorage.setItem('synam_voice_input_enabled', el?.checked?'1':'0');
  if(!el?.checked) stopVoiceInput();
  updateVoiceToggleLabels();
}

function toast(t){const el=$('toast');el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2400)}
function setLoading(id,on=true){$(id)?.classList.toggle('loading',on)}
function htmlResult(title,text){lastResult=text||'';return `<h2>${title}</h2>${markdownish(text)}`}
function markdownish(text=''){return text.split('\n').map(line=>{if(line.startsWith('### '))return `<h3>${line.slice(4)}</h3>`;if(line.startsWith('## '))return `<h2>${line.slice(3)}</h2>`;if(line.startsWith('- '))return `<li>${line.slice(2)}</li>`;return line.trim()?`<p>${line}</p>`:''}).join('').replace(/(<li>.*<\/li>)/gs,'<ul>$1</ul>')}
function getHistoryList(){try{return JSON.parse(localStorage.getItem('synam_history')||'[]')}catch{return []}}
function saveHistory(type,content){
  const list=getHistoryList();
  const item={id:'h_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),type,content,at:new Date().toLocaleString('vi-VN'),day:new Date().toISOString().slice(0,10)};
  list.unshift(item);
  localStorage.setItem('synam_history',JSON.stringify(list.slice(0,120)));
  renderHistory();
}
function renderHistory(){
  const list=getHistoryList();
  const today=new Date().toISOString().slice(0,10);
  const byType=list.reduce((m,x)=>{m[x.type]=(m[x.type]||0)+1;return m},{});
  const days=new Set(list.map(x=>x.day||String(x.at||'').slice(0,10)).filter(Boolean));
  if($('statCount'))$('statCount').textContent=list.length;
  if($('statToday'))$('statToday').textContent=list.filter(x=>(x.day||'')===today).length;
  if($('statDays'))$('statDays').textContent=days.size||0;
  if($('statTop')){const top=Object.entries(byType).sort((a,b)=>b[1]-a[1])[0];$('statTop').textContent=top?top[0]:'Chưa có';}
  if($('historyMini'))$('historyMini').innerHTML=(list.slice(0,3).map((x,i)=>`<div class="history-mini-item usable" onclick="showHistoryByIndex(${i})"><span>${escapeHtml(x.type)}</span><small>${escapeHtml(x.at||'')} · Chi tiết</small></div>`).join('')||'<p>Chưa có lịch sử. Hãy dùng Chat AI, Tình duyên hoặc Thần số học trước nhé.</p>');
  if($('historyList'))$('historyList').innerHTML=(list.map((x,i)=>`<div class="history-item"><div><b>${escapeHtml(x.type)}</b><br><small>${escapeHtml(x.at||'')}</small></div><div class="history-actions"><button onclick="showHistoryByIndex(${i})">Chi tiết</button><button onclick="speakHistory(${i})">Đọc</button><button onclick="deleteHistory(${i})">Xóa</button></div></div>`).join('')||'<p>Chưa có lịch sử phân tích.</p>');
  renderStatsBars(byType,list.length);
}
function renderStatsBars(byType,total){
  const el=$('statsBars'); if(!el) return;
  const order=['Sỹ Năm AI Chat','Tình duyên','Thần số học','Tử vi AI','Xem chỉ tay','Xem tướng'];
  const rows=order.map(k=>[k,byType[k]||0]).filter(x=>x[1]>0);
  el.innerHTML=rows.length?rows.map(([k,v])=>{const pct=total?Math.round(v*100/total):0;return `<div class="stat-bar-row"><span>${escapeHtml(k)}</span><b>${v}</b><i style="--w:${pct}%"></i></div>`}).join(''):'<p class="muted">Chưa có dữ liệu thống kê thật.</p>';
}
function showHistoryByIndex(i){const item=getHistoryList()[i];if(!item)return;lastResult=item.content||'';openResultModal(item.type,item.content,item.at);}
function speakHistory(i){const item=getHistoryList()[i];if(item)speakText(item.content,true)}
function deleteHistory(i){const list=getHistoryList();list.splice(i,1);localStorage.setItem('synam_history',JSON.stringify(list));renderHistory();toast('Đã xóa một mục lịch sử')}
function openResultModal(title,content,at=''){
  let modal=$('resultModal');
  if(!modal){document.body.insertAdjacentHTML('beforeend',`<div id="resultModal" class="result-modal"><div class="result-modal-box"><button class="modal-close" onclick="closeResultModal()">×</button><h2 id="resultModalTitle"></h2><small id="resultModalTime"></small><div id="resultModalBody" class="result-modal-body"></div><div class="modal-actions"><button onclick="speakText(lastResult,true)">🔊 Đọc</button><button onclick="copyLastResult()">📋 Copy</button><button onclick="closeResultModal()">Đóng</button></div></div></div>`);modal=$('resultModal')}
  $('resultModalTitle').textContent=title||'Chi tiết'; $('resultModalTime').textContent=at||''; $('resultModalBody').innerHTML=markdownish(content||''); modal.classList.add('open');
}
function closeResultModal(){$('resultModal')?.classList.remove('open')}
async function copyLastResult(){try{await navigator.clipboard.writeText(lastResult||'');toast('Đã copy kết quả')}catch{toast('Không copy được trên trình duyệt này')}}
function showHistory(c){lastResult=decodeURIComponent(c);openResultModal('Chi tiết lịch sử',lastResult)}
function clearHistory(){localStorage.removeItem('synam_history');renderHistory();toast('Đã xóa lịch sử')}

function cleanSpeakText(text=''){
  return String(text||'')
    .replace(/```[\s\S]*?```/g,' đoạn code ')
    .replace(/[#*_`>\[\](){}|]/g,' ')
    .replace(/https?:\/\/\S+/g,' đường link ')
    .replace(/\s+/g,' ')
    .trim()
    .slice(0,3800);
}

let cachedVoices=[];
function getVoicePrefs(){
  try{return JSON.parse(localStorage.getItem('synam_voice_prefs')||'{}')}catch{return {}}
}
function isVietnameseVoice(v){
  const hay=(String(v?.lang||'')+' '+String(v?.name||'')).toLowerCase();
  return hay.includes('vi') || hay.includes('vietnam') || hay.includes('viet nam') || hay.includes('tiếng việt') || hay.includes('tieng viet');
}
function scoreVietnameseVoice(v){
  const hay=(String(v?.lang||'')+' '+String(v?.name||'')).toLowerCase();
  let score=0;
  if(String(v?.lang||'').toLowerCase()==='vi-vn') score+=100;
  if(String(v?.lang||'').toLowerCase().startsWith('vi')) score+=80;
  if(hay.includes('vietnam') || hay.includes('viet nam')) score+=40;
  if(hay.includes('google')) score+=15;
  if(hay.includes('female') || hay.includes('nữ') || hay.includes('nu')) score+=5;
  if(v?.localService) score+=2;
  return score;
}
function refreshVoiceList(){
  if(!('speechSynthesis' in window)) return [];
  cachedVoices=(speechSynthesis.getVoices?.()||[]).slice();
  const select=$('voiceSelect');
  if(select){
    const prefs=getVoicePrefs();
    const vi=cachedVoices.filter(isVietnameseVoice).sort((a,b)=>scoreVietnameseVoice(b)-scoreVietnameseVoice(a));
    const others=cachedVoices.filter(v=>!isVietnameseVoice(v));
    const opts=[`<option value="auto">Tự động chọn giọng Việt</option>`]
      .concat(vi.map(v=>`<option value="${escapeHtml(v.name)}">🇻🇳 ${escapeHtml(v.name)} (${escapeHtml(v.lang||'')})</option>`))
      .concat(others.slice(0,40).map(v=>`<option value="${escapeHtml(v.name)}">🌐 ${escapeHtml(v.name)} (${escapeHtml(v.lang||'')})</option>`));
    select.innerHTML=opts.join('');
    select.value=prefs.voiceName||'auto';
  }
  return cachedVoices;
}
function initVietnameseVoices(){
  if(!('speechSynthesis' in window)) return;
  refreshVoiceList();
  speechSynthesis.onvoiceschanged=()=>refreshVoiceList();
  setTimeout(refreshVoiceList,250);
  setTimeout(refreshVoiceList,1000);
}
function getPreferredVoice(){
  const prefs=getVoicePrefs();
  const voices=refreshVoiceList();
  if(!voices.length) return null;
  if(prefs.voiceName && prefs.voiceName!=='auto'){
    const chosen=voices.find(v=>v.name===prefs.voiceName);
    if(chosen) return chosen;
  }
  const vi=voices.filter(isVietnameseVoice).sort((a,b)=>scoreVietnameseVoice(b)-scoreVietnameseVoice(a));
  return vi[0] || null;
}
function speakText(text, force=false){
  const enabled=$('voiceReplyToggle')?.checked;
  if(!force && !enabled) return;
  if(!('speechSynthesis' in window)){toast('Trình duyệt chưa hỗ trợ đọc giọng nói');return}
  const clean=cleanSpeakText(text);
  if(!clean){toast('Không có nội dung để đọc');return}
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(clean);
  u.lang='vi-VN';
  u.rate=Number($('voiceRate')?.value||1);
  u.pitch=1;
  const voice=getPreferredVoice();
  if(voice){
    u.voice=voice;
    u.lang=voice.lang || 'vi-VN';
    setVoiceStatus('🔊 Đang đọc bằng giọng: '+voice.name,false);
  }else{
    u.lang='vi-VN';
    setVoiceStatus('🔊 Máy chưa có giọng Việt. Vẫn đọc bằng giọng mặc định của trình duyệt.',false);
  }
  u.onend=()=>{ if($('autoListenToggle')?.checked && $('page-chat')?.classList.contains('active')) startVoiceInput(); };
  speechSynthesis.speak(u);
}
function speakLastResult(){if(lastResult){speakText(lastResult,true);return}const first=getHistoryList()[0];if(first){lastResult=first.content||'';speakText(lastResult,true);toast('Đang đọc kết quả gần nhất');return}toast('Chưa có kết quả để đọc. Hãy phân tích trước nhé.')}
function testVoice(){speakText('Xin chào Chủ tịch Năm. Đây là bản Sỹ Năm Voice Việt Pro. Nếu máy có giọng tiếng Việt, tôi sẽ đọc đúng tiếng Việt.',true)}
function saveVoicePrefs(){
  const prefs={
    reply:Boolean($('voiceReplyToggle')?.checked),
    auto:Boolean($('autoListenToggle')?.checked),
    rate:$('voiceRate')?.value||'1',
    voiceName:$('voiceSelect')?.value||'auto'
  };
  localStorage.setItem('synam_voice_prefs',JSON.stringify(prefs));
  updateVoiceToggleLabels();
}

function loadVoicePrefs(){
  try{
    const prefs=getVoicePrefs();
    setTimeout(()=>{
      if($('voiceReplyToggle') && typeof prefs.reply==='boolean') $('voiceReplyToggle').checked=prefs.reply;
      if($('autoListenToggle') && typeof prefs.auto==='boolean') $('autoListenToggle').checked=prefs.auto;
      if($('voiceRate') && prefs.rate) $('voiceRate').value=prefs.rate;
      if($('voiceSelect') && prefs.voiceName) $('voiceSelect').value=prefs.voiceName;
      if($('voiceInputToggle')) $('voiceInputToggle').checked=(localStorage.getItem('synam_voice_input_enabled')!=='0');
      refreshVoiceList();
      updateVoiceToggleLabels();
    },120);
  }catch{}
}
let voiceRecognizer=null;
let voiceListening=false;
function getSpeechRecognition(){return window.SpeechRecognition||window.webkitSpeechRecognition||null}
function setVoiceStatus(text,active=false){const el=$('voiceStatus');if(el){el.textContent=text;el.classList.toggle('listening',active)} const btn=$('voiceBtn');if(btn){btn.classList.toggle('recording',active);btn.textContent=active?'🔴':'🎤'}}
function startVoiceInput(){
  if($('voiceInputToggle') && !$('voiceInputToggle').checked){toast('Mic nhập giọng đang tắt. Bật 🎤 Mic trước đã nhé.');return}
  const SR=getSpeechRecognition();
  if(!SR){toast('Trình duyệt này chưa hỗ trợ nhập giọng nói. Dùng Chrome/Edge trên Android hoặc máy tính nhé.');return}
  if(voiceListening) return;
  try{
    speechSynthesis?.cancel?.();
    voiceRecognizer=new SR();
    voiceRecognizer.lang='vi-VN';
    voiceRecognizer.interimResults=true;
    voiceRecognizer.continuous=false;
    let finalText='';
    voiceListening=true;
    setVoiceStatus('🎙️ Đang nghe... nói câu hỏi của Năm đi',true);
    voiceRecognizer.onresult=(event)=>{
      let interim='';
      for(let i=event.resultIndex;i<event.results.length;i++){
        const txt=event.results[i][0].transcript;
        if(event.results[i].isFinal) finalText+=txt;
        else interim+=txt;
      }
      if($('chatText')) {$('chatText').value=(finalText||interim).trim();autoGrowChatInput();}
    };
    voiceRecognizer.onerror=(e)=>{setVoiceStatus('🎙️ Lỗi nghe giọng nói: '+(e.error||'không rõ'),false);voiceListening=false};
    voiceRecognizer.onend=()=>{
      voiceListening=false;
      setVoiceStatus('🎙️ Đã dừng nghe',false);
      const q=$('chatText')?.value?.trim();
      if(q) sendChat();
    };
    voiceRecognizer.start();
  }catch(e){voiceListening=false;setVoiceStatus('🎙️ Không khởi động được micro',false);toast('Không mở được micro: '+(e.message||e))}
}
function stopVoiceInput(){try{voiceRecognizer?.stop?.()}catch{} voiceListening=false;setVoiceStatus('🎙️ Đã dừng nghe',false)}
function toggleVoiceInput(){voiceListening?stopVoiceInput():startVoiceInput()}
function scrollChatBottom(){const el=$('chatLog'); if(el) el.scrollTop=el.scrollHeight}
function autoGrowChatInput(){const el=$('chatText'); if(!el) return; el.style.height='auto'; el.style.height=Math.min(el.scrollHeight,180)+'px'}
function handleChatKeydown(event){if(event.key==='Enter' && !event.shiftKey){event.preventDefault();sendChat()} }
function newProChat(){if(!confirm('Tạo cuộc chat mới? Lịch sử cũ vẫn nằm trong mục Lịch sử.'))return; const log=$('chatLog'); if(log) log.innerHTML='<div class="msg ai-welcome"><b>✨ Cuộc chat mới</b><br>Năm muốn hỏi gì tiếp? Bấm 🎤 để nói hoặc gõ nội dung bên dưới.</div>'; lastResult='';}

function previewImage(e,id){const f=e.target.files[0];if(!f)return;const img=$(id);img.src=URL.createObjectURL(f);img.style.display='block'}
function copyCameraFile(e,targetInputId,previewId){
  const file=e.target.files&&e.target.files[0];
  if(!file) return;
  const dt=new DataTransfer();
  dt.items.add(file);
  const target=$(targetInputId);
  if(target) target.files=dt.files;
  const img=$(previewId);
  if(img){img.src=URL.createObjectURL(file);img.style.display='block'}
  toast('Đã chụp ảnh xong');
}

async function fileToDataURL(file){return await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)})}

let chatAttachments=[];
let chatMode='chat';
let imageEditDataUrl='';
let firebaseAuthState={enabled:false, app:null, auth:null, providers:{}, ready:false};
async function fileToTextPreview(file){
  if(!file) return '';
  const textTypes=['text/','application/json','application/javascript','application/xml','text/csv'];
  const name=(file.name||'').toLowerCase();
  const canRead=textTypes.some(t=>(file.type||'').startsWith(t)) || /\.(txt|md|json|csv|js|jsx|ts|tsx|html|css|xml|log)$/i.test(name);
  if(!canRead) return '';
  return await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result||'').slice(0,12000));r.onerror=rej;r.readAsText(file)});
}
async function handleChatFiles(e){
  const files=[...(e.target.files||[])].slice(0,6);
  if(!files.length) return;
  for(const file of files){
    if(chatAttachments.length>=6){toast('Tối đa 6 file/ảnh mỗi lần hỏi');break}
    const dataUrl=await fileToDataURL(file);
    const textPreview=await fileToTextPreview(file);
    chatAttachments.push({name:file.name,type:file.type||'application/octet-stream',size:file.size,dataUrl,textPreview});
  }
  e.target.value='';
  renderChatAttachments();
}
function renderChatAttachments(){
  const box=$('chatAttachments'); if(!box) return;
  if(!chatAttachments.length){box.innerHTML='';return}
  box.innerHTML=chatAttachments.map((f,i)=>`<div class="attachment-pill">${f.type.startsWith('image/')?`<img class="attachment-thumb" src="${f.dataUrl}" alt="ảnh">`:''}<span>${f.type.startsWith('image/')?'🖼':'📄'} ${escapeHtml(f.name)}</span><small>${Math.ceil((f.size||0)/1024)} KB</small><button onclick="removeChatAttachment(${i})">×</button></div>`).join('');
}
function removeChatAttachment(i){chatAttachments.splice(i,1);renderChatAttachments()}
function clearChatAttachments(){chatAttachments=[];renderChatAttachments();toast('Đã xóa file đính kèm')}


function setChatMode(mode){
  chatMode=mode;
  ['modeChat','modeCreateImage','modeEditImage'].forEach(id=>$(id)?.classList.remove('active'));
  const panel=$('imageAiPanel');
  const upload=$('imageEditUpload');
  const camUpload=$('imageEditCamera');
  const title=$('imageAiTitle');
  const hint=$('imageAiHint');
  const input=$('chatText');
  const btn=$('chatSendBtn');
  if(mode==='chat'){
    $('modeChat')?.classList.add('active');
    if(panel) panel.style.display='none';
    if(input) input.placeholder='Nhập câu hỏi về ảnh/file hoặc nội dung cần hỏi AI...';
    if(btn) btn.textContent='Gửi';
    return;
  }
  if(panel) panel.style.display='block';
  if(mode==='create-image'){
    $('modeCreateImage')?.classList.add('active');
    if(upload) upload.style.display='none';
  if(camUpload) camUpload.style.display='none';
    if(title) title.textContent='🎨 Tạo ảnh AI';
    if(hint) hint.textContent='Nhập mô tả ảnh muốn AI tạo.';
    if(input) input.placeholder='Ví dụ: tạo ảnh poster neon xanh tím, phong cách cinematic...';
    if(btn) btn.textContent='Tạo ảnh';
  }else{
    $('modeEditImage')?.classList.add('active');
    if(upload) upload.style.display='inline-flex';
    if(camUpload) camUpload.style.display='inline-flex';
    if(title) title.textContent='🖼️ Chỉnh sửa ảnh AI';
    if(hint) hint.textContent='Tải ảnh gốc rồi nhập yêu cầu chỉnh sửa.';
    if(input) input.placeholder='Ví dụ: xóa nền, làm nét, đổi nền xanh, thêm chữ...';
    if(btn) btn.textContent='Chỉnh ảnh';
  }
}
async function handleImageEditFile(e){
  const file=e.target.files?.[0];
  if(!file) return;
  imageEditDataUrl=await fileToDataURL(file);
  const img=$('imageEditPreview');
  if(img){img.src=imageEditDataUrl;img.style.display='block'}
  toast('Đã tải ảnh gốc để chỉnh sửa');
}
function renderGeneratedImages(images=[]){
  if(!images.length) return '';
  return `<div class="generated-images">${images.map((img,i)=>{
    const src=`data:${img.mimeType||'image/png'};base64,${img.data}`;
    return `<figure><img src="${src}" alt="Ảnh AI ${i+1}"><figcaption><a download="synam-ai-image-${Date.now()}-${i+1}.png" href="${src}">Tải ảnh</a></figcaption></figure>`;
  }).join('')}</div>`;
}
async function sendImageAI(){
  const input=$('chatText');
  const prompt=input.value.trim();
  const isEdit=chatMode==='edit-image';
  const attachments=[...chatAttachments];
  if(!prompt){toast('Nhập mô tả ảnh hoặc yêu cầu chỉnh sửa đã nhé');return}
  if(isEdit && !imageEditDataUrl && !attachments.some(f=>String(f.type||'').startsWith('image/'))){toast('Chỉnh sửa ảnh cần tải ảnh gốc');return}
  chatSending=true;
  input.value='';autoGrowChatInput();
  const title=isEdit?'Chỉnh sửa ảnh AI':'Tạo ảnh AI';
  $('chatLog').insertAdjacentHTML('beforeend',`<div class="msg me">${getChatUserRoleHtml()}<b>${title}</b><br>${escapeHtml(prompt)}</div>`);
  $('chatLog').insertAdjacentHTML('beforeend',`<div class="msg" id="typing">AI đang ${isEdit?'chỉnh sửa':'tạo'} ảnh...</div>`);
  chatAttachments=[];renderChatAttachments();
  try{
    const data=await postJSON('/api/image-ai',{mode:isEdit?'edit':'create',prompt,image:imageEditDataUrl,attachments,context:{clientTime:new Date().toLocaleString('vi-VN')}});
    const images=data.images||[];
    const text=data.text||`Đã ${isEdit?'chỉnh sửa':'tạo'} ảnh bằng Sỹ Năm AI.`;
    $('typing').outerHTML=`<div class="msg image-ai-result">${markdownish(text)}${renderGeneratedImages(images)}</div>`;
    lastResult=text;saveHistory(title,text);checkAIStatus();
  }catch(e){
    const err=parseError(e);
    $('typing').outerHTML=`<div class="msg error"><b>AI chưa tạo/chỉnh ảnh được.</b><br>${escapeHtml(err)}<br><small>Kiểm tra API key, quota hoặc cấu hình model ảnh trong .env.</small></div>`;
  }
}

function authHeaders(){const token=localStorage.getItem('synam_token')||'';return token?{'Content-Type':'application/json','Authorization':'Bearer '+token}:{'Content-Type':'application/json'}}
async function postJSON(url,data){const r=await fetch(url,{method:'POST',headers:authHeaders(),body:JSON.stringify(data)});if(!r.ok)throw new Error(await r.text());return r.json()}
async function getJSON(url){const token=localStorage.getItem('synam_token')||'';const r=await fetch(url,{headers:token?{'Authorization':'Bearer '+token}:{}});if(!r.ok)throw new Error(await r.text());return r.json()}

async function quickAsk(){const q=$('globalAsk').value.trim();if(!q){routeTo('chat');return}routeTo('chat');$('chatText').value=q;sendChat()}
let chatSending=false;
async function sendChat(){
  if(chatSending){toast('AI đang trả lời, đợi xong rồi gửi tiếp nhé');return}
  if(chatMode!=='chat') return sendImageAI();
  const input=$('chatText');
  const q=input.value.trim();
  const attachments=[...chatAttachments];
  if(!q && !attachments.length){toast('Nhập câu hỏi hoặc tải ảnh/file lên đã nhé');return}
  chatSending=true;
  input.value='';autoGrowChatInput();
  const attachLabel=attachments.length?`<div class="msg-files">${attachments.map(f=>`${f.type.startsWith('image/')?'🖼':'📄'} ${escapeHtml(f.name)}`).join('<br>')}</div>`:'';
  $('chatLog').insertAdjacentHTML('beforeend',`<div class="msg me">${getChatUserRoleHtml()}${escapeHtml(q||'Phân tích file/ảnh đã tải lên')}${attachLabel}</div>`);
  $('chatLog').insertAdjacentHTML('beforeend',`<div class="msg typing" id="typing"><span class="typing-dots"><i></i><i></i><i></i></span> AI đang phân tích${attachments.length?' ảnh/file':''}...</div>`);scrollChatBottom();
  chatAttachments=[];renderChatAttachments();
  try{
    const history=[...document.querySelectorAll('#chatLog .msg')].slice(-10).map(el=>({role:el.classList.contains('me')?'user':'assistant',text:el.innerText||''}));
    let data;
    const provider=$('chatProvider')?.value||'auto';
    const model=$('chatModel')?.value||'';
    const council=Boolean($('chatCouncil')?.checked);
    if(attachments.length){
      data=await postJSON('/api/chat-ai',{message:q,question:q,attachments,history,context:{clientTime:new Date().toLocaleString('vi-VN'),source:'Sỹ Năm Mystic AI Chat - file/image'}});
    }else{
      data=await postJSON('/api/multi-ai/chat',{message:q,provider,model,council,context:{clientTime:new Date().toLocaleString('vi-VN'),source:'Sỹ Năm AI Chat'}});
    }
    const text=data.text||data.answer||data.result||'AI đã phản hồi nhưng server không trả text.';
    const providerLabel=data.label?`<small>Trả lời bởi: Sỹ Năm AI</small><br>`:'';
    $('typing').outerHTML=`<div class="msg ai-msg"><span class="msg-role">🤖 Sỹ Năm AI</span>${providerLabel}${markdownish(text)}</div>`;
    lastResult=text;saveHistory('Sỹ Năm AI Chat',text);checkAIStatus();scrollChatBottom();speakText(text); 
  }catch(e){
    const err=parseError(e);
    $('typing').outerHTML=`<div class="msg error"><b>AI chưa phản hồi được.</b><br>${escapeHtml(err)}<br><small>Kiểm tra API key / mạng / quota hoặc đổi provider khác rồi thử lại.</small></div>`;scrollChatBottom();
    lastResult='';
  }finally{
    chatSending=false;
  }
}
function localMystic(){const name=$('name').value||'Bạn';const text=`### Luận giải local cho ${name}\n- Tổng quan: năng lượng hiện tại thiên về thay đổi và hoàn thiện bản thân.\n- Công việc: nên tập trung một mục tiêu chính, tránh ôm quá nhiều việc cùng lúc.\n- Tình cảm: cần giao tiếp rõ ràng, chân thành và bớt suy diễn.\n- Lời khuyên: kết quả chỉ mang tính tham khảo văn hóa, quyết định vẫn nên dựa trên thực tế.`;$('report').innerHTML=htmlResult('📜 Kết quả tử vi',text);saveHistory('Tử vi local',text)}
async function generateMystic(){setLoading('report',true);try{const payload={name:$('name').value,birthDate:$('birthDate').value,birthTime:$('birthTime').value,gender:$('gender').value};const data=await postJSON('/api/mystic-ai',payload);const text=data.text||data.result||data.answer||'Không có nội dung trả về.';$('report').innerHTML=htmlResult('📜 Kết quả tử vi AI',text);saveHistory('Tử vi AI',text)}catch(e){localMystic();toast('AI lỗi, đã dùng local')}finally{setLoading('report',false)}}

function reduceNumber(n, keepMaster=true){
  n = Math.abs(parseInt(n||0,10)||0);
  while(n>9 && !(keepMaster && (n===11 || n===22 || n===33))){
    n = String(n).split('').reduce((s,d)=>s+(parseInt(d,10)||0),0);
  }
  return n;
}
function lettersToNumber(name=''){
  const map={A:1,J:1,S:1,B:2,K:2,T:2,C:3,L:3,U:3,D:4,M:4,V:4,E:5,N:5,W:5,F:6,O:6,X:6,G:7,P:7,Y:7,H:8,Q:8,Z:8,I:9,R:9};
  const clean=String(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  return clean.split('').reduce((s,ch)=>s+(map[ch]||0),0);
}
function vowelsToNumber(name=''){
  const vowels='AEIOUY';
  const map={A:1,J:1,S:1,B:2,K:2,T:2,C:3,L:3,U:3,D:4,M:4,V:4,E:5,N:5,W:5,F:6,O:6,X:6,G:7,P:7,Y:7,H:8,Q:8,Z:8,I:9,R:9};
  const clean=String(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  return clean.split('').reduce((s,ch)=>s+(vowels.includes(ch)?(map[ch]||0):0),0);
}
function consonantsToNumber(name=''){
  const vowels='AEIOUY';
  const map={A:1,J:1,S:1,B:2,K:2,T:2,C:3,L:3,U:3,D:4,M:4,V:4,E:5,N:5,W:5,F:6,O:6,X:6,G:7,P:7,Y:7,H:8,Q:8,Z:8,I:9,R:9};
  const clean=String(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  return clean.split('').reduce((s,ch)=>s+(!vowels.includes(ch)?(map[ch]||0):0),0);
}
function numberMeaning(n){
  const m={1:'độc lập, chủ động, có tố chất dẫn dắt',2:'tinh tế, biết lắng nghe, hợp làm cầu nối',3:'sáng tạo, vui vẻ, giỏi biểu đạt',4:'thực tế, kỷ luật, bền bỉ',5:'tự do, linh hoạt, thích trải nghiệm',6:'ấm áp, trách nhiệm, giàu tình cảm',7:'sâu sắc, trực giác tốt, thích tìm hiểu',8:'tham vọng, quản lý tốt, hướng thành tựu',9:'nhân văn, bao dung, giàu lý tưởng',11:'trực giác mạnh, truyền cảm hứng, nhạy cảm',22:'xây dựng lớn, biến ý tưởng thành hệ thống',33:'chữa lành, yêu thương, phụng sự cộng đồng'};
  return m[n]||'cần thêm dữ liệu để luận kỹ hơn';
}
function localNumerologyReport(name,birth){
  const digits=String(birth||'').replace(/\D/g,'');
  const life=reduceNumber(digits.split('').reduce((s,d)=>s+(+d||0),0));
  const soul=reduceNumber(vowelsToNumber(name));
  const expr=reduceNumber(lettersToNumber(name));
  const personality=reduceNumber(consonantsToNumber(name));
  return `### 🔢 Thần số học tổng quan\n- Họ tên: ${name||'Chưa nhập'}\n- Ngày sinh: ${birth||'Chưa nhập'}\n- Con số chủ đạo: ${life} — ${numberMeaning(life)}.\n- Con số linh hồn: ${soul} — điều bên trong bạn hướng tới: ${numberMeaning(soul)}.\n- Con số biểu đạt: ${expr} — cách bạn thể hiện ra ngoài: ${numberMeaning(expr)}.\n- Con số nhân cách: ${personality} — ấn tượng người khác dễ cảm nhận: ${numberMeaning(personality)}.\n\n### Điểm mạnh\n- Bạn có năng lượng nổi bật của số ${life}: ${numberMeaning(life)}.\n- Khi cân bằng cảm xúc, bạn dễ phát huy tốt năng lực giao tiếp, lựa chọn và kiên trì.\n\n### Điểm cần cân bằng\n- Tránh để cảm xúc nhất thời quyết định thay mục tiêu dài hạn.\n- Nên rèn thói quen ghi chép, lên kế hoạch và kiểm tra lại việc quan trọng.\n\n### Gợi ý tình duyên & công việc\n- Tình duyên: hợp với người biết tôn trọng nhịp sống và cách suy nghĩ của bạn.\n- Công việc: ưu tiên môi trường giúp bạn phát huy điểm mạnh của số ${life}.\n\n### Lưu ý\n- Kết quả thần số học chỉ mang tính tham khảo, không thay thế quyết định thực tế.`;
}
async function generateNumerology(){
  const name=$('numName')?.value||''; const birth=$('numBirth')?.value||''; const focus=$('numFocus')?.value||'Tổng quan';
  const local=localNumerologyReport(name,birth); setLoading('numerologyResult',true);
  try{
    const prompt=`Luận thần số học tiếng Việt thật chi tiết cho: Họ tên ${name}, ngày sinh ${birth}, trọng tâm ${focus}. Dựa trên bản tính local sau, mở rộng thành báo cáo đẹp, rõ mục, có điểm mạnh/yếu, công việc, tình duyên và lời khuyên thực tế. Không mê tín cực đoan.\n\n${local}`;
    const data=await postJSON('/api/chat-ai',{message:prompt});
    const text=data.text||data.answer||data.result||local;
    $('numerologyResult').innerHTML=htmlResult('🔢 Kết quả thần số học AI',text); saveHistory('Thần số học',text);
  }catch(e){$('numerologyResult').innerHTML=htmlResult('🔢 Kết quả thần số học',local); saveHistory('Thần số học local',local)}
  finally{setLoading('numerologyResult',false)}
}

async function generateLove(){setLoading('loveResult',true);try{const payload={name1:$('loveName1').value,birth1:$('loveBirth1').value,name2:$('loveName2').value,birth2:$('loveBirth2').value,focus:$('loveFocus').value};const data=await postJSON('/api/love-ai',payload);const text=data.text||data.result||data.answer;$('loveResult').innerHTML=htmlResult('💕 Kết quả tình duyên AI',text);saveHistory('Tình duyên',text)}catch(e){const text=`### Tình duyên tham khảo\n- Hai người cần xem sự hòa hợp qua cách giao tiếp, nhịp sống và mục tiêu dài hạn.\n- Điểm mạnh: có thể bổ sung cho nhau nếu biết lắng nghe.\n- Điểm cần tránh: im lặng, thử lòng, nóng vội.\n- Lời khuyên: dùng tử vi như tham khảo, tình cảm thật nằm ở hành động hằng ngày.`;$('loveResult').innerHTML=htmlResult('💕 Kết quả tình duyên',text);saveHistory('Tình duyên local',text)}finally{setLoading('loveResult',false)}}
async function analyzeVision(kind){const isPalm=kind==='palm';const resultId=isPalm?'palmResult':'faceResult';const file=$(isPalm?'palmImage':'faceImage').files[0];const note=$(isPalm?'palmNote':'faceNote').value;setLoading(resultId,true);try{const image=file?await fileToDataURL(file):'';const payload={mode:isPalm?'palm':'face',palmImage:isPalm?image:'',faceImage:isPalm?'':image,palmLine:isPalm?$('palmLine').value:'',palmNote:isPalm?note:'',facePart:isPalm?'':$('facePart').value,faceNote:isPalm?'':note,clientTime:new Date().toLocaleString('vi-VN')};const data=await postJSON('/api/vision-ai',payload);const text=data.text||data.result||data.answer||'Không có nội dung trả về.';$(resultId).innerHTML=htmlResult(isPalm?'🖐 Kết quả xem chỉ tay AI':'🙂 Kết quả xem tướng AI',text);saveHistory(isPalm?'Xem chỉ tay':'Xem tướng',text)}catch(e){const text=isPalm?`### Chỉ tay tham khảo\n- Sinh đạo: tượng trưng sức bền và nhịp sống.\n- Trí đạo: tượng trưng tư duy, cách quyết định.\n- Tâm đạo: tượng trưng cảm xúc và tình cảm.\n- Ảnh cần rõ lòng bàn tay để AI phân tích sâu hơn.`:`### Xem tướng tham khảo\n- Ngũ quan cân đối thường tạo cảm giác hài hòa.\n- Thần thái sáng thể hiện sự tự tin.\n- Kết quả chỉ là tham khảo văn hóa, không dùng để định danh hoặc kết luận sức khỏe.`;$(resultId).innerHTML=htmlResult(isPalm?'🖐 Kết quả xem chỉ tay':'🙂 Kết quả xem tướng',text);saveHistory(isPalm?'Xem chỉ tay local':'Xem tướng local',text)}finally{setLoading(resultId,false)}}
async function simpleTool(kind){const map={astrology:['astrologyResult','🪐 Kết quả chiêm tinh',`Cung: ${$('zodiac')?.value||''}\nCâu hỏi: ${$('astroQuestion')?.value||''}`],fengshui:['fengshuiResult','☯ Kết quả phong thủy',`Năm sinh: ${$('fengYear')?.value||''}\nCâu hỏi: ${$('fengAsk')?.value||''}`],tarot:['tarotResult','🃏 Kết quả bói bài',$('tarotAsk')?.value||'']};const [id,title,prompt]=map[kind];setLoading(id,true);try{const data=await postJSON('/api/chat-ai',{message:`${title}. ${prompt}`});const text=data.text||data.answer||data.result;$(id).innerHTML=htmlResult(title,text);saveHistory(title,text)}catch(e){const text=`### ${title}\n- Hiện chưa kết nối được AI server.\n- Nội dung bạn hỏi: ${prompt}\n- Lời khuyên: xem đây là gợi ý tham khảo, nên đối chiếu với tình hình thực tế.`;$(id).innerHTML=htmlResult(title,text);saveHistory(title+' local',text)}finally{setLoading(id,false)}}
async function deepAnalyze(){const q=$('deepAsk').value.trim();if(!q)return toast('Nhập chủ đề đã nhé');setLoading('deepResult',true);try{const data=await postJSON('/api/chat-ai',{message:`Phân tích sâu theo nhiều lớp, rõ ràng, có lời khuyên thực tế: ${q}`});const text=data.text||data.answer||data.result;$('deepResult').innerHTML=htmlResult('🤯 AI phân tích sâu',text);saveHistory('AI phân tích sâu',text)}catch(e){const text=`### Phân tích sâu local\n- Vấn đề: ${q}\n- Lớp 1: xác định mục tiêu thật sự.\n- Lớp 2: xem rủi ro, nguồn lực, thời gian.\n- Lớp 3: chọn bước nhỏ làm ngay hôm nay.\n- Lời khuyên: đừng ôm quá nhiều hướng cùng lúc.`;$('deepResult').innerHTML=htmlResult('🤯 AI phân tích sâu',text);saveHistory('AI phân tích sâu local',text)}finally{setLoading('deepResult',false)}}

async function initFirebaseAuth(){
  if(firebaseAuthState.ready) return firebaseAuthState;
  firebaseAuthState.ready=true;
  try{
    const cfgData=await fetch('/api/auth/firebase-config').then(r=>r.json());
    if(!cfgData.enabled){
      const hint=$('socialLoginHint');
      if(hint) hint.textContent='Đăng nhập nhanh chưa sẵn sàng.';
      return firebaseAuthState;
    }
    const appMod=await import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js');
    const authMod=await import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js');
    const app=appMod.initializeApp(cfgData.config);
    const auth=authMod.getAuth(app);
    auth.useDeviceLanguage();
    firebaseAuthState={
      enabled:true,
      app,
      auth,
      providers:{
        google:new authMod.GoogleAuthProvider(),
        facebook:new authMod.FacebookAuthProvider()
      },
      signInWithPopup:authMod.signInWithPopup,
      ready:true
    };
    const hint=$('socialLoginHint');
    if(hint) hint.textContent='Đăng nhập nhanh đã sẵn sàng.';
    return firebaseAuthState;
  }catch(error){
    console.error('Firebase Auth init error:',error);
    const hint=$('socialLoginHint');
    if(hint) hint.textContent='Đăng nhập nhanh chưa khả dụng.';
    return firebaseAuthState;
  }
}

async function socialLogin(provider){
  const state=await initFirebaseAuth();
  if(!state.enabled || !state.auth || !state.providers[provider]){
    toast('Đăng nhập '+(provider==='google'?'Google':'Facebook')+' chưa sẵn sàng');
    routeTo('account');
    return;
  }
  try{
    const result=await state.signInWithPopup(state.auth,state.providers[provider]);
    const user=result.user;
    const idToken=await user.getIdToken();
    const data=await postJSON('/api/auth/social',{
      provider,
      uid:user.uid,
      email:user.email||'',
      name:user.displayName||'',
      avatar:user.photoURL||'',
      idToken
    });
    localStorage.setItem('synam_user',JSON.stringify(data.user));
    localStorage.setItem('synam_token',data.token||'');
    localStorage.setItem('synam_profile',JSON.stringify({name:data.user.name,email:data.user.email,plan:data.user.plan||'Free'}));
    if($('profileName'))$('profileName').value=data.user.name||'';
    if($('profileEmail'))$('profileEmail').value=data.user.email||'';
    if($('profilePlan'))$('profilePlan').value=data.user.plan||'Free';
    setAccountStatus(data.user,'Đăng nhập bằng '+(provider==='google'?'Google':'Facebook')+' thành công.');
    toast('Đăng nhập thành công');
  }catch(error){
    console.error(error);
    toast(error?.code==='auth/popup-closed-by-user'?'Bạn đã đóng cửa sổ đăng nhập.':(error?.message||'Đăng nhập mạng xã hội lỗi'));
  }
}

async function refreshSession(){
  try{
    if(!localStorage.getItem('synam_token')) return;
    const data=await getJSON('/api/auth/me');
    localStorage.setItem('synam_user',JSON.stringify(data.user));
    setAccountStatus(data.user,'Phiên đăng nhập còn hiệu lực.');
  }catch{
    localStorage.removeItem('synam_token');
    localStorage.removeItem('synam_user');
    setAccountStatus(null);
  }
}

async function logoutAccount(){
  try{ await postJSON('/api/auth/logout',{}); }catch{}
  localStorage.removeItem('synam_token');
  localStorage.removeItem('synam_user');
  setAccountStatus(null,'Đã đăng xuất.');
  toast('Đã đăng xuất');
}

function currentProfile(){
  return {
    name:$('profileName')?.value||'Thành viên',
    email:$('profileEmail')?.value||'',
    password:$('profilePassword')?.value||'',
    plan:$('profilePlan')?.value||'Free'
  }
}
function setAccountStatus(user,msg=''){
  const box=$('accountStatus'); if(!box)return;
  if(user){
    const avatar=user.avatar?`<img class="account-avatar" src="${escapeHtml(user.avatar)}" alt="avatar">`:'<div class="account-avatar fake">👤</div>';
    const providers=(user.providers||[]).map(p=>p==='google'?'Google':p==='facebook'?'Facebook':p).join(', ')||'Email/Mật khẩu';
    box.innerHTML=`<div class="account-ok"><div class="account-head">${avatar}<div><h3>✅ Đã đăng nhập</h3><p><b>${escapeHtml(user.name||'Thành viên')}</b><br>${escapeHtml(user.email||'')}</p></div></div><p>Gói: <b>${escapeHtml(user.plan||'Free')}</b> · Nguồn: <b>${escapeHtml(providers)}</b></p>${msg?`<p>${escapeHtml(msg)}</p>`:''}<button type="button" onclick="logoutAccount()">🚪 Đăng xuất</button></div>`;
    document.querySelector('.profile-pill')&&(document.querySelector('.profile-pill').innerHTML=`<span class="avatar">👤</span> ${escapeHtml(user?.name||'Tài khoản')} <b>${escapeHtml(user?.plan||'Free')}</b>`);
  }else{
    box.innerHTML=`<div class="account-warn"><h3>🔐 Chưa đăng nhập</h3><p>Đăng ký/đăng nhập để lưu hồ sơ thành viên. Lịch sử phân tích vẫn được lưu local trên máy.</p></div>`;
  }
}
function loadAccount(){
  try{
    const user=JSON.parse(localStorage.getItem('synam_user')||'null');
    const profile=JSON.parse(localStorage.getItem('synam_profile')||'null');
    if(profile){ if($('profileName'))$('profileName').value=profile.name||''; if($('profileEmail'))$('profileEmail').value=profile.email||''; if($('profilePlan'))$('profilePlan').value=profile.plan||'Free'; }
    setAccountStatus(user);
    initFirebaseAuth();
    refreshSession();
  }catch{setAccountStatus(null);initFirebaseAuth()}
}
function saveAccount(){
  const p=currentProfile();
  localStorage.setItem('synam_profile',JSON.stringify({name:p.name,email:p.email,plan:p.plan}));
  toast('Đã lưu hồ sơ local');
  setAccountStatus(JSON.parse(localStorage.getItem('synam_user')||'null'));
}
async function registerAccount(){
  const p=currentProfile();
  if(!p.email || !p.password){toast('Nhập email và mật khẩu đã nhé');return}
  try{
    const data=await postJSON('/api/auth/register',{name:p.name,email:p.email,password:p.password});
    localStorage.setItem('synam_user',JSON.stringify(data.user));
    localStorage.setItem('synam_token',data.token||'');
    localStorage.setItem('synam_profile',JSON.stringify({name:p.name,email:p.email,plan:data.user.plan||'Free'}));
    setAccountStatus(data.user,'Tài khoản đã tạo trên server.');
    toast('Đăng ký thành công');
  }catch(e){toast(parseError(e))}
}
async function loginAccount(){
  const p=currentProfile();
  if(!p.email || !p.password){toast('Nhập email và mật khẩu đã nhé');return}
  try{
    const data=await postJSON('/api/auth/login',{email:p.email,password:p.password});
    localStorage.setItem('synam_user',JSON.stringify(data.user));
    localStorage.setItem('synam_token',data.token||'');
    localStorage.setItem('synam_profile',JSON.stringify({name:data.user.name,email:data.user.email,plan:data.user.plan||'Free'}));
    if($('profileName'))$('profileName').value=data.user.name||'';
    if($('profilePlan'))$('profilePlan').value=data.user.plan||'Free';
    setAccountStatus(data.user,'Đăng nhập thành công.');
    toast('Đăng nhập thành công');
  }catch(e){toast(parseError(e))}
}
window.addEventListener('DOMContentLoaded',init);


async function loadAIProviders(){
  const grid=$('aiProviderGrid');
  const status=$('aiProviderStatus');
  try{
    const data=await getJSON('/api/ai/providers');
    const providers=data.providers||[];
    if(status){
      status.innerHTML=providers.map(p=>`<div class="ai-status-item"><span><span class="provider-dot ${p.configured?'ok':''}"></span><b>${escapeHtml(p.label)}</b><br><span class="model-small">${p.configured?'Đã cấu hình':'Chưa có key'}</span></span><span>${p.configured?'🟢':'⚪'}</span></div>`).join('');
    }
    const mini=$('miniProviderList');
    if(mini){mini.innerHTML=providers.map(p=>`<div class="mini-provider ${p.configured?'on':''}"><span>${p.configured?'🟢':'⚪'} ${escapeHtml(p.label)}</span><small>${p.configured?'Sẵn sàng':'Chưa có key'}</small></div>`).join('')}
    if(grid){
      grid.innerHTML=providers.map(p=>`<div class="ai-provider-card"><h3><span class="provider-dot ${p.configured?'ok':''}"></span>${escapeHtml(p.label)}</h3><label>API Key<input id="key_${p.id}" type="password" autocomplete="off" placeholder="${p.configured?'Đã lưu key ẩn an toàn':'Dán API key'}"></label><label>Tùy chọn nâng cao<input id="model_${p.id}" autocomplete="off" placeholder="Để trống = tự động"></label><p class="ai-note">${escapeHtml(p.freeHint||'')}</p></div>`).join('');
    }
    const select=$('chatProvider');
    if(select){
      [...select.options].forEach(opt=>{ if(opt.value&&opt.value!=='auto'){ const p=providers.find(x=>x.id===opt.value); opt.disabled=p&&!p.configured; }});
    }
  }catch(e){
    if(status)status.innerHTML=`<p class="error">Không tải được cài đặt AI: ${escapeHtml(parseError(e))}</p>`;
  }
}

async function saveAIKeys(){
  const providers=['ai_main','ai_fast','ai_backup','ai_pro1','ai_pro2','ai_reason','ai_creative','ai_general','ai_light'];
  const keys={}; const models={};
  for(const id of providers){
    const k=$('key_'+id)?.value?.trim()||'';
    const m=$('model_'+id)?.value?.trim()||'';
    if(k && !k.includes('...') && !/^\*+$/.test(k)) keys[id]=k;
    if(m) models[id]=m;
  }
  try{
    const data=await postJSON('/api/ai/user-keys',{keys,models});
    toast('Đã lưu API key AI');
    loadAIProviders();
  }catch(e){
    toast(parseError(e));
  }
}
