import React, { useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from './firebase';
import { Routes, Route, useNavigate } from 'react-router-dom';
import ListingDetail from './ListingDetail';

const ADMIN_EMAILS = ['best@example.com'];

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

function ListingCard({ item }) {
  const navigate = useNavigate();
  return (
    <div className="listing-card">
      <div className="listing-image">
        {item.imageUrls?.[0] ? <img src={item.imageUrls[0]} alt={item.title} /> : '대표 이미지'}
      </div>
      <div className="listing-body">
        <div className="listing-topline">
          <span className="badge">{item.featured ? '추천매물' : '일반매물'}</span>
          <span className="seller-name">{item.sellerName || '업체명 없음'}</span>
        </div>
        <h3 className="listing-title">{item.title}</h3>
        <div className="listing-spec-grid">
          <div className="spec-box"><span>연식</span><strong>{item.year || '-'}</strong></div>
          <div className="spec-box"><span>마스트</span><strong>{item.mast || '-'}</strong></div>
          <div className="spec-box"><span>가동시간</span><strong>{item.hours || '-'}</strong></div>
          <div className="spec-box"><span>배터리</span><strong>{item.battery || '-'}</strong></div>
        </div>
        <div className="listing-footer">
          <div>
            <div className="price-label">판매가</div>
            <div className="price-value">{item.price ? `${item.price}만원` : '-'}</div>
          </div>
          <button className="btn btn-light" onClick={() => navigate(`/listing/${item.id}`)}>상세보기</button>
        </div>
      </div>
    </div>
  );
}


export default function App() {
  const [companies, setCompanies] = useState([]);
  const [listings, setListings] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentCompany, setCurrentCompany] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
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
  const [imageFiles, setImageFiles] = useState([]);

  const isAdmin = !!(currentUser && (ADMIN_EMAILS.includes(currentUser.email || '') || currentCompany?.role === 'admin'));

  useEffect(() => {
    document.title = 'FORKLIFT MARKET | 중고지게차 매물 플랫폼';
  }, []);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user || null);
      if (!user) setCurrentCompany(null);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    const companiesQuery = query(collection(db, 'companies'), orderBy('createdAt', 'desc'));
    const unsubCompanies = onSnapshot(companiesQuery, (snapshot) => {
      const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCompanies(rows);
    });

    const listingsQuery = query(collection(db, 'listings'), orderBy('createdAt', 'desc'));
    const unsubListings = onSnapshot(listingsQuery, (snapshot) => {
      const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setListings(rows);
    });

    return () => {
      unsubCompanies();
      unsubListings();
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const found = companies.find((item) => item.authUserId === currentUser.uid);
    setCurrentCompany(found || null);
  }, [companies, currentUser]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  const visibleListings = useMemo(() => listings.filter((item) => item.status === 'active'), [listings]);
  const pendingListings = useMemo(() => listings.filter((item) => item.status === 'pending'), [listings]);

  const filteredListings = useMemo(() => {
    return visibleListings.filter((item) => {
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
  }, [visibleListings, keyword, brandFilter, tonFilter]);

  const featuredListings = useMemo(() => visibleListings.filter((item) => item.featured).slice(0, 3), [visibleListings]);
  const myListings = useMemo(() => currentCompany ? listings.filter((item) => item.companyId === currentCompany.id) : [], [listings, currentCompany]);

  const dashboardStats = useMemo(() => ({
    totalListings: myListings.length,
    activeCount: myListings.filter((item) => item.status === 'active').length,
    pendingCount: myListings.filter((item) => item.status === 'pending').length,
    soldCount: myListings.filter((item) => item.status === 'sold').length,
  }), [myListings]);

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!signupForm.companyName || !signupForm.name || !signupForm.phone || !signupForm.email || !signupForm.password) {
      setNotice('필수 항목을 입력해주세요.');
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, signupForm.email, signupForm.password);
      await setDoc(doc(db, 'companies', cred.user.uid), {
        authUserId: cred.user.uid,
        companyName: signupForm.companyName,
        name: signupForm.name,
        phone: signupForm.phone,
        email: signupForm.email,
        region: signupForm.region,
        businessType: signupForm.businessType,
        role: ADMIN_EMAILS.includes(signupForm.email) ? 'admin' : 'seller',
        createdAt: serverTimestamp(),
      });
      setSignupForm({ companyName: '', name: '', phone: '', email: '', password: '', region: '', businessType: '' });
      setNotice('업체 회원가입이 완료되었습니다.');
      setActiveTab('dashboard');
    } catch (error) {
      setNotice(error.message || '회원가입 중 오류가 발생했습니다.');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
      setLoginForm({ email: '', password: '' });
      setNotice('로그인되었습니다.');
      setActiveTab('dashboard');
    } catch (error) {
      setNotice(error.message || '로그인 중 오류가 발생했습니다.');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setNotice('로그아웃되었습니다.');
    setActiveTab('home');
  };

  const handleCreateListing = async (e) => {
    e.preventDefault();

    if (!currentUser || !currentCompany) {
      setNotice('로그인한 업체 회원만 등록할 수 있습니다.');
      setActiveTab('seller');
      return;
    }

    if (!listingForm.title || !listingForm.brand || !listingForm.ton || !listingForm.year || !listingForm.price) {
      setNotice('필수 항목을 입력해주세요.');
      return;
    }

    try {
      let imageUrls = [];

      if (imageFiles && imageFiles.length > 0) {
        imageUrls = await Promise.all(
          imageFiles.slice(0, 5).map(async (file) => {
            const safeName = file.name.replace(/[^a-zA-Z0-9가-힣._-]/g, '_');
            const imageRef = ref(storage, `listings/${currentUser.uid}/${Date.now()}-${safeName}`);
            await uploadBytes(imageRef, file);
            return getDownloadURL(imageRef);
          })
        );
      }

      await addDoc(collection(db, 'listings'), {
        companyId: currentCompany.id,
        authUserId: currentUser.uid,
        sellerName: currentCompany.companyName,
        sellerPhone: currentCompany.phone || '',
        ...listingForm,
        imageUrls,
        status: 'pending',
        featured: false,
        createdAt: serverTimestamp(),
      });

      setListingForm(initialForm);
      setImageFiles([]);
      setNotice('매물 등록이 완료되었습니다. 관리자 승인 후 공개됩니다.');
      setActiveTab('dashboard');
    } catch (error) {
      console.error('매물 등록 오류:', error);
      setNotice(error.message || '매물 등록 중 오류가 발생했습니다.');
    }
  };

  const updateMyListingStatus = async (id, nextStatus) => {
    try {
      await updateDoc(doc(db, 'listings', id), { status: nextStatus });
      setNotice('매물 상태가 변경되었습니다.');
    } catch (error) {
      setNotice(error.message || '상태 변경 중 오류가 발생했습니다.');
    }
  };

  const approveListing = async (id) => {
    try {
      await updateDoc(doc(db, 'listings', id), { status: 'active' });
      setNotice('매물이 승인되었습니다.');
    } catch (error) {
      setNotice(error.message || '승인 중 오류가 발생했습니다.');
    }
  };

  const rejectListing = async (id) => {
    try {
      await updateDoc(doc(db, 'listings', id), { status: 'rejected' });
      setNotice('매물이 반려되었습니다.');
    } catch (error) {
      setNotice(error.message || '반려 중 오류가 발생했습니다.');
    }
  };

  const deleteListing = async (id) => {
    const ok = window.confirm('이 매물을 완전히 삭제할까요? 삭제 후에는 복구할 수 없습니다.');
    if (!ok) return;

    try {
      await deleteDoc(doc(db, 'listings', id));
      setNotice('매물이 삭제되었습니다.');
    } catch (error) {
      setNotice(error.message || '삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <Routes>
      <Route path="/" element={
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
        .listing-image { height: 210px; display: flex; align-items: center; justify-content: center; color: #6b7280; background: linear-gradient(135deg, #222, #080808); font-weight: 700; overflow: hidden; }
        .listing-image img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .image-preview-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
        .image-preview { height: 86px; border-radius: 14px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); }
        .image-preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .detail-image-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 18px; }
        .detail-image-grid img { width: 100%; height: 150px; object-fit: cover; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); }
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
        .feature-grid, .dashboard-grid, .three-col { display: grid; gap: 18px; }
        .feature-grid { grid-template-columns: 1.05fr 0.95fr; }
        .dashboard-grid { grid-template-columns: repeat(4, 1fr); }
        .three-col { grid-template-columns: repeat(3, 1fr); }
        .glass-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 28px; padding: 22px; }
        .dark-card { background: #111; border: 1px solid rgba(255,255,255,0.08); border-radius: 28px; padding: 22px; }
        .flow-title { font-size: 22px; font-weight: 900; margin: 0; }
        .list-stack { display: grid; gap: 12px; }
        .list-item { display: flex; justify-content: space-between; gap: 18px; align-items: center; padding: 16px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); }
        .list-meta { color: #9ca3af; font-size: 14px; margin-top: 6px; }
        .status-badge { display: inline-flex; padding: 9px 12px; border-radius: 999px; font-size: 12px; font-weight: 800; }
        .status-active { background: rgba(34,197,94,0.16); color: #86efac; }
        .status-pending { background: rgba(234,179,8,0.16); color: #fde68a; }
        .status-sold { background: rgba(107,114,128,0.22); color: #d1d5db; }
        .status-rejected { background: rgba(239,68,68,0.16); color: #fca5a5; }
        .small-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .small-actions button { padding: 10px 12px; border-radius: 12px; background: transparent; color: #e5e7eb; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; }
        .upload-box { border-radius: 18px; padding: 28px 16px; border: 1px dashed rgba(255,255,255,0.18); text-align: center; color: #9ca3af; background: rgba(255,255,255,0.03); }
        .footer { border-top: 1px solid rgba(255,255,255,0.08); padding: 28px 0; text-align: center; color: #9ca3af; font-size: 13px; }
        @media (max-width: 1024px) {
          .hero-grid, .feature-grid, .listing-grid, .dashboard-grid, .three-col { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 720px) {
          .hero-grid, .feature-grid, .listing-grid, .dashboard-grid, .three-col, .two-col { grid-template-columns: 1fr; }
          .listing-footer, .list-item { flex-direction: column; align-items: flex-start; }
          .section-title { font-size: 30px; }
          .logo { font-size: 24px; }
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
                ...(currentCompany ? [['dashboard', '대시보드']] : []),
                ...(isAdmin ? [['admin', '관리자']] : []),
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
                  <p>여러 판매업체가 직접 가입하고 매물을 등록할 수 있는 중고지게차 매물 플랫폼입니다. 승인 완료된 매물만 공개되며, 참여업체 수와 등록 매물 수가 실시간으로 반영됩니다.</p>
                  <div className="hero-actions">
                    <button className="btn btn-primary" onClick={() => setActiveTab('market')}>추천 매물 보기</button>
                    <button className="btn btn-secondary" onClick={() => setActiveTab('seller')}>업체 등록하기</button>
                  </div>
                  <div className="stats-grid">
                    <StatCard label="등록 매물" value={`${visibleListings.length}+`} />
                    <StatCard label="참여 업체" value={`${companies.length}+`} />
                    <StatCard label="승인대기" value={`${pendingListings.length}+`} />
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
                      {['현대','두산','클라크','도요타','니찌유','스미토모','기타브랜드'].map((category) => <span key={category} className="chip">{category}</span>)}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="section">
              <div className="container">
                <SectionTitle eyebrow="Featured Listings" title="추천 매물" subtitle="승인 완료된 매물만 사용자에게 노출됩니다." />
                <div className="listing-grid">
                  {(featuredListings.length ? featuredListings : visibleListings.slice(0, 3)).map((item) => <ListingCard key={item.id} item={item} />)}
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === 'market' && (
          <section className="section">
            <div className="container">
              <SectionTitle eyebrow="Marketplace" title="전체 매물" subtitle="승인된 매물만 브랜드, 톤수, 키워드로 검색할 수 있습니다." />
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
                {filteredListings.length ? filteredListings.map((item) => <ListingCard key={item.id} item={item} />) : <div className="glass-card">검색 조건에 맞는 매물이 없습니다.</div>}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'seller' && (
          <section className="section">
            <div className="container">
              <SectionTitle eyebrow="Seller Center" title="업체 회원가입 · 로그인" subtitle="업체 회원만 매물을 등록할 수 있습니다." />
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
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'register' && (
          <section className="section">
            <div className="container">
              <SectionTitle eyebrow="Listing Form" title="매물 등록" subtitle="로그인한 업체 회원만 등록할 수 있고, 등록 후 관리자 승인 뒤 공개됩니다." />
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
                  <input
                    className="field"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setImageFiles(Array.from(e.target.files || []).slice(0, 5))}
                  />
                  <div className="upload-box">사진은 최대 5장까지 업로드할 수 있습니다. 사진 없이도 등록 가능합니다.</div>
                  {imageFiles.length ? (
                    <div className="image-preview-grid">
                      {imageFiles.map((file, index) => (
                        <div className="image-preview" key={`${file.name}-${index}`}>
                          <img src={URL.createObjectURL(file)} alt={`업로드 미리보기 ${index + 1}`} />
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <button className="btn btn-primary">매물 등록 신청</button>
                </form>
                <div className="glass-card">
                  <h3 className="flow-title">등록 안내</h3>
                  <div style={{ marginTop: 18, color: '#d1d5db', lineHeight: 1.9 }}>
                    <p>로그인한 업체 회원만 매물을 등록할 수 있습니다.</p>
                    <p>등록 직후 상태는 승인대기이며, 관리자 승인 후 사용자 화면에 공개됩니다.</p>
                    <p>승인대기 매물은 관리자 모드에서만 볼 수 있습니다.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'dashboard' && currentCompany && (
          <section className="section">
            <div className="container">
              <SectionTitle eyebrow="Seller Dashboard" title={`${currentCompany.companyName} 판매업체 관리`} subtitle="내 매물 등록 현황과 상태를 한눈에 확인할 수 있습니다." />
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
                      </div>
                      <div>
                        <div className={`status-badge ${item.status === 'active' ? 'status-active' : item.status === 'pending' ? 'status-pending' : item.status === 'sold' ? 'status-sold' : 'status-rejected'}`}>
                          {item.status === 'active' ? '노출중' : item.status === 'pending' ? '승인대기' : item.status === 'sold' ? '판매완료' : '반려'}
                        </div>
                        <div className="small-actions" style={{ marginTop: 10 }}>
                          <button onClick={() => updateMyListingStatus(item.id, 'sold')}>판매완료</button>
                        </div>
                      </div>
                    </div>
                  )) : <div className="glass-card">등록된 매물이 없습니다.</div>}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'admin' && isAdmin && (
          <section className="section">
            <div className="container">
              <SectionTitle eyebrow="Admin Mode" title="관리자 승인 관리" subtitle="승인대기 매물만 확인하고 승인 또는 반려할 수 있습니다." />
              <div className="dark-card">
                <div className="list-stack">
                  {pendingListings.length ? pendingListings.map((item) => (
                    <div key={item.id} className="list-item">
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 900 }}>{item.title}</div>
                        <div className="list-meta">{item.sellerName} · {item.brand} · {item.ton} · {item.year} · {item.price}만원</div>
                        <div className="list-meta">{item.description || '설명 없음'}</div>
                      </div>
                      <div className="small-actions">
                        <button onClick={() => approveListing(item.id)}>승인</button>
                        <button onClick={() => rejectListing(item.id)}>반려</button>
                        <button onClick={() => deleteListing(item.id)}>삭제</button>
                      </div>
                    </div>
                  )) : <div className="glass-card">현재 승인대기 매물이 없습니다.</div>}
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
                    <p className="list-meta" style={{ marginTop: 10, lineHeight: 1.8 }}>{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}


        <footer className="footer">
  © 2026 FORKLIFT MARKET. All rights reserved.

  <div style={{ marginTop: 10 }}>
    <details>
      <summary>개인정보처리방침</summary>
      <p>본 사이트는 업체명, 연락처, 이메일 등을 수집하며 서비스 제공을 위해 사용됩니다.</p>
      <p>회원 탈퇴 시 개인정보는 즉시 삭제됩니다.</p>
      <p>문의: 너이메일@gmail.com</p>
    </details>

    <details style={{ marginTop: 10 }}>
      <summary>이용약관</summary>
      <p>본 사이트는 중고지게차 매물 정보 제공 플랫폼입니다.</p>
      <p>허위매물 등록 시 삭제될 수 있습니다.</p>
      <p>거래 책임은 판매자와 구매자에게 있습니다.</p>
    </details>
  </div>
</footer>
      </div>
        </>
      } />
      <Route path="/listing/:id" element={<ListingDetail />} />
    </Routes>
  );
}
