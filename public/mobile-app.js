const { useEffect, useMemo, useRef, useState } = React;

const TABS = [
  { id: 'home', icon: '🏠', label: 'Trang chủ' },
  { id: 'horoscope', icon: '🔮', label: 'Tử vi' },
  { id: 'palm', icon: '✋', label: 'Chỉ tay' },
  { id: 'face', icon: '🙂', label: 'Xem tướng' },
  { id: 'astrology', icon: '🪐', label: 'Chiêm tinh' },
  { id: 'love', icon: '💞', label: 'Tình duyên' },
  { id: 'numerology', icon: '🔢', label: 'Thần số học' },
  { id: 'chat', icon: '🤖', label: 'AI Chat' },
  { id: 'multi', icon: '🧠', label: 'Multi AI' },
  { id: 'fengshui', icon: '☯️', label: 'Phong thủy' },
  { id: 'tarot', icon: '🃏', label: 'Bói bài' },
  { id: 'settings', icon: '⚙️', label: 'AI Keys' }
];

const DEFAULT_MESSAGES = [
  { role: 'assistant', text: 'Chào Sỹ Năm 👋 Mình là Sỹ Năm AI Ultra. Bạn cứ hỏi như ChatGPT/Claude/Gemini: code app, thời tiết, ý tưởng, phân tích lỗi, viết nội dung… mình sẽ trả lời rõ ràng, có bước xử lý và không nói lan man.' }
];

function authHeaders() {
  const token = localStorage.getItem('synam_token') || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiJSON(url, payload, method = 'POST') {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: method === 'GET' ? undefined : JSON.stringify(payload || {})
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
  return data;
}

function markdownLite(text = '') {
  const safe = String(text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return safe
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^[-•] (.*)$/gm, '<li>$1</li>')
    .replace(/\n/g, '<br>')
    .replace(/(<li>.*?<\/li>)(<br>)?/gs, '<ul>$1</ul>')
    .replace(/<\/ul><br><ul>/g, '');
}

function App() {
  const [tab, setTab] = useState('home');
  const [health, setHealth] = useState('Đang kiểm tra AI...');
  const [providers, setProviders] = useState([]);

  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(d => setHealth(d.ok ? 'Server online' : 'Server lỗi')).catch(() => setHealth('Server chưa kết nối'));
    loadProviders();
  }, []);

  async function loadProviders() {
    try {
      const data = await fetch('/api/ai/providers', { headers: authHeaders() }).then(r => r.json());
      setProviders(data.providers || []);
    } catch { setProviders([]); }
  }

  return <main className="app-shell">
    <Hero tab={tab} setTab={setTab} health={health} providers={providers} />
    <TabRail tab={tab} setTab={setTab} />
    <section className="workspace">
      {tab === 'home' && <Home setTab={setTab} providers={providers} />}
      {tab === 'chat' && <Chat providers={providers} />}
      {tab === 'palm' && <VisionTool mode="palm" title="Xem chỉ tay AI" icon="✋" />}
      {tab === 'face' && <VisionTool mode="face" title="Xem tướng AI" icon="🙂" />}
      {tab === 'love' && <LoveTool />}
      {tab === 'horoscope' && <SimpleTool kind="horoscope" title="Tử vi / Luận giải" icon="🔮" preset="Luận tử vi hôm nay, công việc, tình cảm, tài chính theo thông tin sau:" />}
      {tab === 'astrology' && <AstrologyTool />}
      {tab === 'numerology' && <NumerologyTool />}
      {tab === 'multi' && <Chat providers={providers} />}
      {tab === 'fengshui' && <FengShuiTool />}
      {tab === 'tarot' && <TarotTool />}
      {tab === 'settings' && <Settings providers={providers} reload={loadProviders} />}
    </section>
    <nav className="bottom-nav">{TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={tab===t.id?'active':''}><span>{t.icon}</span><small>{t.label}</small></button>)}</nav>
  </main>;
}

function Hero({ setTab, health, providers }) {
  const configured = providers.filter(p => p.configured).length;
  return <header className="hero">
    <div className="hero-img hero-left"><img src="assets/hero-left.png" /></div>
    <div className="hero-content">
      <div className="status-row"><span className="dot"></span>{health}<span className="chip">{configured || 0} AI đang bật</span></div>
      <h1>Sỹ Năm <b>Mystic</b></h1>
      <p>AI • Tử vi • Chỉ tay • Xem tướng • Chiêm tinh</p>
      <div className="hero-search"><span>⌕</span><input readOnly value="Hỏi về tử vi, chỉ tay, tướng số, chiêm tinh..."/><button onClick={() => setTab('chat')}>✦ AI phân tích</button></div>
      <div className="hero-actions quick"><button onClick={() => setTab('horoscope')}>🔮 Tử vi hôm nay</button><button onClick={() => setTab('astrology')}>🪐 Cung hoàng đạo</button><button onClick={() => setTab('palm')}>✋ Xem chỉ tay</button><button onClick={() => setTab('face')}>🙂 Xem tướng</button><button onClick={() => setTab('tarot')}>🃏 Đổi bài</button></div>
    </div>
    <div className="hero-img hero-right"><img src="assets/hero-right.jpg" /></div>
  </header>;
}

function TabRail({ tab, setTab }) {
  return <nav className="tab-rail">{TABS.map(t => <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}><span>{t.icon}</span>{t.label}</button>)}</nav>;
}

function Home({ setTab, providers }) {
  const cards = [
    ['🔮','Tử vi','Luận giải hôm nay, công việc, tình cảm, tài chính.', 'horoscope'],
    ['✋','Xem chỉ tay','Upload ảnh bàn tay để AI phân tích rõ hơn.', 'palm'],
    ['🙂','Xem tướng','Upload ảnh khuôn mặt, nhận luận giải nhẹ nhàng.', 'face'],
    ['🪐','Chiêm tinh','Cung hoàng đạo, vận trình tháng, tình cảm.', 'astrology'],
    ['💞','Tình duyên','Tính tuổi, ngũ hành, thần số học bằng code trước khi AI luận.', 'love'],
    ['🔢','Thần số học','Tính số chủ đạo, linh hồn, biểu đạt và luận AI.', 'numerology'],
    ['🤖','AI Chat Pro','Trả lời kiểu ChatGPT/Claude/Gemini, có nhớ ngữ cảnh, copy, thử lại.', 'chat'],
    ['🧠','Multi AI','Tự chọn Claude, Gemini, Groq, OpenRouter, ChatGPT, Grok.', 'multi'],
    ['☯️','Phong thủy','Màu hợp, hướng hợp, bố trí phòng/bàn làm việc.', 'fengshui'],
    ['🃏','Bói bài / Đổi bài','Bốc bài tham khảo và đổi bài nhanh.', 'tarot'],
    ['⚙️','AI Keys','Nhập key để bật Claude/Anthropic, Gemini, Groq...', 'settings']
  ];
  return <div className="home-grid">
    <section className="premium-panel wide"><h2>📱 Màn hình chính mobile</h2><p>Đã khôi phục đủ tab: Chiêm tinh, Thần số học, Phong thủy, Bói bài/Đổi bài. Banner chuyển về phong cách NAM22: ảnh rõ, viền mờ hòa nền, tab chức năng cuộn ngang chuyên nghiệp.</p><div className="provider-pills">{providers.slice(0,8).map(p => <span className={p.configured?'on':''} key={p.id}>{p.configured?'●':'○'} {p.label}</span>)}</div></section>
    {cards.map(c => <button key={c[3]} className="feature-card" onClick={() => setTab(c[3])}><b>{c[0]}</b><h3>{c[1]}</h3><p>{c[2]}</p></button>)}
  </div>;
}

function Chat({ providers }) {
  const [messages, setMessages] = useState(() => JSON.parse(localStorage.getItem('nam44_messages') || 'null') || DEFAULT_MESSAGES);
  const [text, setText] = useState('');
  const [provider, setProvider] = useState('auto');
  const [council, setCouncil] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastPrompt, setLastPrompt] = useState('');
  const boxRef = useRef(null);
  useEffect(() => { localStorage.setItem('nam44_messages', JSON.stringify(messages.slice(-50))); boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: 'smooth' }); }, [messages]);

  async function send(customText) {
    const content = (customText ?? text).trim();
    if (!content || busy) return;
    setText(''); setLastPrompt(content); setBusy(true);
    const next = [...messages, { role: 'user', text: content }];
    setMessages([...next, { role: 'assistant', text: 'Đang suy nghĩ kỹ và kiểm tra ngữ cảnh…', loading: true }]);
    try {
      const data = await apiJSON('/api/multi-ai/chat', { message: content, history: next.slice(-20), provider, council });
      const answer = data.reply || data.text || 'AI chưa trả về nội dung.';
      setMessages([...next, { role: 'assistant', text: answer, meta: data.label || 'Sỹ Năm AI' }]);
    } catch (e) {
      setMessages([...next, { role: 'assistant', text: `⚠️ ${e.message}\n\nGợi ý: vào tab AI Keys kiểm tra CLAUDE_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY hoặc chọn provider khác.` }]);
    } finally { setBusy(false); }
  }

  function copy(t) { navigator.clipboard?.writeText(t); }
  function speak(t) { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang='vi-VN'; speechSynthesis.speak(u); } catch {} }

  return <section className="chat-layout">
    <aside className="chat-side premium-panel"><h2>🧠 AI Router</h2><p>Auto chọn provider có key. Ưu tiên nhanh, chính xác, không lộ model.</p><select value={provider} onChange={e=>setProvider(e.target.value)}><option value="auto">Auto Router</option>{providers.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select><label className="switch"><input type="checkbox" checked={council} onChange={e=>setCouncil(e.target.checked)} /> Hội Đồng AI</label><button onClick={()=>setMessages(DEFAULT_MESSAGES)}>＋ Chat mới</button><div className="mini-list">{providers.map(p => <span className={p.configured?'ok':''} key={p.id}>{p.configured?'●':'○'} {p.label}</span>)}</div></aside>
    <div className="chat-main premium-panel">
      <div className="chat-head"><div><h2>🤖 AI Chat Ultra</h2><p>Chat box hiện đại, copy, đọc, thử lại, giữ ngữ cảnh.</p></div><button onClick={()=>speak(messages.filter(m=>m.role==='assistant').at(-1)?.text || '')}>🔊 Đọc</button></div>
      <div className="chat-box" ref={boxRef}>{messages.map((m,i) => <div key={i} className={`bubble ${m.role} ${m.loading?'loading':''}`}><div className="avatar">{m.role==='user'?'👤':'✦'}</div><div className="bubble-body"><div dangerouslySetInnerHTML={{__html: markdownLite(m.text)}} />{m.role==='assistant' && !m.loading && <div className="msg-actions"><button onClick={()=>copy(m.text)}>Copy</button><button onClick={()=>speak(m.text)}>Đọc</button><button onClick={()=>send(lastPrompt)}>Thử lại</button></div>}</div></div>)}</div>
      <div className="composer"><textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Nhắn AI như ChatGPT..." rows="1"/><button disabled={busy} onClick={()=>send()}>{busy?'…':'Gửi ✈'}</button></div>
    </div>
  </section>;
}

function Settings({ providers, reload }) {
  const [keys, setKeys] = useState({});
  async function save() {
    try { await apiJSON('/api/ai/user-keys', { keys }); await reload(); alert('Đã lưu AI keys ✅'); } catch(e) { alert(e.message); }
  }
  return <section className="premium-panel settings"><h2>⚙️ Multi-AI API Keys</h2><p>Server ưu tiên đọc từ `.env`, hoặc lưu key theo tài khoản test. Anthropic dùng `CLAUDE_API_KEY` hoặc `ANTHROPIC_API_KEY`.</p><div className="key-grid">{providers.map(p => <label key={p.id}><span>{p.label} {p.configured?'✅':'○'}</span><input placeholder={p.maskedKey || p.keyEnv || 'API key'} onChange={e=>setKeys(k=>({...k,[p.id]:e.target.value}))}/><small>{p.model}</small></label>)}</div><button className="primary" onClick={save}>💾 Lưu keys</button></section>;
}

function VisionTool({ mode, title, icon }) {
  const [result, setResult] = useState('Upload ảnh rồi bấm phân tích.');
  const [file, setFile] = useState(null);
  async function run() {
    if (!file) return setResult('Bạn cần chọn ảnh trước nhé.');
    const reader = new FileReader();
    reader.onload = async () => {
      setResult('AI đang phân tích ảnh...');
      try { const d = await apiJSON('/api/vision-ai', { mode, image: reader.result, prompt: title }); setResult(d.text || d.reply || 'Không có kết quả.'); }
      catch(e){ setResult('⚠️ '+e.message); }
    };
    reader.readAsDataURL(file);
  }
  return <section className="tool-grid"><div className="premium-panel"><h2>{icon} {title}</h2><input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0])}/><button className="primary" onClick={run}>Phân tích</button></div><Result text={result}/></section>;
}

function LoveTool() {
  const [a,setA]=useState(''); const [b,setB]=useState(''); const [out,setOut]=useState('Nhập thông tin hai người để luận giải.');
  async function run(){ setOut('Đang tính bằng code và AI luận giải...'); try{const d=await apiJSON('/api/love-ai',{ persons:[{name:'Người 1',birthDate:a},{name:'Người 2',birthDate:b}]}); setOut(d.text||d.reply||'Không có kết quả');}catch(e){setOut('⚠️ '+e.message)} }
  return <section className="tool-grid"><div className="premium-panel"><h2>💞 Tình duyên</h2><input value={a} onChange={e=>setA(e.target.value)} placeholder="Ngày sinh người 1: 01/01/2000"/><input value={b} onChange={e=>setB(e.target.value)} placeholder="Ngày sinh người 2: 02/02/2004"/><button className="primary" onClick={run}>Luận giải</button></div><Result text={out}/></section>;
}
function SimpleTool({kind,title,icon,preset='',placeholder='Bạn muốn hỏi điều gì?'}){const [q,setQ]=useState('');const [out,setOut]=useState('Nhập nội dung rồi bấm luận giải.');async function run(){setOut('AI đang luận giải...');try{const d=await apiJSON('/api/multi-ai/chat',{message:`${preset||title} ${q}`, provider:'auto'});setOut(d.text||d.reply||'Không có kết quả')}catch(e){setOut('⚠️ '+e.message)}}return <section className="tool-grid"><div className="premium-panel"><h2>{icon} {title}</h2><textarea value={q} onChange={e=>setQ(e.target.value)} placeholder={placeholder}/><button className="primary" onClick={run}>Luận giải</button></div><Result text={out}/></section>}

function AstrologyTool(){return <SimpleTool kind="astrology" title="Chiêm tinh" icon="🪐" preset="Luận chiêm tinh theo cung hoàng đạo, thời điểm hiện tại và câu hỏi sau:" placeholder="Ví dụ: Song Tử, tình duyên tháng này thế nào?"/>}
function FengShuiTool(){return <SimpleTool kind="fengshui" title="Phong thủy" icon="☯️" preset="Phân tích phong thủy thực tế, màu hợp, hướng hợp, bố trí không gian theo thông tin sau:" placeholder="Ví dụ: sinh năm 1995, muốn xem hướng bàn làm việc và màu hợp."/>}
function TarotTool(){
  const cards=['The Fool - Khởi đầu mới','The Magician - Chủ động tạo cơ hội','The High Priestess - Lắng nghe trực giác','The Lovers - Lựa chọn trong tình cảm','The Chariot - Tiến lên quyết đoán','Strength - Bình tĩnh và mềm mỏng','The Hermit - Cần thời gian suy ngẫm','Wheel of Fortune - Vận trình đang xoay chuyển','The Star - Hy vọng và chữa lành','The Sun - Rõ ràng, vui vẻ, tích cực'];
  const [q,setQ]=useState(''); const [picked,setPicked]=useState([]); const [out,setOut]=useState('Nhập câu hỏi rồi bấm bốc bài. Có thể bấm Đổi bài để bốc lại.');
  async function draw(){
    const deck=[...cards].sort(()=>Math.random()-.5).slice(0,3); setPicked(deck); setOut('AI đang luận 3 lá bài...');
    try{
      const d=await apiJSON('/api/multi-ai/chat',{provider:'auto',message:`Bói bài tarot tham khảo, không khẳng định tuyệt đối. Câu hỏi: ${q}. Ba lá: ${deck.join(', ')}. Hãy luận rõ: hiện tại, lời khuyên, kết quả gần.`});
      setOut(d.text||d.reply||deck.join('\n'));
    }catch(e){
      setOut(`### 🃏 Ba lá bài\n- ${deck.join('\n- ')}\n\nLời khuyên: xem như tham khảo để bình tĩnh lựa chọn, không quyết định thay thực tế.`);
    }
  }
  return <section className="tool-grid"><div className="premium-panel"><h2>🃏 Bói bài / Đổi bài</h2><textarea value={q} onChange={e=>setQ(e.target.value)} placeholder="Bạn muốn hỏi điều gì?"/><button className="primary" onClick={draw}>{picked.length?'🔄 Đổi bài':'🃏 Bốc bài'}</button><div className="tarot-cards">{picked.map(c=><span key={c}>{c}</span>)}</div></div><Result text={out}/></section>
}
function NumerologyTool(){
  const [name,setName]=useState(''); const [birth,setBirth]=useState(''); const [out,setOut]=useState('Nhập họ tên và ngày sinh để tính thần số học.');
  function sumDigits(v){let n=String(v).replace(/\D/g,'').split('').reduce((a,b)=>a+Number(b),0); while(n>9 && ![11,22,33].includes(n)) n=String(n).split('').reduce((a,b)=>a+Number(b),0); return n||0}
  async function run(){const life=sumDigits(birth); setOut('Đang tính local và AI luận giải...'); try{const d=await apiJSON('/api/multi-ai/chat',{provider:'auto',message:`Thần số học cho tên ${name||'chưa nhập'}, ngày sinh ${birth||'chưa nhập'}, số chủ đạo local là ${life}. Luận rõ tính cách, tình duyên, công việc, lời khuyên.`}); setOut(d.text||d.reply||`Số chủ đạo: ${life}`)}catch(e){setOut(`### 🔢 Kết quả local
- Họ tên: ${name||'Chưa nhập'}
- Ngày sinh: ${birth||'Chưa nhập'}
- Số chủ đạo: ${life||'Chưa đủ dữ liệu'}

Kết quả chỉ mang tính tham khảo.`)}}
  return <section className="tool-grid"><div className="premium-panel"><h2>🔢 Thần số học AI</h2><input value={name} onChange={e=>setName(e.target.value)} placeholder="Họ và tên"/><input value={birth} onChange={e=>setBirth(e.target.value)} placeholder="Ngày sinh: 01/01/2000"/><button className="primary" onClick={run}>🤖 Luận thần số học</button></div><Result text={out}/></section>
}

function Result({text}){return <article className="premium-panel result"><h2>📌 Kết quả</h2><div dangerouslySetInnerHTML={{__html: markdownLite(text)}} /></article>}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
