const routes=[['home','Tử Vi','tuvi'],['palm','Xem Chỉ Tay','palm'],['face','Xem Tướng','face'],['astrology','Chiêm Tinh','astro'],['love','Tình Duyên','love'],['numerology','Thần Số Học','num'],['chat','AI Chat','chat'],['ai','Multi AI','deep'],['fengshui','Phong Thủy','feng'],['tarot','Bói Bài','tarot'],['history','Lịch Sử','history']];
let lastResult='';
const $=id=>document.getElementById(id);
function init(){renderTabs();renderHistory();loadAccount();loadVoicePrefs();initVietnameseVoices();startClock();const firstRoute=location.hash?.replace('#/','')||(window.matchMedia&&window.matchMedia('(max-width: 760px)').matches?'chat':'home');routeTo(firstRoute,false);window.addEventListener('hashchange',()=>routeTo(location.hash.replace('#/','')||'home',false));checkGeminiStatus();loadAIProviders();setTimeout(()=>{if(window.matchMedia&&window.matchMedia('(max-width:760px)').matches&&$('chatText')){$('chatText').focus({preventScroll:true});}},600);}
function tabIcon(icon){return `<span class="holo-icon icon-${icon}"><i></i></span>`}
function renderTabs(){const html=routes.map(([id,name,ico])=>`<button class="tab-card" data-route="${id}" onclick="routeTo('${id}')">${tabIcon(ico)}<span>${name}</span></button>`).join('');$('featureTabs').innerHTML=html;$('sideLinks').innerHTML=routes.concat([['deep','AI phân tích sâu','deep'],['ai','Cài đặt Multi-AI','deep'],['account','Tài khoản','account']]).map(([id,name,ico])=>`<button class="link" onclick="routeTo('${id}');toggleMenu(false)">${tabIcon(ico)} <span>${name}</span></button>`).join('')}
function routeTo(route,push=true){
  if(!route)route='home';
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const page=$('page-'+route)||$('page-home');
  page.classList.add('active');
  document.body.dataset.route=route;
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
function parseError(e){const raw=String(e?.message||e||'Lỗi không xác định');try{const j=JSON.parse(raw);let msg=j.error||raw;if(Array.isArray(j.attempts)&&j.attempts.length){msg+='\n\nCác model đã thử:\n'+j.attempts.map(a=>`- ${a.model}: ${a.error}`).join('\n')}return msg}catch{return raw.replace(/^Error:\s*/,'')}}
function startClock(){const tick=()=>{const el=$('liveClock');if(el)el.textContent=new Date().toLocaleString('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});};tick();setInterval(tick,30000)}
async function checkGeminiStatus(){const el=$('geminiStatus');if(!el)return;try{const h=await fetch('/api/health').then(r=>r.json());el.textContent=h.hasGeminiKey?'Gemini: đã cấu hình API key':'Gemini: chưa có API key';el.className=h.hasGeminiKey?'ai-status ok':'ai-status warn'}catch(e){el.textContent='Server AI: chưa kết nối';el.className='ai-status warn'}}

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

function hideModelLeak(text=''){
  return String(text||'')
    .replace(/^\s*(Trả lời bởi|Powered by|Model|Provider)\s*[:：].*$/gmi,'')
    .replace(/\b(gemini|google gemini|groq|openrouter|openai|chatgpt|gpt-4o(?:-mini)?|gpt-4\.1(?:-mini)?|claude|anthropic|deepseek|qwen|mistral|grok|llama-3(?:\.\d)?[^\s,.]*)\b/gi, 'AI')
    .replace(/\n{3,}/g,'\n\n')
    .trim();
}

function markdownish(text=''){
  text=String(text||'').replace(/\\n/g,'\n').replace(/\r/g,'');
  const inline=s=>escapeHtml(String(s||''))
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/_(.+?)_/g,'<em>$1</em>');
  let inList=false, out='';
  String(text||'').split('\n').forEach(raw=>{
    const line=raw.trim();
    if(!line){ if(inList){out+='</ul>';inList=false} return; }
    if(line.startsWith('### ')){ if(inList){out+='</ul>';inList=false} out+=`<h3>${inline(line.slice(4))}</h3>`; return; }
    if(line.startsWith('## ')){ if(inList){out+='</ul>';inList=false} out+=`<h2>${inline(line.slice(3))}</h2>`; return; }
    if(line.startsWith('- ')){ if(!inList){out+='<ul>';inList=true} out+=`<li>${inline(line.slice(2))}</li>`; return; }
    if(inList){out+='</ul>';inList=false}
    out+=`<p>${inline(line)}</p>`;
  });
  if(inList) out+='</ul>';
  return out;
}
function saveHistory(type,content){const list=JSON.parse(localStorage.getItem('synam_history')||'[]');list.unshift({type,content,at:new Date().toLocaleString('vi-VN')});localStorage.setItem('synam_history',JSON.stringify(list.slice(0,50)));renderHistory();}
function renderHistory(){const list=JSON.parse(localStorage.getItem('synam_history')||'[]');if($('statCount'))$('statCount').textContent=list.length;if($('historyMini'))$('historyMini').innerHTML=(list.slice(0,3).map(x=>`<div class="history-mini-item"><span>${x.type}</span><small>Chi tiết</small></div>`).join('')||'<p>Chưa có lịch sử.</p>');if($('historyList'))$('historyList').innerHTML=(list.map(x=>`<div class="history-item"><div><b>${x.type}</b><br><small>${x.at}</small></div><button onclick="showHistory('${encodeURIComponent(x.content)}')">Chi tiết</button></div>`).join('')||'<p>Chưa có lịch sử phân tích.</p>')}
function showHistory(c){lastResult=decodeURIComponent(c);toast('Đã mở nội dung lịch sử');alert(lastResult.slice(0,2000))}
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
function speakLastResult(){if(!lastResult){toast('Chưa có kết quả để đọc');return} speakText(lastResult,true)}
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

function autoResizeChatText(){
  const el=$('chatText');
  if(!el) return;
  el.style.height='auto';
  const max=window.innerWidth<700?170:240;
  const next=Math.min(Math.max(el.scrollHeight,52),max);
  el.style.height=next+'px';
  el.style.overflowY=el.scrollHeight>max?'auto':'hidden';
}
function setChatTextValue(text){
  const el=$('chatText');
  if(!el) return;
  el.value=String(text||'');
  autoResizeChatText();
}
function handleChatTextKey(event){
  if(event.key==='Enter' && !event.shiftKey){
    event.preventDefault();
    sendChat();
  }
}
function scheduleVoiceAutoSend(){
  clearTimeout(window.synamVoiceSendTimer);
  window.synamVoiceSendTimer=setTimeout(()=>{
    const latest=$('chatText')?.value?.trim();
    if(latest && !voiceListening) sendChat();
  },3000);
}
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
      setChatTextValue((finalText||interim).trim());
      setVoiceStatus(finalText||interim ? '🎙️ Đang nhận: '+(finalText||interim).trim() : '🎙️ Đang nghe...', true);
    };
    voiceRecognizer.onerror=(e)=>{setVoiceStatus('🎙️ Lỗi nghe giọng nói: '+(e.error||'không rõ'),false);voiceListening=false};
    voiceRecognizer.onend=()=>{
      voiceListening=false;
      setVoiceStatus('🎙️ Đã dừng nghe - sẽ gửi sau 3 giây nếu bạn không nói tiếp',false);
      const q=$('chatText')?.value?.trim();
      if(q){
        scheduleVoiceAutoSend();
      }
    };
    voiceRecognizer.start();
  }catch(e){voiceListening=false;setVoiceStatus('🎙️ Không khởi động được micro',false);toast('Không mở được micro: '+(e.message||e))}
}
function stopVoiceInput(){try{voiceRecognizer?.stop?.()}catch{} voiceListening=false;setVoiceStatus('🎙️ Đã dừng nghe',false)}
function toggleVoiceInput(){voiceListening?stopVoiceInput():startVoiceInput()}
function scrollChatBottom(){const el=$('chatLog'); if(el) el.scrollTop=el.scrollHeight}
let lastChatRequest=null;
let lastAssistantText='';
function renderAIMessage(text, extraClass='ai-msg'){
  lastAssistantText=String(text||'');
  return `<div class="msg ${extraClass}"><span class="msg-role">🤖 Sỹ Năm AI</span>${markdownish(text)}<div class="msg-actions"><button type="button" onclick="copyAssistantText()">📋 Copy</button><button type="button" onclick="regenerateLastChat()">↻ Thử lại</button></div></div>`;
}
async function copyAssistantText(){
  const text=lastAssistantText||lastResult||'';
  if(!text){toast('Chưa có câu trả lời để copy');return}
  try{await navigator.clipboard.writeText(text);toast('Đã copy câu trả lời')}catch(_e){toast('Máy không cho copy tự động, hãy bôi đen để copy nhé')}
}
function regenerateLastChat(){
  if(!lastChatRequest){toast('Chưa có câu hỏi để thử lại');return}
  setChatTextValue(lastChatRequest.message||'');
  chatAttachments=[...(lastChatRequest.attachments||[])];
  renderChatAttachments();
  sendChat();
}
function newProChat(){if(!confirm('Tạo cuộc chat mới? Bộ nhớ hội thoại hiện tại sẽ được làm mới, lịch sử cũ vẫn nằm trong mục Lịch sử.'))return; clearChatMemory(); const log=$('chatLog'); if(log) log.innerHTML='<div class="msg ai-welcome"><b>✨ Cuộc chat mới</b><br>Năm muốn hỏi gì tiếp? Bấm 🎤 để nói hoặc gõ nội dung bên dưới.</div>'; lastResult='';}

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
  box.innerHTML=chatAttachments.map((f,i)=>`<div class="attachment-pill"><span>${f.type.startsWith('image/')?'🖼':'📄'} ${escapeHtml(f.name)}</span><small>${Math.ceil((f.size||0)/1024)} KB</small><button onclick="removeChatAttachment(${i})">×</button></div>`).join('');
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
    if(input) input.placeholder='Nhập câu hỏi về ảnh/file hoặc nội dung cần hỏi Gemini...';
    if(btn) btn.textContent='Gửi';
    return;
  }
  if(panel) panel.style.display='block';
  if(mode==='create-image'){
    $('modeCreateImage')?.classList.add('active');
    if(upload) upload.style.display='none';
  if(camUpload) camUpload.style.display='none';
    if(title) title.textContent='🎨 Tạo ảnh AI';
    if(hint) hint.textContent='Nhập mô tả ảnh muốn Gemini tạo.';
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
  input.value='';
  const title=isEdit?'Chỉnh sửa ảnh AI':'Tạo ảnh AI';
  $('chatLog').insertAdjacentHTML('beforeend',`<div class="msg me">${getChatUserRoleHtml()}<b>${title}</b><br>${escapeHtml(prompt)}</div>`);
  $('chatLog').insertAdjacentHTML('beforeend',`<div class="msg" id="typing">Gemini đang ${isEdit?'chỉnh sửa':'tạo'} ảnh...</div>`);
  chatAttachments=[];renderChatAttachments();
  try{
    const data=await postJSON('/api/image-ai',{mode:isEdit?'edit':'create',prompt,image:imageEditDataUrl,attachments,context:{clientTime:new Date().toLocaleString('vi-VN')}});
    const images=data.images||[];
    const text=hideModelLeak(data.text||`Đã ${isEdit?'chỉnh sửa':'tạo'} ảnh bằng AI.`);
    $('typing').outerHTML=`<div class="msg image-ai-result">${markdownish(text)}${renderGeneratedImages(images)}</div>`;
    lastResult=text;saveHistory(title,text);checkGeminiStatus();
  }catch(e){
    const err=parseError(e);
    $('typing').outerHTML=`<div class="msg error"><b>Gemini chưa tạo/chỉnh ảnh được.</b><br>${escapeHtml(err)}<br><small>Kiểm tra GEMINI_API_KEY, quota hoặc đổi GEMINI_IMAGE_MODEL / GEMINI_IMAGE_MODELS trong .env. Có thể mở /api/models để xem danh sách fallback.</small></div>`;
  }
}

function authHeaders(){const token=localStorage.getItem('synam_token')||'';return token?{'Content-Type':'application/json','Authorization':'Bearer '+token}:{'Content-Type':'application/json'}}
async function postJSON(url,data){const r=await fetch(url,{method:'POST',headers:authHeaders(),body:JSON.stringify(data)});if(!r.ok)throw new Error(await r.text());return r.json()}
async function getJSON(url){const token=localStorage.getItem('synam_token')||'';const r=await fetch(url,{headers:token?{'Authorization':'Bearer '+token}:{}});if(!r.ok)throw new Error(await r.text());return r.json()}

async function quickAsk(){const q=($('globalAsk')?.value||'').trim();routeTo('chat');setTimeout(()=>{if(q){setChatTextValue(q);sendChat()}else if($('chatText')){$('chatText').focus();}},120)}

// ===== NAM30 MEMORY PRO CORE =====
// Lưu hội thoại thật vào localStorage, không chỉ đọc chữ từ khung chat.
// Nhờ vậy câu thứ 2, câu thứ 3 vẫn bám được câu trước.
const SYN_CHAT_MEMORY_KEY='synam_chat_memory_v30';
function loadChatMemory(){
  try{const list=JSON.parse(localStorage.getItem(SYN_CHAT_MEMORY_KEY)||'[]');return Array.isArray(list)?list:[]}catch{return []}
}
function saveChatMemory(list){
  const clean=(Array.isArray(list)?list:[])
    .filter(x=>x && x.role && String(x.text||'').trim())
    .slice(-40)
    .map(x=>({role:x.role==='assistant'?'assistant':'user',text:String(x.text||'').trim().slice(0,2200),at:x.at||new Date().toISOString()}));
  localStorage.setItem(SYN_CHAT_MEMORY_KEY,JSON.stringify(clean));
  return clean;
}
function rememberChatTurn(role,text){
  const list=loadChatMemory();
  list.push({role:role==='assistant'?'assistant':'user',text:String(text||'').trim(),at:new Date().toISOString()});
  saveChatMemory(list);
}
function clearChatMemory(){localStorage.removeItem(SYN_CHAT_MEMORY_KEY);toast('Đã xóa bộ nhớ hội thoại NAM30')}
function domChatHistory(limit=18){
  return [...document.querySelectorAll('#chatLog .msg')]
    .filter(el=>!el.classList.contains('typing') && !el.id)
    .slice(-limit)
    .map(el=>({
      role:el.classList.contains('me')?'user':'assistant',
      text:String(el.innerText||'')
        .replace(/👤 .*?(Free|Pro|Guest)?/g,'')
        .replace(/👥 Khách/g,'')
        .replace(/🤖 Sỹ Năm AI/g,'')
        .replace(/Trả lời bởi:.*?(\n|$)/g,'')
        .replace(/AI đang phân tích|Đang trả lời/gi,'')
        .trim().slice(0,1800)
    }))
    .filter(x=>x.text);
}
function getChatHistoryForAI(limit=30){
  const memory=loadChatMemory();
  const dom=domChatHistory(12);
  const merged=[...memory,...dom];
  const seen=new Set();
  return merged.filter(x=>{
    const key=x.role+'|'+String(x.text||'').slice(0,120);
    if(seen.has(key)) return false;
    seen.add(key);
    return x.text && !/AI đang phân tích|Đang trả lời/i.test(x.text);
  }).slice(-limit);
}
// ===== END NAM30 MEMORY PRO CORE =====

// ===== NAM34 WEATHER FRONTEND GUARD =====
function isWeatherQuestionClient(message=''){
  const q=String(message||'').toLowerCase().normalize('NFC');
  return /(thời tiết|thoi tiet|dự báo|du bao|nhiệt độ|nhiet do|mưa|mua|nắng|nang|bão|bao|gió|gio|độ ẩm|do am|khí hậu|khi hau)/i.test(q);
}

function weatherLocationClient(message=''){
  const q=String(message||'').toLowerCase().normalize('NFC');
  const known=[
    [/việt\s*trì|viet\s*tri/, {name:'Việt Trì, Phú Thọ, Việt Nam', latitude:21.3227, longitude:105.4020}],
    [/phú\s*thọ|phu\s*tho/, {name:'Phú Thọ, Việt Nam', latitude:21.3980, longitude:105.2240}],
    [/hà\s*nội|ha\s*noi|hanoi/, {name:'Hà Nội, Việt Nam', latitude:21.0278, longitude:105.8342}],
    [/hồ\s*chí\s*minh|ho\s*chi\s*minh|sài\s*gòn|sai\s*gon|tp\s*hcm/, {name:'TP. Hồ Chí Minh, Việt Nam', latitude:10.8231, longitude:106.6297}],
    [/đà\s*nẵng|da\s*nang/, {name:'Đà Nẵng, Việt Nam', latitude:16.0544, longitude:108.2022}]
  ];
  for(const [re,loc] of known){ if(re.test(q)) return loc; }
  return {name:'Hà Nội, Việt Nam', latitude:21.0278, longitude:105.8342};
}
function weatherCodeViClient(code){
  const m={0:'Trời quang',1:'Ít mây',2:'Có mây',3:'Nhiều mây/u ám',45:'Sương mù',48:'Sương mù',51:'Mưa phùn nhẹ',53:'Mưa phùn vừa',55:'Mưa phùn dày',61:'Mưa nhỏ',63:'Mưa vừa',65:'Mưa to',80:'Mưa rào nhẹ',81:'Mưa rào vừa',82:'Mưa rào mạnh',95:'Dông',96:'Dông kèm mưa đá',99:'Dông kèm mưa đá'};
  return m[Number(code)]||'Không rõ';
}
async function askWeatherBrowserFallback(message){
  const loc=weatherLocationClient(message);
  const url=`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&timezone=Asia%2FBangkok&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,cloud_cover,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=3`;
  const r=await fetch(url,{cache:'no-store'});
  if(!r.ok) throw new Error('WEATHER_BROWSER_HTTP_'+r.status);
  const data=await r.json();
  const cur=data.current||{}, daily=data.daily||{};
  const lines=[
    `### 🌦️ Thời tiết ${loc.name}`,
    `- **Hiện tại:** ${Math.round(cur.temperature_2m ?? 0)}°C, cảm giác như ${Math.round(cur.apparent_temperature ?? cur.temperature_2m ?? 0)}°C, ${weatherCodeViClient(cur.weather_code)}.`,
    `- **Độ ẩm:** ${cur.relative_humidity_2m ?? '?'}% · **Gió:** ${cur.wind_speed_10m ?? '?'} km/h · **Mây:** ${cur.cloud_cover ?? '?'}%.`,
    `- **Hôm nay:** khoảng ${Math.round(daily.temperature_2m_min?.[0] ?? 0)}°C - ${Math.round(daily.temperature_2m_max?.[0] ?? 0)}°C, khả năng mưa cao nhất ${daily.precipitation_probability_max?.[0] ?? '?'}%.`
  ];
  if(daily.time?.[1]) lines.push(`- **Ngày mai (${daily.time[1]}):** khoảng ${Math.round(daily.temperature_2m_min?.[1] ?? 0)}°C - ${Math.round(daily.temperature_2m_max?.[1] ?? 0)}°C, ${weatherCodeViClient(daily.weather_code?.[1])}.`);
  lines.push('', '_Nguồn: Open-Meteo, lấy trực tiếp từ trình duyệt nếu server hosting bị chặn kết nối._');
  return lines.join('\n');
}
async function askWeatherDirectClient(message){
  try{
    const r=await postJSON('/api/weather',{message});
    const text=String(r?.text||'').replace(/\\n/g,'\n');
    if(text && !/chưa lấy được|thử lại sau|không lấy được/i.test(text)) return text;
  }catch(_serverWeatherErr){}
  return await askWeatherBrowserFallback(message);
}
// ===== END NAM34 WEATHER FRONTEND GUARD =====

async function sendChat(){
  if(chatMode!=='chat') return sendImageAI();
  const input=$('chatText');
  const q=input.value.trim();
  const attachments=[...chatAttachments];
  if(!q && !attachments.length){toast('Nhập câu hỏi hoặc tải ảnh/file lên đã nhé');return}
  const history=getChatHistoryForAI(30);
  lastChatRequest={message:q,attachments:[...attachments]};
  rememberChatTurn('user', q||'Phân tích file/ảnh đã tải lên');
  input.value='';
  autoResizeChatText();
  const attachLabel=attachments.length?`<div class="msg-files">${attachments.map(f=>`${f.type.startsWith('image/')?'🖼':'📄'} ${escapeHtml(f.name)}`).join('<br>')}</div>`:'';
  $('chatLog').insertAdjacentHTML('beforeend',`<div class="msg me">${getChatUserRoleHtml()}${escapeHtml(q||'Phân tích file/ảnh đã tải lên')}${attachLabel}</div>`);
  $('chatLog').insertAdjacentHTML('beforeend',`<div class="msg typing" id="typing"><span class="typing-dots"><i></i><i></i><i></i></span> AI đang phân tích${attachments.length?' ảnh/file':''}...</div>`);scrollChatBottom();
  chatAttachments=[];renderChatAttachments();
  try{
    let data;
    const provider=$('chatProvider')?.value||'auto';
    const model=$('chatModel')?.value||'';
    const council=Boolean($('chatCouncil')?.checked);
    const context={clientTime:new Date().toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}),source:'Sỹ Năm AI Chat',today:new Date().toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})};
    if(!attachments.length && isWeatherQuestionClient(q)){
      try{
        const weatherText=await askWeatherDirectClient(q);
        if(weatherText){
          data={ok:true,provider:'local',label:'Sỹ Năm Weather Core',model:'hidden',text:weatherText};
        }
      }catch(_weatherErr){
        // Nếu route thời tiết riêng lỗi, vẫn fallback sang multi-ai/chat bên dưới.
      }
    }
    if(!data){
      if(attachments.length){
        data=await postJSON('/api/chat-ai',{message:q,question:q,attachments,history,context});
      }else{
        data=await postJSON('/api/multi-ai/chat',{message:q,provider,model,council,history,context});
      }
    }
    const text=hideModelLeak(data.text||data.answer||data.result||'AI đã phản hồi nhưng server không trả text.');
    $('typing').outerHTML=renderAIMessage(text);
    lastResult=text;rememberChatTurn('assistant',text);saveHistory(data.label||'Sỹ Năm AI Chat',text);checkGeminiStatus();scrollChatBottom();speakText(text); 
  }catch(e){
    const err=parseError(e);
    $('typing').outerHTML=`<div class="msg error"><b>AI chưa phản hồi được.</b><br>${escapeHtml(err)}<br><small>Kiểm tra API key / mạng / quota hoặc đổi provider khác rồi thử lại.</small></div>`;scrollChatBottom();
    lastResult='';
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
      status.innerHTML=providers.map(p=>`<div class="ai-status-item"><span><span class="provider-dot ${p.configured?'ok':''}"></span><b>${escapeHtml(p.label)}</b><br><span class="model-small">${escapeHtml(p.model||'auto')} · ${p.configured?'Đã cấu hình':'Chưa có key'}</span></span><span>${p.configured?'🟢':'⚪'}</span></div>`).join('');
    }
    const mini=$('miniProviderList');
    if(mini){mini.innerHTML=providers.map(p=>`<div class="mini-provider ${p.configured?'on':''}"><span>${p.configured?'🟢':'⚪'} ${escapeHtml(p.label)}</span><small>${p.configured?'Ready':'No key'}</small></div>`).join('')}
    if(grid){
      grid.innerHTML=providers.map(p=>`<div class="ai-provider-card"><h3><span class="provider-dot ${p.configured?'ok':''}"></span>${escapeHtml(p.label)}</h3><label>API Key<input id="key_${p.id}" type="password" autocomplete="off" placeholder="${p.configured?'Đã lưu key ẩn an toàn':'Dán API key'}"></label><label>Model<select id="model_${p.id}"><option value="">Mặc định: ${escapeHtml(p.model||'auto')}</option>${(p.models||[]).map(m=>`<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('')}</select></label><p class="ai-note">${escapeHtml(p.freeHint||'')}</p></div>`).join('');
    }
    const select=$('chatProvider');
    if(select){
      [...select.options].forEach(opt=>{ if(opt.value&&opt.value!=='auto'){ const p=providers.find(x=>x.id===opt.value); opt.disabled=p&&!p.configured; }});
    }
  }catch(e){
    if(status)status.innerHTML=`<p class="error">Không tải được Multi-AI: ${escapeHtml(parseError(e))}</p>`;
  }
}

async function saveAIKeys(){
  const providers=['gemini','groq','openrouter','openai','claude','deepseek','grok','qwen','mistral'];
  const keys={}; const models={};
  for(const id of providers){
    const k=$('key_'+id)?.value?.trim()||'';
    const m=$('model_'+id)?.value?.trim()||'';
    if(k && !k.includes('...') && !/^\*+$/.test(k)) keys[id]=k;
    if(m) models[id]=m;
  }
  try{
    const data=await postJSON('/api/ai/user-keys',{keys,models});
    toast('Đã lưu API key Multi-AI');
    loadAIProviders();
  }catch(e){
    toast(parseError(e));
  }
}

setTimeout(autoResizeChatText, 300);

// ===== NAM33 REAL DASHBOARD + FUNCTIONAL CARDS =====
function nam33Stats(){
  try{return JSON.parse(localStorage.getItem('synam_stats')||'{}')}catch{return {}}
}
function saveNam33Stats(s){localStorage.setItem('synam_stats',JSON.stringify(s||{}))}
function incNam33Stat(key,amount=1){
  const s=nam33Stats();
  if(!s.startedAt) s.startedAt=new Date().toISOString();
  s[key]=(Number(s[key]||0)+amount);
  s.updatedAt=new Date().toISOString();
  saveNam33Stats(s);
  renderNam33Stats();
}
const nam33OldSaveHistory = typeof saveHistory==='function' ? saveHistory : null;
saveHistory=function(type,content){
  const t=String(type||'Phân tích');
  if(nam33OldSaveHistory) nam33OldSaveHistory(t,content); else {
    const list=JSON.parse(localStorage.getItem('synam_history')||'[]');
    list.unshift({type:t,content,at:new Date().toLocaleString('vi-VN')});
    localStorage.setItem('synam_history',JSON.stringify(list.slice(0,80)));
  }
  const low=t.toLowerCase();
  incNam33Stat('analysis',1);
  if(/chat|ai/i.test(t)) incNam33Stat('chat',1);
  if(/ảnh|image|chỉ tay|tướng|file|vision/i.test(t)) incNam33Stat('image',1);
  renderHistory();
};
renderHistory=function(){
  let list=[];
  try{list=JSON.parse(localStorage.getItem('synam_history')||'[]')}catch{}
  const mini=$('historyMini');
  if($('statCount')) $('statCount').textContent=list.length;
  if(mini){
    mini.innerHTML=list.length?list.slice(0,4).map((x,i)=>`<div class="history-mini-item" onclick="event.stopPropagation();showHistory('${encodeURIComponent(x.content||'')}')"><span>${escapeHtml(x.type||'Phân tích')}</span><small>${escapeHtml(x.at||'')}</small></div>`).join(''):'<p>Chưa có lịch sử.</p><small>Hãy chat AI / xem chỉ tay / xem tướng, kết quả sẽ lưu ở đây.</small>';
  }
  const full=$('historyList');
  if(full){
    full.innerHTML=list.length?list.map((x,i)=>`<div class="history-item"><div><b>${escapeHtml(x.type||'Phân tích')}</b><br><small>${escapeHtml(x.at||'')}</small></div><button onclick="showHistory('${encodeURIComponent(x.content||'')}')">Chi tiết</button></div>`).join(''):'<p>Chưa có lịch sử phân tích.</p>';
  }
  renderNam33Stats();
};
function exportHistoryTxt(event){
  event?.stopPropagation?.();
  let list=[];try{list=JSON.parse(localStorage.getItem('synam_history')||'[]')}catch{}
  if(!list.length){toast('Chưa có lịch sử để xuất');return}
  const text=list.map((x,i)=>`# ${i+1}. ${x.type||'Phân tích'}\nThời gian: ${x.at||''}\n\n${x.content||''}\n`).join('\n-------------------------\n\n');
  const blob=new Blob([text],{type:'text/plain;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='synam-lich-su-phan-tich.txt';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  toast('Đã xuất lịch sử TXT');
}
const nam33OldClearHistory = typeof clearHistory==='function' ? clearHistory : null;
clearHistory=function(){
  if(!confirm('Xóa toàn bộ lịch sử phân tích?')) return;
  localStorage.removeItem('synam_history');
  renderHistory();
  toast('Đã xóa lịch sử');
};
function renderNam33Stats(){
  const s=nam33Stats();
  const history=JSON.parse(localStorage.getItem('synam_history')||'[]');
  const started=s.startedAt?new Date(s.startedAt):new Date();
  const days=Math.max(1,Math.ceil((Date.now()-started.getTime())/86400000));
  const analysis=Number(s.analysis||history.length||0);
  const chat=Number(s.chat||history.filter(x=>/chat|ai/i.test(x.type||'')).length||0);
  const img=Number(s.image||history.filter(x=>/ảnh|image|chỉ tay|tướng|file|vision/i.test(x.type||'')).length||0);
  if($('statCount')) $('statCount').textContent=analysis;
  if($('statChatCount')) $('statChatCount').textContent=chat;
  if($('statImageCount')) $('statImageCount').textContent=img;
  if($('statDaysUsed')) $('statDaysUsed').textContent=days;
  if($('nam33StatPercent')) $('nam33StatPercent').textContent=Math.min(100,Math.round((analysis/20)*100))+'%';
}
function resetNam33Stats(event){
  event?.stopPropagation?.();
  if(!confirm('Reset thống kê? Lịch sử vẫn giữ nguyên.')) return;
  localStorage.removeItem('synam_stats');renderNam33Stats();toast('Đã reset thống kê');
}
function syncHomeVoiceSelect(){
  const home=$('homeVoiceSelect'), main=$('voiceSelect');
  if(home && main){main.value=home.value;saveVoicePrefs();toast('Đã chọn giọng: '+home.options[home.selectedIndex].text)}
}
function syncHomeVoiceRate(){
  const home=$('homeVoiceRate'), main=$('voiceRate');
  if(home && main){main.value=home.value;saveVoicePrefs()}
}
function syncNam33VoiceHome(){
  try{
    refreshVoiceList?.();
    const main=$('voiceSelect'), home=$('homeVoiceSelect');
    if(main && home){home.innerHTML=main.innerHTML;home.value=main.value||'auto'}
    const rate=$('voiceRate'), homeRate=$('homeVoiceRate');
    if(rate && homeRate) homeRate.value=rate.value||'1';
  }catch{}
}
const nam33OldSpeakLastResult = typeof speakLastResult==='function' ? speakLastResult : null;
speakLastResult=function(){
  if(!lastResult){
    let list=[];try{list=JSON.parse(localStorage.getItem('synam_history')||'[]')}catch{}
    if(list[0]?.content) lastResult=list[0].content;
  }
  if(!lastResult){toast('Chưa có kết quả để đọc. Hãy chat hoặc phân tích trước nhé.');return}
  speakText(lastResult,true);
};
window.addEventListener('DOMContentLoaded',()=>{
  setTimeout(()=>{renderHistory();renderNam33Stats();syncNam33VoiceHome();},350);
  setTimeout(syncNam33VoiceHome,1400);
});
// ===== END NAM33 =====
