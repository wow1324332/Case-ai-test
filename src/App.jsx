import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { 
  Play, CheckCircle, XCircle, AlertTriangle, ShieldAlert, FolderPlus, 
  FileSpreadsheet, UploadCloud, ChevronRight, LayoutDashboard, Folder, 
  Activity, Settings, LogOut, Plus, Search, Filter, PlayCircle, Info
} from 'lucide-react';

// Firebase 및 Gemini 환경 변수를 안전하게 가져오기 (미리보기 환경 호환성 고려)
// 실제 Vite 환경에서는 import.meta.env가 존재하지만, es2015 빌드 타겟 경고를 방지하기 위해 예외 처리를 추가합니다.
const getEnv = (key) => {
  try {
    // Vite 환경인 경우
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env[key] || "";
    }
  } catch (e) {
    // ignore
  }
  return "";
};

// Vercel 환경 변수를 이용한 SDK 초기화
import { initializeApp } from 'firebase/app';
import { GoogleGenerativeAI } from '@google/generative-ai';

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID')
};

let firebaseApp, genAI, aiModel;

try {
  // 환경변수가 등록되어 있을 때만 Firebase 초기화 실행
  if (firebaseConfig.apiKey) {
    firebaseApp = initializeApp(firebaseConfig);
    console.log("🔥 Firebase initialized successfully.");
  }
  
  // 환경변수가 등록되어 있을 때만 Gemini 초기화 실행
  const geminiApiKey = getEnv('VITE_GEMINI_API_KEY');
  if (geminiApiKey) {
    genAI = new GoogleGenerativeAI(geminiApiKey);
    aiModel = genAI.getGenerativeModel({ model: "gemini-2.5-pro" }); 
    console.log("🧠 Gemini AI initialized successfully.");
  }
} catch (error) {
  console.error("SDK Initialization Error:", error);
}

// 간단하면서도 강력한 CSV 파서 (따옴표 내 쉼표 처리 포함)
const parseCSV = (str) => {
  const arr = [];
  let quote = false;
  for (let row = 0, col = 0, c = 0; c < str.length; c++) {
    let cc = str[c], nc = str[c + 1];
    arr[row] = arr[row] || [];
    arr[row][col] = arr[row][col] || '';
    if (cc === '"' && quote && nc === '"') { arr[row][col] += cc; ++c; continue; }
    if (cc === '"') { quote = !quote; continue; }
    if (cc === ',' && !quote) { ++col; continue; }
    if (cc === '\r' && nc === '\n' && !quote) { ++row; col = 0; ++c; continue; }
    if (cc === '\n' && !quote) { ++row; col = 0; continue; }
    if (cc === '\r' && !quote) { ++row; col = 0; continue; }
    arr[row][col] += cc;
  }
  return arr;
};

const generateId = () => Math.random().toString(36).substr(2, 9);

const COLORS = {
  pass: '#10b981', // Emerald 500
  fail: '#f43f5e', // Rose 500
  block: '#f59e0b', // Amber 500
  untested: '#64748b' // Slate 500
};

const INITIAL_DATA = {
  projects: [
    { id: 'p1', name: '넥서스 프로토콜 v2.0', description: '차세대 블록체인 결제 시스템 코어 엔진 QA' }
  ],
  suites: [
    { id: 's1', projectId: 'p1', name: '결제 모듈 코어 테스트', headers: ['테스트 케이스 명', '사전조건', '테스트 절차', '기대결과', '우선순위'] }
  ],
  cases: [
    { id: 'c1', suiteId: 's1', title: '정상적인 결제 요청 처리 확인', priority: 'High', fields: { '테스트 케이스 명': '정상적인 결제 요청 처리 확인', '사전조건': '유효한 계정과 잔액 보유', '테스트 절차': '1. 결제 API 호출\n2. 파라미터 전달', '기대결과': '상태코드 200 반환 및 잔액 차감', '우선순위': 'High' } },
    { id: 'c2', suiteId: 's1', title: '잔액 부족 시 결제 거절 확인', priority: 'High', fields: { '테스트 케이스 명': '잔액 부족 시 결제 거절 확인', '사전조건': '잔액이 0원인 계정', '테스트 절차': '1. 1000원 결제 요청', '기대결과': '상태코드 400 및 에러 메시지 반환', '우선순위': 'High' } },
    { id: 'c3', suiteId: 's1', title: '동시 다발적 결제 요청 처리 (Locking)', priority: 'Critical', fields: { '테스트 케이스 명': '동시 다발적 결제 요청 처리 (Locking)', '사전조건': '동일 계정으로 스크립트 준비', '테스트 절차': '1. 0.1초 간격으로 5회 결제 요청', '기대결과': '첫 결제만 성공하고 나머지는 409 Conflict 반환', '우선순위': 'Critical' } },
  ],
  runs: [
    { id: 'r1', projectId: 'p1', name: '릴리즈 2.0.1 회귀 테스트', status: 'completed', 
      results: { 'c1': { status: 'pass' }, 'c2': { status: 'pass' }, 'c3': { status: 'fail', note: 'Locking 처리가 늦어 중복 결제됨' } },
      createdAt: new Date().toISOString()
    }
  ]
};

export default function QAApp() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('login'); // login, dashboard, project, suite, run, execute
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [activeRunId, setActiveRunId] = useState(null);
  const [activeSuiteId, setActiveSuiteId] = useState(null);

  // Execute Run 뷰 및 Create Run 상태 최상단 관리
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [filter, setFilter] = useState('all'); // all, untested, pass, fail, block
  const [selectedRunCases, setSelectedRunCases] = useState([]); // Create Run에서의 선택 항목
  const [isDetailOpen, setIsDetailOpen] = useState(false); // Execute Run의 사이드바 토글
  const [selectedHeaders, setSelectedHeaders] = useState([]); // Execute Run 목록 표시 헤더
  const [isHeaderDropdownOpen, setIsHeaderDropdownOpen] = useState(false);

  const [toastMessage, setToastMessage] = useState(null);

  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  const [editProjectName, setEditProjectName] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');

  const [isSuiteSettingsOpen, setIsSuiteSettingsOpen] = useState(false);
  const [editSuiteName, setEditSuiteName] = useState('');

  // 스위트 생성 시 폼 초기화 방지를 위한 상태 추가
  const [suiteNameInput, setSuiteNameInput] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const [data, setData] = useState({
    projects: [],
    suites: [],
    cases: [],
    runs: []
  });

  // 애니메이션용 마운트 상태
  const [isLoaded, setIsLoaded] = useState(false);
  useEffect(() => { 
    setIsLoaded(true); 
    // SheetJS (엑셀 파서) 동적 로드
    if (!window.XLSX) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    // 런 진입 시 첫 케이스 자동선택
    if (currentView === 'execute_run' && activeRunId) {
      const run = data.runs.find(r => r.id === activeRunId);
      if (run) {
        const caseIdsInRun = Object.keys(run.results || {});
        const runCases = data.cases.filter(c => caseIdsInRun.includes(c.id));
        if (!selectedCaseId && runCases.length > 0) {
            setSelectedCaseId(runCases[0].id);
        }
      }
    }
    // 런 생성 화면 진입 시 전체 케이스 자동 체크
    if (currentView === 'create_run' && activeProjectId) {
      const projSuites = data.suites.filter(s => s.projectId === activeProjectId);
      const allCases = data.cases.filter(c => projSuites.some(s => s.id === c.suiteId));
      setSelectedRunCases(allCases.map(c => c.id));
    }
  }, [currentView, activeRunId, selectedCaseId, activeProjectId, data.runs, data.cases, data.suites]);

  useEffect(() => {
    setSelectedFileName('');
    setSelectedFile(null);
    setSuiteNameInput('');
    setIsProjectSettingsOpen(false);
    setIsSuiteSettingsOpen(false);
    setIsHeaderDropdownOpen(false);
  }, [currentView]);

  // 폰트 스타일 선언 (Pretendard 적용)
  const globalStyles = `
    @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
    .font-sans {
      font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif !important;
    }
  `;

  // 더미 로그인 처리
  const handleLogin = (e) => {
    e.preventDefault();
    setUser({ name: 'QA 마스터', email: 'qa@nexus.inc' });
    setData(INITIAL_DATA); // 로그인 시 샘플 데이터 로드
    setCurrentView('dashboard');
  };

  const Layout = ({ children, title }) => (
    <div className="flex h-screen bg-[#f8fafc] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/40 via-[#f8fafc] to-slate-100 text-slate-800 font-sans overflow-hidden selection:bg-blue-200/50">
      <style>{globalStyles}</style>
      
      {/* Sidebar - Glassmorphism */}
      <aside className="w-60 bg-white/60 backdrop-blur-2xl border-r border-slate-200/50 flex flex-col z-20 shadow-[4px_0_24px_rgb(0,0,0,0.02)]">
        <div className="h-14 flex items-center gap-2.5 px-5 border-b border-slate-200/50">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_2px_10px_rgb(59,130,246,0.3)]">
            <ShieldAlert size={16} className="text-white" />
          </div>
          <h1 className="text-[15px] font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight">
            QA NEXUS
          </h1>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          <NavItem icon={<LayoutDashboard size={18}/>} label="대시보드" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} />
          <div className="pt-6 pb-2 px-2 text-[10px] font-bold text-slate-400 tracking-wider uppercase">Projects</div>
          {data.projects.map(p => (
            <NavItem 
              key={p.id} 
              icon={<Folder size={16}/>} 
              label={p.name} 
              active={currentView === 'project' && activeProjectId === p.id} 
              onClick={() => { setActiveProjectId(p.id); setCurrentView('project'); }} 
            />
          ))}
          <button 
            onClick={() => setCurrentView('create_project')}
            className="w-full flex items-center gap-2 px-3 py-2.5 mt-4 rounded-xl text-xs font-semibold text-slate-500 hover:text-blue-600 hover:bg-white/80 transition-all border border-dashed border-slate-300 hover:border-blue-400 hover:shadow-sm"
          >
            <Plus size={16} /> 프로젝트 추가
          </button>
        </nav>

        <div className="p-4 border-t border-slate-200/50 bg-white/40 backdrop-blur-md">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/60 transition-colors border border-transparent hover:border-white hover:shadow-sm">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-50 flex items-center justify-center text-xs font-bold text-blue-700 shadow-inner border border-white">
              {user?.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
            </div>
            <button onClick={() => {setUser(null); setCurrentView('login');}} className="text-slate-400 hover:text-rose-500 transition-colors p-1.5 rounded-lg hover:bg-rose-50">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col z-10 h-screen overflow-hidden relative">
        <header className="h-14 flex items-center justify-between px-8 border-b border-slate-200/50 bg-white/40 backdrop-blur-2xl sticky top-0 z-30 shadow-sm">
          <h2 className="text-[15px] font-bold text-slate-800 tracking-tight">{title}</h2>
        </header>
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
          <div className={`transition-all duration-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} h-full max-w-6xl mx-auto`}>
            {children}
          </div>
        </div>
      </main>

      {/* Cinematic Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-50 bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 text-white px-5 py-3.5 rounded-2xl shadow-[0_20px_40px_rgb(0,0,0,0.2)] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-8 duration-300">
          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Info size={14} className="text-blue-400" />
          </div>
          <span className="text-xs font-medium tracking-wide">{toastMessage}</span>
        </div>
      )}
    </div>
  );

  const NavItem = ({ icon, label, active, onClick }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300 ${
        active 
        ? 'bg-white shadow-[0_2px_10px_rgb(0,0,0,0.03)] border border-white text-blue-700' 
        : 'text-slate-500 hover:bg-white/60 hover:text-slate-800 border border-transparent'
      }`}
    >
      <span className={`${active ? 'text-blue-600' : 'text-slate-400'}`}>{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );

  if (currentView === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-sans bg-[#f8fafc]">
        <style>{globalStyles}</style>
        {/* Cinematic Animated Background Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/20 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-400/20 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        <div className="w-full max-w-md p-10 bg-white/70 backdrop-blur-2xl rounded-[2rem] border border-white shadow-[0_8px_40px_rgb(0,0,0,0.06)] relative z-10 transition-all">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 shadow-[0_8px_20px_rgb(59,130,246,0.3)]">
              <ShieldAlert size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight text-center">QA NEXUS</h1>
            <p className="text-slate-500 mt-1.5 text-xs font-medium text-center">프리미엄 엔터프라이즈 테스트 플랫폼</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5 ml-1 uppercase tracking-wider">Email</label>
              <input type="email" defaultValue="tester@nexus.com" required className="w-full bg-white/50 backdrop-blur-sm border border-slate-200/80 rounded-xl text-sm px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder-slate-400 shadow-inner" placeholder="이메일 입력" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5 ml-1 uppercase tracking-wider">Password</label>
              <input type="password" defaultValue="password" required className="w-full bg-white/50 backdrop-blur-sm border border-slate-200/80 rounded-xl text-sm px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder-slate-400 shadow-inner" placeholder="비밀번호 입력" />
            </div>
            <button type="submit" className="w-full bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-bold py-3.5 rounded-xl transition-all shadow-[0_4px_14px_0_rgb(59,130,246,0.39)] hover:shadow-[0_6px_20px_rgb(59,130,246,0.23)] border border-blue-500/50 mt-4">
              시스템 접속
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (currentView === 'dashboard') {
    const totalCases = data.cases.length;
    let totalPass = 0, totalFail = 0, totalBlock = 0, totalUntested = 0;
    
    data.runs.forEach(run => {
      Object.values(run.results || {}).forEach(res => {
        if (res.status === 'pass') totalPass++;
        if (res.status === 'fail') totalFail++;
        if (res.status === 'block') totalBlock++;
      });
    });

    const pieData = [
      { name: 'PASS', value: totalPass, color: COLORS.pass },
      { name: 'FAIL', value: totalFail, color: COLORS.fail },
      { name: 'BLOCK', value: totalBlock, color: COLORS.block },
    ].filter(d => d.value > 0);

    return (
      <Layout title="시스템 오버뷰">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
          <StatCard title="총 프로젝트" value={data.projects.length} icon={<Folder size={20}/>} color="text-blue-600" bg="bg-blue-50" border="border-blue-100" />
          <StatCard title="테스트 케이스" value={totalCases} icon={<FileSpreadsheet size={20}/>} color="text-indigo-600" bg="bg-indigo-50" border="border-indigo-100" />
          <StatCard title="완료된 런" value={data.runs.filter(r => r.status === 'completed').length} icon={<CheckCircle size={20}/>} color="text-emerald-600" bg="bg-emerald-50" border="border-emerald-100" />
          <StatCard title="발견된 결함" value={totalFail} icon={<AlertTriangle size={20}/>} color="text-rose-600" bg="bg-rose-50" border="border-rose-100" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 h-[340px]">
          {/* Pie Chart Card */}
          <div className="bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6 flex flex-col">
            <h3 className="text-[13px] font-bold text-slate-800 mb-4">전체 테스트 상태</h3>
            <div className="flex-1 min-h-0 relative">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none" cornerRadius={4}>
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '12px', fontSize: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
                      itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                    />
                    <Legend verticalAlign="bottom" height={24} iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#475569', fontWeight: '600' }}/>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-xs text-slate-400 font-medium">
                  <Activity size={24} className="mb-2 text-slate-300 opacity-50"/>
                  데이터 없음
                </div>
              )}
            </div>
          </div>

          {/* Recent Runs List */}
          <div className="col-span-1 lg:col-span-2 bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6 flex flex-col">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-[13px] font-bold text-slate-800">최근 테스트 런</h3>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
              {data.runs.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 font-medium">
                   <PlayCircle size={28} className="mb-2 text-slate-300 opacity-50"/>
                   생성된 테스트 런이 없습니다.
                 </div>
              ) : (
                data.runs.map(run => {
                  const pCount = Object.values(run.results).filter(r => r.status === 'pass').length;
                  const fCount = Object.values(run.results).filter(r => r.status === 'fail').length;
                  const bCount = Object.values(run.results).filter(r => r.status === 'block').length;
                  const total = Object.keys(run.results).length || 1; 
                  const progress = Math.round(((pCount + fCount + bCount) / total) * 100) || 0;

                  return (
                    <div key={run.id} onClick={() => { setActiveRunId(run.id); setCurrentView('execute_run'); }} className="group bg-white/60 border border-slate-200/60 rounded-xl p-4 cursor-pointer hover:bg-white hover:border-blue-300 hover:shadow-[0_4px_20px_rgb(59,130,246,0.08)] transition-all duration-300">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 group-hover:text-blue-700 transition-colors tracking-tight">{run.name}</h4>
                          <p className="text-[11px] font-medium text-slate-500 mt-1 flex items-center gap-1">
                            <Folder size={12}/> {data.projects.find(p=>p.id===run.projectId)?.name}
                          </p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${run.status === 'completed' ? 'bg-slate-100/50 text-slate-500 border-slate-200/60' : 'bg-blue-50 text-blue-600 border-blue-200/60'}`}>
                          {run.status === 'completed' ? '완료됨' : '진행중'}
                        </span>
                      </div>
                      
                      <div className="mt-2">
                        <div className="flex justify-between text-[10px] mb-1.5 font-bold">
                          <span className="text-slate-500">진행률</span>
                          <span className="text-slate-800">{progress}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                          <div style={{ width: `${(pCount/total)*100}%` }} className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full"></div>
                          <div style={{ width: `${(fCount/total)*100}%` }} className="bg-gradient-to-r from-rose-400 to-rose-500 h-full"></div>
                          <div style={{ width: `${(bCount/total)*100}%` }} className="bg-gradient-to-r from-amber-400 to-amber-500 h-full"></div>
                        </div>
                        <div className="flex gap-4 mt-2.5 text-[10px] font-bold">
                          <span className="text-emerald-600 flex items-center gap-1.5"><CheckCircle size={12}/> {pCount}</span>
                          <span className="text-rose-600 flex items-center gap-1.5"><XCircle size={12}/> {fCount}</span>
                          <span className="text-amber-600 flex items-center gap-1.5"><AlertTriangle size={12}/> {bCount}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (currentView === 'create_project') {
    const handleCreateProject = (e) => {
      e.preventDefault();
      const newProj = {
        id: generateId(),
        name: e.target.name.value,
        description: e.target.desc.value
      };
      setData(prev => ({ ...prev, projects: [...prev.projects, newProj] }));
      setActiveProjectId(newProj.id);
      setCurrentView('project');
    };

    return (
      <Layout title="새 프로젝트 생성">
        <div className="max-w-xl mx-auto mt-8">
          <div className="bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-[15px] font-bold text-slate-800 mb-6 flex items-center gap-2">
              <FolderPlus size={18} className="text-blue-600"/> 프로젝트 정보 입력
            </h2>
            <form onSubmit={handleCreateProject} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1.5 ml-1 uppercase tracking-wider">Project Name</label>
                <input name="name" required className="w-full bg-white/50 backdrop-blur-sm border border-slate-200/80 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-inner" placeholder="예: 모바일 앱 리뉴얼 v3.0" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1.5 ml-1 uppercase tracking-wider">Description (Optional)</label>
                <textarea name="desc" rows={4} className="w-full bg-white/50 backdrop-blur-sm border border-slate-200/80 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none shadow-inner" placeholder="프로젝트의 목적이나 주요 내용을 간략히 적어주세요."></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-6 mt-4">
                <button type="button" onClick={() => setCurrentView('dashboard')} className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all">취소</button>
                <button type="submit" className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-[0_4px_14px_0_rgb(59,130,246,0.39)] hover:shadow-[0_6px_20px_rgb(59,130,246,0.23)] border border-blue-500/50 transition-all">프로젝트 생성</button>
              </div>
            </form>
          </div>
        </div>
      </Layout>
    );
  }

  if (currentView === 'project') {
    const project = data.projects.find(p => p.id === activeProjectId);
    if (!project) return <Layout title="Not Found"><p>프로젝트를 찾을 수 없습니다.</p></Layout>;

    const projSuites = data.suites.filter(s => s.projectId === project.id);
    const projRuns = data.runs.filter(r => r.projectId === project.id);

    const handleUpdateProject = (e) => {
        e.preventDefault();
        setData(prev => ({
            ...prev,
            projects: prev.projects.map(p => p.id === activeProjectId ? { ...p, name: editProjectName } : p)
        }));
        setIsProjectSettingsOpen(false);
        setToastMessage('프로젝트 이름이 수정되었습니다.');
    };

    const handleDeleteProject = () => {
        setData(prev => ({
            ...prev,
            projects: prev.projects.filter(p => p.id !== activeProjectId),
            suites: prev.suites.filter(s => s.projectId !== activeProjectId),
            runs: prev.runs.filter(r => r.projectId !== activeProjectId)
        }));
        setToastMessage('프로젝트가 삭제되었습니다.');
        setIsProjectSettingsOpen(false);
        setCurrentView('dashboard');
    };

    return (
      <Layout title={project.name}>
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
             <div className="flex items-center gap-3 mb-1.5">
                 <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight">{project.name}</h2>
                 <button onClick={() => { setEditProjectName(project.name); setIsProjectSettingsOpen(true); }} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-all">
                     <Settings size={18} />
                 </button>
             </div>
            <p className="text-slate-500 text-[13px] font-medium">{project.description || '설명이 없습니다.'}</p>
          </div>
        </div>

        {isProjectSettingsOpen && (
            <div className="mb-6 p-5 bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                <h3 className="text-[13px] font-bold text-slate-800 mb-4 flex items-center gap-1.5"><Settings size={14}/> 프로젝트 설정</h3>
                <form onSubmit={handleUpdateProject} className="flex items-end gap-3">
                    <div className="flex-1">
                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 ml-1 uppercase tracking-wider">Rename Project</label>
                        <input value={editProjectName} onChange={(e) => setEditProjectName(e.target.value)} required className="w-full bg-white/50 backdrop-blur-sm border border-slate-200/80 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-inner" />
                    </div>
                    <button type="submit" className="px-4 py-2.5 bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-[0_4px_14px_0_rgb(59,130,246,0.39)] border border-blue-500/50 transition-all">저장</button>
                    <button type="button" onClick={handleDeleteProject} className="px-4 py-2.5 border border-rose-200/80 text-rose-600 bg-rose-50/50 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all shadow-sm">삭제</button>
                    <button type="button" onClick={() => setIsProjectSettingsOpen(false)} className="px-4 py-2.5 text-slate-500 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all">취소</button>
                </form>
            </div>
        )}

        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => setCurrentView('create_suite')} className="flex items-center gap-2 px-4 py-2.5 bg-white/80 backdrop-blur-md text-slate-700 border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 rounded-xl text-xs font-bold transition-all shadow-sm">
            <FileSpreadsheet size={16} /> 테스트 스위트 추가
          </button>
          <button onClick={() => setCurrentView('create_run')} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border border-emerald-500/50 rounded-xl text-xs font-bold transition-all shadow-[0_4px_14px_0_rgb(16,185,129,0.39)] hover:shadow-[0_6px_20px_rgb(16,185,129,0.23)]">
            <PlayCircle size={16} /> 새 테스트 런 시작
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Suites List */}
          <div className="bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6">
            <h3 className="text-[13px] font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Folder size={16} className="text-blue-500"/> 테스트 스위트 구성
            </h3>
            <div className="space-y-3">
              {projSuites.length === 0 ? (
                <div className="text-center py-10 text-slate-400 bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200/80 text-[13px] font-medium">
                  <FileSpreadsheet size={32} className="mx-auto mb-3 text-slate-300 opacity-60" />
                  <p>아직 스위트가 없습니다.<br/>문서를 업로드하여 케이스를 구성해보세요.</p>
                </div>
              ) : (
                projSuites.map(suite => {
                  const caseCount = data.cases.filter(c => c.suiteId === suite.id).length;
                  return (
                    <div key={suite.id} className="group bg-white/60 border border-slate-200/60 rounded-xl p-4 flex justify-between items-center hover:bg-white hover:border-blue-300 hover:shadow-[0_4px_20px_rgb(59,130,246,0.08)] transition-all duration-300 cursor-pointer"
                         onClick={() => { setActiveSuiteId(suite.id); setCurrentView('suite_detail'); }}>
                      <div>
                        <h4 className="text-[13px] font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{suite.name}</h4>
                        <p className="text-[11px] font-medium text-slate-500 mt-1">총 {caseCount}개 케이스</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                         <ChevronRight size={16} className="text-slate-400 group-hover:text-blue-600" />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Runs List */}
          <div className="bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6">
            <h3 className="text-[13px] font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Activity size={16} className="text-emerald-500"/> 활성 테스트 런
            </h3>
            <div className="space-y-3">
              {projRuns.length === 0 ? (
                <div className="text-center py-10 text-slate-400 bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200/80 text-[13px] font-medium">
                  <PlayCircle size={32} className="mx-auto mb-3 text-slate-300 opacity-60" />
                  <p>진행 중이거나 완료된 런이 없습니다.<br/>'새 테스트 런 시작'을 눌러주세요.</p>
                </div>
              ) : (
                projRuns.map(run => (
                  <div key={run.id} onClick={() => { setActiveRunId(run.id); setCurrentView('execute_run'); }} className="group bg-white/60 border border-slate-200/60 rounded-xl p-4 cursor-pointer hover:bg-white hover:border-emerald-300 hover:shadow-[0_4px_20px_rgb(16,185,129,0.08)] transition-all duration-300">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[13px] font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">{run.name}</h4>
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${run.status === 'completed' ? 'bg-slate-100/50 text-slate-500 border-slate-200/60' : 'bg-emerald-50 text-emerald-600 border-emerald-200/60'}`}>
                        {run.status === 'completed' ? '종료됨' : '진행중'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (currentView === 'create_suite') {
    const handleFileUpload = (e) => {
      e.preventDefault();
      const name = suiteNameInput; 
      const file = selectedFile; 
      
      if (!file) {
        setToastMessage('파일을 선택해주세요.'); 
        return;
      }

      const processData = (jsonData) => {
        if (jsonData.length < 2) {
          setToastMessage('데이터가 충분하지 않습니다. 헤더와 최소 1개의 데이터 행이 필요합니다.');
          return;
        }

        const rawHeaders = jsonData[0];
        const headers = rawHeaders.map((h, i) => h ? String(h).trim() : `열 ${i+1}`);

        const newCases = [];
        const suiteId = generateId();
        
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue; 
          
          let title = '';
          const titleIdx = headers.findIndex(h => /(제목|title|이름|name|tc|테스트케이스)/i.test(h.replace(/\s+/g, '')));
          if (titleIdx !== -1 && row[titleIdx]) {
              title = String(row[titleIdx]);
          } else if (row[0]) {
              title = String(row[0]); 
          } else {
              continue; 
          }

          let priority = 'Medium';
          const priorityIdx = headers.findIndex(h => /(중요도|우선순위|priority|등급|레벨|level)/i.test(h.replace(/\s+/g, '')));
          if (priorityIdx !== -1 && row[priorityIdx]) priority = String(row[priorityIdx]);

          const fields = {};
          headers.forEach((h, idx) => {
            fields[h] = row[idx] !== undefined ? String(row[idx]) : '';
          });

          newCases.push({ id: generateId(), suiteId: suiteId, title: title, priority: priority, fields: fields });
        }

        if(newCases.length === 0){
             setToastMessage('유효한 테스트 케이스를 찾지 못했습니다. 문서를 확인해주세요.');
             return;
        }

        const newSuite = { id: suiteId, projectId: activeProjectId, name: name, headers: headers };
        
        setData(prev => ({ ...prev, suites: [...prev.suites, newSuite], cases: [...prev.cases, ...newCases] }));
        setToastMessage(`성공적으로 ${newCases.length}개의 케이스를 생성했습니다!`);
        setCurrentView('project');
      };

      const isCSV = file.name.toLowerCase().endsWith('.csv');
      const reader = new FileReader();

      if (isCSV) {
        reader.onload = (evt) => {
          try { processData(parseCSV(evt.target.result)); } catch(err) { setToastMessage('CSV 파싱 오류 발생'); }
        };
        reader.readAsText(file);
      } else {
        if (!window.XLSX) { setToastMessage('라이브러리 로딩 중... 다시 시도해주세요.'); return; }
        reader.onload = (evt) => {
          try {
            const workbook = window.XLSX.read(new Uint8Array(evt.target.result), { type: 'array' });
            processData(window.XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 }));
          } catch (error) { setToastMessage('파일 파싱 오류. 형식을 확인해주세요.'); }
        };
        reader.readAsArrayBuffer(file);
      }
    };

    return (
      <Layout title="데이터 업로드 및 스위트 생성">
        <div className="max-w-2xl mx-auto mt-6 bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-200/50 bg-slate-50/30 backdrop-blur-md">
            <h2 className="text-[15px] font-bold text-slate-800 flex items-center gap-2">
              <UploadCloud className="text-blue-600" size={20}/>
              케이스 대량 임포트
            </h2>
            <p className="text-slate-500 text-[13px] font-medium mt-1.5">
              Excel (.xlsx) 또는 CSV 파일을 업로드하여 스위트를 생성합니다. 문서의 첫 번째 행이 앱 내부의 항목 이름으로 자동 적용됩니다.
            </p>
          </div>
          
          <form onSubmit={handleFileUpload} className="p-8 space-y-6">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5 ml-1 uppercase tracking-wider">Test Suite Name</label>
              <input name="suiteName" value={suiteNameInput} onChange={(e) => setSuiteNameInput(e.target.value)} required className="w-full bg-white/50 backdrop-blur-sm border border-slate-200/80 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-inner" placeholder="예: 회원가입 시나리오 모음" />
            </div>

            <div className="bg-blue-50/50 border border-blue-100/50 rounded-xl p-4 shadow-sm">
              <h4 className="text-[12px] font-bold text-blue-800 mb-1.5 flex items-center gap-1.5">
                <Info size={14} className="text-blue-600"/> 동적 헤더 가이드
              </h4>
              <p className="text-[11px] font-medium text-blue-700 mb-3 leading-relaxed">
                엑셀의 첫 번째 행에 작성된 열 이름이 그대로 시스템에 등록됩니다.
              </p>
              <div className="flex gap-2.5 text-[11px] font-mono font-bold text-slate-600 bg-white/80 backdrop-blur-md p-3 rounded-lg border border-slate-200/60 overflow-x-auto shadow-sm">
                <span className="text-slate-800">테스트 케이스 명</span> | <span>테스트 환경</span> | <span>기대 결과</span> | ...
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5 ml-1 uppercase tracking-wider">File Attachment</label>
              <div className={`relative border-2 border-dashed ${selectedFileName ? 'border-emerald-400/80 bg-emerald-50/50' : 'border-slate-300/80 hover:border-blue-400/80 bg-slate-50/50'} rounded-2xl p-8 text-center transition-all duration-300 group`}>
                <input type="file" name="excelFile" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) { setSelectedFile(file); setSelectedFileName(file.name); }
                }} />
                {selectedFileName ? (
                    <>
                        <CheckCircle size={36} className="mx-auto mb-3 text-emerald-500" />
                        <p className="text-emerald-700 text-sm font-bold tracking-tight">{selectedFileName}</p>
                        <p className="text-[11px] font-medium text-emerald-600 mt-1.5">성공적으로 첨부되었습니다. 클릭하여 변경.</p>
                    </>
                ) : (
                    <>
                        <FileSpreadsheet size={36} className="mx-auto mb-3 text-slate-300 group-hover:text-blue-400 transition-colors" />
                        <p className="text-slate-700 text-sm font-bold tracking-tight">클릭하거나 파일을 드래그하여 업로드</p>
                        <p className="text-[11px] font-medium text-slate-400 mt-1.5">.xlsx, .xls, .csv 지원</p>
                    </>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-slate-100">
              <button type="button" onClick={() => setCurrentView('project')} className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all">취소</button>
              <button type="submit" className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-[0_4px_14px_0_rgb(59,130,246,0.39)] hover:shadow-[0_6px_20px_rgb(59,130,246,0.23)] border border-blue-500/50 transition-all">업로드 및 생성</button>
            </div>
          </form>
        </div>
      </Layout>
    );
  }

  if (currentView === 'suite_detail') {
    const suite = data.suites.find(s => s.id === activeSuiteId);
    const cases = data.cases.filter(c => c.suiteId === activeSuiteId);

    const handleUpdateSuite = (e) => {
        e.preventDefault();
        setData(prev => ({ ...prev, suites: prev.suites.map(s => s.id === activeSuiteId ? { ...s, name: editSuiteName } : s) }));
        setIsSuiteSettingsOpen(false);
        setToastMessage('스위트 이름이 수정되었습니다.');
    };
    const handleDeleteSuite = () => {
        setData(prev => ({ ...prev, suites: prev.suites.filter(s => s.id !== activeSuiteId), cases: prev.cases.filter(c => c.suiteId !== activeSuiteId) }));
        setToastMessage('스위트가 삭제되었습니다.');
        setIsSuiteSettingsOpen(false);
        setCurrentView('project');
    };

    return (
      <Layout title={`스위트: ${suite?.name}`}>
        <div className="mb-5 flex justify-between items-center">
          <button onClick={() => setCurrentView('project')} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 font-bold bg-white/60 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-200/60 shadow-sm transition-all hover:bg-white hover:shadow-md">
            <ChevronRight className="rotate-180" size={16}/> 프로젝트로 돌아가기
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-500">총 <span className="text-slate-800 font-bold">{cases.length}</span>개의 케이스</span>
            <button onClick={() => { setEditSuiteName(suite?.name || ''); setIsSuiteSettingsOpen(true); }} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-all ml-2">
                <Settings size={18} />
            </button>
          </div>
        </div>

        {isSuiteSettingsOpen && (
            <div className="mb-6 p-5 bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                <h3 className="text-[13px] font-bold text-slate-800 mb-4 flex items-center gap-1.5"><Settings size={14}/> 스위트 설정</h3>
                <form onSubmit={handleUpdateSuite} className="flex items-end gap-3">
                    <div className="flex-1">
                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 ml-1 uppercase tracking-wider">Rename Suite</label>
                        <input value={editSuiteName} onChange={(e) => setEditSuiteName(e.target.value)} required className="w-full bg-white/50 backdrop-blur-sm border border-slate-200/80 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-inner" />
                    </div>
                    <button type="submit" className="px-4 py-2.5 bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-[0_4px_14px_0_rgb(59,130,246,0.39)] border border-blue-500/50 transition-all">저장</button>
                    <button type="button" onClick={handleDeleteSuite} className="px-4 py-2.5 border border-rose-200/80 text-rose-600 bg-rose-50/50 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all shadow-sm">삭제</button>
                    <button type="button" onClick={() => setIsSuiteSettingsOpen(false)} className="px-4 py-2.5 text-slate-500 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all">취소</button>
                </form>
            </div>
        )}

        <div className="bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-slate-50/80 backdrop-blur-md border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-4 w-16 text-center">ID</th>
                {suite?.headers?.map((header, idx) => (
                  <th key={idx} className="px-5 py-4 whitespace-nowrap">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {cases.map((c, i) => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3.5 text-[11px] font-mono font-bold text-slate-400 text-center">C{i+1}</td>
                  {suite?.headers?.map((header, idx) => (
                    <td key={idx} className="px-5 py-3.5 text-[13px] font-medium text-slate-700 max-w-[250px] truncate" title={c.fields?.[header] || ''}>
                      {c.fields?.[header] || '-'}
                    </td>
                  ))}
                </tr>
              ))}
              {cases.length === 0 && (
                <tr><td colSpan={suite?.headers ? suite.headers.length + 1 : 4} className="p-10 text-center text-[13px] font-medium text-slate-400">케이스가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Layout>
    );
  }

  if (currentView === 'create_run') {
    const projSuites = data.suites.filter(s => s.projectId === activeProjectId);
    
    const handleCaseToggle = (caseId) => { setSelectedRunCases(prev => prev.includes(caseId) ? prev.filter(id => id !== caseId) : [...prev, caseId]); };
    const handleSuiteToggle = (suiteId, isChecked) => {
        const suiteCases = data.cases.filter(c => c.suiteId === suiteId).map(c=>c.id);
        if (isChecked) setSelectedRunCases(prev => [...new Set([...prev, ...suiteCases])]);
        else setSelectedRunCases(prev => prev.filter(id => !suiteCases.includes(id)));
    };

    const handleCreateRun = (e) => {
      e.preventDefault();
      const runName = e.target.runName.value;
      if (selectedRunCases.length === 0) { setToastMessage('최소 1개 이상의 테스트 케이스를 선택해주세요.'); return; }
      
      const runCases = data.cases.filter(c => selectedRunCases.includes(c.id));
      const initialResults = {};
      runCases.forEach(c => { initialResults[c.id] = { status: 'untested', note: '' }; });

      const newRun = { id: generateId(), projectId: activeProjectId, name: runName, status: 'active', results: initialResults, createdAt: new Date().toISOString() };
      setData(prev => ({ ...prev, runs: [...prev.runs, newRun] }));
      setActiveRunId(newRun.id);
      if (runCases.length > 0) setSelectedCaseId(runCases[0].id); else setSelectedCaseId(null);
      setCurrentView('execute_run');
    };

    return (
      <Layout title="테스트 런 생성">
        <div className="max-w-4xl mx-auto mt-6 bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-8">
          <form onSubmit={handleCreateRun}>
            <div className="mb-8">
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5 ml-1 uppercase tracking-wider">Test Run Name</label>
              <input name="runName" required defaultValue={`Sprint Release Run - ${new Date().toLocaleDateString()}`} className="w-full bg-white/50 backdrop-blur-sm border border-slate-200/80 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-inner" />
            </div>
            
            <div className="mb-8">
              <div className="flex justify-between items-end mb-3 px-1">
                <h4 className="text-[13px] font-bold text-slate-700">포함할 테스트 케이스 선택</h4>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">총 {selectedRunCases.length}개 선택됨</span>
              </div>
              
              <div className="bg-white/50 border border-slate-200/80 rounded-xl max-h-[500px] overflow-y-auto custom-scrollbar shadow-inner">
                {projSuites.map(suite => {
                  const suiteCases = data.cases.filter(c => c.suiteId === suite.id);
                  const checkedCasesInSuite = suiteCases.filter(c => selectedRunCases.includes(c.id));
                  const isAllChecked = suiteCases.length > 0 && checkedCasesInSuite.length === suiteCases.length;
                  const isSomeChecked = checkedCasesInSuite.length > 0 && !isAllChecked;

                  return (
                    <div key={suite.id} className="border-b border-slate-200/60 last:border-0">
                      <div className="flex items-center gap-3 p-4 bg-slate-50/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-10">
                        <input type="checkbox" checked={isAllChecked} ref={el => el && (el.indeterminate = isSomeChecked)} onChange={(e) => handleSuiteToggle(suite.id, e.target.checked)} className="w-4 h-4 text-emerald-500 border-slate-300 rounded focus:ring-emerald-500/20 cursor-pointer transition-all" />
                        <span className="text-[13px] font-black text-slate-800">{suite.name}</span>
                        <span className="text-[11px] font-bold text-slate-500 ml-auto bg-white/80 px-2.5 py-1 rounded-md border border-slate-200/50 shadow-sm">{checkedCasesInSuite.length} / {suiteCases.length}</span>
                      </div>
                      <div className="divide-y divide-slate-100/80 bg-white/40">
                        {suiteCases.map(c => (
                          <label key={c.id} className="flex items-start gap-4 p-4 hover:bg-white hover:shadow-sm cursor-pointer transition-all duration-300 group">
                            <div className="mt-0.5 shrink-0">
                               <input type="checkbox" checked={selectedRunCases.includes(c.id)} onChange={() => handleCaseToggle(c.id)} className="w-4 h-4 text-emerald-500 border-slate-300 rounded focus:ring-emerald-500/20 cursor-pointer transition-all" />
                            </div>
                            <div className="flex-1 min-w-0">
                               <p className="text-[13px] font-bold text-slate-800 mb-2 group-hover:text-emerald-700 transition-colors tracking-tight">{c.title}</p>
                               <div className="flex flex-wrap gap-x-6 gap-y-2">
                                 {suite.headers.slice(0, 3).map(h => {
                                    if(!c.fields[h] || c.fields[h] === c.title) return null;
                                    return (
                                      <span key={h} className="text-[11px] font-medium text-slate-500 truncate max-w-[300px]">
                                        <span className="font-bold text-slate-400 mr-1.5">{h}:</span>{c.fields[h]}
                                      </span>
                                    );
                                 })}
                               </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {projSuites.length === 0 && <p className="text-[13px] font-medium text-slate-400 p-10 text-center">사용 가능한 스위트가 없습니다.</p>}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-slate-100">
              <button type="button" onClick={() => setCurrentView('project')} className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all">취소</button>
              <button type="submit" disabled={projSuites.length===0} className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 text-white shadow-[0_4px_14px_0_rgb(16,185,129,0.39)] hover:shadow-[0_6px_20px_rgb(16,185,129,0.23)] border border-emerald-500/50 transition-all flex items-center gap-2">
                <Play size={16} fill="currentColor"/> 실행 시작
              </button>
            </div>
          </form>
        </div>
      </Layout>
    );
  }

  if (currentView === 'execute_run') {
    const run = data.runs.find(r => r.id === activeRunId);
    if (!run) return <Layout title="Not Found"><p>Run Not Found</p></Layout>;

    const caseIdsInRun = Object.keys(run.results || {});
    const runCases = data.cases.filter(c => caseIdsInRun.includes(c.id));
    const selectedCase = runCases.find(c => c.id === selectedCaseId);
    const selectedResult = selectedCaseId ? run.results[selectedCaseId] : null;

    const runHeaders = Array.from(new Set(runCases.flatMap(c => { const suite = data.suites.find(s => s.id === c.suiteId); return suite?.headers || []; })));

    const handleResultUpdate = (status) => {
      if(!selectedCaseId) return;
      setData(prev => {
        const newRuns = prev.runs.map(r => r.id === activeRunId ? { ...r, results: { ...r.results, [selectedCaseId]: { ...r.results[selectedCaseId], status } } } : r);
        return { ...prev, runs: newRuns };
      });
      if (status !== 'untested') {
         const nextUntested = runCases.find(c => c.id !== selectedCaseId && run.results[c.id].status === 'untested');
         if (nextUntested) setSelectedCaseId(nextUntested.id);
      }
    };

    const handleNoteUpdate = (e) => {
      if(!selectedCaseId) return;
      const note = e.target.value;
      setData(prev => {
        const newRuns = prev.runs.map(r => r.id === activeRunId ? { ...r, results: { ...r.results, [selectedCaseId]: { ...r.results[selectedCaseId], note } } } : r);
        return { ...prev, runs: newRuns };
      });
    }

    const handleInlineResultUpdate = (caseId, status) => {
      setData(prev => {
        const newRuns = prev.runs.map(r => r.id === activeRunId ? { ...r, results: { ...r.results, [caseId]: { ...r.results[caseId], status } } } : r);
        return { ...prev, runs: newRuns };
      });
      setSelectedCaseId(caseId);
    };

    const handleCompleteRun = () => {
      setData(prev => {
        const newRuns = prev.runs.map(r => r.id === activeRunId ? { ...r, status: 'completed' } : r);
        return { ...prev, runs: newRuns };
      });
      setIsDetailOpen(true);
      setToastMessage('테스트 런이 완료되었습니다.');
    };

    const filteredCases = runCases.filter(c => filter === 'all' || run.results[c.id].status === filter);
    const total = caseIdsInRun.length;
    const pCount = Object.values(run.results).filter(r => r.status === 'pass').length;
    const fCount = Object.values(run.results).filter(r => r.status === 'fail').length;
    const bCount = Object.values(run.results).filter(r => r.status === 'block').length;
    const progress = Math.round(((pCount + fCount + bCount) / total) * 100) || 0;

    return (
      <Layout title={`실행: ${run.name}`}>
        <div className="mb-4 flex justify-between items-center">
          <button onClick={() => setCurrentView('project')} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 font-bold bg-white/60 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-200/60 shadow-sm transition-all hover:bg-white hover:shadow-md">
            <ChevronRight className="rotate-180" size={16}/> 프로젝트로 돌아가기
          </button>
          {run.status === 'active' ? (
            <button onClick={handleCompleteRun} className="px-4 py-2 bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg text-xs font-bold shadow-[0_4px_14px_0_rgb(16,185,129,0.39)] border border-emerald-500/50 transition-all flex items-center gap-1.5">
              <CheckCircle size={14}/> 런 완료
            </button>
          ) : (
            <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100/80 text-slate-500 border border-slate-200/80 shadow-inner">완료된 런</span>
          )}
        </div>

        {/* TOP PROGRESS GRAPH */}
        <div className="bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-5 mb-5 flex flex-col gap-3">
           <div className="flex justify-between items-center">
              <span className="text-[13px] font-black text-slate-800 tracking-tight">전체 진행 상황 ({progress}%)</span>
              <div className="flex gap-5 text-[11px] font-bold">
                 <span className="text-emerald-600">PASS: {pCount}</span>
                 <span className="text-rose-600">FAIL: {fCount}</span>
                 <span className="text-amber-600">BLOCK: {bCount}</span>
                 <span className="text-slate-400">UNTESTED: {total - pCount - fCount - bCount}</span>
              </div>
           </div>
           <div className="h-4 rounded-full overflow-hidden shadow-inner border border-slate-100/50 bg-slate-50">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart layout="vertical" data={[{name: 'progress', PASS: pCount, FAIL: fCount, BLOCK: bCount, UNTESTED: total - (pCount+fCount+bCount)}]} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                 <XAxis type="number" hide domain={[0, total]}/>
                 <YAxis type="category" dataKey="name" hide />
                 <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ fontSize: '11px', padding: '6px 10px', borderRadius: '8px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', fontWeight: 'bold' }} />
                 <Bar dataKey="PASS" stackId="a" fill="url(#colorPass)" />
                 <Bar dataKey="FAIL" stackId="a" fill="url(#colorFail)" />
                 <Bar dataKey="BLOCK" stackId="a" fill="url(#colorBlock)" />
                 <Bar dataKey="UNTESTED" stackId="a" fill="#e2e8f0" />
                 <defs>
                   <linearGradient id="colorPass" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#10b981"/></linearGradient>
                   <linearGradient id="colorFail" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#fb7185"/><stop offset="100%" stopColor="#f43f5e"/></linearGradient>
                   <linearGradient id="colorBlock" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#f59e0b"/></linearGradient>
                 </defs>
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="flex h-[calc(100vh-230px)] gap-5">
          
          {/* Left Panel - Case List */}
          <div className="flex-1 flex flex-col bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden transition-all min-w-0">
            <div className="p-4 border-b border-slate-200/60 bg-slate-50/50 backdrop-blur-md flex justify-between items-center relative z-20">
              <div className="relative">
                 <button onClick={() => setIsHeaderDropdownOpen(!isHeaderDropdownOpen)} className="text-[11px] font-bold px-3 py-2 bg-white border border-slate-200/80 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-1.5 shadow-sm transition-all">
                    <Filter size={14}/> 표시 항목 설정
                 </button>
                 {isHeaderDropdownOpen && (
                    <div className="absolute top-full mt-2 left-0 z-50 bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-[0_10px_40px_rgb(0,0,0,0.1)] rounded-xl p-3 w-56 max-h-56 overflow-y-auto">
                       <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider ml-1">목록 표시 항목</p>
                       {runHeaders.map(h => (
                          <label key={h} className="flex items-center gap-2.5 py-1.5 px-1 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                             <input type="checkbox" checked={selectedHeaders.includes(h)} onChange={(e) => {
                                 if (e.target.checked) setSelectedHeaders([...selectedHeaders, h]);
                                 else setSelectedHeaders(selectedHeaders.filter(sh => sh !== h));
                             }} className="w-3.5 h-3.5 text-blue-500 rounded border-slate-300 focus:ring-blue-500/20" />
                             <span className="text-[12px] font-bold text-slate-700 truncate">{h}</span>
                          </label>
                       ))}
                    </div>
                 )}
              </div>
              
              <div className="flex bg-slate-200/50 p-1 rounded-lg">
                {['all', 'untested', 'pass', 'fail', 'block'].map(f => (
                  <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-md transition-all duration-300 ${filter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                    {f === 'all' ? '전체' : f}
                  </button>
                ))}
              </div>

              <button onClick={() => setIsDetailOpen(!isDetailOpen)} className="text-[11px] px-3 py-2 bg-blue-50/80 text-blue-700 border border-blue-200/60 rounded-lg hover:bg-blue-100 flex items-center gap-1.5 font-bold ml-2 transition-all">
                 {isDetailOpen ? '상세 접기' : '상세 펼치기'}
                 {isDetailOpen ? <ChevronRight size={14}/> : <ChevronRight className="rotate-180" size={14}/>} 
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white/40">
              {filteredCases.map((c, idx) => {
                const status = run.results[c.id].status;
                const isSelected = selectedCaseId === c.id;
                
                let icon = <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300"></div>;
                if (status === 'pass') icon = <CheckCircle size={16} className="text-emerald-500"/>;
                if (status === 'fail') icon = <XCircle size={16} className="text-rose-500"/>;
                if (status === 'block') icon = <AlertTriangle size={16} className="text-amber-500"/>;

                return (
                  <div key={c.id} 
                    className={`p-4 border-b border-slate-100/80 transition-all duration-300 flex flex-col gap-3 last:border-0 ${isSelected ? 'bg-blue-50/40 border-l-4 border-l-blue-500' : 'hover:bg-slate-50/60 border-l-4 border-l-transparent'}`}>
                    
                    <div className="flex items-start justify-between gap-4 cursor-pointer" onClick={() => { setSelectedCaseId(c.id); if(!isDetailOpen) setIsDetailOpen(true); }}>
                      <div className="flex items-start gap-3 flex-1 min-w-0 mt-0.5">
                        <div className="mt-0.5 shrink-0">{icon}</div>
                        <p className={`text-[13px] tracking-tight truncate ${isSelected ? 'text-blue-900 font-black' : 'text-slate-800 font-bold'}`}>{c.title}</p>
                      </div>
                      
                      {/* Inline Action Buttons */}
                      <div className="flex gap-1.5 shrink-0 bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200/80 p-1 shadow-sm" onClick={(e) => e.stopPropagation()}>
                         <button onClick={(e) => { e.stopPropagation(); handleInlineResultUpdate(c.id, 'pass'); }} title="PASS" className={`p-1.5 rounded-md transition-all ${status === 'pass' ? 'bg-gradient-to-b from-emerald-400 to-emerald-500 text-white shadow-md border-emerald-400' : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-500'}`}>
                           <CheckCircle size={14}/>
                         </button>
                         <button onClick={(e) => { e.stopPropagation(); handleInlineResultUpdate(c.id, 'fail'); }} title="FAIL" className={`p-1.5 rounded-md transition-all ${status === 'fail' ? 'bg-gradient-to-b from-rose-400 to-rose-500 text-white shadow-md border-rose-400' : 'text-slate-400 hover:bg-rose-50 hover:text-rose-500'}`}>
                           <XCircle size={14}/>
                         </button>
                         <button onClick={(e) => { e.stopPropagation(); handleInlineResultUpdate(c.id, 'block'); }} title="BLOCK" className={`p-1.5 rounded-md transition-all ${status === 'block' ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-white shadow-md border-amber-400' : 'text-slate-400 hover:bg-amber-50 hover:text-amber-500'}`}>
                           <AlertTriangle size={14}/>
                         </button>
                      </div>
                    </div>

                    {/* Selected Headers Render */}
                    {selectedHeaders.length > 0 && (
                        <div className="pl-6 space-y-2.5 cursor-pointer" onClick={() => { setSelectedCaseId(c.id); if(!isDetailOpen) setIsDetailOpen(true); }}>
                          {selectedHeaders.map(h => {
                            const val = c.fields?.[h];
                            if(!val || val === c.title) return null;
                            return (
                                <div key={h} className="bg-white border border-slate-200/60 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
                                  <div className="font-black text-[10px] text-blue-600/80 mb-1.5 uppercase tracking-wider">{h}</div>
                                  <div className="text-[12px] font-medium text-slate-700 whitespace-pre-wrap leading-relaxed">{val}</div>
                                </div>
                            )
                          })}
                        </div>
                    )}
                  </div>
                );
              })}
              {filteredCases.length === 0 && <p className="text-center text-slate-400 text-[13px] font-bold mt-10">해당하는 케이스가 없습니다.</p>}
            </div>
          </div>

          {/* Right Panel - Detail / Summary */}
          {(isDetailOpen || run.status === 'completed') && (
            <div className="w-1/3 min-w-[340px] flex flex-col bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden transition-all duration-500">
              {run.status === 'completed' && (!selectedCase || !isDetailOpen) ? (
                <div className="flex-1 p-8 flex flex-col items-center justify-center bg-slate-50/50">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mb-6 shadow-[0_8px_20px_rgb(16,185,129,0.3)]">
                    <CheckCircle size={32} className="text-white" />
                  </div>
                  <h2 className="text-xl font-black text-slate-800 mb-8 tracking-tight">테스트 런 완료 보고서</h2>
                  <div className="flex gap-4 mb-8 bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] w-full justify-between">
                    <div className="text-center flex-1">
                      <p className="text-emerald-500 font-black text-3xl mb-1">{pCount}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pass</p>
                    </div>
                    <div className="w-px bg-slate-200"></div>
                    <div className="text-center flex-1">
                      <p className="text-rose-500 font-black text-3xl mb-1">{fCount}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fail</p>
                    </div>
                    <div className="w-px bg-slate-200"></div>
                    <div className="text-center flex-1">
                      <p className="text-amber-500 font-black text-3xl mb-1">{bCount}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Block</p>
                    </div>
                  </div>
                </div>
              ) : selectedCase && selectedResult ? (
                <>
                  <div className="p-6 border-b border-slate-200/60 bg-white/60 backdrop-blur-md">
                    <div className="flex justify-between items-start mb-4">
                      <h2 className="text-[15px] font-black text-slate-900 leading-snug tracking-tight">{selectedCase.title}</h2>
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border shrink-0 ${selectedCase.priority === 'Critical' ? 'border-rose-200/80 text-rose-600 bg-rose-50/80' : 'border-slate-200/80 text-slate-500 bg-slate-50/80'}`}>
                        {selectedCase.priority}
                      </span>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2.5 mt-5">
                      <button onClick={() => handleResultUpdate('pass')} className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 border transition-all duration-300 ${selectedResult.status === 'pass' ? 'bg-gradient-to-b from-emerald-400 to-emerald-500 border-emerald-400 text-white shadow-[0_6px_20px_rgb(16,185,129,0.3)]' : 'border-slate-200/80 bg-white/60 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-600'}`}>
                        <CheckCircle size={16} />
                        <span className="text-[11px] font-black tracking-widest uppercase">Pass</span>
                      </button>
                      <button onClick={() => handleResultUpdate('fail')} className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 border transition-all duration-300 ${selectedResult.status === 'fail' ? 'bg-gradient-to-b from-rose-400 to-rose-500 border-rose-400 text-white shadow-[0_6px_20px_rgb(244,63,94,0.3)]' : 'border-slate-200/80 bg-white/60 text-slate-600 hover:border-rose-300 hover:bg-rose-50/50 hover:text-rose-600'}`}>
                        <XCircle size={16} />
                        <span className="text-[11px] font-black tracking-widest uppercase">Fail</span>
                      </button>
                      <button onClick={() => handleResultUpdate('block')} className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 border transition-all duration-300 ${selectedResult.status === 'block' ? 'bg-gradient-to-b from-amber-400 to-amber-500 border-amber-400 text-white shadow-[0_6px_20px_rgb(245,158,11,0.3)]' : 'border-slate-200/80 bg-white/60 text-slate-600 hover:border-amber-300 hover:bg-amber-50/50 hover:text-amber-600'}`}>
                        <AlertTriangle size={16} />
                        <span className="text-[11px] font-black tracking-widest uppercase">Block</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/30">
                    {(() => {
                      const caseSuite = data.suites.find(s => s.id === selectedCase.suiteId);
                      if (caseSuite?.headers && selectedCase.fields) {
                        return caseSuite.headers.map((header, idx) => {
                          const val = selectedCase.fields[header];
                          if (!val || val === selectedCase.title) return null; 
                          return (
                            <section key={idx} className="bg-white/80 backdrop-blur-md p-4 rounded-xl border border-white shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                              <h4 className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-wider">{header}</h4>
                              <div className="text-slate-800 text-[13px] font-medium whitespace-pre-wrap leading-relaxed">
                                {val}
                              </div>
                            </section>
                          );
                        });
                      }
                      return null;
                    })()}

                    <section className="bg-white/80 backdrop-blur-md p-4 rounded-xl border border-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] mt-4">
                      <h4 className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-wider">실제 결과 및 메모 (Notes)</h4>
                      <textarea 
                        value={selectedResult.note || ''} 
                        onChange={handleNoteUpdate}
                        placeholder="버그 정보, 환경, 이슈 링크 등을 기록하세요."
                        className="w-full bg-slate-50/80 border border-slate-200/60 rounded-xl p-3 text-slate-800 text-[13px] font-medium focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none h-28 shadow-inner"
                      />
                    </section>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400 flex-col bg-slate-50/50">
                  <ShieldAlert size={40} className="mb-4 text-slate-300 opacity-50" />
                  <p className="text-[13px] font-bold">좌측에서 테스트 케이스를 선택하세요.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </Layout>
    );
  }

  return <div className="bg-[#f8fafc] h-screen flex items-center justify-center text-slate-500 text-sm font-bold tracking-widest">로딩 중...</div>;
}

const StatCard = ({ title, value, icon, color, bg, border }) => (
  <div className={`bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-5 flex items-center justify-between group hover:-translate-y-1 transition-transform duration-300`}>
    <div>
      <p className="text-slate-500 text-[11px] font-bold mb-1.5 uppercase tracking-wider">{title}</p>
      <h3 className="text-3xl font-black text-slate-800 tracking-tight">{value}</h3>
    </div>
    <div className={`p-3 rounded-xl ${bg} ${color} border ${border} shadow-inner group-hover:scale-110 transition-transform duration-300`}>
      {icon}
    </div>
  </div>
);
