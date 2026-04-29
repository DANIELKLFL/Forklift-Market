import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  doc,
  onSnapshot,
  collection,
  runTransaction,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

const ADMIN_EMAILS = ['best@example.com'];

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
  const diff = new Date(endTime).getTime() - Date.now();
  if (Number.isNaN(diff)) return '종료일 미정';
  if (diff <= 0) return '경매 종료';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff / 3600000) % 24);
  const m = Math.floor((diff / 60000) % 60);
  if (d > 0) return `${d}일 ${h}시간 남음`;
  if (h > 0) return `${h}시간 ${m}분 남음`;
  return `${m}분 남음`;
}

function getAuctionPermissionMessage(user, company, item) {
  if (!user) return '로그인 후 입찰할 수 있습니다.';
  if (!company) return '회원정보 확인 후 입찰할 수 있습니다.';
  if (company.memberType !== 'buyer') return '경매 입찰은 인증된 소비자회원만 가능합니다.';
  if (!company.auctionVerified) return '관리자 경매인증 완료 후 입찰할 수 있습니다.';
  if (!company.bidDepositPaid) return '입찰보증금 확인 완료 후 입찰할 수 있습니다.';
  if (
    company.bidDepositStatus === 'locked' &&
    company.currentAuctionId &&
    company.currentAuctionId !== item?.id
  ) {
    return '이미 다른 경매에 참여 중입니다. 해당 경매 종료 후 다시 참여할 수 있습니다.';
  }
  if (company.bidDepositStatus === 'used') {
    return '낙찰 처리된 보증금입니다. 관리자 확인 후 다시 참여할 수 있습니다.';
  }
  if (item?.authUserId === user.uid) return '본인이 등록한 경매에는 입찰할 수 없습니다.';
  return '';
}

export default function ListingDetail() {
  const { id } = useParams();

  const [item, setItem] = useState(null);
  const [user, setUser] = useState(null);
  const [currentCompany, setCurrentCompany] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [notice, setNotice] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [dealerPrice, setDealerPrice] = useState(null);

  const touchStartX = useRef(0);
  const pinchStartDistance = useRef(null);
  const pinchStartZoom = useRef(1);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u || null));
  }, []);

  useEffect(() => {
    if (!user) {
      setCurrentCompany(null);
      return;
    }

    return onSnapshot(doc(db, 'companies', user.uid), (snap) => {
      setCurrentCompany(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
  }, [user]);

  useEffect(() => {
    return onSnapshot(doc(db, 'listings', id), (snap) => {
      setItem(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
  }, [id]);

  useEffect(() => {
    const isAdminUser = ADMIN_EMAILS.includes(user?.email || '');
    const allowedSeller = currentCompany?.memberType === 'seller' &&
      (currentCompany?.sellerPostingAllowed === true || currentCompany?.auctionPostingAllowed === true);

    if (!id || (!isAdminUser && !allowedSeller)) {
      setDealerPrice(null);
      return;
    }

    getDoc(doc(db, 'dealerPrices', id))
      .then((snap) => {
        setDealerPrice(snap.exists() ? snap.data().dealerPrice : null);
      })
      .catch((error) => {
        console.error('업자가격 조회 권한 오류:', error);
        setDealerPrice(null);
      });
  }, [id, user?.email, currentCompany?.memberType, currentCompany?.sellerPostingAllowed, currentCompany?.auctionPostingAllowed]);

  const images = item?.imageUrls || [];
  const thumbs = item?.thumbnailUrls?.length ? item.thumbnailUrls : images;

  const openViewer = (index) => {
    setCurrentIndex(index);
    setZoom(1);
    setViewerOpen(true);
  };

  const movePrev = () => {
    setZoom(1);
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const moveNext = () => {
    setZoom(1);
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const getDistance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleBid = async () => {
    const permissionMessage = getAuctionPermissionMessage(user, currentCompany, item);

    if (permissionMessage) {
      setNotice(permissionMessage);
      return;
    }

    if (item?.auctionEndsAt && new Date(item.auctionEndsAt).getTime() <= Date.now()) {
      setNotice('이미 종료된 경매입니다.');
      return;
    }

    const bidNumber = Number(bidAmount);

    if (!bidNumber || bidNumber <= 0) {
      setNotice('입찰 금액을 입력해주세요.');
      return;
    }

    try {
      const listingRef = doc(db, 'listings', id);
      const companyRef = doc(db, 'companies', user.uid);
      const bidRef = doc(collection(db, 'listings', id, 'bids'));

      await runTransaction(db, async (tx) => {
        const listingSnap = await tx.get(listingRef);
        const companySnap = await tx.get(companyRef);

        if (!listingSnap.exists()) throw new Error('매물을 찾을 수 없습니다.');
        if (!companySnap.exists()) throw new Error('회원정보를 찾을 수 없습니다.');

        const data = listingSnap.data();
        const company = companySnap.data();

        const innerPermission = getAuctionPermissionMessage(
          user,
          { id: user.uid, ...company },
          { id, ...data }
        );

        if (innerPermission) throw new Error(innerPermission);

        if (data.auctionEndsAt && new Date(data.auctionEndsAt).getTime() <= Date.now()) {
          throw new Error('이미 종료된 경매입니다.');
        }

        tx.update(companyRef, {
          bidDepositStatus: 'locked',
          currentAuctionId: id,
          currentAuctionTitle: data.title || '',
          bidDepositLockedAt: serverTimestamp(),
        });

        tx.update(listingRef, {
          bidCount: Number(data.bidCount || 0) + 1,
          lastBidAt: serverTimestamp(),
        });

        tx.set(bidRef, {
          amount: bidNumber,
          userId: user.uid,
          userEmail: user.email,
          bidderName: company.name || '',
          bidderPhone: company.phone || '',
          memberType: company.memberType || 'buyer',
          createdAt: serverTimestamp(),
        });
      });

      setBidAmount('');
      setNotice('입찰이 완료되었습니다. 입찰금액은 관리자만 확인할 수 있습니다.');
    } catch (error) {
      setNotice(error.message || '입찰 중 오류가 발생했습니다.');
    }
  };

  if (!item) {
    return (
      <div style={{ padding: 40, background: '#0a0a0a', color: '#fff' }}>
        로딩중...
      </div>
    );
  }

  const isAuction = item.saleType === 'auction';
  const isAuctionEnded = item.auctionEndsAt
    ? new Date(item.auctionEndsAt).getTime() <= Date.now()
    : false;

  const auctionPermissionMessage = getAuctionPermissionMessage(user, currentCompany, item);
  const isAdmin = ADMIN_EMAILS.includes(user?.email || '');
  const canViewDealerPrice = isAdmin || (
    currentCompany?.memberType === 'seller' &&
    (currentCompany?.sellerPostingAllowed === true || currentCompany?.auctionPostingAllowed === true)
  );

  const specRows = [
    ['브랜드', item.brand || '-'],
    ['톤수', item.ton || '-'],
    ['연식', item.year ? `${item.year}년식` : '-'],
    ['마스트', item.mast || '-'],
    ['가동시간', item.hours || '-'],
    ['지역', item.location || '-'],
    ['배터리', item.battery || '-'],
    ['옵션', item.option || '-'],
  ];

  return (
    <div className="detail-page">
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #0a0a0a; color: #fff; font-family: Arial, sans-serif; }
        .detail-page { min-height: 100vh; background: linear-gradient(180deg, #080808 0%, #111 100%); color: #fff; padding: 28px 0 110px; }
        .detail-container { width: min(1100px, calc(100% - 32px)); margin: 0 auto; }
        .back-link { display: inline-flex; align-items: center; gap: 6px; color: #fca5a5; text-decoration: none; font-weight: 900; margin-bottom: 18px; }
        .detail-hero { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 24px; align-items: start; }
        .photo-card, .info-card, .auction-card, .desc-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 28px; overflow: hidden; box-shadow: 0 18px 40px rgba(0,0,0,0.28); }
        .main-photo { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; display: block; background: #111; cursor: pointer; }
        .no-photo { aspect-ratio: 4 / 3; display: grid; place-items: center; color: #6b7280; background: #111; font-weight: 900; }
        .thumb-row { display: flex; gap: 10px; overflow-x: auto; padding: 12px; background: #0d0d0d; -webkit-overflow-scrolling: touch; }
        .thumb-img { flex: 0 0 auto; width: 76px; height: 64px; border-radius: 12px; object-fit: cover; cursor: pointer; border: 2px solid transparent; opacity: 0.72; }
        .thumb-img.active { border-color: #ef4444; opacity: 1; }
        .info-card { padding: 24px; }
        .badge-line { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .badge { display: inline-flex; padding: 8px 12px; border-radius: 999px; background: rgba(239,68,68,0.16); color: #fca5a5; font-size: 12px; font-weight: 900; }
        .title { margin: 16px 0 0; font-size: clamp(28px, 5vw, 46px); line-height: 1.12; letter-spacing: -0.04em; }
        .price { margin-top: 18px; color: #ef4444; font-size: 34px; font-weight: 900; }
        .spec-grid { margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .spec-box { padding: 14px; border-radius: 18px; background: rgba(255,255,255,0.055); }
        .spec-box span { display: block; color: #9ca3af; font-size: 12px; margin-bottom: 6px; }
        .spec-box strong { font-size: 15px; line-height: 1.35; }
        .desc-card, .auction-card { padding: 24px; margin-top: 22px; }
        .section-title { margin: 0 0 14px; font-size: 22px; font-weight: 900; }
        .desc-text { color: #d1d5db; white-space: pre-wrap; line-height: 1.85; margin: 0; }
        .notice-box { margin-bottom: 16px; padding: 15px; border-radius: 16px; background: rgba(220,38,38,0.14); color: #fecaca; line-height: 1.7; border: 1px solid rgba(220,38,38,0.22); }
        .auction-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 14px; }
        .bid-input { width: 100%; margin-top: 14px; padding: 15px; border-radius: 14px; background: #050505; color: #fff; border: 1px solid #333; font: inherit; }
        .primary-btn { width: 100%; margin-top: 12px; padding: 16px; border-radius: 16px; border: none; background: #dc2626; color: #fff; font-weight: 900; font-size: 16px; cursor: pointer; }
        .bottom-cta { position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; background: rgba(5,5,5,0.96); border-top: 1px solid rgba(255,255,255,0.1); padding: 10px 14px calc(10px + env(safe-area-inset-bottom)); backdrop-filter: blur(12px); }
        .bottom-cta-inner { width: min(1100px, 100%); margin: 0 auto; display: grid; grid-template-columns: 1fr 1.1fr; gap: 10px; align-items: center; }
        .bottom-price { font-size: 18px; font-weight: 900; color: #ef4444; }
        .call-btn { display: inline-flex; align-items: center; justify-content: center; padding: 15px; border-radius: 16px; background: #dc2626; color: #fff; text-decoration: none; font-weight: 900; }
        .viewer { position: fixed; inset: 0; background: rgba(0,0,0,0.96); z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 18px; }
        .viewer-btn { position: absolute; background: transparent; color: #fff; border: none; cursor: pointer; }
        .viewer-close { top: 16px; right: 20px; font-size: 34px; }
        .viewer-prev { left: 16px; font-size: 50px; }
        .viewer-next { right: 16px; font-size: 50px; }
        .viewer-img { max-width: 92%; max-height: 74%; object-fit: contain; transition: transform 0.12s ease; }
        .viewer-thumbs { display: flex; gap: 8px; margin-top: 18px; max-width: 92%; overflow-x: auto; }
        .viewer-thumb { width: 64px; height: 64px; object-fit: cover; border-radius: 9px; cursor: pointer; border: 2px solid #333; opacity: 0.65; }
        .viewer-thumb.active { border-color: #ef4444; opacity: 1; }
        @media (max-width: 760px) {
          .detail-page { padding: 14px 0 108px; }
          .detail-container { width: min(100% - 20px, 1100px); }
          .detail-hero { grid-template-columns: 1fr; gap: 14px; }
          .photo-card, .info-card, .auction-card, .desc-card { border-radius: 20px; }
          .info-card, .auction-card, .desc-card { padding: 16px; }
          .main-photo, .no-photo { aspect-ratio: 1 / 0.82; }
          .title { font-size: 28px; }
          .price { font-size: 28px; margin-top: 14px; }
          .spec-grid, .auction-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
          .spec-box { padding: 12px; border-radius: 14px; }
          .thumb-img { width: 68px; height: 58px; }
          .bottom-cta-inner { grid-template-columns: 0.9fr 1.1fr; }
          .viewer-prev, .viewer-next { display: none; }
          .viewer-img { max-width: 96%; max-height: 70%; }
        }
      `}</style>

      <div className="detail-container">
        <Link to="/" className="back-link">← 홈으로</Link>

        {notice && <div className="notice-box">{notice}</div>}

        <div className="detail-hero">
          <div className="photo-card">
            {images.length > 0 ? (
              <>
                <img
                  className="main-photo"
                  src={getResizedImage(images[currentIndex] || images[0], '900x900')}
                  alt={`${item.title} 대표 이미지`}
                  loading="eager"
                  onClick={() => openViewer(currentIndex)}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = images[currentIndex] || images[0];
                  }}
                />
                {thumbs.length > 1 && (
                  <div className="thumb-row">
                    {thumbs.map((url, i) => {
                      const originalUrl = images[i] || url;
                      const thumbUrl = getResizedImage(originalUrl, '400x400');
                      return (
                        <img
                          key={`${url}-${i}`}
                          className={`thumb-img ${currentIndex === i ? 'active' : ''}`}
                          src={thumbUrl}
                          alt={`${item.title} 썸네일 ${i + 1}`}
                          onClick={() => {
                            setCurrentIndex(i);
                            setZoom(1);
                          }}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = originalUrl;
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="no-photo">대표 이미지 없음</div>
            )}
          </div>

          <div className="info-card">
            <div className="badge-line">
              <span className="badge">{isAuction ? '비공개 경매' : '일반 판매'}</span>
              {item.sellerName ? <span className="badge">{item.sellerName}</span> : null}
            </div>
            <h1 className="title">{item.title}</h1>
            <div className="price">
              {isAuction ? (isAuctionEnded ? '경매 종료' : `시작가 ${item.auctionStartPrice || item.price || '-'}만원`) : `판매가 ${item.price || '-'}만원`}
            </div>
            {canViewDealerPrice && dealerPrice ? (
              <div className="dealer-price-box">업자 전용가 {Number(dealerPrice).toLocaleString()}만원</div>
            ) : null}

            <div className="spec-grid">
              {specRows.map(([label, value]) => (
                <div className="spec-box" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="desc-card">
          <h2 className="section-title">매물 설명</h2>
          <p className="desc-text">{item.description || '등록된 상세 설명이 없습니다.'}</p>
        </div>

        {isAuction && (
          <div className="auction-card">
            <h2 className="section-title">비공개 입찰</h2>
            <div className="notice-box">
              경매 입찰은 <b>관리자 인증 완료</b> 및 <b>입찰보증금 확인 완료</b>된 소비자회원만 가능합니다.
              입찰 참여 시 보증금은 해당 경매에 잠기며, 다른 경매에는 중복 참여할 수 없습니다.
            </div>

            <div className="auction-grid">
              <div className="spec-box"><span>입찰 수</span><strong>{item.bidCount || 0}회</strong></div>
              <div className="spec-box"><span>입찰 단위</span><strong>{item.bidUnit || '-'}만원</strong></div>
              <div className="spec-box"><span>경매 시작</span><strong>{item.auctionStartAt || '미정'}</strong></div>
              <div className="spec-box"><span>남은시간</span><strong>{getTimeLeftText(item.auctionEndsAt)}</strong></div>
            </div>

            {!isAuctionEnded && !auctionPermissionMessage ? (
              <>
                <input
                  className="bid-input"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder="입찰 금액 입력 (만원)"
                  type="number"
                  inputMode="numeric"
                />
                <button className="primary-btn" onClick={handleBid}>입찰하기</button>
              </>
            ) : (
              <div className="notice-box" style={{ marginTop: 16, marginBottom: 0, textAlign: 'center', fontWeight: 900 }}>
                {isAuctionEnded ? '경매가 종료되었습니다.' : auctionPermissionMessage}
              </div>
            )}
          </div>
        )}
      </div>

      {item.sellerPhone && (
        <div className="bottom-cta">
          <div className="bottom-cta-inner">
            <div>
              <div style={{ color: '#9ca3af', fontSize: 12, fontWeight: 700 }}>{isAuction ? '경매물품' : '판매가'}</div>
              <div className="bottom-price">{isAuction ? getTimeLeftText(item.auctionEndsAt) : `${item.price || '-'}만원`}</div>
            </div>
            <a href={`tel:${item.sellerPhone}`} className="call-btn">전화문의 {item.sellerPhone}</a>
          </div>
        </div>
      )}

      {viewerOpen && images.length > 0 && (
        <div className="viewer" onClick={() => setViewerOpen(false)}>
          <button className="viewer-btn viewer-close" onClick={() => setViewerOpen(false)}>✕</button>
          <button className="viewer-btn viewer-prev" onClick={(e) => { e.stopPropagation(); movePrev(); }}>‹</button>
          <button className="viewer-btn viewer-next" onClick={(e) => { e.stopPropagation(); moveNext(); }}>›</button>

          <img
            className="viewer-img"
            src={images[currentIndex]}
            alt="확대 이미지"
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => {
              e.preventDefault();
              setZoom((prev) => Math.min(3, Math.max(1, prev + (e.deltaY < 0 ? 0.15 : -0.15))));
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              if (e.touches.length === 1) touchStartX.current = e.touches[0].clientX;
              if (e.touches.length === 2) {
                pinchStartDistance.current = getDistance(e.touches);
                pinchStartZoom.current = zoom;
              }
            }}
            onTouchMove={(e) => {
              e.stopPropagation();
              if (e.touches.length === 2 && pinchStartDistance.current) {
                const nextDistance = getDistance(e.touches);
                const nextZoom = pinchStartZoom.current * (nextDistance / pinchStartDistance.current);
                setZoom(Math.min(3, Math.max(1, nextZoom)));
              }
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              if (e.changedTouches.length === 1 && zoom === 1) {
                const diff = e.changedTouches[0].clientX - touchStartX.current;
                if (diff > 60) movePrev();
                if (diff < -60) moveNext();
              }
              pinchStartDistance.current = null;
            }}
            style={{ transform: `scale(${zoom})` }}
          />

          <div className="viewer-thumbs" onClick={(e) => e.stopPropagation()}>
            {thumbs.map((url, i) => {
              const originalUrl = images[i] || url;
              const thumbUrl = getResizedImage(originalUrl, '400x400');
              return (
                <img
                  key={`${url}-viewer-thumb-${i}`}
                  className={`viewer-thumb ${currentIndex === i ? 'active' : ''}`}
                  src={thumbUrl}
                  alt={`확대 썸네일 ${i + 1}`}
                  onClick={() => { setCurrentIndex(i); setZoom(1); }}
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = originalUrl; }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
