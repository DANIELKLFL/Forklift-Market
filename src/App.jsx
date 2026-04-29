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
  getDoc,
  getDocs,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  limit,
  increment,
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

const BATTERY_GRADE_INFO = {
  '신품': '배터리 교체 후 6개월 이내 또는 신품급 상태입니다. 장시간 작업에 가장 적합합니다.',
  'A급': '사용 가능 시간이 약 80~95% 수준입니다. 일반적인 하루 작업에 무리가 적은 양호한 상태입니다.',
  'B급': '사용 가능 시간이 약 60~80% 수준입니다. 작업은 가능하지만 사용환경에 따라 중간 충전이 필요할 수 있습니다.',
  'C급': '사용 가능 시간이 약 40~60% 수준입니다. 작업 시간이 짧고 배터리 교체를 고려해야 하는 상태입니다.',
  '폐품': '사용 가능 시간이 약 40% 이하이거나 셀 불량 가능성이 높은 상태입니다. 배터리 교체가 필요한 수준입니다.',
};

const initialForm = {
  saleType: 'normal',
  title: '',
  brand: '',
  ton: '',
  year: '',
  mast: '',
  hours: '',
  battery: '',
  option: '',
  price: '',
  dealerPrice: '',
  location: '',
  description: '',
  auctionStartPrice: '',
  buyNowPrice: '',
  bidUnit: '',
  auctionStartDate: '',
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

function getResizedImage(url, size) {
  if (!url || !size) return url;

  try {
    const match = url.match(/\/b\/([^/]+)\/o\/([^?]+)/);
    if (!match) return url;

    const bucket = match[1];
    const filePath = decodeURIComponent(match[2]);
    const resizedPath = filePath.replace(/\.[^/.]+$/, `_${size}.webp`);

    return `https://storage.googleapis.com/${bucket}/${resizedPath}`;
  } catch (error) {
    return url;
  }
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

function makeAuctionSchedule(startDate) {
  if (!startDate) return { auctionStartAt: '', auctionEndsAt: '' };

  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(start.getTime() + 72 * 60 * 60 * 1000);

  const formatLocal = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${h}:${min}`;
  };

  return {
    auctionStartAt: formatLocal(start),
    auctionEndsAt: formatLocal(end),
  };
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

  const goToDetail = () => {
    navigate(`/listing/${item.id}`);
  };
  const isAuction = item.saleType === 'auction';
  const currentPrice = item.currentBid || item.auctionStartPrice || item.price;

  return (
    <div className="listing-card">
      <div className="listing-image">
        {item.imageUrls?.[0] || item.thumbnailUrls?.[0] ? (
          <img
            src={getResizedImage(item.imageUrls?.[0] || item.thumbnailUrls?.[0], '400x400')}
            alt={item.title}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = item.imageUrls?.[0] || item.thumbnailUrls?.[0];
            }}
          />
        ) : '대표 이미지'}
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
            <button type="button" className="btn btn-light" onClick={goToDetail}>
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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageFiles, setImageFiles] = useState([]);
  const [memberType, setMemberType] = useState('seller');
  const [marketVisibleCount, setMarketVisibleCount] = useState(LISTINGS_PAGE_SIZE);
  const [auctionVisibleCount, setAuctionVisibleCount] = useState(LISTINGS_PAGE_SIZE);
  const [editingListingId, setEditingListingId] = useState('');
  const [editForm, setEditForm] = useState(initialForm);
  const [adminMemberFilter, setAdminMemberFilter] = useState('seller');
  const [visitorCount, setVisitorCount] = useState(0);

  const isAdmin = currentUser?.email === 'best@example.com';
  const isSeller = currentCompany?.memberType !== 'buyer' && !!currentCompany;
  const isBuyer = currentCompany?.memberType === 'buyer';

  useEffect(() => {
    document.title = 'FORKLIFT MARKET | 중고지게차 매물 플랫폼';
  }, []);

  useEffect(() => {
    const statRef = doc(db, 'siteStats', 'homepage');

    const unsubStats = onSnapshot(statRef, (snap) => {
      if (snap.exists()) {
        setVisitorCount(Number(snap.data().visitorCount || 0));
      }
    });

    const alreadyCounted = sessionStorage.getItem('forkliftMarketVisited');
    if (!alreadyCounted) {
      sessionStorage.setItem('forkliftMarketVisited', 'yes');
      setDoc(statRef, { visitorCount: increment(1) }, { merge: true }).catch((error) => {
        console.error('방문자 수 업데이트 오류:', error);
      });
    }

    return () => unsubStats();
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

  const serviceCompanies = useMemo(() => {
    return companies.filter((company) => {
      if (company.memberType === 'buyer') return false;
      return company.showAsService === true;
    });
  }, [companies]);

  const serviceCompaniesByRegion = useMemo(() => {
    return serviceCompanies.reduce((acc, company) => {
      const region = company.region || '지역 미등록';
      if (!acc[region]) acc[region] = [];
      acc[region].push(company);
      return acc;
    }, {});
  }, [serviceCompanies]);

  const filteredListings = useMemo(() => {
    const searchWords = keyword
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    return visibleListings.filter((item) => {
      const searchText = [
        item.title,
        item.brand,
        item.ton,
        item.year,
        item.mast,
        item.hours,
        item.battery,
        item.option,
        item.location,
        item.sellerName,
        item.description,
      ]
        .join(' ')
        .toLowerCase();

      const matchKeyword = searchWords.length
        ? searchWords.some((word) => searchText.includes(word))
        : true;

      const matchBrand = brandFilter ? item.brand === brandFilter : true;
      const matchTon = tonFilter ? item.ton === tonFilter : true;
      return matchKeyword && matchBrand && matchTon;
    });
  }, [visibleListings, keyword, brandFilter, tonFilter]);

  const filteredAuctionListings = useMemo(() => {
    const searchWords = keyword
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    return auctionListings.filter((item) => {
      const searchText = [
        item.title,
        item.brand,
        item.ton,
        item.year,
        item.mast,
        item.hours,
        item.battery,
        item.option,
        item.location,
        item.sellerName,
        item.description,
        item.auctionDesc,
      ]
        .join(' ')
        .toLowerCase();

      const matchKeyword = searchWords.length
        ? searchWords.some((word) => searchText.includes(word))
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
        sellerPostingAllowed: memberType === 'seller' ? true : false,
        showAsService: false,
        auctionVerified: memberType === 'buyer' ? false : true,
        bidDepositPaid: memberType === 'buyer' ? false : true,
        bidDepositStatus: memberType === 'buyer' ? 'available' : 'none',
        currentAuctionId: '',
        role: ADMIN_EMAILS.includes(signupForm.email) ? 'admin' : memberType,
        createdAt: serverTimestamp(),
      });
      setSignupForm({ companyName: '', name: '', phone: '', email: '', password: '', region: '', businessType: '' });
      setNotice(memberType === 'seller' ? '업체 회원가입이 완료되었습니다. 기본 매물 등록 한도는 4개입니다.' : '소비자 회원가입이 완료되었습니다. 경매 입찰과 즉시구매가 가능합니다.');
      setActiveTab(memberType === 'seller' ? 'dashboard' : 'market');
    } catch (error) {
      console.error('매물 등록 오류:', error);
      setNotice(error.message || '매물 등록 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
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

  const handleImageFilesChange = async (e) => {
    const pickedFiles = Array.from(e.target.files || []).slice(0, 5);

    if (!pickedFiles.length) {
      setImageFiles([]);
      return;
    }

    try {
      setNotice('사진을 등록 준비 중입니다. 잠시만 기다려주세요.');
      const preparedFiles = await Promise.all(
        pickedFiles.map((file) => compressImageFile(file, 1200, 0.72))
      );
      setImageFiles(preparedFiles);
      setNotice(`${preparedFiles.length}장 사진이 선택되었습니다.`);
    } catch (error) {
      console.error('모바일 사진 준비 오류:', error);
      setImageFiles(pickedFiles);
      setNotice('사진 압축은 건너뛰고 원본 사진으로 등록 준비했습니다.');
    } finally {
      e.target.value = '';
    }
  };

  const handleCreateListing = async (e) => {
    e.preventDefault();

    if (uploading) return;
    setUploading(true);
    setUploadProgress(0);

    let companyForSubmit = currentCompany;

    if (currentUser && !companyForSubmit) {
      try {
        const companySnap = await getDoc(doc(db, 'companies', currentUser.uid));
        if (companySnap.exists()) {
          companyForSubmit = { id: companySnap.id, ...companySnap.data() };
          setCurrentCompany(companyForSubmit);
        }
      } catch (error) {
        console.error('회원정보 재확인 오류:', error);
      }
    }

    if (!currentUser || !companyForSubmit) {
      setNotice('업체 회원정보 확인이 늦어지고 있습니다. 로그인 상태 확인 후 다시 눌러주세요.');
      setActiveTab('seller');
      setUploading(false);
      return;
    }

    if (companyForSubmit.memberType === 'buyer') {
      setNotice('소비자 회원은 매물을 등록할 수 없습니다. 업체회원만 등록 가능합니다.');
      setUploading(false);
      return;
    }

    if (companyForSubmit.sellerPostingAllowed === false) {
      setNotice('관리자에 의해 매물등록이 일시 중지된 업체회원입니다. 관리자에게 문의해주세요.');
      setUploading(false);
      return;
    }

    const currentCount = getCompanyListingCount(companyForSubmit);
    const limit = getCompanyLimit(companyForSubmit);

    if (currentCount >= limit) {
      setNotice(`현재 등록 가능 한도는 ${limit}개입니다. 관리자에게 한도 상향을 요청해주세요.`);
      setUploading(false);
      return;
    }

    if (!listingForm.title || !listingForm.brand || !listingForm.ton || !listingForm.year) {
      setNotice('모델명, 브랜드, 톤수, 연식은 필수입니다.');
      setUploading(false);
      return;
    }

    if (listingForm.saleType === 'normal' && !listingForm.price) {
      setNotice('일반 판매 매물은 판매가를 입력해주세요.');
      setUploading(false);
      return;
    }

    if (listingForm.saleType === 'auction') {
      if (!listingForm.auctionStartPrice || !listingForm.bidUnit || !listingForm.auctionStartDate) {
        setNotice('경매물품은 시작가, 입찰 단위, 경매 시작날짜를 입력해주세요. 경매는 선택한 날짜 낮 12시부터 72시간 진행됩니다.');
        setUploading(false);
        return;
      }
    }

    try {
      const selectedFiles = imageFiles.slice(0, 5);
      let imageUrls = [];
      let thumbnailUrls = [];

      // 1단계: 사진을 먼저 업로드합니다. 그래야 매물 저장 후 사진이 100% 붙습니다.
      if (selectedFiles.length > 0) {
        const uploadedUrls = [];

        for (let index = 0; index < selectedFiles.length; index += 1) {
          const file = selectedFiles[index];
          const timeKey = `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
          const safeImageName = file.name.replace(/[^a-zA-Z0-9가-힣._-]/g, '_');
          const imageRef = ref(storage, `listings/${currentUser.uid}/images/${timeKey}-${safeImageName}`);

          await uploadBytes(imageRef, file);
          const imageUrl = await getDownloadURL(imageRef);
          uploadedUrls.push(imageUrl);
          setUploadProgress(Math.round(((index + 1) / selectedFiles.length) * 100));
        }

        imageUrls = uploadedUrls;
        thumbnailUrls = uploadedUrls;
      }

      const isAuction = listingForm.saleType === 'auction';
      const startPrice = Number(listingForm.auctionStartPrice || 0);
      const auctionSchedule = isAuction ? makeAuctionSchedule(listingForm.auctionStartDate) : { auctionStartAt: null, auctionEndsAt: null };

      // 2단계: 사진 URL을 포함해서 매물을 저장합니다.
      const listingDocRef = await addDoc(collection(db, 'listings'), {
        companyId: companyForSubmit.id,
        authUserId: currentUser.uid,
        sellerName: companyForSubmit.companyName,
        sellerPhone: companyForSubmit.phone || '',
        title: listingForm.title,
        brand: listingForm.brand,
        ton: listingForm.ton,
        year: listingForm.year,
        mast: listingForm.mast,
        hours: listingForm.hours,
        battery: listingForm.battery,
        option: listingForm.option || '',
        price: isAuction ? startPrice : Number(listingForm.price || 0),
        location: listingForm.location,
        description: listingForm.description,
        saleType: listingForm.saleType,
        auctionStartPrice: isAuction ? startPrice : null,
        currentBid: isAuction ? startPrice : null,
        bidUnit: isAuction ? Number(listingForm.bidUnit || 0) : null,
        buyNowPrice: isAuction && listingForm.buyNowPrice ? Number(listingForm.buyNowPrice) : null,
        auctionStartDate: isAuction ? listingForm.auctionStartDate : null,
        auctionStartAt: isAuction ? auctionSchedule.auctionStartAt : null,
        auctionEndsAt: isAuction ? auctionSchedule.auctionEndsAt : null,
        auctionDesc: isAuction ? listingForm.auctionDesc : '',
        bidCount: isAuction ? 0 : null,
        highestBidderId: '',
        highestBidderEmail: '',
        highestBidderName: '',
        auctionStatus: isAuction ? 'scheduled' : null,
        imageUrls,
        thumbnailUrls,
        imageUploadStatus: selectedFiles.length ? 'done' : 'none',
        status: 'pending',
        featured: false,
        createdAt: serverTimestamp(),
      });

      if (listingForm.dealerPrice) {
        await setDoc(doc(db, 'dealerPrices', listingDocRef.id), {
          listingId: listingDocRef.id,
          companyId: companyForSubmit.id,
          authUserId: currentUser.uid,
          dealerPrice: Number(listingForm.dealerPrice),
          createdAt: serverTimestamp(),
        });
      }

      // 3단계: 모든 저장이 끝난 뒤 이동합니다.
      setListingForm(initialForm);
      setImageFiles([]);
      setNotice('매물 등록이 완료되었습니다. 관리자 승인 후 공개됩니다.');
      setActiveTab('dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('매물 등록 오류:', error);
      setNotice(error.message || '매물 등록 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const startEditListing = (item) => {
    if (!currentUser || item.authUserId !== currentUser.uid) {
      setNotice('본인 매물만 수정할 수 있습니다.');
      return;
    }

    setEditingListingId(item.id);
    setEditForm({
      saleType: item.saleType || 'normal',
      title: item.title || '',
      brand: item.brand || '',
      ton: item.ton || '',
      year: item.year || '',
      mast: item.mast || '',
      hours: item.hours || '',
      battery: item.battery || '',
      price: item.saleType === 'auction' ? '' : item.price || '',
      dealerPrice: '',
      location: item.location || '',
      description: item.description || '',
      auctionStartPrice: item.auctionStartPrice || '',
      buyNowPrice: item.buyNowPrice || '',
      bidUnit: item.bidUnit || '',
      auctionStartDate: item.auctionStartDate || '',
      auctionStartAt: item.auctionStartAt || '',
      auctionEndsAt: item.auctionEndsAt || '',
      auctionDesc: item.auctionDesc || '',
    });
  };

  const cancelEditListing = () => {
    setEditingListingId('');
    setEditForm(initialForm);
  };

  const saveEditListing = async (item) => {
    if (!currentUser || item.authUserId !== currentUser.uid) {
      setNotice('본인 매물만 수정할 수 있습니다.');
      return;
    }

    if (!editForm.title || !editForm.brand || !editForm.ton || !editForm.year) {
      setNotice('모델명, 브랜드, 톤수, 연식은 필수입니다.');
      return;
    }

    try {
      const isAuction = item.saleType === 'auction';
      const updateData = {
        title: editForm.title,
        brand: editForm.brand,
        ton: editForm.ton,
        year: editForm.year,
        mast: editForm.mast,
        hours: editForm.hours,
        battery: editForm.battery,
        location: editForm.location,
        description: editForm.description,
      };

      if (isAuction) {
        updateData.auctionStartPrice = Number(editForm.auctionStartPrice || 0);
        updateData.currentBid = Number(item.currentBid || editForm.auctionStartPrice || 0);
        updateData.price = Number(editForm.auctionStartPrice || 0);
        updateData.buyNowPrice = editForm.buyNowPrice ? Number(editForm.buyNowPrice) : null;
        updateData.bidUnit = Number(editForm.bidUnit || 0);
        updateData.auctionStartDate = editForm.auctionStartDate;
        const auctionSchedule = makeAuctionSchedule(editForm.auctionStartDate);
        updateData.auctionStartAt = auctionSchedule.auctionStartAt;
        updateData.auctionEndsAt = auctionSchedule.auctionEndsAt;
        updateData.auctionDesc = editForm.auctionDesc;
      } else {
        updateData.price = Number(editForm.price || 0);
      }

      await updateDoc(doc(db, 'listings', item.id), updateData);

      if (editForm.dealerPrice) {
        await setDoc(doc(db, 'dealerPrices', item.id), {
          listingId: item.id,
          companyId: item.companyId,
          authUserId: currentUser.uid,
          dealerPrice: Number(editForm.dealerPrice),
          updatedAt: serverTimestamp(),
        });
      }

      setNotice('매물이 수정되었습니다.');
      cancelEditListing();
    } catch (error) {
      setNotice(error.message || '매물 수정 중 오류가 발생했습니다.');
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

  const updateCompanyPermission = async (companyId, data, successMessage) => {
    try {
      await updateDoc(doc(db, 'companies', companyId), data);
      setNotice(successMessage);
    } catch (error) {
      setNotice(error.message || '회원 권한 변경 중 오류가 발생했습니다.');
    }
  };

  const deleteCompanyRecord = async (company) => {
    const ok = window.confirm(`${company.companyName || company.email || '회원'} 정보를 삭제할까요?

주의: Firestore 회원정보만 삭제됩니다. Firebase Authentication 로그인 계정은 콘솔에서 별도 삭제가 필요합니다.`);
    if (!ok) return;

    try {
      await deleteDoc(doc(db, 'companies', company.id));
      setNotice('회원 정보가 삭제되었습니다. 로그인 계정은 Firebase Authentication에서 별도 삭제해주세요.');
    } catch (error) {
      setNotice(error.message || '회원 삭제 중 오류가 발생했습니다.');
    }
  };

  const finalizeAuction = async (listing) => {
    const ok = window.confirm('이 경매의 낙찰자를 선정하고 보증금을 정리할까요?');
    if (!ok) return;

    try {
      const bidsSnap = await getDocs(collection(db, 'listings', listing.id, 'bids'));
      const bids = bidsSnap.docs.map((bidDoc) => ({ id: bidDoc.id, ...bidDoc.data() }));

      if (!bids.length) {
        await updateDoc(doc(db, 'listings', listing.id), {
          auctionStatus: 'ended_no_bids',
          status: 'sold',
          winnerId: '',
          winnerEmail: '',
          winningPrice: null,
          finalizedAt: serverTimestamp(),
        });
        setNotice('입찰자가 없어 경매를 종료 처리했습니다.');
        return;
      }

      const winner = bids.reduce((best, bid) => {
        return Number(bid.amount || 0) > Number(best.amount || 0) ? bid : best;
      }, bids[0]);

      await updateDoc(doc(db, 'listings', listing.id), {
        auctionStatus: 'finalized',
        status: 'sold',
        winnerId: winner.userId || '',
        winnerEmail: winner.userEmail || '',
        winnerName: winner.bidderName || '',
        winnerPhone: winner.bidderPhone || '',
        winningPrice: Number(winner.amount || 0),
        finalizedAt: serverTimestamp(),
      });

      const bidderIds = [...new Set(bids.map((bid) => bid.userId).filter(Boolean))];

      await Promise.all(
        bidderIds.map(async (bidderId) => {
          const isWinner = bidderId === winner.userId;
          await updateDoc(doc(db, 'companies', bidderId), {
            bidDepositStatus: isWinner ? 'used' : 'available',
            currentAuctionId: '',
            lastAuctionId: listing.id,
            lastAuctionResult: isWinner ? 'winner' : 'lost',
            lastAuctionUpdatedAt: serverTimestamp(),
          });
        })
      );

      setNotice(`낙찰자 선정 완료: ${winner.userEmail || winner.userId} / ${winner.amount}만원`);
    } catch (error) {
      console.error('낙찰 처리 오류:', error);
      setNotice(error.message || '낙찰 처리 중 오류가 발생했습니다.');
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
            .visitor-badge {
              padding: 11px 18px;
              border-radius: 16px;
              background: rgba(239,68,68,0.18);
              border: 1px solid rgba(239,68,68,0.35);
              color: #fca5a5;
              font-size: 15px;
              font-weight: 900;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              white-space: nowrap;
              word-break: keep-all;
              flex-shrink: 0;
              line-height: 1;
            }
            .visitor-badge-small {
              padding: 9px 14px;
              border-radius: 999px;
              background: rgba(255,255,255,0.06);
              border-color: rgba(255,255,255,0.12);
              color: #fff;
              font-size: 13px;
            }
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
            .listing-image { height: 170px; display: flex; align-items: center; justify-content: center; color: #6b7280; background: linear-gradient(135deg, #222, #080808); font-weight: 700; overflow: hidden; }
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
              .container { width: min(100% - 20px, 1200px); }
              .header-inner { padding: 10px 0; gap: 8px; }
              .logo { font-size: 22px; }
              .logo-sub { font-size: 11px; }
              .nav { width: 100%; overflow-x: auto; flex-wrap: nowrap; padding-bottom: 4px; -webkit-overflow-scrolling: touch; }
              .nav button { white-space: nowrap; padding: 9px 12px; border-radius: 12px; font-size: 13px; }
              .hero { padding: 28px 0 22px; }
              .hero-grid, .feature-grid, .listing-grid, .dashboard-grid, .three-col, .two-col, .filter-grid, .company-card { grid-template-columns: 1fr; }
              .hero h1 { font-size: 34px; }
              .hero p { font-size: 14px; line-height: 1.65; }
              .stats-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
              .section { padding: 24px 0; }
              .section-title { font-size: 28px; }
              .glass-card, .dark-card, .search-panel, .search-panel-inner { border-radius: 20px; padding: 16px; }
              .listing-grid { gap: 14px; }
              .listing-card { border-radius: 20px; }
              .listing-image { height: 150px; }
              .listing-body { padding: 14px; }
              .listing-title { font-size: 20px; margin-top: 10px; }
              .listing-spec-grid { gap: 8px; margin-top: 12px; }
              .spec-box { padding: 10px; border-radius: 14px; }
              .price-value { font-size: 24px; }
              .listing-footer, .list-item { flex-direction: column; align-items: stretch; }
              .listing-footer .btn, .small-actions button { width: 100%; }
              .limit-control { justify-content: flex-start; }
              .field, .select, .textarea { padding: 12px; border-radius: 13px; font-size: 14px; }
              .btn { padding: 12px 15px; border-radius: 13px; }
              .image-preview-grid { grid-template-columns: repeat(3, 1fr); }

              /* 모바일 매물보기: 사진보다 모델명/가격/마스트/배터리 가독성 우선 */
              .visitor-badge {
                font-size: 12px;
                padding: 8px 10px;
                border-radius: 12px;
                min-width: max-content;
              }
              .visitor-badge-small {
                font-size: 12px;
                padding: 8px 10px;
              }
              .listing-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 12px;
              }
              .listing-card {
                display: grid;
                grid-template-columns: 118px minmax(0, 1fr);
                gap: 0;
                border-radius: 18px;
                min-height: 152px;
              }
              .listing-image {
                height: 100%;
                min-height: 152px;
                border-radius: 0;
              }
              .listing-body {
                padding: 12px;
                min-width: 0;
                display: flex;
                flex-direction: column;
              }
              .listing-topline {
                justify-content: flex-start;
                gap: 6px;
              }
              .seller-name { display: none; }
              .badge {
                font-size: 10px;
                padding: 5px 8px;
              }
              .listing-title {
                font-size: 16px;
                line-height: 1.32;
                margin-top: 7px;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
              }
              .listing-spec-grid {
                grid-template-columns: 1fr;
                gap: 5px;
                margin-top: 8px;
              }
              .spec-box {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 10px;
                padding: 6px 8px;
                border-radius: 10px;
              }
              .spec-box span {
                margin-bottom: 0;
                font-size: 10px;
                white-space: nowrap;
              }
              .spec-box strong {
                font-size: 12px;
                text-align: right;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
              .auction-mini {
                grid-template-columns: 1fr;
                gap: 5px;
                margin-top: 8px;
              }
              .auction-mini div {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 7px 8px;
                border-radius: 10px;
              }
              .auction-mini span { margin-bottom: 0; font-size: 10px; }
              .auction-mini strong { font-size: 11px; }
              .listing-footer {
                margin-top: auto;
                padding-top: 8px;
                flex-direction: row;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
              }
              .price-label { display: none; }
              .price-value {
                font-size: 20px;
                line-height: 1.1;
                margin-top: 0;
                white-space: nowrap;
              }
              .listing-footer .btn {
                width: auto;
                padding: 8px 10px;
                border-radius: 10px;
                font-size: 11px;
                white-space: nowrap;
              }
              .listing-footer > div:last-child {
                flex-shrink: 0;
              }

              .app-shell { padding-bottom: 82px; }
              .mobile-bottom-nav {
                position: fixed;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 50;
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 6px;
                padding: 8px 10px calc(8px + env(safe-area-inset-bottom));
                background: rgba(5,5,5,0.96);
                border-top: 1px solid rgba(255,255,255,0.1);
                backdrop-filter: blur(12px);
              }
              .mobile-bottom-nav button {
                border: 1px solid rgba(255,255,255,0.1);
                background: #151515;
                color: #e5e7eb;
                border-radius: 14px;
                padding: 10px 6px;
                font-size: 12px;
                font-weight: 900;
              }
              .mobile-bottom-nav button.active { background: #dc2626; color: #fff; border-color: #dc2626; }
              .mobile-register-submit {
                position: sticky;
                bottom: 78px;
                z-index: 15;
                box-shadow: 0 -10px 24px rgba(0,0,0,0.32);
              }
              input[type="file"].field { padding: 14px; background: #111; border: 1px dashed rgba(239,68,68,0.45); }
            }
            @media (min-width: 721px) {
              .mobile-bottom-nav { display: none; }
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
                  <div className="visitor-badge">
                    방문자 {visitorCount.toLocaleString()}명
                  </div>
                  {[
                    ['home', '홈'],
                    ['market', '매물보기'],
                    ['auction', '경매물품'],
                    ['service', 'A/S업체'],
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
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div className="pill">업체 회원가입 · 매물 등록 · 경매 입찰</div>
                        <div className="visitor-badge visitor-badge-small">
                          방문자 {visitorCount.toLocaleString()}명
                        </div>
                      </div>
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

            {activeTab === 'service' && (
              <section className="section">
                <div className="container">
                  <SectionTitle eyebrow="A/S Network" title="지역별 지게차 A/S 전문업체" subtitle="FORKLIFT MARKET에 등록된 업체를 지역별로 확인하고 바로 전화 문의할 수 있습니다." />

                  {Object.keys(serviceCompaniesByRegion).length ? (
                    <div className="list-stack">
                      {Object.entries(serviceCompaniesByRegion).map(([region, rows]) => (
                        <div key={region} className="dark-card">
                          <h3 className="flow-title">{region}</h3>
                          <div className="company-admin-grid" style={{ marginTop: 18 }}>
                            {rows.map((company) => (
                              <div key={company.id} className="company-card">
                                <div>
                                  <div style={{ fontSize: 20, fontWeight: 900 }}>{company.companyName || '업체명 없음'}</div>
                                  <div className="list-meta">업무: {company.businessType || 'A/S · 정비 · 매매'}</div>
                                  <div className="list-meta">담당자: {company.name || '-'}</div>
                                  <div className="list-meta">지역: {company.region || '-'}</div>
                                </div>
                                <div className="limit-control">
                                  {company.phone ? (
                                    <a
                                      href={`tel:${company.phone}`}
                                      className="btn btn-primary"
                                      style={{ color: '#fff', textDecoration: 'none' }}
                                    >
                                      전화문의 {company.phone}
                                    </a>
                                  ) : (
                                    <div className="list-meta">연락처 미등록</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="glass-card">아직 등록된 A/S 전문업체가 없습니다.</div>
                  )}
                </div>
              </section>
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
                        <input
                          className="field"
                          value={listingForm.brand}
                          onChange={(e) => setListingForm({ ...listingForm, brand: e.target.value.replace(/[^가-힣ㄱ-ㅎㅏ-ㅣ\s]/g, '') })}
                          placeholder="브랜드 (한글만 입력)"
                        />
                        <input
                          className="field"
                          value={listingForm.ton}
                          onChange={(e) => setListingForm({ ...listingForm, ton: e.target.value.replace(/[^0-9.톤tT\-+\s]/g, '') })}
                          placeholder="톤수 (예: 2.5톤)"
                        />
                      </div>
                      <div className="two-col">
                        <input
                          className="field"
                          value={listingForm.year}
                          onChange={(e) => setListingForm({ ...listingForm, year: e.target.value.replace(/[^0-9]/g, '') })}
                          placeholder="연식 (숫자만 입력, 예: 2018)"
                          inputMode="numeric"
                        />
                        <select
                          className="select"
                          value={listingForm.mast}
                          onChange={(e) => setListingForm({ ...listingForm, mast: e.target.value })}
                        >
                          <option value="">마스트 선택</option>
                          <option value="2단 3M">2단 3M</option>
                          <option value="2단 3.3M">2단 3.3M</option>
                          <option value="2단 4M">2단 4M</option>
                          <option value="3단 4M">3단 4M</option>
                          <option value="3단 4.3M">3단 4.3M</option>
                          <option value="3단 4.5M">3단 4.5M</option>
                          <option value="3단 5M">3단 5M</option>
                          <option value="기타">기타</option>
                        </select>
                      </div>
                      <div className="two-col">
                        <input
                          className="field"
                          value={listingForm.hours}
                          onChange={(e) => setListingForm({ ...listingForm, hours: e.target.value.replace(/[^0-9]/g, '') })}
                          placeholder="가동시간 (숫자만 입력)"
                          inputMode="numeric"
                        />
                        <input
                          className="field"
                          value={listingForm.location}
                          onChange={(e) => setListingForm({ ...listingForm, location: e.target.value.replace(/[^가-힣ㄱ-ㅎㅏ-ㅣ\s]/g, '') })}
                          placeholder="지역 (한글만 입력)"
                        />
                      </div>
                      <div className="two-col">
                        <div>
                          <select
                            className="select"
                            value={listingForm.battery}
                            onChange={(e) => setListingForm({ ...listingForm, battery: e.target.value })}
                          >
                            <option value="">배터리 상태 선택</option>
                            <option value="신품">신품</option>
                            <option value="A급">A급</option>
                            <option value="B급">B급</option>
                            <option value="C급">C급</option>
                            <option value="폐품">폐품</option>
                          </select>
                          {listingForm.battery && (
                            <div className="list-meta" style={{ marginTop: 8, lineHeight: 1.6 }}>
                              소비자 기준: {BATTERY_GRADE_INFO[listingForm.battery]}
                            </div>
                          )}
                        </div>
                        <select
                          className="select"
                          value={listingForm.option || ''}
                          onChange={(e) => setListingForm({ ...listingForm, option: e.target.value })}
                        >
                          <option value="">주요옵션 선택</option>
                          <option value="사이드쉬프트">사이드쉬프트</option>
                          <option value="포크포지셔너(양개)">포크포지셔너(양개)</option>
                          <option value="포크포지셔너(편개)">포크포지셔너(편개)</option>
                          <option value="복합형">복합형</option>
                        </select>
                      </div>

                      {listingForm.saleType === 'normal' ? (
                        <div className="grid-gap">
                          <input
                            className="field"
                            value={listingForm.price}
                            onChange={(e) => setListingForm({ ...listingForm, price: e.target.value.replace(/[^0-9]/g, '') })}
                            placeholder="소비자 판매가 입력 (만원 단위, 숫자만)"
                            type="number"
                          />
                          <input
                            className="field"
                            value={listingForm.dealerPrice}
                            onChange={(e) => setListingForm({ ...listingForm, dealerPrice: e.target.value.replace(/[^0-9]/g, '') })}
                            placeholder="업체가 입력 (만원 단위, 숫자만)"
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
                              onChange={(e) => setListingForm({ ...listingForm, dealerPrice: e.target.value.replace(/[^0-9]/g, '') })}
                            placeholder="업체가 입력 (만원 단위, 숫자만)"
                              type="number"
                            />
                            <input
                              className="field"
                              value={listingForm.bidUnit}
                              onChange={(e) => setListingForm({ ...listingForm, bidUnit: e.target.value })}
                              placeholder="입찰 단위 (만원) 예: 10"
                              type="number"
                            />
                            <div>
                              <div className="list-meta" style={{ marginBottom: 6 }}>경매 시작날짜</div>
                              <input
                                className="field"
                                value={listingForm.auctionStartDate}
                                onChange={(e) => setListingForm({ ...listingForm, auctionStartDate: e.target.value })}
                                type="date"
                              />
                              <div className="list-meta" style={{ marginTop: 8, lineHeight: 1.6 }}>
                                경매는 선택한 날짜 낮 12시부터 자동 시작되며 72시간 동안 진행됩니다.
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
                        onChange={handleImageFilesChange}
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
                      <button className="btn btn-primary mobile-register-submit" disabled={uploading} type="submit">
                        {uploading ? '매물 등록 중입니다...' : '매물 등록 신청'}
                      </button>

                      {uploading && (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ height: 8, background: 'rgba(255,255,255,0.12)', borderRadius: 999, overflow: 'hidden' }}>
                            <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#dc2626', transition: 'width 0.2s ease' }} />
                          </div>
                          <div className="list-meta" style={{ marginTop: 6 }}>
                            사진 압축과 업로드를 진행 중입니다. 완료되면 자동으로 내 매물관리로 이동합니다.
                          </div>
                        </div>
                      )}
                    </form>
                    <div className="glass-card">
                      <h3 className="flow-title">등록 안내</h3>
                      <div style={{ marginTop: 18, color: '#d1d5db', lineHeight: 1.9 }}>
                        <p>업체 회원은 일반 판매와 경매 판매를 선택해 등록할 수 있습니다.</p>
                        <p>배터리 등급은 소비자 기준으로 표시됩니다: 신품(신품급), A급(80~95%), B급(60~80%), C급(40~60%), 폐품(40% 이하).</p>
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
                              <button onClick={() => startEditListing(item)}>수정</button>
                              <button onClick={() => updateMyListingStatus(item.id, 'sold')}>판매완료</button>
                              <button onClick={() => deleteListing(item.id)}>삭제</button>
                            </div>
                          </div>
                          {editingListingId === item.id && (
                            <div className="glass-card" style={{ marginTop: 14, width: '100%' }}>
                              <h3 className="flow-title">매물 수정</h3>
                              <div className="grid-gap" style={{ marginTop: 14 }}>
                                <input className="field" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} placeholder="모델명" />
                                <div className="two-col">
                                  <input className="field" value={editForm.brand} onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })} placeholder="브랜드" />
                                  <input className="field" value={editForm.ton} onChange={(e) => setEditForm({ ...editForm, ton: e.target.value })} placeholder="톤수" />
                                </div>
                                <div className="two-col">
                                  <input className="field" value={editForm.year} onChange={(e) => setEditForm({ ...editForm, year: e.target.value })} placeholder="연식" />
                                  <input className="field" value={editForm.mast} onChange={(e) => setEditForm({ ...editForm, mast: e.target.value })} placeholder="마스트" />
                                </div>
                                <div className="two-col">
                                  <input className="field" value={editForm.hours} onChange={(e) => setEditForm({ ...editForm, hours: e.target.value })} placeholder="가동시간" />
                                  <input className="field" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} placeholder="지역" />
                                </div>
                                <input className="field" value={editForm.battery} onChange={(e) => setEditForm({ ...editForm, battery: e.target.value })} placeholder="배터리 상태 / 옵션" />

                                {item.saleType === 'auction' ? (
                                  <div className="grid-gap">
                                    <div className="two-col">
                                      <input className="field" value={editForm.auctionStartPrice} onChange={(e) => setEditForm({ ...editForm, auctionStartPrice: e.target.value })} placeholder="시작가" type="number" />
                                      <input className="field" value={editForm.buyNowPrice} onChange={(e) => setEditForm({ ...editForm, buyNowPrice: e.target.value })} placeholder="즉시구매가" type="number" />
                                    </div>
                                    <input className="field" value={editForm.bidUnit} onChange={(e) => setEditForm({ ...editForm, bidUnit: e.target.value })} placeholder="입찰 단위" type="number" />
                                    <div>
                                      <div className="list-meta" style={{ marginBottom: 6 }}>경매 시작날짜</div>
                                      <input className="field" value={editForm.auctionStartDate} onChange={(e) => setEditForm({ ...editForm, auctionStartDate: e.target.value })} type="date" />
                                      <div className="list-meta" style={{ marginTop: 8 }}>선택한 날짜 낮 12시부터 72시간 진행됩니다.</div>
                                    </div>
                                    <textarea className="textarea" value={editForm.auctionDesc} onChange={(e) => setEditForm({ ...editForm, auctionDesc: e.target.value })} placeholder="경매 설명" />
                                  </div>
                                ) : (
                                  <input className="field" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} placeholder="판매가" type="number" />
                                )}

                                <input className="field" value={editForm.dealerPrice} onChange={(e) => setEditForm({ ...editForm, dealerPrice: e.target.value })} placeholder="업체가 새로 입력 / 변경할 때만 입력" type="number" />
                                <textarea className="textarea" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="매물 설명" />
                                <div className="small-actions">
                                  <button onClick={() => saveEditListing(item)}>저장</button>
                                  <button onClick={cancelEditListing}>취소</button>
                                </div>
                              </div>
                            </div>
                          )}
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
                    <h3 className="flow-title">경매 낙찰 관리</h3>
                    <div className="list-stack" style={{ marginTop: 18 }}>
                      {auctionListings.length ? auctionListings.map((item) => {
                        const ended = item.auctionEndsAt ? new Date(item.auctionEndsAt).getTime() <= Date.now() : false;
                        return (
                          <div key={item.id} className="list-item">
                            <div>
                              <div style={{ fontSize: 20, fontWeight: 900 }}>{item.title}</div>
                              <div className="list-meta">입찰수 {item.bidCount || 0}회 · 종료 {item.auctionEndsAt || '미정'} · 상태 {item.auctionStatus || '-'}</div>
                              {item.winnerEmail ? (
                                <div className="list-meta" style={{ color: '#fca5a5' }}>
                                  낙찰자: {item.winnerEmail} · 낙찰가: {item.winningPrice}만원 · 연락처: {item.winnerPhone || '-'}
                                </div>
                              ) : null}
                            </div>
                            <div className="small-actions">
                              <button
                                onClick={() => finalizeAuction(item)}
                                disabled={!ended || item.auctionStatus === 'finalized'}
                              >
                                {item.auctionStatus === 'finalized' ? '낙찰완료' : ended ? '낙찰자 선정' : '진행중'}
                              </button>
                            </div>
                          </div>
                        );
                      }) : <div className="glass-card">관리할 경매가 없습니다.</div>}
                    </div>
                  </div>

                  <div className="dark-card" style={{ marginTop: 22 }}>
                    <h3 className="flow-title">회원 정보 · 권한 관리</h3>
                    <div className="small-actions" style={{ marginTop: 14, marginBottom: 14 }}>
                      <button
                        onClick={() => setAdminMemberFilter('seller')}
                        style={{ background: adminMemberFilter === 'seller' ? '#dc2626' : 'transparent' }}
                      >
                        업체회원 보기
                      </button>
                      <button
                        onClick={() => setAdminMemberFilter('buyer')}
                        style={{ background: adminMemberFilter === 'buyer' ? '#dc2626' : 'transparent' }}
                      >
                        소비자회원 보기
                      </button>
                      <button
                        onClick={() => setAdminMemberFilter('all')}
                        style={{ background: adminMemberFilter === 'all' ? '#dc2626' : 'transparent' }}
                      >
                        전체 보기
                      </button>
                    </div>
                    <div className="company-admin-grid" style={{ marginTop: 18 }}>
                      {companies.filter((company) => {
                        if (adminMemberFilter === 'all') return true;
                        if (adminMemberFilter === 'buyer') return company.memberType === 'buyer';
                        return company.memberType !== 'buyer';
                      }).length ? companies.filter((company) => {
                        if (adminMemberFilter === 'all') return true;
                        if (adminMemberFilter === 'buyer') return company.memberType === 'buyer';
                        return company.memberType !== 'buyer';
                      }).map((company) => {
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
                                <div style={{ display: 'grid', gap: 10, justifyItems: 'end' }}>
                                  <div style={{ fontWeight: 900 }}>소비자회원 · 경매참여 관리</div>
                                  <div className="list-meta">
                                    경매인증: {company.auctionVerified ? '완료' : '미완료'} · 보증금: {company.bidDepositPaid ? '확인완료' : '미확인'}
                                  </div>
                                  <div className="small-actions" style={{ justifyContent: 'flex-end' }}>
                                    <button
                                      onClick={() => updateCompanyPermission(
                                        company.id,
                                        { auctionVerified: !company.auctionVerified },
                                        company.auctionVerified ? '경매 인증을 해제했습니다.' : '경매 인증을 완료했습니다.'
                                      )}
                                    >
                                      {company.auctionVerified ? '경매인증 해제' : '경매인증 승인'}
                                    </button>
                                    <button
                                      onClick={() => updateCompanyPermission(
                                        company.id,
                                        { bidDepositPaid: !company.bidDepositPaid },
                                        company.bidDepositPaid ? '입찰보증금 확인을 해제했습니다.' : '입찰보증금 확인 완료 처리했습니다.'
                                      )}
                                    >
                                      {company.bidDepositPaid ? '보증금 해제' : '보증금 확인'}
                                    </button>
                                    <button onClick={() => deleteCompanyRecord(company)}>
                                      회원정보 삭제
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div style={{ fontWeight: 900 }}>등록 {usedCount}개 / 한도 {limit}개</div>
                                  <div className="list-meta">
                                    등록권한: {company.sellerPostingAllowed === false ? '중지' : '허용'} · A/S노출: {company.showAsService ? '노출중' : '숨김'}
                                  </div>
                                  <button
                                    onClick={() => updateCompanyPermission(
                                      company.id,
                                      { showAsService: company.showAsService ? false : true },
                                      company.showAsService ? 'A/S업체 노출을 해제했습니다.' : 'A/S업체로 노출했습니다.'
                                    )}
                                  >
                                    {company.showAsService ? 'A/S 숨김' : 'A/S 노출'}
                                  </button>
                                  <button
                                    onClick={() => updateCompanyPermission(
                                      company.id,
                                      { sellerPostingAllowed: company.sellerPostingAllowed === false ? true : false },
                                      company.sellerPostingAllowed === false ? '업체 매물등록을 허용했습니다.' : '업체 매물등록을 중지했습니다.'
                                    )}
                                  >
                                    {company.sellerPostingAllowed === false ? '등록 허용' : '등록 중지'}
                                  </button>
                                  <select
                                    className="select"
                                    value={limit}
                                    onChange={(e) => updateCompanyLimit(company.id, e.target.value)}
                                  >
                                    {Array.from({ length: MAX_LISTING_LIMIT - DEFAULT_LISTING_LIMIT + 1 }, (_, index) => DEFAULT_LISTING_LIMIT + index).map((num) => (
                                      <option key={num} value={num}>{num}개</option>
                                    ))}
                                  </select>
                                  <button onClick={() => deleteCompanyRecord(company)}>
                                    회원정보 삭제
                                  </button>
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

            <div className="mobile-bottom-nav">
              <button className={activeTab === 'home' ? 'active' : ''} onClick={() => setActiveTab('home')}>홈</button>
              <button className={activeTab === 'market' ? 'active' : ''} onClick={() => setActiveTab('market')}>매물</button>
              <button className={activeTab === 'auction' ? 'active' : ''} onClick={() => setActiveTab('auction')}>경매</button>
              <button
                className={activeTab === 'register' ? 'active' : ''}
                onClick={() => setActiveTab(isSeller || isAdmin ? 'register' : 'seller')}
              >등록</button>
            </div>

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
