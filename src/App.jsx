import React, { useEffect, useMemo, useState } from 'react';

const DEFAULT_LISTINGS = [
  {
    id: 'seed-1',
    sellerId: 'demo-company',
    sellerName: '베스트지게차',
    title: '도요타 1.5톤 전동지게차',
    brand: '도요타',
    ton: '1.5톤',
    year: '2019',
    mast: '3단 4.5M',
    hours: '6200',
    battery: '리튬 신품',
    price: '1250',
    location: '경기',
    description: '사이드쉬프트 장착, 상태 우수, 바로 출고 가능',
    status: 'active',
    featured: true,
    createdAt: '2026-04-21',
  },
  {
    id: 'seed-2',
    sellerId: 'demo-company-2',
    sellerName: '에이스렌탈',
    title: '니찌유 2톤 리치지게차',
    brand: '니찌유',
    ton: '2톤',
    year: '2021',
    mast: '2단 4M',
    hours: '1500',
    battery: 'A급 배터리',
    price: '650',
    location: '충남',
    description: '연식 좋고 배터리 상태 양호, 물류창고 추천',
    status: 'active',
    featured: true,
    createdAt: '2026-04-20',
  },
  {
    id: 'seed-3',
    sellerId: 'demo-company-3',
    sellerName: '스마트포크',
    title: '도요타 2.5톤 카운터 지게차',
    brand: '도요타',
    ton: '2.5톤',
    year: '2018',
    mast: '3단 4.7M',
    hours: '8100',
    battery: '슈퍼A급',
    price: '980',
    location: '인천',
    description: '자동발 옵션, 현장 테스트 가능',
    status: 'active',
    featured: true,
    createdAt: '2026-04-19',
  },
];

const DEFAULT_USERS = [
  {
    id: 'demo-company',
    companyName: '베스트지게차',
    name: '김대표',
    phone: '010-1111-2222',
    email: 'best@example.com',
    password: '1234',
    region: '경기',
    businessType: '매매',
    createdAt: '2026-04-21',
  },
];

const initialForm = {
  title: '',
  brand: '',
  ton: '',
  year: '',
  mast: '',
  hours: '',
  battery: '',
  price: '',
  location: '',
  description: '',
};

function SectionTitle({ eyebrow, title, subtitle }) {
  return (
    <div className="section-title-wrap">
      <div className="section-eyebrow">{eyebrow}</div>
      <h2 className="section-title">{title}</h2>
      {subtitle ? <p className="section-subtitle">{subtitle}</p> : null}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function ListingCard({ item, onSelect }) {
  return (
    <div className="listing-card">
      <div className="listing-image">대표 이미지</div>
      <div className="listing-body">
        <div className="listing-topline">
          <span className="badge">{item.featured ? '추천매물' : '일반매물'}</span>
          <span className="seller-name">{item.sellerName}</span>
        </div>
        <h3 className="listing-title">{item.title}</h3>
        <div className="listing-spec-grid">
          <div className="spec-box"><span>연식</span><strong>{item.year}년식</strong></div>
          <div className="spec-box"><span>마스트</span><strong>{item.mast}</strong></div>
          <div className="spec-box"><span>가동시간</span><strong>{item.hours}시간</strong></div>
          <div className="spec-box"><span>배터리</span><strong>{item.battery}</strong></div>
        </div>
        <div className="listing-footer">
          <div>
            <div className="price-label">판매가</div>
            <div className="price-value">{item.price}만원</div>
          </div>
          <button className="btn btn-light" onClick={() => onSelect(item)}>상세보기</button>
        </div>
      </div>
    </div>
  );
}

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>닫기</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [selectedListing, setSelectedListing] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [tonFilter, setTonFilter] = useState('');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    companyName: '',
    name: '',
    phone: '',
    email: '',
    password: '',
    region: '',
    businessType: '',
  });
  const [listingForm, setListingForm] = useState(initialForm);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const storedUsers = localStorage.getItem('forklift-market-users');
    const storedListings = localStorage.getItem('forklift-market-listings');
    const storedCurrentUser = localStorage.getItem('forklift-market-current-user');

    const parsedUsers = storedUsers ? JSON.parse(storedUsers) : DEFAULT_USERS;
    const parsedListings = storedListings ? JSON.parse(storedListings) : DEFAULT_LISTINGS;

    setUsers(parsedUsers);
    setListings(parsedListings);

    if (!storedUsers) localStorage.setItem('forklift-market-users', JSON.stringify(parsedUsers));
    if (!storedListings) localStorage.setItem('forklift-market-listings', JSON.stringify(parsedListings));
    if (storedCurrentUser) setCurrentUser(JSON.parse(storedCurrentUser));

    document.title = 'FORKLIFT MARKET | 중고지게차 매물 플랫폼';
  }, []);

  useEffect(() => {
    if (users.length) localStorage.setItem('forklift-market-users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (listings.length) localStorage.setItem('forklift-market-listings', JSON.stringify(listings));
  }, [listings]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('forklift-market-current-user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('forklift-market-current-user');
    }
  }, [currentUser]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  const activeListings = useMemo(() => listings.filter((item) => item.status === 'active'), [listings]);

  const filteredListings = useMemo(() => {
    return activeListings.filter((item) => {
      const matchKeyword = keyword
        ? [item.title, item.brand, item.ton, item.location, item.sellerName, item.description]
            .join(' ')
            .toLowerCase()
            .includes(keyword.toLowerCase())
        : true;
      const matchBrand = brandFilter ? item.brand === brandFilter : true;
      const matchTon = tonFilter ? item.ton === tonFilter : true;
      return matchKeyword && matchBrand && matchTon;
    });
  }, [activeListings, keyword, brandFilter, tonFilter]);

  const featuredListings = useMemo(() => activeListings.filter((item) => item.featured).slice(0, 3), [activeListings]);
  const myListings = useMemo(() => currentUser ? listings.filter((item) => item.sellerId === currentUser.id) : [], [listings, currentUser]);

  const dashboardStats = useMemo(() => ({
    totalListings: myListings.length,
    activeCount: myListings.filter((item) => item.status === 'active').length,
    pendingCount: myListings.filter((item) => item.status === 'pending').length,
    soldCount: myListings.filter((item) => item.status === 'sold').length,
  }), [myListings]);

  const handleSignup = (e) => {
    e.preventDefault();
    if (!signupForm.companyName || !signupForm.name || !signupForm.phone || !signupForm.email || !signupForm.password) {
      setNotice('필수 항목을 입력해주세요.');
      return;
    }
    if (users.some((user) => user.email === signupForm.email)) {
      setNotice('이미 등록된 이메일입니다.');
      return;
    }

    const newUser = {
      id: `user-${Date.now()}`,
      ...signupForm,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setUsers((prev) => [...prev, newUser]);
    setCurrentUser(newUser);
    setSignupForm({ companyName: '', name: '', phone: '', email: '', password: '', region: '', businessType: '' });
    setNotice('회원가입이 완료되었습니다.');
    setActiveTab('dashboard');
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const foundUser = users.find((user) => user.email === loginForm.email && user.password === loginForm.password);
    if (!foundUser) {
      setNotice('이메일 또는 비밀번호를 확인해주세요.');
      return;
    }
    setCurrentUser(foundUser);
    setLoginForm({ email: '', password: '' });
    setNotice('로그인되었습니다.');
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setNotice('로그아웃되었습니다.');
    setActiveTab('home');
  };

  const handleCreateListing = (e) => {
    e.preventDefault();
    if (!currentUser) {
      setNotice('로그인 후 매물을 등록할 수 있습니다.');
      setActiveTab('seller');
      return;
    }
    if (!listingForm.title || !listingForm.brand || !listingForm.ton || !listingForm.year || !listingForm.price) {
      setNotice('필수 항목을 입력해주세요.');
      return;
    }

    const newListing = {
      id: `listing-${Date.now()}`,
      sellerId: currentUser.id,
      sellerName: currentUser.companyName,
      ...listingForm,
      status: 'pending',
      featured: false,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setListings((prev) => [newListing, ...prev]);
    setListingForm(initialForm);
    setNotice('매물 등록이 완료되었습니다. 관리자 확인 후 노출됩니다.');
    setActiveTab('dashboard');
  };

  const updateMyListingStatus = (id, nextStatus) => {
    setListings((prev) => prev.map((item) => (item.id === id ? { ...item, status: nextStatus } : item)));
    setNotice('매물 상태가 변경되었습니다.');
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Arial, sans-serif; background: #0a0a0a; color: #fff; }
        button, input, select, textarea { font: inherit; }
        .app-shell { min-height: 100vh; background: linear-gradient(180deg, #080808 0%, #101010 100%); }
        .container { width: min(1200px, calc(100% - 32px)); margin: 0 auto; }
        .header { position: sticky; top: 0; z-index: 20; backdrop-filter: blur(12px); background: rgba(0,0,0,0.72); border-bottom: 1px solid rgba(255,255,255,0.08); }
        .header-inner { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 18px 0; flex-wrap: wrap; }
        .logo { font-size: 30px; font-weight: 900; color: #ef4444; letter-spacing: -0.03em; }
        .logo-sub { font-size: 12px; color: #9ca3af; margin-top: 4px; }
        .nav { display: flex; gap: 10px; flex-wrap: wrap; }
        .nav button { padding: 11px 16px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: #e5e7eb; cursor: pointer; }
        .nav button.active { background: #dc2626; border-color: #dc2626; color: white; }
        .notice-wrap { position: sticky; top: 84px; z-index: 10; }
        .notice { margin-top: 14px; padding: 14px 16px; border-radius: 16px; background: rgba(220,38,38,0.12); border: 1px solid rgba(220,38,38,0.25); color: #fee2e2; }
        .hero { padding: 58px 0 34px; background: radial-gradient(circle at top right, rgba(220,38,38,0.24), transparent 18%), radial-gradient(circle at left, rgba(255,255,255,0.06), transparent 18%); }
        .hero-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 28px; align-items: stretch; }
        .pill { display: inline-block; padding: 9px 14px; border-radius: 999px; background: rgba(220,38,38,0.1); border: 1px solid rgba(220,38,38,0.28); color: #fca5a5; font-size: 13px; font-weight: 700; }
        .hero h1 { margin: 18px 0 0; font-size: clamp(38px, 6vw, 68px); line-height: 1.04; letter-spacing: -0.04em; }
        .hero h1 span { display: block; color: #ef4444; }
        .hero p { margin: 20px 0 0; max-width: 720px; color: #d1d5db; line-height: 1.8; font-size: 16px; }
        .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 28px; }
        .btn { border: none; cursor: pointer; border-radius: 16px; padding: 14px 20px; font-weight: 800; }
        .btn-primary { background: #dc2626; color: #fff; box-shadow: 0 10px 22px rgba(127,29,29,0.35); }
        .btn-secondary { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.14); }
        .btn-light { background: #f5f5f5; color: #111; }
        .btn-outline { background: transparent; color: #e5e7eb; border: 1px solid rgba(255,255,255,0.14); }
        .stats-grid { margin-top: 28px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        .stat-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 18px; }
        .stat-value { font-size: 30px; font-weight: 900; }
        .stat-label { font-size: 13px; color: #9ca3af; margin-top: 6px; }
        .search-panel { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 28px; padding: 18px; box-shadow: 0 16px 36px rgba(0,0,0,0.34); }
        .search-panel-inner { background: #111; border-radius: 24px; padding: 22px; }
        .panel-title { font-size: 22px; font-weight: 900; margin: 0 0 18px; }
        .grid-gap { display: grid; gap: 12px; }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .field, .select, .textarea { width: 100%; padding: 14px 15px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); background: #060606; color: #fff; outline: none; }
        .textarea { min-height: 120px; resize: vertical; }
        .category-row { margin-top: 18px; display: flex; flex-wrap: wrap; gap: 10px; }
        .chip { padding: 10px 12px; border-radius: 999px; font-size: 12px; color: #d1d5db; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); }
        .section { padding: 36px 0; }
        .section-title-wrap { margin-bottom: 22px; }
        .section-eyebrow { font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #f87171; font-weight: 800; }
        .section-title { margin: 10px 0 0; font-size: 40px; line-height: 1.1; letter-spacing: -0.03em; }
        .section-subtitle { margin: 12px 0 0; color: #9ca3af; line-height: 1.7; max-width: 760px; }
        .listing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .listing-card { overflow: hidden; border-radius: 28px; background: #111; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 18px 40px rgba(0,0,0,0.25); }
        .listing-image { height: 210px; display: flex; align-items: center; justify-content: center; color: #6b7280; background: linear-gradient(135deg, #222, #080808); font-weight: 700; }
        .listing-body { padding: 20px; }
        .listing-topline { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .badge { display: inline-flex; padding: 7px 11px; border-radius: 999px; background: rgba(239,68,68,0.14); color: #fca5a5; font-size: 12px; font-weight: 900; }
        .seller-name { color: #9ca3af; font-size: 12px; }
        .listing-title { font-size: 24px; line-height: 1.25; margin: 14px 0 0; }
        .listing-spec-grid { margin-top: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .spec-box { padding: 14px; border-radius: 18px; background: rgba(255,255,255,0.05); }
        .spec-box span { display: block; color: #9ca3af; font-size: 12px; margin-bottom: 6px; }
        .spec-box strong { font-size: 14px; }
        .listing-footer { margin-top: 18px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .price-label { color: #9ca3af; font-size: 12px; }
        .price-value { color: #ef4444; font-size: 28px; font-weight: 900; margin-top: 4px; }
        .flow-grid, .feature-grid, .three-col { display: grid; gap: 18px; }
        .flow-grid { grid-template-columns: repeat(4, 1fr); }
        .three-col { grid-template-columns: repeat(3, 1fr); }
        .feature-grid { grid-template-columns: 1.05fr 0.95fr; }
        .glass-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 28px; padding: 22px; }
        .dark-card { background: #111; border: 1px solid rgba(255,255,255,0.08); border-radius: 28px; padding: 22px; }
        .flow-number { width: 42px; height: 42px; border-radius: 999px; background: #dc2626; display: inline-flex; align-items: center; justify-content: center; font-weight: 900; margin-bottom: 14px; }
        .flow-title { font-size: 22px; font-weight: 900; margin: 0; }
        .flow-desc { color: #9ca3af; line-height: 1.7; margin: 10px 0 0; }
        .cta-box { border-radius: 32px; padding: 30px; background: linear-gradient(90deg, #dc2626, #991b1b); border: 1px solid rgba(255,255,255,0.1); }
        .cta-box h3 { margin: 10px 0 0; font-size: 48px; line-height: 1.1; letter-spacing: -0.03em; }
        .cta-box p { margin: 16px 0 0; color: rgba(255,255,255,0.9); line-height: 1.8; }
        .cta-actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 22px; }
        .dashboard-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        .list-stack { display: grid; gap: 12px; }
        .list-item { display: flex; justify-content: space-between; gap: 18px; align-items: center; padding: 16px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); }
        .list-meta { color: #9ca3af; font-size: 14px; margin-top: 6px; }
        .status-badge { display: inline-flex; padding: 9px 12px; border-radius: 999px; font-size: 12px; font-weight: 800; }
        .status-active { background: rgba(34,197,94,0.16); color: #86efac; }
        .status-pending { background: rgba(234,179,8,0.16); color: #fde68a; }
        .status-sold { background: rgba(107,114,128,0.22); color: #d1d5db; }
        .small-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .small-actions button { padding: 10px 12px; border-radius: 12px; background: transparent; color: #e5e7eb; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; }
        .upload-box { border-radius: 18px; padding: 28px 16px; border: 1px dashed rgba(255,255,255,0.18); text-align: center; color: #9ca3af; background: rgba(255,255,255,0.03); }
        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.74); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 50; }
        .modal-card { width: min(860px, 100%); max-height: 90vh; overflow: auto; background: #0b0b0b; border: 1px solid rgba(255,255,255,0.1); border-radius: 28px; padding: 22px; }
        .modal-actions { display: flex; justify-content: flex-end; margin-bottom: 12px; }
        .footer { border-top: 1px solid rgba(255,255,255,0.08); padding: 28px 0; text-align: center; color: #9ca3af; font-size: 13px; }
        @media (max-width: 1024px) {
          .hero-grid, .feature-grid, .listing-grid, .flow-grid, .three-col, .dashboard-grid { grid-template-columns: 1fr 1fr; }
          .cta-box h3 { font-size: 38px; }
        }
        @media (max-width: 720px) {
          .hero-grid, .feature-grid, .listing-grid, .flow-grid, .three-col, .dashboard-grid, .two-col { grid-template-columns: 1fr; }
          .header-inner { align-items: flex-start; }
          .logo { font-size: 24px; }
          .section-title { font-size: 30px; }
          .cta-box h3 { font-size: 30px; }
          .list-item, .listing-footer { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
      <div className="app-shell">
        <header className="header">
          <div className="container header-inner">
            <div>
              <div className="logo">FORKLIFT MARKET</div>
              <div className="logo-sub">중고지게차 매물 플랫폼</div>
            </div>
            <nav className="nav">
              {[
                ['home', '홈'],
                ['market', '매물보기'],
                ['seller', '업체가입'],
                ['register', '매물등록'],
                ['landing', '광고안내'],
                ...(currentUser ? [['dashboard', '대시보드']] : []),
              ].map(([key, label]) => (
                <button key={key} className={activeTab === key ? 'active' : ''} onClick={() => setActiveTab(key)}>{label}</button>
              ))}
              {currentUser ? <button onClick={handleLogout}>로그아웃</button> : null}
            </nav>
          </div>
        </header>

        {notice ? <div className="container notice-wrap"><div className="notice">{notice}</div></div> : null}

        {activeTab === 'home' && (
          <>
            <section className="hero">
              <div className="container hero-grid">
                <div>
                  <div className="pill">업체 회원가입 · 매물 등록 · 문의 연결</div>
                  <h1>지게차 매물 찾기부터<span>판매 · 렌탈 · 상담까지 한 번에</span></h1>
                  <p>여러 판매업체가 직접 가입하고 매물을 등록할 수 있는 중고지게차 매물 플랫폼입니다. 실매물 중심 등록, 빠른 문의 연결, 업체 홍보까지 한곳에서 운영할 수 있습니다.</p>
                  <div className="hero-actions">
                    <button className="btn btn-primary" onClick={() => setActiveTab('market')}>추천 매물 보기</button>
                    <button className="btn btn-secondary" onClick={() => setActiveTab('seller')}>업체 등록하기</button>
                  </div>
                  <div className="stats-grid">
                    <StatCard label="등록 매물" value={`${activeListings.length}+`} />
                    <StatCard label="참여 업체" value={`${users.length}+`} />
                    <StatCard label="렌탈 문의" value="실시간" />
                    <StatCard label="A/S 연결" value="빠른 안내" />
                  </div>
                </div>
                <div className="search-panel">
                  <div className="search-panel-inner">
                    <div className="panel-title">매물 검색</div>
                    <div className="grid-gap">
                      <input className="field" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="브랜드 / 톤수 / 연식 검색" />
                      <div className="two-col">
                        <select className="select" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
                          <option value="">브랜드 전체</option>
                          <option value="현대">현대</option>
                          <option value="두산">두산</option>
                          <option value="클라크">클라크</option>
                          <option value="도요타">도요타</option>
                          <option value="니찌유">니찌유</option>
                          <option value="스미토모">스미토모</option>
                          <option value="기타브랜드">기타브랜드</option>
                        </select>
                        <select className="select" value={tonFilter} onChange={(e) => setTonFilter(e.target.value)}>
                          <option value="">톤수 전체</option>
                          <option value="1.5톤">1.5톤</option>
                          <option value="2톤">2톤</option>
                          <option value="2.5톤">2.5톤</option>
                          <option value="3톤이상">3톤이상</option>
                          <option value="4.5톤이상">4.5톤이상</option>
                        </select>
                      </div>
                      <button className="btn btn-primary" onClick={() => setActiveTab('market')}>매물 검색하기</button>
                    </div>
                    <div className="category-row">
                      {['현대','두산','클라크','도요타','니찌유','스미토모','기타브랜드'].map((category) => (
                        <span key={category} className="chip">{category}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="section">
              <div className="container">
                <SectionTitle eyebrow="Featured Listings" title="추천 매물" subtitle="실시간 등록된 매물 중 눈에 잘 띄는 대표 장비를 먼저 보여줍니다." />
                <div className="listing-grid">
                  {featuredListings.map((item) => <ListingCard key={item.id} item={item} onSelect={setSelectedListing} />)}
                </div>
              </div>
            </section>

            <section className="section">
              <div className="container">
                <SectionTitle eyebrow="Platform Flow" title="업체 등록 절차" subtitle="매매·렌탈·정비 업체가 직접 가입하고 매물을 등록할 수 있습니다." />
                <div className="flow-grid">
                  {[
                    ['1', '업체 회원가입', '지게차 매매·렌탈·정비 업체가 가입 후 기본 정보를 등록합니다.'],
                    ['2', '매물 등록', '사진, 톤수, 마스트, 연식, 배터리, 가격을 직접 입력해 매물을 올립니다.'],
                    ['3', '관리자 확인', '허위매물 방지와 품질 유지를 위해 관리자 확인 후 노출됩니다.'],
                    ['4', '문의 연결', '구매자가 전화, 문자, 카톡으로 판매업체에 바로 문의합니다.'],
                  ].map(([num, title, desc]) => (
                    <div key={num} className="glass-card">
                      <div className="flow-number">{num}</div>
                      <h3 className="flow-title">{title}</h3>
                      <p className="flow-desc">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="section">
              <div className="container">
                <div className="cta-box">
                  <div className="section-eyebrow" style={{ color: 'rgba(255,255,255,0.8)' }}>Seller Landing</div>
                  <h3>업체 모집 · 광고 · 상단노출 안내</h3>
                  <p>매물 등록만 하는 것이 아니라, 업체 소개와 대표 매물을 노출해 홍보 채널로도 활용할 수 있습니다.</p>
                  <div className="cta-actions">
                    <button className="btn" style={{ background: '#111', color: '#fff' }} onClick={() => setActiveTab('landing')}>광고안내 보기</button>
                    <button className="btn btn-secondary" onClick={() => setActiveTab('seller')}>업체 등록하기</button>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === 'market' && (
          <section className="section">
            <div className="container">
              <SectionTitle eyebrow="Marketplace" title="전체 매물" subtitle="브랜드, 톤수, 키워드로 원하는 장비를 빠르게 찾을 수 있습니다." />
              <div className="glass-card" style={{ marginBottom: 20 }}>
                <div className="grid-gap" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  <input className="field" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="브랜드 / 연식 / 지역 검색" />
                  <select className="select" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
                    <option value="">브랜드 전체</option>
                    <option value="현대">현대</option>
                    <option value="두산">두산</option>
                    <option value="클라크">클라크</option>
                    <option value="도요타">도요타</option>
                    <option value="니찌유">니찌유</option>
                    <option value="스미토모">스미토모</option>
                    <option value="기타브랜드">기타브랜드</option>
                  </select>
                  <select className="select" value={tonFilter} onChange={(e) => setTonFilter(e.target.value)}>
                    <option value="">톤수 전체</option>
                    <option value="1.5톤">1.5톤</option>
                    <option value="2톤">2톤</option>
                    <option value="2.5톤">2.5톤</option>
                    <option value="3톤이상">3톤이상</option>
                    <option value="4.5톤이상">4.5톤이상</option>
                  </select>
                  <button className="btn btn-secondary" onClick={() => { setKeyword(''); setBrandFilter(''); setTonFilter(''); }}>필터 초기화</button>
                </div>
              </div>
              <div className="listing-grid">
                {filteredListings.length ? filteredListings.map((item) => <ListingCard key={item.id} item={item} onSelect={setSelectedListing} />) : <div className="glass-card">검색 조건에 맞는 매물이 없습니다.</div>}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'seller' && (
          <section className="section">
            <div className="container">
              <SectionTitle eyebrow="Seller Center" title="업체 회원가입 · 로그인" subtitle="판매업체, 렌탈업체, 정비업체가 가입 후 직접 매물을 등록할 수 있습니다." />
              <div className="feature-grid">
                <div className="dark-card">
                  <h3 className="flow-title">회원가입</h3>
                  <form className="grid-gap" style={{ marginTop: 18 }} onSubmit={handleSignup}>
                    <input className="field" value={signupForm.companyName} onChange={(e) => setSignupForm({ ...signupForm, companyName: e.target.value })} placeholder="업체명" />
                    <input className="field" value={signupForm.name} onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })} placeholder="담당자명" />
                    <input className="field" value={signupForm.phone} onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })} placeholder="연락처" />
                    <input className="field" value={signupForm.email} onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })} placeholder="이메일" type="email" />
                    <input className="field" value={signupForm.password} onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })} placeholder="비밀번호" type="password" />
                    <div className="two-col">
                      <input className="field" value={signupForm.region} onChange={(e) => setSignupForm({ ...signupForm, region: e.target.value })} placeholder="지역" />
                      <input className="field" value={signupForm.businessType} onChange={(e) => setSignupForm({ ...signupForm, businessType: e.target.value })} placeholder="업종 (매매/렌탈/정비)" />
                    </div>
                    <button className="btn btn-primary">회원가입</button>
                  </form>
                </div>
                <div className="glass-card">
                  <h3 className="flow-title">로그인</h3>
                  <form className="grid-gap" style={{ marginTop: 18 }} onSubmit={handleLogin}>
                    <input className="field" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} placeholder="이메일" type="email" />
                    <input className="field" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} placeholder="비밀번호" type="password" />
                    <button className="btn btn-light">로그인</button>
                  </form>
                  <div className="dark-card" style={{ marginTop: 18, background: 'rgba(0,0,0,0.35)' }}>
                    <div style={{ fontWeight: 900 }}>테스트 계정</div>
                    <div style={{ color: '#d1d5db', marginTop: 8 }}>이메일: best@example.com</div>
                    <div style={{ color: '#d1d5db' }}>비밀번호: 1234</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'register' && (
          <section className="section">
            <div className="container">
              <SectionTitle eyebrow="Listing Form" title="매물 등록" subtitle="로그인한 판매업체만 등록할 수 있으며, 등록 후 관리자 확인 뒤 노출됩니다." />
              <div className="feature-grid">
                <form className="dark-card grid-gap" onSubmit={handleCreateListing}>
                  <input className="field" value={listingForm.title} onChange={(e) => setListingForm({ ...listingForm, title: e.target.value })} placeholder="모델명 입력" />
                  <div className="two-col">
                    <input className="field" value={listingForm.brand} onChange={(e) => setListingForm({ ...listingForm, brand: e.target.value })} placeholder="브랜드" />
                    <input className="field" value={listingForm.ton} onChange={(e) => setListingForm({ ...listingForm, ton: e.target.value })} placeholder="톤수" />
                  </div>
                  <div className="two-col">
                    <input className="field" value={listingForm.year} onChange={(e) => setListingForm({ ...listingForm, year: e.target.value })} placeholder="연식" />
                    <input className="field" value={listingForm.mast} onChange={(e) => setListingForm({ ...listingForm, mast: e.target.value })} placeholder="마스트 높이" />
                  </div>
                  <div className="two-col">
                    <input className="field" value={listingForm.hours} onChange={(e) => setListingForm({ ...listingForm, hours: e.target.value })} placeholder="가동시간" />
                    <input className="field" value={listingForm.location} onChange={(e) => setListingForm({ ...listingForm, location: e.target.value })} placeholder="지역" />
                  </div>
                  <input className="field" value={listingForm.battery} onChange={(e) => setListingForm({ ...listingForm, battery: e.target.value })} placeholder="배터리 상태 / 주요 옵션" />
                  <input className="field" value={listingForm.price} onChange={(e) => setListingForm({ ...listingForm, price: e.target.value })} placeholder="판매가 입력 (만원 단위)" />
                  <textarea className="textarea" value={listingForm.description} onChange={(e) => setListingForm({ ...listingForm, description: e.target.value })} placeholder="매물 설명" />
                  <div className="upload-box">이미지 업로드는 실제 배포 시 스토리지 연동이 필요합니다.</div>
                  <button className="btn btn-primary">매물 등록 신청</button>
                </form>
                <div className="glass-card">
                  <h3 className="flow-title">등록 안내</h3>
                  <div style={{ marginTop: 18, color: '#d1d5db', lineHeight: 1.9 }}>
                    <p>로그인한 업체 회원만 매물을 등록할 수 있습니다.</p>
                    <p>등록된 매물은 관리자 확인 전까지 승인대기 상태로 저장됩니다.</p>
                    <p>실제 운영 시에는 이미지 업로드, 사업자 인증, 허위매물 신고 기능을 추가하면 더 안정적으로 운영할 수 있습니다.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'dashboard' && currentUser && (
          <section className="section">
            <div className="container">
              <SectionTitle eyebrow="Seller Dashboard" title={`${currentUser.companyName} 판매업체 관리`} subtitle="내 매물 등록 현황과 상태를 한눈에 확인할 수 있습니다." />
              <div className="dashboard-grid">
                <StatCard label="전체 매물" value={dashboardStats.totalListings} />
                <StatCard label="노출중" value={dashboardStats.activeCount} />
                <StatCard label="승인대기" value={dashboardStats.pendingCount} />
                <StatCard label="판매완료" value={dashboardStats.soldCount} />
              </div>
              <div className="dark-card" style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
                  <h3 className="flow-title" style={{ margin: 0 }}>내 매물 관리</h3>
                  <button className="btn btn-primary" onClick={() => setActiveTab('register')}>새 매물 등록</button>
                </div>
                <div className="list-stack">
                  {myListings.length ? myListings.map((item) => (
                    <div key={item.id} className="list-item">
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 900 }}>{item.title}</div>
                        <div className="list-meta">{item.year}년식 · {item.ton} · {item.mast} · {item.price}만원</div>
                        <div className="list-meta">등록일 {item.createdAt}</div>
                      </div>
                      <div>
                        <div className={`status-badge ${item.status === 'active' ? 'status-active' : item.status === 'pending' ? 'status-pending' : 'status-sold'}`}>
                          {item.status === 'active' ? '노출중' : item.status === 'pending' ? '승인대기' : '판매완료'}
                        </div>
                        <div className="small-actions" style={{ marginTop: 10 }}>
                          <button onClick={() => updateMyListingStatus(item.id, 'sold')}>판매완료</button>
                          <button onClick={() => updateMyListingStatus(item.id, 'active')}>노출중</button>
                        </div>
                      </div>
                    </div>
                  )) : <div className="glass-card">등록된 매물이 없습니다.</div>}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'landing' && (
          <section className="section">
            <div className="container">
              <SectionTitle eyebrow="Business Landing" title="업체 모집 랜딩페이지" subtitle="판매업체 유입을 위한 소개, 광고상품 안내, 등록 유도 섹션입니다." />
              <div className="three-col">
                {[
                  ['무료 등록', '업체 회원가입 후 기본 매물을 등록하고 문의를 받을 수 있습니다.'],
                  ['상단 노출', '대표 매물과 업체를 메인에 노출해 더 많은 문의를 받을 수 있습니다.'],
                  ['브랜드 홍보', '업체 소개, 지역, 주력 장비를 함께 보여줘 신뢰도를 높일 수 있습니다.'],
                ].map(([title, desc]) => (
                  <div key={title} className="glass-card">
                    <h3 className="flow-title">{title}</h3>
                    <p className="flow-desc">{desc}</p>
                  </div>
                ))}
              </div>
              <div className="feature-grid" style={{ marginTop: 20 }}>
                <div className="dark-card">
                  <h3 className="flow-title">왜 등록해야 하나요?</h3>
                  <ul style={{ marginTop: 18, color: '#d1d5db', lineHeight: 2, paddingLeft: 18 }}>
                    <li>중고지게차 구매 고객에게 직접 노출</li>
                    <li>렌탈·매매·정비 문의까지 함께 연결</li>
                    <li>지역 기반 노출로 가까운 고객 확보</li>
                    <li>상단노출 상품으로 추가 홍보 가능</li>
                  </ul>
                </div>
                <div className="cta-box">
                  <h3 style={{ marginTop: 0 }}>지금 바로 업체 등록</h3>
                  <p>회원가입 후 바로 매물을 등록하고, 승인 후 노출을 시작할 수 있습니다.</p>
                  <div className="cta-actions">
                    <button className="btn" style={{ background: '#111', color: '#fff' }} onClick={() => setActiveTab('seller')}>업체 회원가입</button>
                    <button className="btn btn-secondary" onClick={() => setActiveTab('register')}>매물 등록하기</button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <Modal open={!!selectedListing} onClose={() => setSelectedListing(null)}>
          {selectedListing && (
            <div>
              <div className="badge">{selectedListing.sellerName}</div>
              <h3 className="section-title" style={{ marginTop: 14 }}>{selectedListing.title}</h3>
              <div className="listing-spec-grid" style={{ marginTop: 18 }}>
                <div className="spec-box"><span>브랜드</span><strong>{selectedListing.brand}</strong></div>
                <div className="spec-box"><span>톤수</span><strong>{selectedListing.ton}</strong></div>
                <div className="spec-box"><span>연식</span><strong>{selectedListing.year}년식</strong></div>
                <div className="spec-box"><span>마스트</span><strong>{selectedListing.mast}</strong></div>
                <div className="spec-box"><span>가동시간</span><strong>{selectedListing.hours}시간</strong></div>
                <div className="spec-box"><span>배터리</span><strong>{selectedListing.battery}</strong></div>
                <div className="spec-box"><span>지역</span><strong>{selectedListing.location}</strong></div>
                <div className="spec-box"><span>판매가</span><strong style={{ color: '#f87171' }}>{selectedListing.price}만원</strong></div>
              </div>
              <div className="glass-card" style={{ marginTop: 18, color: '#d1d5db', lineHeight: 1.8 }}>
                {selectedListing.description || '등록된 설명이 없습니다.'}
              </div>
              <div className="cta-actions">
                <button className="btn btn-primary">전화 문의</button>
                <button className="btn btn-secondary">카톡 상담</button>
              </div>
            </div>
          )}
        </Modal>

        <footer className="footer">© 2026 FORKLIFT MARKET. All rights reserved.</footer>
      </div>
    </>
  );
}
