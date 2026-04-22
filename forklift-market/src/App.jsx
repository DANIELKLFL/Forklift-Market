export default function App() {import React, { useEffect, useMemo, useState } from 'react';

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

function StatCard({ label, value }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <div className="text-2xl font-black">{value}</div>
      <div className="mt-1 text-sm text-neutral-400">{label}</div>
    </div>
  );
}

function SectionTitle({ eyebrow, title, subtitle }) {
  return (
    <div className="mb-8">
      <div className="text-sm font-semibold uppercase tracking-[0.22em] text-red-400">{eyebrow}</div>
      <h2 className="mt-2 text-3xl font-black md:text-4xl">{title}</h2>
      {subtitle ? <p className="mt-3 max-w-3xl text-neutral-400">{subtitle}</p> : null}
    </div>
  );
}

function ListingCard({ item, onSelect }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-neutral-900 shadow-xl shadow-black/20">
      <div className="flex h-48 items-center justify-center bg-gradient-to-br from-neutral-800 to-black text-neutral-500">
        대표 이미지
      </div>
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold text-red-300">{item.featured ? '추천매물' : item.status === 'active' ? '일반매물' : '승인대기'}</span>
          <span className="text-xs text-neutral-500">{item.sellerName}</span>
        </div>
        <h3 className="text-xl font-bold leading-snug">{item.title}</h3>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-neutral-300">
          <div className="rounded-2xl bg-white/5 p-3">연식<br /><span className="font-semibold text-white">{item.year}년식</span></div>
          <div className="rounded-2xl bg-white/5 p-3">마스트<br /><span className="font-semibold text-white">{item.mast}</span></div>
          <div className="rounded-2xl bg-white/5 p-3">가동시간<br /><span className="font-semibold text-white">{item.hours}시간</span></div>
          <div className="rounded-2xl bg-white/5 p-3">배터리<br /><span className="font-semibold text-white">{item.battery}</span></div>
        </div>
        <div className="mt-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-neutral-500">판매가</div>
            <div className="text-2xl font-black text-red-500">{item.price}만원</div>
          </div>
          <button
            onClick={() => onSelect(item)}
            className="rounded-2xl bg-white px-4 py-2 text-sm font-bold text-black hover:bg-neutral-200"
          >
            상세보기
          </button>
        </div>
      </div>
    </div>
  );
}

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-[28px] border border-white/10 bg-neutral-950 p-6 shadow-2xl shadow-black/50">
        <div className="mb-4 flex justify-end">
          <button onClick={onClose} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-neutral-300">닫기</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function ForkliftMarket() {
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

    const ensureMeta = (name, content, attr = 'name') => {
      let tag = document.head.querySelector(`meta[${attr}="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    ensureMeta('description', '중고지게차 매물 등록, 업체 회원가입, 렌탈 문의, 판매 상담까지 한 번에 가능한 FORKLIFT MARKET.');
    ensureMeta('keywords', '중고지게차, 지게차매매, 지게차렌탈, 지게차매물, 전동지게차, 리치지게차, 지게차플랫폼');
    ensureMeta('og:title', 'FORKLIFT MARKET', 'property');
    ensureMeta('og:description', '중고지게차 매물 등록, 검색, 상담이 가능한 지게차 플랫폼', 'property');
    ensureMeta('og:type', 'website', 'property');
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

  const dashboardStats = useMemo(() => {
    return {
      totalListings: myListings.length,
      activeCount: myListings.filter((item) => item.status === 'active').length,
      pendingCount: myListings.filter((item) => item.status === 'pending').length,
      soldCount: myListings.filter((item) => item.status === 'sold').length,
    };
  }, [myListings]);

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
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <div className="text-2xl font-black tracking-tight text-red-500">FORKLIFT MARKET</div>
            <div className="text-xs text-neutral-400">중고지게차 매물 플랫폼</div>
          </div>

          <nav className="flex flex-wrap items-center gap-2 text-sm">
            {[
              ['home', '홈'],
              ['market', '매물보기'],
              ['seller', '업체가입'],
              ['register', '매물등록'],
              ['landing', '광고안내'],
              ...(currentUser ? [['dashboard', '대시보드']] : []),
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`rounded-2xl px-4 py-2 ${activeTab === key ? 'bg-red-600 text-white' : 'border border-white/10 text-neutral-300 hover:bg-white/5'}`}
              >
                {label}
              </button>
            ))}
            {currentUser ? (
              <button onClick={handleLogout} className="rounded-2xl border border-white/10 px-4 py-2 text-neutral-300 hover:bg-white/5">
                로그아웃
              </button>
            ) : null}
          </nav>
        </div>
      </header>

      {notice ? (
        <div className="sticky top-[73px] z-30 mx-auto max-w-7xl px-6 pt-4">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{notice}</div>
        </div>
      ) : null}

      {activeTab === 'home' && (
        <>
          <section className="relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(220,38,38,0.22),transparent_28%),radial-gradient(circle_at_left,rgba(255,255,255,0.08),transparent_20%)]" />
            <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-24">
              <div>
                <div className="mb-4 inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-4 py-1 text-sm text-red-300">
                  업체 회원가입 · 매물 등록 · 문의 연결
                </div>
                <h1 className="max-w-3xl text-4xl font-black leading-tight md:text-6xl">
                  지게차 매물 찾기부터
                  <span className="block text-red-500">판매 · 렌탈 · 상담까지 한 번에</span>
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-300 md:text-lg">
                  여러 판매업체가 직접 가입하고 매물을 등록할 수 있는 중고지게차 매물 플랫폼입니다.
                  실매물 중심 등록, 빠른 문의 연결, 업체 홍보까지 한곳에서 운영할 수 있습니다.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <button onClick={() => setActiveTab('market')} className="rounded-2xl bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-red-900/30 hover:bg-red-500">
                    추천 매물 보기
                  </button>
                  <button onClick={() => setActiveTab('seller')} className="rounded-2xl border border-white/15 px-6 py-3 text-sm font-semibold text-white hover:bg-white/5">
                    업체 등록하기
                  </button>
                </div>

                <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
                  <StatCard label="등록 매물" value={`${activeListings.length}+`} />
                  <StatCard label="참여 업체" value={`${users.length}+`} />
                  <StatCard label="렌탈 문의" value="실시간" />
                  <StatCard label="A/S 연결" value="빠른 안내" />
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/30 backdrop-blur">
                <div className="rounded-[24px] bg-neutral-900 p-5">
                  <div className="mb-4 text-lg font-bold">매물 검색</div>
                  <div className="grid gap-3">
                    <input value={keyword} onChange={(e) => setKeyword(e.target.value)} className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm outline-none placeholder:text-neutral-500" placeholder="브랜드 / 톤수 / 연식 검색" />
                    <div className="grid grid-cols-2 gap-3">
                      <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-neutral-300">
                        <option value="">브랜드 전체</option>
              <option value="현대">현대</option>
              <option value="두산">두산</option>
              <option value="클라크">클라크</option>
              <option value="도요타">도요타</option>
              <option value="니찌유">니찌유</option>
              <option value="스미토모">스미토모</option>
              <option value="기타브랜드">기타브랜드</option>
                      </select>
                      <select value={tonFilter} onChange={(e) => setTonFilter(e.target.value)} className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-neutral-300">
                        <option value="">톤수 전체</option>
                        <option value="1.5톤">1.5톤</option>
                        <option value="2톤">2톤</option>
                        <option value="2.5톤">2.5톤</option>
                        <option value="3톤이상">3톤이상</option>
                        <option value="4.5톤이상">4.5톤이상</option>
                      </select>
                    </div>
                    <button onClick={() => setActiveTab('market')} className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold">매물 검색하기</button>
                  </div>

                  <div className="mt-6">
                    <div className="mb-3 text-sm font-semibold text-neutral-300">인기 카테고리</div>
                    <div className="flex flex-wrap gap-2">
                      {['현대','두산','클라크','도요타','니찌유','스미토모','기타브랜드'].map((category) => (
                        <span key={category} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-neutral-300">{category}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
            <SectionTitle eyebrow="Featured Listings" title="추천 매물" subtitle="실시간 등록된 매물 중 눈에 잘 띄는 대표 장비를 먼저 보여줍니다." />
            <div className="grid gap-6 md:grid-cols-3">
              {featuredListings.map((item) => <ListingCard key={item.id} item={item} onSelect={setSelectedListing} />)}
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-6 py-6 md:py-10">
            <SectionTitle eyebrow="Platform Flow" title="업체 등록 절차" subtitle="매매·렌탈·정비 업체가 직접 가입하고 매물을 등록할 수 있습니다." />
            <div className="grid gap-6 md:grid-cols-4">
              {[
                ['1', '업체 회원가입', '지게차 매매·렌탈·정비 업체가 가입 후 기본 정보를 등록합니다.'],
                ['2', '매물 등록', '사진, 톤수, 마스트, 연식, 배터리, 가격을 직접 입력해 매물을 올립니다.'],
                ['3', '관리자 확인', '허위매물 방지와 품질 유지를 위해 관리자 확인 후 노출됩니다.'],
                ['4', '문의 연결', '구매자가 전화, 문자, 카톡으로 판매업체에 바로 문의합니다.'],
              ].map(([num, title, desc]) => (
                <div key={num} className="rounded-[28px] border border-white/10 bg-white/5 p-6">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-600 font-black">{num}</div>
                  <div className="text-lg font-bold">{title}</div>
                  <p className="mt-2 text-sm leading-6 text-neutral-400">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-6 py-12 md:py-20">
            <div className="rounded-[32px] border border-red-500/20 bg-gradient-to-r from-red-600 to-red-800 p-8 md:p-10">
              <div className="max-w-3xl">
                <div className="text-sm font-semibold uppercase tracking-[0.24em] text-red-100/80">Seller Landing</div>
                <h3 className="mt-3 text-3xl font-black md:text-5xl">업체 모집 · 광고 · 상단노출 안내</h3>
                <p className="mt-4 text-sm leading-7 text-red-50/90 md:text-base">
                  매물 등록만 하는 것이 아니라, 업체 소개와 대표 매물을 노출해 홍보 채널로도 활용할 수 있습니다.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button onClick={() => setActiveTab('landing')} className="rounded-2xl bg-black px-6 py-3 text-sm font-bold text-white hover:bg-neutral-900">광고안내 보기</button>
                  <button onClick={() => setActiveTab('seller')} className="rounded-2xl border border-white/30 px-6 py-3 text-sm font-bold text-white hover:bg-white/10">업체 등록하기</button>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {activeTab === 'market' && (
        <section className="mx-auto max-w-7xl px-6 py-12">
          <SectionTitle eyebrow="Marketplace" title="전체 매물" subtitle="브랜드, 톤수, 키워드로 원하는 장비를 빠르게 찾을 수 있습니다." />
          <div className="mb-6 grid gap-3 rounded-[28px] border border-white/10 bg-white/5 p-4 md:grid-cols-4">
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)} className="rounded-2xl bg-black px-4 py-3 text-sm outline-none" placeholder="브랜드 / 연식 / 지역 검색" />
            <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className="rounded-2xl bg-black px-4 py-3 text-sm text-neutral-300">
              <option value="">브랜드 전체</option>
              <option value="현대">현대</option>
              <option value="두산">두산</option>
              <option value="클라크">클라크</option>
              <option value="도요타">도요타</option>
              <option value="니찌유">니찌유</option>
              <option value="스미토모">스미토모</option>
              <option value="기타브랜드">기타브랜드</option>
            </select>
            <select value={tonFilter} onChange={(e) => setTonFilter(e.target.value)} className="rounded-2xl bg-black px-4 py-3 text-sm text-neutral-300">
              <option value="">톤수 전체</option>
                        <option value="1.5톤">1.5톤</option>
                        <option value="2톤">2톤</option>
                        <option value="2.5톤">2.5톤</option>
                        <option value="3톤이상">3톤이상</option>
                        <option value="4.5톤이상">4.5톤이상</option>
            </select>
            <button onClick={() => { setKeyword(''); setBrandFilter(''); setTonFilter(''); }} className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-neutral-300 hover:bg-white/5">필터 초기화</button>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {filteredListings.length ? filteredListings.map((item) => <ListingCard key={item.id} item={item} onSelect={setSelectedListing} />) : (
              <div className="col-span-full rounded-[28px] border border-white/10 bg-white/5 p-10 text-center text-neutral-400">검색 조건에 맞는 매물이 없습니다.</div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'seller' && (
        <section className="mx-auto max-w-7xl px-6 py-12">
          <SectionTitle eyebrow="Seller Center" title="업체 회원가입 · 로그인" subtitle="판매업체, 렌탈업체, 정비업체가 가입 후 직접 매물을 등록할 수 있습니다." />
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[28px] border border-white/10 bg-neutral-900 p-6">
              <h3 className="text-2xl font-black">회원가입</h3>
              <form onSubmit={handleSignup} className="mt-5 grid gap-3">
                <input value={signupForm.companyName} onChange={(e) => setSignupForm({ ...signupForm, companyName: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="업체명" />
                <input value={signupForm.name} onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="담당자명" />
                <input value={signupForm.phone} onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="연락처" />
                <input value={signupForm.email} onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="이메일" type="email" />
                <input value={signupForm.password} onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="비밀번호" type="password" />
                <div className="grid grid-cols-2 gap-3">
                  <input value={signupForm.region} onChange={(e) => setSignupForm({ ...signupForm, region: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="지역" />
                  <input value={signupForm.businessType} onChange={(e) => setSignupForm({ ...signupForm, businessType: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="업종 (매매/렌탈/정비)" />
                </div>
                <button className="rounded-2xl bg-red-600 px-4 py-3 font-bold">회원가입</button>
              </form>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
              <h3 className="text-2xl font-black">로그인</h3>
              <form onSubmit={handleLogin} className="mt-5 grid gap-3">
                <input value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="이메일" type="email" />
                <input value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="비밀번호" type="password" />
                <button className="rounded-2xl bg-white px-4 py-3 font-bold text-black">로그인</button>
              </form>

              <div className="mt-8 rounded-[24px] border border-white/10 bg-black/30 p-4 text-sm text-neutral-300">
                <div className="font-bold text-white">테스트 계정</div>
                <div className="mt-2">이메일: best@example.com</div>
                <div>비밀번호: 1234</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'register' && (
        <section className="mx-auto max-w-7xl px-6 py-12">
          <SectionTitle eyebrow="Listing Form" title="매물 등록" subtitle="로그인한 판매업체만 등록할 수 있으며, 등록 후 관리자 확인 뒤 노출됩니다." />
          <div className="grid gap-6 md:grid-cols-[1.05fr_0.95fr]">
            <form onSubmit={handleCreateListing} className="rounded-[28px] border border-white/10 bg-neutral-900 p-6 shadow-xl shadow-black/20">
              <div className="grid gap-3">
                <input value={listingForm.title} onChange={(e) => setListingForm({ ...listingForm, title: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="모델명 입력" />
                <div className="grid grid-cols-2 gap-3">
                  <input value={listingForm.brand} onChange={(e) => setListingForm({ ...listingForm, brand: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="브랜드" />
                  <input value={listingForm.ton} onChange={(e) => setListingForm({ ...listingForm, ton: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="톤수" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input value={listingForm.year} onChange={(e) => setListingForm({ ...listingForm, year: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="연식" />
                  <input value={listingForm.mast} onChange={(e) => setListingForm({ ...listingForm, mast: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="마스트 높이" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input value={listingForm.hours} onChange={(e) => setListingForm({ ...listingForm, hours: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="가동시간" />
                  <input value={listingForm.location} onChange={(e) => setListingForm({ ...listingForm, location: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="지역" />
                </div>
                <input value={listingForm.battery} onChange={(e) => setListingForm({ ...listingForm, battery: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="배터리 상태 / 주요 옵션" />
                <input value={listingForm.price} onChange={(e) => setListingForm({ ...listingForm, price: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="판매가 입력 (만원 단위)" />
                <textarea value={listingForm.description} onChange={(e) => setListingForm({ ...listingForm, description: e.target.value })} className="min-h-[120px] rounded-2xl bg-black px-4 py-3" placeholder="매물 설명" />
                <div className="rounded-2xl border border-dashed border-white/15 bg-black/40 px-4 py-6 text-center text-sm text-neutral-500">
                  이미지 업로드는 실제 배포 시 스토리지 연동이 필요합니다.
                </div>
                <button className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white">매물 등록 신청</button>
              </div>
            </form>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
              <h3 className="text-2xl font-black">등록 안내</h3>
              <div className="mt-5 space-y-4 text-sm leading-7 text-neutral-300">
                <p>로그인한 업체 회원만 매물을 등록할 수 있습니다.</p>
                <p>등록된 매물은 관리자 확인 전까지 승인대기 상태로 저장됩니다.</p>
                <p>실제 운영 시에는 이미지 업로드, 사업자 인증, 허위매물 신고 기능을 추가하면 더 안정적으로 운영할 수 있습니다.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'dashboard' && currentUser && (
        <section className="mx-auto max-w-7xl px-6 py-12">
          <SectionTitle eyebrow="Seller Dashboard" title={`${currentUser.companyName} 판매업체 관리`} subtitle="내 매물 등록 현황과 상태를 한눈에 확인할 수 있습니다." />
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="전체 매물" value={dashboardStats.totalListings} />
            <StatCard label="노출중" value={dashboardStats.activeCount} />
            <StatCard label="승인대기" value={dashboardStats.pendingCount} />
            <StatCard label="판매완료" value={dashboardStats.soldCount} />
          </div>

          <div className="mt-8 rounded-[28px] border border-white/10 bg-neutral-900 p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-2xl font-black">내 매물 관리</h3>
              <button onClick={() => setActiveTab('register')} className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-bold">새 매물 등록</button>
            </div>
            <div className="space-y-3">
              {myListings.length ? myListings.map((item) => (
                <div key={item.id} className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-lg font-bold">{item.title}</div>
                    <div className="mt-1 text-sm text-neutral-400">{item.year}년식 · {item.ton} · {item.mast} · {item.price}만원</div>
                    <div className="mt-2 text-xs text-neutral-500">등록일 {item.createdAt}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-2 text-xs font-bold ${item.status === 'active' ? 'bg-green-500/15 text-green-300' : item.status === 'pending' ? 'bg-yellow-500/15 text-yellow-300' : 'bg-neutral-500/20 text-neutral-300'}`}>
                      {item.status === 'active' ? '노출중' : item.status === 'pending' ? '승인대기' : '판매완료'}
                    </span>
                    <button onClick={() => updateMyListingStatus(item.id, 'sold')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-neutral-300 hover:bg-white/5">판매완료</button>
                    <button onClick={() => updateMyListingStatus(item.id, 'active')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-neutral-300 hover:bg-white/5">노출중</button>
                  </div>
                </div>
              )) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-neutral-400">등록된 매물이 없습니다.</div>
              )}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'landing' && (
        <section className="mx-auto max-w-7xl px-6 py-12">
          <SectionTitle eyebrow="Business Landing" title="업체 모집 랜딩페이지" subtitle="판매업체 유입을 위한 소개, 광고상품 안내, 등록 유도 섹션입니다." />
          <div className="grid gap-6 md:grid-cols-3">
            {[
              ['무료 등록', '업체 회원가입 후 기본 매물을 등록하고 문의를 받을 수 있습니다.'],
              ['상단 노출', '대표 매물과 업체를 메인에 노출해 더 많은 문의를 받을 수 있습니다.'],
              ['브랜드 홍보', '업체 소개, 지역, 주력 장비를 함께 보여줘 신뢰도를 높일 수 있습니다.'],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-[28px] border border-white/10 bg-white/5 p-6">
                <div className="text-xl font-black">{title}</div>
                <p className="mt-3 text-sm leading-7 text-neutral-400">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-[28px] border border-white/10 bg-neutral-900 p-6">
              <h3 className="text-2xl font-black">왜 등록해야 하나요?</h3>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-neutral-300">
                <li>• 중고지게차 구매 고객에게 직접 노출</li>
                <li>• 렌탈·매매·정비 문의까지 함께 연결</li>
                <li>• 지역 기반 노출로 가까운 고객 확보</li>
                <li>• 상단노출 상품으로 추가 홍보 가능</li>
              </ul>
            </div>
            <div className="rounded-[28px] border border-red-500/20 bg-gradient-to-r from-red-600 to-red-800 p-6">
              <h3 className="text-2xl font-black">지금 바로 업체 등록</h3>
              <p className="mt-4 text-sm leading-7 text-red-50/90">회원가입 후 바로 매물을 등록하고, 승인 후 노출을 시작할 수 있습니다.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={() => setActiveTab('seller')} className="rounded-2xl bg-black px-5 py-3 text-sm font-bold text-white">업체 회원가입</button>
                <button onClick={() => setActiveTab('register')} className="rounded-2xl border border-white/30 px-5 py-3 text-sm font-bold text-white">매물 등록하기</button>
              </div>
            </div>
          </div>
        </section>
      )}

      <Modal open={!!selectedListing} onClose={() => setSelectedListing(null)}>
        {selectedListing && (
          <div>
            <div className="mb-3 inline-flex rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold text-red-300">{selectedListing.sellerName}</div>
            <h3 className="text-3xl font-black">{selectedListing.title}</h3>
            <div className="mt-6 grid gap-3 md:grid-cols-2 text-sm text-neutral-300">
              <div className="rounded-2xl bg-white/5 p-4">브랜드<br /><span className="font-semibold text-white">{selectedListing.brand}</span></div>
              <div className="rounded-2xl bg-white/5 p-4">톤수<br /><span className="font-semibold text-white">{selectedListing.ton}</span></div>
              <div className="rounded-2xl bg-white/5 p-4">연식<br /><span className="font-semibold text-white">{selectedListing.year}년식</span></div>
              <div className="rounded-2xl bg-white/5 p-4">마스트<br /><span className="font-semibold text-white">{selectedListing.mast}</span></div>
              <div className="rounded-2xl bg-white/5 p-4">가동시간<br /><span className="font-semibold text-white">{selectedListing.hours}시간</span></div>
              <div className="rounded-2xl bg-white/5 p-4">배터리<br /><span className="font-semibold text-white">{selectedListing.battery}</span></div>
              <div className="rounded-2xl bg-white/5 p-4">지역<br /><span className="font-semibold text-white">{selectedListing.location}</span></div>
              <div className="rounded-2xl bg-white/5 p-4">판매가<br /><span className="font-semibold text-red-400">{selectedListing.price}만원</span></div>
            </div>
            <div className="mt-5 rounded-2xl bg-white/5 p-4 text-sm leading-7 text-neutral-300">
              {selectedListing.description || '등록된 설명이 없습니다.'}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold">전화 문의</button>
              <button className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold text-white">카톡 상담</button>
            </div>
          </div>
        )}
      </Modal>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-neutral-500">
        © 2026 FORKLIFT MARKET. All rights reserved.
      </footer>
    </div>
  );
}
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

function StatCard({ label, value }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <div className="text-2xl font-black">{value}</div>
      <div className="mt-1 text-sm text-neutral-400">{label}</div>
    </div>
  );
}

function SectionTitle({ eyebrow, title, subtitle }) {
  return (
    <div className="mb-8">
      <div className="text-sm font-semibold uppercase tracking-[0.22em] text-red-400">{eyebrow}</div>
      <h2 className="mt-2 text-3xl font-black md:text-4xl">{title}</h2>
      {subtitle ? <p className="mt-3 max-w-3xl text-neutral-400">{subtitle}</p> : null}
    </div>
  );
}

function ListingCard({ item, onSelect }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-neutral-900 shadow-xl shadow-black/20">
      <div className="flex h-48 items-center justify-center bg-gradient-to-br from-neutral-800 to-black text-neutral-500">
        대표 이미지
      </div>
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold text-red-300">{item.featured ? '추천매물' : item.status === 'active' ? '일반매물' : '승인대기'}</span>
          <span className="text-xs text-neutral-500">{item.sellerName}</span>
        </div>
        <h3 className="text-xl font-bold leading-snug">{item.title}</h3>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-neutral-300">
          <div className="rounded-2xl bg-white/5 p-3">연식<br /><span className="font-semibold text-white">{item.year}년식</span></div>
          <div className="rounded-2xl bg-white/5 p-3">마스트<br /><span className="font-semibold text-white">{item.mast}</span></div>
          <div className="rounded-2xl bg-white/5 p-3">가동시간<br /><span className="font-semibold text-white">{item.hours}시간</span></div>
          <div className="rounded-2xl bg-white/5 p-3">배터리<br /><span className="font-semibold text-white">{item.battery}</span></div>
        </div>
        <div className="mt-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-neutral-500">판매가</div>
            <div className="text-2xl font-black text-red-500">{item.price}만원</div>
          </div>
          <button
            onClick={() => onSelect(item)}
            className="rounded-2xl bg-white px-4 py-2 text-sm font-bold text-black hover:bg-neutral-200"
          >
            상세보기
          </button>
        </div>
      </div>
    </div>
  );
}

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-[28px] border border-white/10 bg-neutral-950 p-6 shadow-2xl shadow-black/50">
        <div className="mb-4 flex justify-end">
          <button onClick={onClose} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-neutral-300">닫기</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function ForkliftMarket() {
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

    const ensureMeta = (name, content, attr = 'name') => {
      let tag = document.head.querySelector(`meta[${attr}="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    ensureMeta('description', '중고지게차 매물 등록, 업체 회원가입, 렌탈 문의, 판매 상담까지 한 번에 가능한 FORKLIFT MARKET.');
    ensureMeta('keywords', '중고지게차, 지게차매매, 지게차렌탈, 지게차매물, 전동지게차, 리치지게차, 지게차플랫폼');
    ensureMeta('og:title', 'FORKLIFT MARKET', 'property');
    ensureMeta('og:description', '중고지게차 매물 등록, 검색, 상담이 가능한 지게차 플랫폼', 'property');
    ensureMeta('og:type', 'website', 'property');
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

  const dashboardStats = useMemo(() => {
    return {
      totalListings: myListings.length,
      activeCount: myListings.filter((item) => item.status === 'active').length,
      pendingCount: myListings.filter((item) => item.status === 'pending').length,
      soldCount: myListings.filter((item) => item.status === 'sold').length,
    };
  }, [myListings]);

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
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <div className="text-2xl font-black tracking-tight text-red-500">FORKLIFT MARKET</div>
            <div className="text-xs text-neutral-400">중고지게차 매물 플랫폼</div>
          </div>

          <nav className="flex flex-wrap items-center gap-2 text-sm">
            {[
              ['home', '홈'],
              ['market', '매물보기'],
              ['seller', '업체가입'],
              ['register', '매물등록'],
              ['landing', '광고안내'],
              ...(currentUser ? [['dashboard', '대시보드']] : []),
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`rounded-2xl px-4 py-2 ${activeTab === key ? 'bg-red-600 text-white' : 'border border-white/10 text-neutral-300 hover:bg-white/5'}`}
              >
                {label}
              </button>
            ))}
            {currentUser ? (
              <button onClick={handleLogout} className="rounded-2xl border border-white/10 px-4 py-2 text-neutral-300 hover:bg-white/5">
                로그아웃
              </button>
            ) : null}
          </nav>
        </div>
      </header>

      {notice ? (
        <div className="sticky top-[73px] z-30 mx-auto max-w-7xl px-6 pt-4">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{notice}</div>
        </div>
      ) : null}

      {activeTab === 'home' && (
        <>
          <section className="relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(220,38,38,0.22),transparent_28%),radial-gradient(circle_at_left,rgba(255,255,255,0.08),transparent_20%)]" />
            <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-24">
              <div>
                <div className="mb-4 inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-4 py-1 text-sm text-red-300">
                  업체 회원가입 · 매물 등록 · 문의 연결
                </div>
                <h1 className="max-w-3xl text-4xl font-black leading-tight md:text-6xl">
                  지게차 매물 찾기부터
                  <span className="block text-red-500">판매 · 렌탈 · 상담까지 한 번에</span>
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-300 md:text-lg">
                  여러 판매업체가 직접 가입하고 매물을 등록할 수 있는 중고지게차 매물 플랫폼입니다.
                  실매물 중심 등록, 빠른 문의 연결, 업체 홍보까지 한곳에서 운영할 수 있습니다.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <button onClick={() => setActiveTab('market')} className="rounded-2xl bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-red-900/30 hover:bg-red-500">
                    추천 매물 보기
                  </button>
                  <button onClick={() => setActiveTab('seller')} className="rounded-2xl border border-white/15 px-6 py-3 text-sm font-semibold text-white hover:bg-white/5">
                    업체 등록하기
                  </button>
                </div>

                <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
                  <StatCard label="등록 매물" value={`${activeListings.length}+`} />
                  <StatCard label="참여 업체" value={`${users.length}+`} />
                  <StatCard label="렌탈 문의" value="실시간" />
                  <StatCard label="A/S 연결" value="빠른 안내" />
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/30 backdrop-blur">
                <div className="rounded-[24px] bg-neutral-900 p-5">
                  <div className="mb-4 text-lg font-bold">매물 검색</div>
                  <div className="grid gap-3">
                    <input value={keyword} onChange={(e) => setKeyword(e.target.value)} className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm outline-none placeholder:text-neutral-500" placeholder="브랜드 / 톤수 / 연식 검색" />
                    <div className="grid grid-cols-2 gap-3">
                      <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-neutral-300">
                        <option value="">브랜드 전체</option>
              <option value="현대">현대</option>
              <option value="두산">두산</option>
              <option value="클라크">클라크</option>
              <option value="도요타">도요타</option>
              <option value="니찌유">니찌유</option>
              <option value="스미토모">스미토모</option>
              <option value="기타브랜드">기타브랜드</option>
                      </select>
                      <select value={tonFilter} onChange={(e) => setTonFilter(e.target.value)} className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-neutral-300">
                        <option value="">톤수 전체</option>
                        <option value="1.5톤">1.5톤</option>
                        <option value="2톤">2톤</option>
                        <option value="2.5톤">2.5톤</option>
                        <option value="3톤이상">3톤이상</option>
                        <option value="4.5톤이상">4.5톤이상</option>
                      </select>
                    </div>
                    <button onClick={() => setActiveTab('market')} className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold">매물 검색하기</button>
                  </div>

                  <div className="mt-6">
                    <div className="mb-3 text-sm font-semibold text-neutral-300">인기 카테고리</div>
                    <div className="flex flex-wrap gap-2">
                      {['현대','두산','클라크','도요타','니찌유','스미토모','기타브랜드'].map((category) => (
                        <span key={category} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-neutral-300">{category}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
            <SectionTitle eyebrow="Featured Listings" title="추천 매물" subtitle="실시간 등록된 매물 중 눈에 잘 띄는 대표 장비를 먼저 보여줍니다." />
            <div className="grid gap-6 md:grid-cols-3">
              {featuredListings.map((item) => <ListingCard key={item.id} item={item} onSelect={setSelectedListing} />)}
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-6 py-6 md:py-10">
            <SectionTitle eyebrow="Platform Flow" title="업체 등록 절차" subtitle="매매·렌탈·정비 업체가 직접 가입하고 매물을 등록할 수 있습니다." />
            <div className="grid gap-6 md:grid-cols-4">
              {[
                ['1', '업체 회원가입', '지게차 매매·렌탈·정비 업체가 가입 후 기본 정보를 등록합니다.'],
                ['2', '매물 등록', '사진, 톤수, 마스트, 연식, 배터리, 가격을 직접 입력해 매물을 올립니다.'],
                ['3', '관리자 확인', '허위매물 방지와 품질 유지를 위해 관리자 확인 후 노출됩니다.'],
                ['4', '문의 연결', '구매자가 전화, 문자, 카톡으로 판매업체에 바로 문의합니다.'],
              ].map(([num, title, desc]) => (
                <div key={num} className="rounded-[28px] border border-white/10 bg-white/5 p-6">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-600 font-black">{num}</div>
                  <div className="text-lg font-bold">{title}</div>
                  <p className="mt-2 text-sm leading-6 text-neutral-400">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-6 py-12 md:py-20">
            <div className="rounded-[32px] border border-red-500/20 bg-gradient-to-r from-red-600 to-red-800 p-8 md:p-10">
              <div className="max-w-3xl">
                <div className="text-sm font-semibold uppercase tracking-[0.24em] text-red-100/80">Seller Landing</div>
                <h3 className="mt-3 text-3xl font-black md:text-5xl">업체 모집 · 광고 · 상단노출 안내</h3>
                <p className="mt-4 text-sm leading-7 text-red-50/90 md:text-base">
                  매물 등록만 하는 것이 아니라, 업체 소개와 대표 매물을 노출해 홍보 채널로도 활용할 수 있습니다.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button onClick={() => setActiveTab('landing')} className="rounded-2xl bg-black px-6 py-3 text-sm font-bold text-white hover:bg-neutral-900">광고안내 보기</button>
                  <button onClick={() => setActiveTab('seller')} className="rounded-2xl border border-white/30 px-6 py-3 text-sm font-bold text-white hover:bg-white/10">업체 등록하기</button>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {activeTab === 'market' && (
        <section className="mx-auto max-w-7xl px-6 py-12">
          <SectionTitle eyebrow="Marketplace" title="전체 매물" subtitle="브랜드, 톤수, 키워드로 원하는 장비를 빠르게 찾을 수 있습니다." />
          <div className="mb-6 grid gap-3 rounded-[28px] border border-white/10 bg-white/5 p-4 md:grid-cols-4">
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)} className="rounded-2xl bg-black px-4 py-3 text-sm outline-none" placeholder="브랜드 / 연식 / 지역 검색" />
            <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className="rounded-2xl bg-black px-4 py-3 text-sm text-neutral-300">
              <option value="">브랜드 전체</option>
              <option value="현대">현대</option>
              <option value="두산">두산</option>
              <option value="클라크">클라크</option>
              <option value="도요타">도요타</option>
              <option value="니찌유">니찌유</option>
              <option value="스미토모">스미토모</option>
              <option value="기타브랜드">기타브랜드</option>
            </select>
            <select value={tonFilter} onChange={(e) => setTonFilter(e.target.value)} className="rounded-2xl bg-black px-4 py-3 text-sm text-neutral-300">
              <option value="">톤수 전체</option>
                        <option value="1.5톤">1.5톤</option>
                        <option value="2톤">2톤</option>
                        <option value="2.5톤">2.5톤</option>
                        <option value="3톤이상">3톤이상</option>
                        <option value="4.5톤이상">4.5톤이상</option>
            </select>
            <button onClick={() => { setKeyword(''); setBrandFilter(''); setTonFilter(''); }} className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-neutral-300 hover:bg-white/5">필터 초기화</button>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {filteredListings.length ? filteredListings.map((item) => <ListingCard key={item.id} item={item} onSelect={setSelectedListing} />) : (
              <div className="col-span-full rounded-[28px] border border-white/10 bg-white/5 p-10 text-center text-neutral-400">검색 조건에 맞는 매물이 없습니다.</div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'seller' && (
        <section className="mx-auto max-w-7xl px-6 py-12">
          <SectionTitle eyebrow="Seller Center" title="업체 회원가입 · 로그인" subtitle="판매업체, 렌탈업체, 정비업체가 가입 후 직접 매물을 등록할 수 있습니다." />
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[28px] border border-white/10 bg-neutral-900 p-6">
              <h3 className="text-2xl font-black">회원가입</h3>
              <form onSubmit={handleSignup} className="mt-5 grid gap-3">
                <input value={signupForm.companyName} onChange={(e) => setSignupForm({ ...signupForm, companyName: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="업체명" />
                <input value={signupForm.name} onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="담당자명" />
                <input value={signupForm.phone} onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="연락처" />
                <input value={signupForm.email} onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="이메일" type="email" />
                <input value={signupForm.password} onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="비밀번호" type="password" />
                <div className="grid grid-cols-2 gap-3">
                  <input value={signupForm.region} onChange={(e) => setSignupForm({ ...signupForm, region: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="지역" />
                  <input value={signupForm.businessType} onChange={(e) => setSignupForm({ ...signupForm, businessType: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="업종 (매매/렌탈/정비)" />
                </div>
                <button className="rounded-2xl bg-red-600 px-4 py-3 font-bold">회원가입</button>
              </form>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
              <h3 className="text-2xl font-black">로그인</h3>
              <form onSubmit={handleLogin} className="mt-5 grid gap-3">
                <input value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="이메일" type="email" />
                <input value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="비밀번호" type="password" />
                <button className="rounded-2xl bg-white px-4 py-3 font-bold text-black">로그인</button>
              </form>

              <div className="mt-8 rounded-[24px] border border-white/10 bg-black/30 p-4 text-sm text-neutral-300">
                <div className="font-bold text-white">테스트 계정</div>
                <div className="mt-2">이메일: best@example.com</div>
                <div>비밀번호: 1234</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'register' && (
        <section className="mx-auto max-w-7xl px-6 py-12">
          <SectionTitle eyebrow="Listing Form" title="매물 등록" subtitle="로그인한 판매업체만 등록할 수 있으며, 등록 후 관리자 확인 뒤 노출됩니다." />
          <div className="grid gap-6 md:grid-cols-[1.05fr_0.95fr]">
            <form onSubmit={handleCreateListing} className="rounded-[28px] border border-white/10 bg-neutral-900 p-6 shadow-xl shadow-black/20">
              <div className="grid gap-3">
                <input value={listingForm.title} onChange={(e) => setListingForm({ ...listingForm, title: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="모델명 입력" />
                <div className="grid grid-cols-2 gap-3">
                  <input value={listingForm.brand} onChange={(e) => setListingForm({ ...listingForm, brand: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="브랜드" />
                  <input value={listingForm.ton} onChange={(e) => setListingForm({ ...listingForm, ton: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="톤수" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input value={listingForm.year} onChange={(e) => setListingForm({ ...listingForm, year: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="연식" />
                  <input value={listingForm.mast} onChange={(e) => setListingForm({ ...listingForm, mast: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="마스트 높이" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input value={listingForm.hours} onChange={(e) => setListingForm({ ...listingForm, hours: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="가동시간" />
                  <input value={listingForm.location} onChange={(e) => setListingForm({ ...listingForm, location: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="지역" />
                </div>
                <input value={listingForm.battery} onChange={(e) => setListingForm({ ...listingForm, battery: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="배터리 상태 / 주요 옵션" />
                <input value={listingForm.price} onChange={(e) => setListingForm({ ...listingForm, price: e.target.value })} className="rounded-2xl bg-black px-4 py-3" placeholder="판매가 입력 (만원 단위)" />
                <textarea value={listingForm.description} onChange={(e) => setListingForm({ ...listingForm, description: e.target.value })} className="min-h-[120px] rounded-2xl bg-black px-4 py-3" placeholder="매물 설명" />
                <div className="rounded-2xl border border-dashed border-white/15 bg-black/40 px-4 py-6 text-center text-sm text-neutral-500">
                  이미지 업로드는 실제 배포 시 스토리지 연동이 필요합니다.
                </div>
                <button className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white">매물 등록 신청</button>
              </div>
            </form>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
              <h3 className="text-2xl font-black">등록 안내</h3>
              <div className="mt-5 space-y-4 text-sm leading-7 text-neutral-300">
                <p>로그인한 업체 회원만 매물을 등록할 수 있습니다.</p>
                <p>등록된 매물은 관리자 확인 전까지 승인대기 상태로 저장됩니다.</p>
                <p>실제 운영 시에는 이미지 업로드, 사업자 인증, 허위매물 신고 기능을 추가하면 더 안정적으로 운영할 수 있습니다.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'dashboard' && currentUser && (
        <section className="mx-auto max-w-7xl px-6 py-12">
          <SectionTitle eyebrow="Seller Dashboard" title={`${currentUser.companyName} 판매업체 관리`} subtitle="내 매물 등록 현황과 상태를 한눈에 확인할 수 있습니다." />
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="전체 매물" value={dashboardStats.totalListings} />
            <StatCard label="노출중" value={dashboardStats.activeCount} />
            <StatCard label="승인대기" value={dashboardStats.pendingCount} />
            <StatCard label="판매완료" value={dashboardStats.soldCount} />
          </div>

          <div className="mt-8 rounded-[28px] border border-white/10 bg-neutral-900 p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-2xl font-black">내 매물 관리</h3>
              <button onClick={() => setActiveTab('register')} className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-bold">새 매물 등록</button>
            </div>
            <div className="space-y-3">
              {myListings.length ? myListings.map((item) => (
                <div key={item.id} className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-lg font-bold">{item.title}</div>
                    <div className="mt-1 text-sm text-neutral-400">{item.year}년식 · {item.ton} · {item.mast} · {item.price}만원</div>
                    <div className="mt-2 text-xs text-neutral-500">등록일 {item.createdAt}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-2 text-xs font-bold ${item.status === 'active' ? 'bg-green-500/15 text-green-300' : item.status === 'pending' ? 'bg-yellow-500/15 text-yellow-300' : 'bg-neutral-500/20 text-neutral-300'}`}>
                      {item.status === 'active' ? '노출중' : item.status === 'pending' ? '승인대기' : '판매완료'}
                    </span>
                    <button onClick={() => updateMyListingStatus(item.id, 'sold')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-neutral-300 hover:bg-white/5">판매완료</button>
                    <button onClick={() => updateMyListingStatus(item.id, 'active')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-neutral-300 hover:bg-white/5">노출중</button>
                  </div>
                </div>
              )) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-neutral-400">등록된 매물이 없습니다.</div>
              )}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'landing' && (
        <section className="mx-auto max-w-7xl px-6 py-12">
          <SectionTitle eyebrow="Business Landing" title="업체 모집 랜딩페이지" subtitle="판매업체 유입을 위한 소개, 광고상품 안내, 등록 유도 섹션입니다." />
          <div className="grid gap-6 md:grid-cols-3">
            {[
              ['무료 등록', '업체 회원가입 후 기본 매물을 등록하고 문의를 받을 수 있습니다.'],
              ['상단 노출', '대표 매물과 업체를 메인에 노출해 더 많은 문의를 받을 수 있습니다.'],
              ['브랜드 홍보', '업체 소개, 지역, 주력 장비를 함께 보여줘 신뢰도를 높일 수 있습니다.'],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-[28px] border border-white/10 bg-white/5 p-6">
                <div className="text-xl font-black">{title}</div>
                <p className="mt-3 text-sm leading-7 text-neutral-400">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-[28px] border border-white/10 bg-neutral-900 p-6">
              <h3 className="text-2xl font-black">왜 등록해야 하나요?</h3>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-neutral-300">
                <li>• 중고지게차 구매 고객에게 직접 노출</li>
                <li>• 렌탈·매매·정비 문의까지 함께 연결</li>
                <li>• 지역 기반 노출로 가까운 고객 확보</li>
                <li>• 상단노출 상품으로 추가 홍보 가능</li>
              </ul>
            </div>
            <div className="rounded-[28px] border border-red-500/20 bg-gradient-to-r from-red-600 to-red-800 p-6">
              <h3 className="text-2xl font-black">지금 바로 업체 등록</h3>
              <p className="mt-4 text-sm leading-7 text-red-50/90">회원가입 후 바로 매물을 등록하고, 승인 후 노출을 시작할 수 있습니다.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={() => setActiveTab('seller')} className="rounded-2xl bg-black px-5 py-3 text-sm font-bold text-white">업체 회원가입</button>
                <button onClick={() => setActiveTab('register')} className="rounded-2xl border border-white/30 px-5 py-3 text-sm font-bold text-white">매물 등록하기</button>
              </div>
            </div>
          </div>
        </section>
      )}

      <Modal open={!!selectedListing} onClose={() => setSelectedListing(null)}>
        {selectedListing && (
          <div>
            <div className="mb-3 inline-flex rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold text-red-300">{selectedListing.sellerName}</div>
            <h3 className="text-3xl font-black">{selectedListing.title}</h3>
            <div className="mt-6 grid gap-3 md:grid-cols-2 text-sm text-neutral-300">
              <div className="rounded-2xl bg-white/5 p-4">브랜드<br /><span className="font-semibold text-white">{selectedListing.brand}</span></div>
              <div className="rounded-2xl bg-white/5 p-4">톤수<br /><span className="font-semibold text-white">{selectedListing.ton}</span></div>
              <div className="rounded-2xl bg-white/5 p-4">연식<br /><span className="font-semibold text-white">{selectedListing.year}년식</span></div>
              <div className="rounded-2xl bg-white/5 p-4">마스트<br /><span className="font-semibold text-white">{selectedListing.mast}</span></div>
              <div className="rounded-2xl bg-white/5 p-4">가동시간<br /><span className="font-semibold text-white">{selectedListing.hours}시간</span></div>
              <div className="rounded-2xl bg-white/5 p-4">배터리<br /><span className="font-semibold text-white">{selectedListing.battery}</span></div>
              <div className="rounded-2xl bg-white/5 p-4">지역<br /><span className="font-semibold text-white">{selectedListing.location}</span></div>
              <div className="rounded-2xl bg-white/5 p-4">판매가<br /><span className="font-semibold text-red-400">{selectedListing.price}만원</span></div>
            </div>
            <div className="mt-5 rounded-2xl bg-white/5 p-4 text-sm leading-7 text-neutral-300">
              {selectedListing.description || '등록된 설명이 없습니다.'}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold">전화 문의</button>
              <button className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold text-white">카톡 상담</button>
            </div>
          </div>
        )}
      </Modal>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-neutral-500">
        © 2026 FORKLIFT MARKET. All rights reserved.
      </footer>
    </div>
  );
}
