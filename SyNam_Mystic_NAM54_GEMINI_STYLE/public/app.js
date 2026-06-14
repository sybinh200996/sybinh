const { useEffect, useMemo, useRef, useState } = React;

const TABS = [
  { id: 'home', icon: '🏠', label: 'Trang chủ' },
  { id: 'chat', icon: '💬', label: 'SyNam AI' },
  { id: 'horoscope', icon: '🔮', label: 'Tử vi' },
  { id: 'love', icon: '💞', label: 'Tình duyên' },
  { id: 'settings', icon: '⚙️', label: 'Cài đặt' }
];

const DEFAULT_MESSAGES = [
  { role: 'assistant', text: 'Chào anh 👋 Mình là SyNam AI trong SyNam Mystic. Anh có thể hỏi như ChatGPT/Gemini: trả lời rõ ý, có cấu trúc, giữ ngữ cảnh, không nói lan man. Em cũng hỗ trợ tử vi, thần số học, chiêm tinh, tình duyên, phong thủy, xem tay/xem tướng và thời tiết.' }
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
  const [quickPrompt, setQuickPrompt] = useState('');

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
    <QuickAsk setTab={setTab} setQuickPrompt={setQuickPrompt} />
    <section className="workspace">
      {tab === 'home' && <Home setTab={setTab} providers={providers} />}
      {tab === 'chat' && <Chat providers={providers} initialPrompt={quickPrompt} clearInitialPrompt={() => setQuickPrompt('')} />}
      {tab === 'palm' && <VisionTool mode="palm" title="Xem chỉ tay AI" icon="✋" />}
      {tab === 'face' && <VisionTool mode="face" title="Xem tướng AI" icon="🙂" />}
      {tab === 'love' && <LoveTool />}
      {tab === 'horoscope' && <HoroscopeTool />}
      {tab === 'astrology' && <AstrologyTool />}
      {tab === 'numerology' && <NumerologyTool />}
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
      <div className="status-row"><span className="dot"></span>{health}<span className="chip">{configured || 0} AI</span></div>
      <p className="eyebrow">SyNam Mystic</p>
      <h1>SyNam Mystic</h1>
      <p className="hero-sub">AI Chat thông minh • Tử vi chuyên sâu • Thần số học • Tình duyên</p>
      <div className="hero-actions quick">
        <button onClick={() => setTab('chat')}>💬 Hỏi AI</button>
        <button onClick={() => setTab('horoscope')}>🔮 Tử vi</button>
        <button onClick={() => setTab('love')}>💞 Tình duyên</button>
        <button onClick={() => setTab('palm')}>✋ Xem tay</button>
      </div>
    </div>
    <div className="hero-img hero-right"><img src="assets/hero-right-cut.png" /></div>
  </header>;
}

function QuickAsk({ setTab, setQuickPrompt }) {
  const [q, setQ] = useState('');
  function submit() {
    const text = q.trim();
    if (!text) return;
    setQuickPrompt(text);
    setTab('chat');
    setQ('');
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 80);
  }
  return <section className="quick-ask premium-panel">
    <div className="quick-ask-title"><span>💬</span><div><h2>Hỏi SyNam AI</h2><p>Chat AI là trung tâm. Nhập câu hỏi, bấm gửi là chuyển vào cuộc trò chuyện.</p></div></div>
    <div className="quick-ask-box"><textarea value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submit();}}} placeholder="Hỏi SyNam AI về Mystic, thời tiết, tình duyên..." rows="1"/><button onClick={submit}>Gửi ✈</button></div>
  </section>;
}

function TabRail({ tab, setTab }) {
  return <nav className="tab-rail">{TABS.map(t => <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}><span>{t.icon}</span>{t.label}</button>)}</nav>;
}

function Home({ setTab, providers }) {
  const cards = [
    ['💬','SyNam AI','Chat chuyên nghiệp kiểu ChatGPT/Gemini, nhớ ngữ cảnh, copy, đọc, thử lại.', 'chat'],
    ['🔮','Tử vi','Luận giải chi tiết công việc, tình cảm, tài chính và định hướng.', 'horoscope'],
    ['💞','Tình duyên','Phân tích nhiều lớp: tuổi, ngũ hành, thần số học và cách hòa hợp.', 'love'],
    ['🪐','Chiêm tinh','Cung hoàng đạo, vận trình tháng, tính cách và cảm xúc.', 'astrology'],
    ['🔢','Thần số học','Số chủ đạo, linh hồn, biểu đạt và bài học phát triển.', 'numerology'],
    ['✋','Xem chỉ tay','Upload ảnh bàn tay để AI phân tích tham khảo.', 'palm'],
    ['🙂','Xem tướng','Upload ảnh khuôn mặt, nhận luận giải nhẹ nhàng.', 'face'],
    ['☯️','Phong thủy','Màu hợp, hướng hợp, bố trí phòng/bàn làm việc.', 'fengshui'],
    ['🃏','Bói bài','Bốc bài tham khảo và đổi bài nhanh.', 'tarot'],
    ['⚙️','Cài đặt','Thiết lập AI key, tài khoản test và cấu hình.', 'settings']
  ];
  return <div className="home-grid">
    {cards.map(c => <button key={c[3]} className="feature-card" onClick={() => setTab(c[3])}><b>{c[0]}</b><h3>{c[1]}</h3><p>{c[2]}</p></button>)}
  </div>;
}

function Chat({ providers, initialPrompt = '', clearInitialPrompt = () => {} }) {
  const [messages, setMessages] = useState(() => JSON.parse(localStorage.getItem('synam_mystic_nam53_messages') || 'null') || DEFAULT_MESSAGES);
  const [text, setText] = useState('');
  const [provider, setProvider] = useState('auto');
  const [council, setCouncil] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastPrompt, setLastPrompt] = useState('');
  const boxRef = useRef(null);
  useEffect(() => { localStorage.setItem('synam_mystic_nam53_messages', JSON.stringify(messages.slice(-50))); boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: 'smooth' }); }, [messages]);
  useEffect(() => {
    if (initialPrompt && !busy) {
      const prompt = initialPrompt;
      clearInitialPrompt();
      setTimeout(() => send(prompt), 80);
    }
  }, [initialPrompt]);

  async function send(customText) {
    const content = (customText ?? text).trim();
    if (!content || busy) return;
    setText(''); setLastPrompt(content); setBusy(true);
    const next = [...messages, { role: 'user', text: content }];
    setMessages([...next, { role: 'assistant', text: 'Đang suy nghĩ kỹ và kiểm tra ngữ cảnh…', loading: true }]);
    try {
      const data = await apiJSON('/api/multi-ai/chat', { message: content, history: next.slice(-20), provider, council });
      const answer = data.reply || data.text || 'AI chưa trả về nội dung.';
      setMessages([...next, { role: 'assistant', text: answer, meta: data.label || 'SyNam AI' }]);
    } catch (e) {
      setMessages([...next, { role: 'assistant', text: `⚠️ ${e.message}\n\nGợi ý: vào tab Cài đặt AI kiểm tra CLAUDE_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY hoặc chọn provider khác.` }]);
    } finally { setBusy(false); }
  }

  function copy(t) { navigator.clipboard?.writeText(t); }
  function speak(t) { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang='vi-VN'; speechSynthesis.speak(u); } catch {} }

  return <section className="chat-layout">
    <aside className="chat-side premium-panel"><h2>🧠 AI Router</h2><p>Auto chọn provider có key. Ưu tiên nhanh, chính xác, không lộ model.</p><select value={provider} onChange={e=>setProvider(e.target.value)}><option value="auto">Auto Router</option>{providers.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select><label className="switch"><input type="checkbox" checked={council} onChange={e=>setCouncil(e.target.checked)} /> Hội Đồng AI</label><button onClick={()=>setMessages(DEFAULT_MESSAGES)}>＋ Chat mới</button><div className="mini-list">{providers.map(p => <span className={p.configured?'ok':''} key={p.id}>{p.configured?'●':'○'} {p.label}</span>)}</div></aside>
    <div className="chat-main premium-panel">
      <div className="chat-head"><div><h2>🤖 SyNam AI Chat</h2><p>Chat box hiện đại, copy, đọc, thử lại, giữ ngữ cảnh.</p></div><button onClick={()=>speak(messages.filter(m=>m.role==='assistant').at(-1)?.text || '')}>🔊 Đọc</button></div>
      <div className="chat-box" ref={boxRef}>{messages.map((m,i) => <div key={i} className={`bubble ${m.role} ${m.loading?'loading':''}`}><div className="avatar">{m.role==='user'?'👤':'✦'}</div><div className="bubble-body"><div dangerouslySetInnerHTML={{__html: markdownLite(m.text)}} />{m.role==='assistant' && !m.loading && <div className="msg-actions"><button onClick={()=>copy(m.text)}>Copy</button><button onClick={()=>speak(m.text)}>Đọc</button><button onClick={()=>send(lastPrompt)}>Thử lại</button></div>}</div></div>)}</div>
      <div className="composer"><textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Nhắn SyNam AI như ChatGPT..." rows="1"/><button disabled={busy} onClick={()=>send()}>{busy?'…':'Gửi ✈'}</button></div>
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
  const [nameA,setNameA]=useState(''); const [nameB,setNameB]=useState('');
  const [a,setA]=useState(''); const [b,setB]=useState('');
  const [focus,setFocus]=useState('Tổng quan mức độ hòa hợp, điểm hút nhau, điểm dễ xung đột và cách phát triển lâu dài');
  const [out,setOut]=useState('Nhập tên + ngày sinh hai người để luận giải nhiều lớp.');
  async function run(){ setOut('Đang tính bằng code và AI luận giải tình duyên chuyên sâu...'); try{const d=await apiJSON('/api/love-ai',{ focus, persons:[{name:nameA||'Người 1',birthDate:a},{name:nameB||'Người 2',birthDate:b}]}); setOut(d.text||d.reply||'Không có kết quả');}catch(e){setOut('⚠️ '+e.message)} }
  return <section className="tool-grid"><div className="premium-panel"><h2>💞 Tình duyên hai người</h2><input value={nameA} onChange={e=>setNameA(e.target.value)} placeholder="Tên người 1"/><input value={a} onChange={e=>setA(e.target.value)} placeholder="Ngày sinh người 1: 01/01/2000"/><input value={nameB} onChange={e=>setNameB(e.target.value)} placeholder="Tên người 2"/><input value={b} onChange={e=>setB(e.target.value)} placeholder="Ngày sinh người 2: 02/02/2004"/><textarea value={focus} onChange={e=>setFocus(e.target.value)} placeholder="Muốn xem sâu phần nào?"/><button className="primary" onClick={run}>Luận giải chuyên sâu</button></div><Result text={out}/></section>;
}
function SimpleTool({kind,title,icon,preset='',placeholder='Bạn muốn hỏi điều gì?'}){const [q,setQ]=useState('');const [out,setOut]=useState('Nhập nội dung rồi bấm luận giải.');async function run(){setOut('AI đang luận giải...');try{const d=await apiJSON('/api/multi-ai/chat',{message:`${preset||title} ${q}`, provider:'auto'});setOut(d.text||d.reply||'Không có kết quả')}catch(e){setOut('⚠️ '+e.message)}}return <section className="tool-grid"><div className="premium-panel"><h2>{icon} {title}</h2><textarea value={q} onChange={e=>setQ(e.target.value)} placeholder={placeholder}/><button className="primary" onClick={run}>Luận giải</button></div><Result text={out}/></section>}


function HoroscopeTool(){
  const [name,setName]=useState('');
  const [birthDate,setBirthDate]=useState('');
  const [birthTime,setBirthTime]=useState('');
  const [gender,setGender]=useState('Nam');
  const [focus,setFocus]=useState('Tổng quan hôm nay, công việc, tình cảm, tài chính');
  const [out,setOut]=useState('Nhập họ tên, ngày sinh, giờ sinh rồi bấm **AI luận giải** hoặc **Luận local**.');

  const can=['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
  const chi=['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
  const zodiac=[['Ma Kết',1,19],['Bảo Bình',2,18],['Song Ngư',3,20],['Bạch Dương',4,19],['Kim Ngưu',5,20],['Song Tử',6,21],['Cự Giải',7,22],['Sư Tử',8,22],['Xử Nữ',9,22],['Thiên Bình',10,23],['Bọ Cạp',11,22],['Nhân Mã',12,21],['Ma Kết',12,31]];
  function parseDate(v){
    if(!v) return null;
    if(/^\d{4}-\d{2}-\d{2}$/.test(v)){const [y,m,d]=v.split('-').map(Number);return {y,m,d};}
    const parts=String(v).match(/(\d{1,2})\D+(\d{1,2})\D+(\d{4})/);
    if(parts) return {d:+parts[1],m:+parts[2],y:+parts[3]};
    return null;
  }
  function getCanChiYear(y){return `${can[(y+6)%10]} ${chi[(y+8)%12]}`;}
  function getElement(y){return ['Kim','Thủy','Hỏa','Thổ','Mộc'][(Math.floor(((y-4)%60)/2)%5+5)%5];}
  function getZodiac(d,m){for(const [name,mm,last] of zodiac){if(m===mm && d<=last) return name;}return 'Ma Kết';}
  function localText(){
    const bd=parseDate(birthDate);
    if(!bd) return '⚠️ Bạn cần nhập ngày sinh hợp lệ. Ví dụ: 2000-01-01 hoặc 01/01/2000.';
    const age=new Date().getFullYear()-bd.y;
    const canchi=getCanChiYear(bd.y);
    const element=getElement(bd.y);
    const cung=getZodiac(bd.d,bd.m);
    const displayName=name.trim()||'Bạn';
    return `### 📜 Tổng quan tử vi cho ${displayName}

| Mục | Thông tin |
|---|---|
| Ngày sinh | ${String(bd.d).padStart(2,'0')}/${String(bd.m).padStart(2,'0')}/${bd.y} |
| Giờ sinh | ${birthTime || 'Chưa nhập'} |
| Giới tính | ${gender} |
| Tuổi tham khảo | ${age} |
| Can chi năm sinh | ${canchi} |
| Ngũ hành tham khảo | ${element} |
| Cung hoàng đạo | ${cung} |

### 🔮 Luận giải hôm nay
- **Tổng quan:** năng lượng hiện tại hợp với việc sắp xếp lại mục tiêu, giảm ôm đồm và chọn việc quan trọng nhất để làm trước.
- **Công việc:** nên đi theo hướng chắc chắn, kiểm tra kỹ chi tiết, tránh quyết định vội vì cảm xúc nhất thời.
- **Tài chính:** ưu tiên giữ ổn định, hạn chế chi tiêu bốc đồng; khoản nào chưa rõ thì nên chậm lại một nhịp.
- **Tình cảm:** cần nói rõ cảm xúc, tránh im lặng quá lâu. Một lời hỏi han đúng lúc có thể làm dịu nhiều hiểu lầm.
- **Sức khỏe tinh thần:** nên ngủ đủ hơn, bớt căng não vì nhiều kế hoạch cùng lúc.

### ✨ Lời khuyên riêng theo trọng tâm
${focus || 'Tập trung vào điều thực tế, dễ làm ngay trong hôm nay.'}

> Kết quả mang tính tham khảo văn hóa/giải trí, không thay thế quyết định thực tế.`;
  }
  function localRun(){ setOut(localText()); }
  async function run(){
    const localReport=localText();
    if(localReport.startsWith('⚠️')) return setOut(localReport);
    setOut('AI đang luận giải tử vi chi tiết...');
    const bd=parseDate(birthDate);
    const computed=bd?{canChiYear:getCanChiYear(bd.y), element:getElement(bd.y), westernZodiac:getZodiac(bd.d,bd.m), focus}:{};
    try{
      const d=await apiJSON('/api/mystic-ai',{name:name||'Bạn',birthDate,birthTime,gender,profile:{name,birthDate,birthTime,gender,focus},computed,localReport});
      setOut(d.text||d.result||d.answer||localReport);
    }catch(e){
      setOut(localReport + `\n\n---\n\n⚠️ AI server chưa trả lời nên app đã dùng bản luận local ổn định. Lỗi kỹ thuật: ${e.message}`);
    }
  }
  return <section className="tool-grid horoscope-tool">
    <div className="premium-panel">
      <h2>🔮 Tử vi / Luận giải</h2>
      <label>Họ tên<input value={name} onChange={e=>setName(e.target.value)} placeholder="Đặng Văn Năm" /></label>
      <label>Ngày sinh<input value={birthDate} onChange={e=>setBirthDate(e.target.value)} type="date" /></label>
      <label>Giờ sinh<input value={birthTime} onChange={e=>setBirthTime(e.target.value)} type="time" /></label>
      <label>Giới tính<select value={gender} onChange={e=>setGender(e.target.value)}><option>Nam</option><option>Nữ</option><option>Khác</option></select></label>
      <label>Trọng tâm luận giải<textarea value={focus} onChange={e=>setFocus(e.target.value)} placeholder="Ví dụ: tình cảm, công việc, tài chính hôm nay" /></label>
      <button className="primary" onClick={run}>🤖 AI luận giải</button>
      <button onClick={localRun}>🔎 Luận local</button>
    </div>
    <Result text={out}/>
  </section>;
}

function AstrologyTool(){return <SimpleTool kind="astrology" title="Chiêm tinh" icon="🪐" preset="Luận chiêm tinh đầy đủ, chuyên nghiệp: tổng quan cung, nguyên tố, tính cách, cảm xúc, tình yêu, công việc, điểm mạnh, điểm cần cân bằng, vận trình gần và lời khuyên thực tế. Câu hỏi:" placeholder="Ví dụ: Song Tử, tình duyên tháng này thế nào?"/>}
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
  async function run(){const life=sumDigits(birth); setOut('Đang tính local và AI luận giải...'); try{const d=await apiJSON('/api/multi-ai/chat',{provider:'auto',message:`Thần số học chuyên sâu cho tên ${name||'chưa nhập'}, ngày sinh ${birth||'chưa nhập'}, số chủ đạo local là ${life}. Luận rõ tính cách, tình duyên, công việc, lời khuyên.`}); setOut(d.text||d.reply||`Số chủ đạo: ${life}`)}catch(e){setOut(`### 🔢 Kết quả local
- Họ tên: ${name||'Chưa nhập'}
- Ngày sinh: ${birth||'Chưa nhập'}
- Số chủ đạo: ${life||'Chưa đủ dữ liệu'}

Kết quả chỉ mang tính tham khảo.`)}}
  return <section className="tool-grid"><div className="premium-panel"><h2>🔢 Thần số học AI</h2><input value={name} onChange={e=>setName(e.target.value)} placeholder="Họ và tên"/><input value={birth} onChange={e=>setBirth(e.target.value)} placeholder="Ngày sinh: 01/01/2000"/><button className="primary" onClick={run}>🤖 Luận thần số học</button></div><Result text={out}/></section>
}

function Result({text}){return <article className="premium-panel result"><h2>📌 Kết quả</h2><div dangerouslySetInnerHTML={{__html: markdownLite(text)}} /></article>}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
