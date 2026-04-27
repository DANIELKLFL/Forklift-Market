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
  limit,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from './firebase';
import { Routes, Route, useNavigate } from 'react-router-dom';
import ListingDetail from './ListingDetail';

const ADMIN_EMAILS = ['best@example.com'];
const DEFAULT_LISTING_LIMIT = 4;
const MAX_LISTING_LIMIT = 20;
const LISTINGS_PAGE_SIZE = 12;

const initialForm = {
  saleType: 'normal',
  title: '',
  brand: '',
  ton: '',
  year: '',
  mast: '',
  hours: '',
  battery: '',
  price: '',
  dealerPrice: '',
  location: '',
  description: '',
  auctionStartPrice: '',
  buyNowPrice: '',
  bidUnit: '',
  auctionStartAt: '',
  auctionEndsAt: '',
  auctionDesc: '',
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

function getTimeLeftText(endTime) {
  if (!endTime) return '종료일 미정';

  const end = new Date(endTime).getTime();
  const now = Date.now();
  const diff = end - now;

  if (Number.isNaN(end)) return '종료일 미정';
  if (diff <= 0) return '경매 종료';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  if (days > 0) return `${days}일 ${hours}시간 남음`;
  if (hours > 0) return `${hours}시간 ${minutes}분 남음`;
  return `${minutes}분 남음`;
}

async function compressImageFile(file, maxWidth = 1200, quality = 0.72) {
  if (!file || !file.type.startsWith('image/')) return file;

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            const compressedFile = new File(
              [blob],
              file.name.replace(/\.[^.]+$/, '.jpg'),
              { type: 'image/jpeg' }
            );

            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => resolve(file);
      img.src = event.target.result;
    };

    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

function ListingCard({ item, isAdmin, onDelete }) {
  const navigate = useNavigate();
  const isAuction = item.saleType === 'auction';
  const currentPrice = item.currentBid || item.auctionStartPrice || item.price;

  return (
    <div className="listing-card">
      <div className="listing-image">
        {item.imageUrls?.[0] ? <img src={item.imageUrls[0]} alt={item.title} /> : '대표 이미지'}
      </div>
      <div className="listing-body">
        <div className="listing-topline">
          <span className="badge">{isAuction ? '경매물품' : item.featured ? '추천매물' : '일반매물'}</span>
          <span className="seller-name">{item.sellerName || '업체명 없음'}</span>
        </div>
        <h3 className="listing-title">{item.title}</h3>
        <div className="listing-spec-grid">
          <div className="spec-box"><span>연식</span><strong>{item.year || '-'}</strong></div>
          <div className="spec-box"><span>마스트</span><strong>{item.mast || '-'}</strong></div>
          <div className="spec-box"><span>가동시간</span><strong>{item.hours || '-'}</strong></div>
          <div className="spec-box"><span>배터리</span><strong>{item.battery || '-'}</strong></div>
        </div>

        {isAuction ? (
          <div className="auction-mini">
            <div><span>입찰수</span><strong>{item.bidCount || 0}회</strong></div>
            <div><span>남은시간</span><strong>{getTimeLeftText(item.auctionEndsAt)}</strong></div>
          </div>
        ) : null}

        <div className="listing-footer">
          <div>
            <div className="price-label">{isAuction ? '현재 입찰가' : '판매가'}</div>
            <div className="price-value">{currentPrice ? `${currentPrice}만원` : '-'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-light" onClick={() => navigate(`/listing/${item.id}`)}>
              {isAuction ? '경매보기' : '상세보기'}
            </button>

            {isAdmin && (
              <button className="btn btn-primary" onClick={() => onDelete(item.id)}>
                삭제
              </button>
            )}
          </div>
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
  const [memberType, setMemberType] = useState('seller');
  const [marketVisibleCount, setMarketVisibleCount] = useState(LISTINGS_PAGE_SIZE);
  const [auctionVisibleCount, setAuctionVisibleCount] = useState(LISTINGS_PAGE_SIZE);
  const [editingListingId, setEditingListingId] = useState('');
  const [editForm, setEditForm] = useState(initialForm);

  const isAdmin = currentUser?.email === 'best@example.com';
  const isSeller = currentCompany?.memberType !== 'buyer' && !!currentCompany;
  const isBuyer = currentCompany?.memberType === 'buyer';

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

    const listingsQuery = query(
      collection(db, 'listings'),
      orderBy('createdAt', 'desc'),
      limit(60)
    );
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
    const found = companies.find((item) => item.authUserId === currentUser.uid || item.id === currentUser.uid);
    setCurrentCompany(found || null);
  }, [companies, currentUser]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  const visibleListings = useMemo(
    () => listings.filter((item) => item.status === 'active' && item.saleType !== 'auction'),
    [listings]
  );

  const auctionListings = useMemo(
    () => listings.filter((item) => item.status === 'active' && item.saleType === 'auction'),
    [listings]
  );

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

  const filteredAuctionListings = useMemo(() => {
    return auctionListings.filter((item) => {
      const matchKeyword = keyword
        ? [item.title, item.brand, item.ton, item.location, item.sellerName, item.description, item.auctionDesc]
            .join(' ')
            .toLowerCase()
            .includes(keyword.toLowerCase())
        : true;
      const matchBrand = brandFilter ? item.brand === brandFilter : true;
      const matchTon = tonFilter ? item.ton === tonFilter : true;
      return matchKeyword && matchBrand && matchTon;
    });
  }, [auctionListings, keyword, brandFilter, tonFilter]);

  const displayedMarketListings = useMemo(
    () => filteredListings.slice(0, marketVisibleCount),
    [filteredListings, marketVisibleCount]
  );

  const displayedAuctionListings = useMemo(
    () => filteredAuctionListings.slice(0, auctionVisibleCount),
    [filteredAuctionListings, auctionVisibleCount]
  );

  const featuredListings = useMemo(() => visibleListings.filter((item) => item.featured).slice(0, 3), [visibleListings]);
  const myListings = useMemo(() => currentCompany ? listings.filter((item) => item.companyId === currentCompany.id || item.authUserId === currentUser?.uid) : [], [listings, currentCompany, currentUser]);

  const dashboardStats = useMemo(() => ({
    totalListings: myListings.length,
    activeCount: myListings.filter((item) => item.status === 'active').length,
    pendingCount: myListings.filter((item) => item.status === 'pending').length,
    soldCount: myListings.filter((item) => item.status === 'sold').length,
  }), [myListings]);

  const getCompanyListingCount = (company) => {
    return listings.filter((item) => item.companyId === company.id || item.authUserId === company.authUserId).length;
  };

  const getCompanyLimit = (company) => {
    return Number(company.listingLimit || DEFAULT_LISTING_LIMIT);
  };

  useEffect(() => {
    setMarketVisibleCount(LISTINGS_PAGE_SIZE);
    setAuctionVisibleCount(LISTINGS_PAGE_SIZE);
  }, [keyword, brandFilter, tonFilter]);

  const handleSignup = async (e) => {
    e.preventDefault();

    if (memberType === 'seller') {
      if (!signupForm.companyName || !signupForm.name || !signupForm.phone || !signupForm.email || !signupForm.password) {
        setNotice('업체명, 담당자명, 연락처, 이메일, 비밀번호를 입력해주세요.');
        return;
      }
    }

    if (memberType === 'buyer') {
      if (!signupForm.name || !signupForm.phone || !signupForm.email || !signupForm.password) {
        setNotice('이름, 연락처, 이메일, 비밀번호를 입력해주세요.');
        return;
      }
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, signupForm.email, signupForm.password);
      await setDoc(doc(db, 'companies', cred.user.uid), {
        authUserId: cred.user.uid,
        memberType,
        companyName: memberType === 'seller' ? signupForm.companyName : signupForm.name,
        name: signupForm.name,
        phone: signupForm.phone,
        email: signupForm.email,
        region: signupForm.region,
        businessType: memberType === 'seller' ? signupForm.businessType : '소비자',
        listingLimit: memberType === 'seller' ? DEFAULT_LISTING_LIMIT : 0,
        role: ADMIN_EMAILS.includes(signupForm.email) ? 'admin' : memberType,
        createdAt: serverTimestamp(),
      });
      setSignupForm({ companyName: '', name: '', phone: '', email: '', password: '', region: '', businessType: '' });
      setNotice(memberType === 'seller' ? '업체 회원가입이 완료되었습니다. 기본 매물 등록 한도는 4개입니다.' : '소비자 회원가입이 완료되었습니다. 경매 입찰과 즉시구매가 가능합니다.');
      setActiveTab(memberType === 'seller' ? 'dashboard' : 'market');
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

    if (currentCompany.memberType === 'buyer') {
      setNotice('소비자 회원은 매물을 등록할 수 없습니다. 업체회원만 등록 가능합니다.');
      return;
    }

    const currentCount = getCompanyListingCount(currentCompany);
    const limit = getCompanyLimit(currentCompany);

    if (currentCount >= limit) {
      setNotice(`현재 등록 가능 한도는 ${limit}개입니다. 관리자에게 한도 상향을 요청해주세요.`);
      return;
    }

    if (!listingForm.title || !listingForm.brand || !listingForm.ton || !listingForm.year) {
      setNotice('모델명, 브랜드, 톤수, 연식은 필수입니다.');
      return;
    }

    if (listingForm.saleType === 'normal' && !listingForm.price) {
      setNotice('일반 판매 매물은 판매가를 입력해주세요.');
      return;
    }

    if (listingForm.saleType === 'auction') {
      if (!listingForm.auctionStartPrice || !listingForm.bidUnit || !listingForm.auctionStartAt || !listingForm.auctionEndsAt) {
        setNotice('경매물품은 시작가, 입찰 단위, 경매 시작시간, 경매 종료시간을 입력해주세요.');
        return;
      }

      if (new Date(listingForm.auctionEndsAt).getTime() <= new Date(listingForm.auctionStartAt).getTime()) {
        setNotice('경매 종료시간은 시작시간보다 늦어야 합니다.');
        return;
      }
    }

    try {
      let imageUrls = [];

      if (imageFiles && imageFiles.length > 0) {
        imageUrls = await Promise.all(
          imageFiles.slice(0, 5).map(async (file) => {
            const compressedFile = await compressImageFile(file);
            const safeName = compressedFile.name.replace(/[^a-zA-Z0-9가-힣._-]/g, '_');
            const imageRef = ref(storage, `listings/${currentUser.uid}/${Date.now()}-${safeName}`);
            await uploadBytes(imageRef, compressedFile);
            return getDownloadURL(imageRef);
          })
        );
      }

      const isAuction = listingForm.saleType === 'auction';
      const startPrice = Number(listingForm.auctionStartPrice || 0);

      const listingDocRef = await addDoc(collection(db, 'listings'), {
        companyId: currentCompany.id,
        authUserId: currentUser.uid,
        sellerName: currentCompany.companyName,
        sellerPhone: currentCompany.phone || '',
        title: listingForm.title,
        brand: listingForm.brand,
        ton: listingForm.ton,
        year: listingForm.year,
        mast: listingForm.mast,
        hours: listingForm.hours,
        battery: listingForm.battery,
        price: isAuction ? startPrice : Number(listingForm.price || 0),
        location: listingForm.location,
        description: listingForm.description,
        saleType: listingForm.saleType,
        auctionStartPrice: isAuction ? startPrice : null,
        currentBid: isAuction ? startPrice : null,
        bidUnit: isAuction ? Number(listingForm.bidUnit || 0) : null,
        buyNowPrice: isAuction && listingForm.buyNowPrice ? Number(listingForm.buyNowPrice) : null,
        auctionStartAt: isAuction ? listingForm.auctionStartAt : null,
        auctionEndsAt: isAuction ? listingForm.auctionEndsAt : null,
        auctionDesc: isAuction ? listingForm.auctionDesc : '',
        bidCount: isAuction ? 0 : null,
        highestBidderId: '',
        highestBidderEmail: '',
        highestBidderName: '',
        auctionStatus: isAuction ? 'scheduled' : null,
        imageUrls,
        status: 'pending',
        featured: false,
        createdAt: serverTimestamp(),
      });

      if (listingForm.dealerPrice) {
        await setDoc(doc(db, 'dealerPrices', listingDocRef.id), {
          listingId: listingDocRef.id,
          companyId: currentCompany.id,
          authUserId: currentUser.uid,
          dealerPrice: Number(listingForm.dealerPrice),
          createdAt: serverTimestamp(),
        });
      }

      setListingForm(initialForm);
      setImageFiles([]);
      setNotice('매물 등록이 완료되었습니다. 관리자 승인 후 공개됩니다.');
      setActiveTab('dashboard');
    } catch (error) {
      console.error('매물 등록 오류:', error);
      setNotice(error.message || '매물 등록 중 오류가 발생했습니다.');
    }
  };

  const startEditListing = (item) => {
    if (!currentUser || item.authUserId !== currentUser.uid) {
      setNotice('본인 매물만 수정할 수 있습니다.');
      return;
    }
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
    const targetListing = listings.find((item) => item.id === id);

    if (!targetListing) {
      setNotice('삭제할 매물을 찾을 수 없습니다.');
      return;
    }

    const isOwner = currentUser && targetListing.authUserId === currentUser.uid;

    if (!isAdmin && !isOwner) {
      setNotice('본인 매물 또는 관리자만 삭제할 수 있습니다.');
      return;
    }

    const ok = window.confirm('이 매물을 완전히 삭제할까요? 삭제 후에는 복구할 수 없습니다.');
    if (!ok) return;

    try {
      await deleteDoc(doc(db, 'listings', id));
      setNotice('매물이 삭제되었습니다.');
    } catch (error) {
      setNotice(error.message || '삭제 중 오류가 발생했습니다.');
    }
  };

  const updateCompanyLimit = async (companyId, nextLimit) => {
    const limitNumber = Number(nextLimit);

    if (limitNumber < DEFAULT_LISTING_LIMIT || limitNumber > MAX_LISTING_LIMIT) {
      setNotice('매물 한도는 4개부터 20개까지만 설정할 수 있습니다.');
      return;
    }

    try {
      await updateDoc(doc(db, 'companies', companyId), { listingLimit: limitNumber });
      setNotice(`매물 등록 한도를 ${limitNumber}개로 변경했습니다.`);
    } catch (error) {
      setNotice(error.message || '업체 한도 변경 중 오류가 발생했습니다.');
    }
  };

  const renderFilterBox = (placeholder = '브랜드 / 연식 / 지역 검색') => (
    <div className="glass-card" style={{ marginBottom: 20 }}>
      <div className="grid-gap filter-grid">
        <input className="field" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder={placeholder} />
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
  );

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
            .filter-grid { grid-template-columns: repeat(4, 1fr); }
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
            .listing-body { padding: 20px; }
            .listing-topline { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
            .badge { display: inline-flex; padding: 7px 11px; border-radius: 999px; background: rgba(239,68,68,0.14); color: #fca5a5; font-size: 12px; font-weight: 900; }
            .seller-name { color: #9ca3af; font-size: 12px; }
            .listing-title { font-size: 24px; line-height: 1.25; margin: 14px 0 0; }
            .listing-spec-grid { margin-top: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .spec-box { padding: 14px; border-radius: 18px; background: rgba(255,255,255,0.05); }
            .spec-box span { display: block; color: #9ca3af; font-size: 12px; margin-bottom: 6px; }
            .spec-box strong { font-size: 14px; }
            .auction-mini { margin-top: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .auction-mini div { padding: 12px; border-radius: 16px; background: rgba(220,38,38,0.1); border: 1px solid rgba(220,38,38,0.18); }
            .auction-mini span { display: block; color: #fca5a5; font-size: 12px; margin-bottom: 5px; }
            .auction-mini strong { font-size: 13px; }
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
            .company-admin-grid { display: grid; gap: 14px; }
            .company-card { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; align-items: center; padding: 18px; border-radius: 20px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); }
            .limit-control { display: flex; gap: 8px; align-items: center; justify-content: flex-end; flex-wrap: wrap; }
            .limit-control select { max-width: 120px; }
            .footer { border-top: 1px solid rgba(255,255,255,0.08); padding: 28px 0; text-align: center; color: #9ca3af; font-size: 13px; }
            @media (max-width: 1024px) {
              .hero-grid, .feature-grid, .listing-grid, .dashboard-grid, .three-col, .company-card { grid-template-columns: 1fr 1fr; }
            }
            @media (max-width: 720px) {
              .hero-grid, .feature-grid, .listing-grid, .dashboard-grid, .three-col, .two-col, .filter-grid, .company-card { grid-template-columns: 1fr; }
              .listing-footer, .list-item { flex-direction: column; align-items: flex-start; }
              .limit-control { justify-content: flex-start; }
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
                    ['auction', '경매물품'],
                    ['seller', '회원가입/로그인'],
                    ...(isSeller || isAdmin ? [['register', '매물등록']] : []),
                    ...(isSeller ? [['dashboard', '대시보드']] : []),
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
                      <div className="pill">업체 회원가입 · 매물 등록 · 경매 입찰</div>
                      <h1>지게차 매물 찾기부터<span>판매 · 경매 · 상담까지 한 번에</span></h1>
                      <p>여러 판매업체가 직접 가입하고 일반 매물과 경매물품을 등록할 수 있는 중고지게차 매물 플랫폼입니다. 승인 완료된 매물만 공개됩니다.</p>
                      <div className="hero-actions">
                        <button className="btn btn-primary" onClick={() => setActiveTab('market')}>추천 매물 보기</button>
                        <button className="btn btn-secondary" onClick={() => setActiveTab('auction')}>경매물품 보기</button>
                        <button className="btn btn-secondary" onClick={() => setActiveTab('seller')}>업체 등록하기</button>
                      </div>
                      <div className="stats-grid">
                        <StatCard label="일반 매물" value={`${visibleListings.length}+`} />
                        <StatCard label="경매물품" value={`${auctionListings.length}+`} />
                        <StatCard label="참여 업체" value={`${companies.length}+`} />
                        <StatCard label="승인대기" value={`${pendingListings.length}+`} />
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
                    <SectionTitle eyebrow="Featured Listings" title="추천 매물" subtitle="승인 완료된 일반 매물만 사용자에게 노출됩니다." />
                    <div className="listing-grid">
                      {(featuredListings.length ? featuredListings : visibleListings.slice(0, 3)).map((item) => <ListingCard key={item.id} item={item} isAdmin={isAdmin} onDelete={deleteListing} />)}
                    </div>
                  </div>
                </section>
              </>
            )}

            {activeTab === 'market' && (
              <section className="section">
                <div className="container">
                  <SectionTitle eyebrow="Marketplace" title="전체 매물" subtitle="일반 판매 매물만 브랜드, 톤수, 키워드로 검색할 수 있습니다." />
                  {renderFilterBox()}
                  <div className="listing-grid">
                    {filteredListings.length ? displayedMarketListings.map((item) => <ListingCard key={item.id} item={item} isAdmin={isAdmin} onDelete={deleteListing} />) : <div className="glass-card">검색 조건에 맞는 매물이 없습니다.</div>}
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'auction' && (
              <section className="section">
                <div className="container">
                  <SectionTitle eyebrow="Auction Market" title="경매물품" subtitle="입찰 방식으로 진행되는 중고지게차 경매 물품입니다." />
                  {renderFilterBox()}
                  <div className="listing-grid">
                    {filteredAuctionListings.length ? displayedAuctionListings.map((item) => <ListingCard key={item.id} item={item} isAdmin={isAdmin} onDelete={deleteListing} />) : <div className="glass-card">현재 등록된 경매물품이 없습니다.</div>}
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'market' && filteredListings.length > marketVisibleCount && (
              <div className="container" style={{ paddingBottom: 36, textAlign: 'center' }}>
                <button className="btn btn-primary" onClick={() => setMarketVisibleCount((prev) => prev + LISTINGS_PAGE_SIZE)}>
                  더보기 ({displayedMarketListings.length}/{filteredListings.length})
                </button>
              </div>
            )}

            {activeTab === 'auction' && filteredAuctionListings.length > auctionVisibleCount && (
              <div className="container" style={{ paddingBottom: 36, textAlign: 'center' }}>
                <button className="btn btn-primary" onClick={() => setAuctionVisibleCount((prev) => prev + LISTINGS_PAGE_SIZE)}>
                  더보기 ({displayedAuctionListings.length}/{filteredAuctionListings.length})
                </button>
              </div>
            )}

            {activeTab === 'seller' && (
              <section className="section">
                <div className="container">
                  <SectionTitle eyebrow="Member Center" title="회원가입 · 로그인" subtitle="업체회원은 매물 등록, 소비자회원은 경매 입찰과 즉시구매가 가능합니다." />
                  <div className="feature-grid">
                    <div className="dark-card">
                      <h3 className="flow-title">회원가입</h3>
                      <form className="grid-gap" style={{ marginTop: 18 }} onSubmit={handleSignup}>
                        <div className="two-col">
                          <button
                            type="button"
                            className={memberType === 'seller' ? 'btn btn-primary' : 'btn btn-secondary'}
                            onClick={() => setMemberType('seller')}
                          >
                            업체회원
                          </button>
                          <button
                            type="button"
                            className={memberType === 'buyer' ? 'btn btn-primary' : 'btn btn-secondary'}
                            onClick={() => setMemberType('buyer')}
                          >
                            소비자회원
                          </button>
                        </div>
                        {memberType === 'seller' && (
                          <input className="field" value={signupForm.companyName} onChange={(e) => setSignupForm({ ...signupForm, companyName: e.target.value })} placeholder="업체명" />
                        )}
                        <input className="field" value={signupForm.name} onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })} placeholder="담당자명" />
                        <input className="field" value={signupForm.phone} onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })} placeholder="연락처" />
                        <input className="field" value={signupForm.email} onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })} placeholder="이메일" type="email" />
                        <input className="field" value={signupForm.password} onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })} placeholder="비밀번호" type="password" />
                        {memberType === 'seller' && (
                          <div className="two-col">
                            <input className="field" value={signupForm.region} onChange={(e) => setSignupForm({ ...signupForm, region: e.target.value })} placeholder="지역" />
                            <input className="field" value={signupForm.businessType} onChange={(e) => setSignupForm({ ...signupForm, businessType: e.target.value })} placeholder="업종 (매매/렌탈/정비)" />
                          </div>
                        )}
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
                  <SectionTitle eyebrow="Listing Form" title="매물 등록" subtitle="일반 판매 또는 경매물품을 선택해 등록할 수 있습니다. 등록 후 관리자 승인 뒤 공개됩니다." />
                  <div className="feature-grid">
                    <form className="dark-card grid-gap" onSubmit={handleCreateListing}>
                      {currentCompany ? (
                        <div className="notice" style={{ marginTop: 0 }}>
                          현재 등록 {getCompanyListingCount(currentCompany)}개 / 한도 {getCompanyLimit(currentCompany)}개
                        </div>
                      ) : null}

                      <div className="two-col">
                        <button
                          type="button"
                          className={listingForm.saleType === 'normal' ? 'btn btn-primary' : 'btn btn-secondary'}
                          onClick={() => setListingForm({ ...listingForm, saleType: 'normal' })}
                        >
                          일반 판매
                        </button>
                        <button
                          type="button"
                          className={listingForm.saleType === 'auction' ? 'btn btn-primary' : 'btn btn-secondary'}
                          onClick={() => setListingForm({ ...listingForm, saleType: 'auction' })}
                        >
                          경매 판매
                        </button>
                      </div>

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

                      {listingForm.saleType === 'normal' ? (
                        <div className="grid-gap">
                          <input
                            className="field"
                            value={listingForm.price}
                            onChange={(e) => setListingForm({ ...listingForm, price: e.target.value })}
                            placeholder="소비자 판매가 입력 (만원 단위)"
                            type="number"
                          />
                          <input
                            className="field"
                            value={listingForm.dealerPrice}
                            onChange={(e) => setListingForm({ ...listingForm, dealerPrice: e.target.value })}
                            placeholder="업체가 입력 (만원 단위, 업체회원/관리자만 노출)"
                            type="number"
                          />
                        </div>
                      ) : (
                        <div className="glass-card" style={{ padding: 16 }}>
                          <h3 className="flow-title">경매 설정</h3>
                          <div className="grid-gap" style={{ marginTop: 14 }}>
                            <div className="two-col">
                              <input
                                className="field"
                                value={listingForm.auctionStartPrice}
                                onChange={(e) => setListingForm({ ...listingForm, auctionStartPrice: e.target.value })}
                                placeholder="시작가 (만원)"
                                type="number"
                              />
                              <input
                                className="field"
                                value={listingForm.buyNowPrice}
                                onChange={(e) => setListingForm({ ...listingForm, buyNowPrice: e.target.value })}
                                placeholder="즉시구매가 (만원, 선택)"
                                type="number"
                              />
                            </div>
                            <input
                              className="field"
                              value={listingForm.dealerPrice}
                              onChange={(e) => setListingForm({ ...listingForm, dealerPrice: e.target.value })}
                              placeholder="업체가 입력 (만원 단위, 업체회원/관리자만 노출)"
                              type="number"
                            />
                            <input
                              className="field"
                              value={listingForm.bidUnit}
                              onChange={(e) => setListingForm({ ...listingForm, bidUnit: e.target.value })}
                              placeholder="입찰 단위 (만원) 예: 10"
                              type="number"
                            />
                            <div className="two-col">
                              <div>
                                <div className="list-meta" style={{ marginBottom: 6 }}>경매 시작시간</div>
                                <input
                                  className="field"
                                  value={listingForm.auctionStartAt}
                                  onChange={(e) => setListingForm({ ...listingForm, auctionStartAt: e.target.value })}
                                  type="datetime-local"
                                />
                              </div>
                              <div>
                                <div className="list-meta" style={{ marginBottom: 6 }}>경매 종료시간</div>
                                <input
                                  className="field"
                                  value={listingForm.auctionEndsAt}
                                  onChange={(e) => setListingForm({ ...listingForm, auctionEndsAt: e.target.value })}
                                  type="datetime-local"
                                />
                              </div>
                            </div>
                            <textarea
                              className="textarea"
                              value={listingForm.auctionDesc}
                              onChange={(e) => setListingForm({ ...listingForm, auctionDesc: e.target.value })}
                              placeholder="경매 설명 / 입찰 유의사항"
                            />
                          </div>
                        </div>
                      )}

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
                        <p>업체 회원은 일반 판매와 경매 판매를 선택해 등록할 수 있습니다.</p>
                        <p>모든 매물은 등록 직후 승인대기 상태이며, 관리자 승인 후 공개됩니다.</p>
                        <p>기본 등록 한도는 업체당 4개이며, 관리자가 최대 20개까지 조정할 수 있습니다.</p>
                        <p>경매물품은 경매물품 탭에만 노출됩니다.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'dashboard' && isSeller && currentCompany && (
              <section className="section">
                <div className="container">
                  <SectionTitle eyebrow="Seller Dashboard" title={`${currentCompany.companyName} 판매업체 관리`} subtitle="내 매물 등록 현황과 상태를 한눈에 확인할 수 있습니다." />
                  <div className="dashboard-grid">
                    <StatCard label="전체 매물" value={`${dashboardStats.totalListings}/${getCompanyLimit(currentCompany)}`} />
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
                            <div className="list-meta">{item.saleType === 'auction' ? '경매' : '일반'} · {item.year}년식 · {item.ton} · {item.mast} · {item.price}만원</div>
                          </div>
                          <div>
                            <div className={`status-badge ${item.status === 'active' ? 'status-active' : item.status === 'pending' ? 'status-pending' : item.status === 'sold' ? 'status-sold' : 'status-rejected'}`}>
                              {item.status === 'active' ? '노출중' : item.status === 'pending' ? '승인대기' : item.status === 'sold' ? '판매완료' : '반려'}
                            </div>
                            <div className="small-actions" style={{ marginTop: 10 }}>
                              <button onClick={() => updateMyListingStatus(item.id, 'sold')}>판매완료</button>
                              <button onClick={() => deleteListing(item.id)}>삭제</button>
                            </div>
                          </div>
                        </div>
                      )) : <div className="glass-card">현재 등록된 매물이 없습니다.</div>}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'admin' && isAdmin && (
              <section className="section">
                <div className="container">
                  <SectionTitle eyebrow="Admin Mode" title="관리자 승인 · 업체 관리" subtitle="승인대기 매물 확인, 업체 정보 확인, 업체별 등록 한도 설정을 할 수 있습니다." />

                  <div className="dark-card">
                    <h3 className="flow-title">승인대기 매물</h3>
                    <div className="list-stack" style={{ marginTop: 18 }}>
                      {pendingListings.length ? pendingListings.map((item) => (
                        <div key={item.id} className="list-item">
                          <div>
                            <div style={{ fontSize: 20, fontWeight: 900 }}>{item.title}</div>
                            <div className="list-meta">
                              {item.saleType === 'auction' ? '경매물품' : '일반매물'} · {item.sellerName} · {item.brand} · {item.ton} · {item.year} · {item.price}만원
                            </div>
                            {item.saleType === 'auction' ? (
                              <div className="list-meta">
                                시작가 {item.auctionStartPrice}만원 · 현재가 {item.currentBid}만원 · 입찰단위 {item.bidUnit}만원 · 종료 {item.auctionEndsAt}
                              </div>
                            ) : null}
                            <div className="list-meta">{item.description || item.auctionDesc || '설명 없음'}</div>
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

                  <div className="dark-card" style={{ marginTop: 22 }}>
                    <h3 className="flow-title">업체 정보 · 등록 한도 관리</h3>
                    <div className="company-admin-grid" style={{ marginTop: 18 }}>
                      {companies.length ? companies.map((company) => {
                        const usedCount = getCompanyListingCount(company);
                        const limit = getCompanyLimit(company);

                        return (
                          <div key={company.id} className="company-card">
                            <div>
                              <div style={{ fontSize: 20, fontWeight: 900 }}>{company.companyName || '업체명 없음'}</div>
                              <div className="list-meta">담당자: {company.name || '-'}</div>
                              <div className="list-meta">연락처: {company.phone || '-'}</div>
                              <div className="list-meta">이메일: {company.email || '-'}</div>
                              <div className="list-meta">지역: {company.region || '-'} · 업종: {company.businessType || '-'}</div>
                              <div className="list-meta">회원구분: {company.memberType === 'buyer' ? '소비자회원' : '업체회원'} · 권한: {company.role || 'seller'}</div>
                            </div>
                            <div className="limit-control">
                              {company.memberType === 'buyer' ? (
                                <div style={{ fontWeight: 900 }}>소비자회원 · 매물등록 불가</div>
                              ) : (
                                <>
                                  <div style={{ fontWeight: 900 }}>등록 {usedCount}개 / 한도 {limit}개</div>
                                  <select
                                    className="select"
                                    value={limit}
                                    onChange={(e) => updateCompanyLimit(company.id, e.target.value)}
                                  >
                                    {Array.from({ length: MAX_LISTING_LIMIT - DEFAULT_LISTING_LIMIT + 1 }, (_, index) => DEFAULT_LISTING_LIMIT + index).map((num) => (
                                      <option key={num} value={num}>{num}개</option>
                                    ))}
                                  </select>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      }) : <div className="glass-card">가입된 업체가 없습니다.</div>}
                    </div>
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
                  <p>문의: sg00082@naver.com</p>
                </details>

                <details>
                  <summary>통신판매신고번호</summary>
                  <p>제 2019-용인처인-0285호</p>
                  <p>담당자 : 박진홍</p>
                  <p>문의: sg00082@naver.com</p>
                </details>

                <details style={{ marginTop: 10 }}>
                  <summary>이용약관</summary>
                  <p>본 사이트는 중고지게차 매물 정보 제공 플랫폼입니다.</p>
                  <p>허위매물 등록 시 삭제될 수 있습니다.</p>
                  <p>본 사이트는 중고지게차 매물 정보를 제공하는 플랫폼이며,거래의 당사자가 아닙니다.거래 책임은 판매자와 구매자에게 있습니다.</p>
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
