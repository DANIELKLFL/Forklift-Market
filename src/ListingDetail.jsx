import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  doc,
  onSnapshot,
  collection,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

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

export default function ListingDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [user, setUser] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [notice, setNotice] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(1);

  const touchStartX = useRef(0);
  const pinchStartDistance = useRef(null);
  const pinchStartZoom = useRef(1);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u || null));
  }, []);

  useEffect(() => {
    return onSnapshot(doc(db, 'listings', id), (snap) => {
      setItem(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
  }, [id]);

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
    if (!user) {
      setNotice('로그인 후 입찰할 수 있습니다.');
      return;
    }

    const bidNumber = Number(bidAmount);
    if (!bidNumber) {
      setNotice('입찰 금액을 입력해주세요.');
      return;
    }

    try {
      const listingRef = doc(db, 'listings', id);
      const bidRef = doc(collection(db, 'listings', id, 'bids'));

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(listingRef);
        if (!snap.exists()) throw new Error('매물을 찾을 수 없습니다.');

        const data = snap.data();
        const current = Number(data.currentBid || data.auctionStartPrice || 0);
        const min = current + Number(data.bidUnit || 1);

        if (bidNumber < min) throw new Error(`최소 입찰가는 ${min}만원입니다.`);

        tx.update(listingRef, {
          currentBid: bidNumber,
          bidCount: Number(data.bidCount || 0) + 1,
          highestBidderId: user.uid,
          highestBidderEmail: user.email,
        });

        tx.set(bidRef, {
          amount: bidNumber,
          userId: user.uid,
          userEmail: user.email,
          createdAt: serverTimestamp(),
        });
      });

      setBidAmount('');
      setNotice('입찰이 완료되었습니다.');
    } catch (error) {
      setNotice(error.message || '입찰 중 오류가 발생했습니다.');
    }
  };

  if (!item) {
    return <div style={{ padding: 40, background: '#0a0a0a', color: '#fff' }}>로딩중...</div>;
  }

  const isAuction = item.saleType === 'auction';

  return (
    <div style={{ padding: 40, background: '#0a0a0a', color: '#fff', minHeight: '100vh' }}>
      <Link to="/" style={{ color: '#f87171' }}>← 홈으로</Link>

      {notice && (
        <div style={{ marginTop: 20, padding: 15, borderRadius: 12, background: 'rgba(220,38,38,0.15)', color: '#fecaca' }}>
          {notice}
        </div>
      )}

      <h1>{item.title}</h1>

      {thumbs.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 12,
          marginTop: 20,
          maxWidth: 900
        }}>
          {thumbs.map((url, i) => (
            <img
              key={`${url}-${i}`}
              src={url}
              alt={`${item.title} 이미지 ${i + 1}`}
              loading="lazy"
              onClick={() => openViewer(i)}
              style={{
                width: '100%',
                height: 210,
                objectFit: 'cover',
                borderRadius: 16,
                cursor: 'pointer',
                background: '#111'
              }}
            />
          ))}
        </div>
      )}

      <h2 style={{ color: '#ef4444', marginTop: 30 }}>
        {isAuction ? '비공개 경매 진행 중' : `판매가 ${item.price}만원`}
      </h2>

      <div style={{ lineHeight: 1.8 }}>
        <p>{item.brand} · {item.ton} · {item.year}년식</p>
        <p>지역: {item.location || '-'}</p>
        <p>마스트: {item.mast || '-'}</p>
        <p>가동시간: {item.hours || '-'}</p>
        <p>배터리/옵션: {item.battery || '-'}</p>
        <p>{item.description}</p>
      </div>

      {isAuction && (
        <div style={{ marginTop: 30, maxWidth: 800, padding: 24, borderRadius: 20, background: '#111' }}>
          <h2 style={{ color: '#ef4444', marginTop: 0 }}>비공개 입찰</h2>
          <p>입찰 수: {item.bidCount || 0}회</p>
          <p>입찰 단위: {item.bidUnit || '-'}만원</p>
          <p>경매 종료: {item.auctionEndsAt || '미정'}</p>
          <p style={{ color: '#fca5a5', fontWeight: 800 }}>남은시간: {getTimeLeftText(item.auctionEndsAt)}</p>

          <input
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            placeholder="입찰 금액 입력 (만원)"
            type="number"
            style={{ width: '100%', marginTop: 12, padding: 15, borderRadius: 12, background: '#050505', color: '#fff', border: '1px solid #333' }}
          />

          <button
            onClick={handleBid}
            style={{ width: '100%', marginTop: 12, padding: 16, borderRadius: 14, background: '#dc2626', color: '#fff', border: 'none', fontWeight: 900 }}
          >
            입찰하기
          </button>
        </div>
      )}

      {item.sellerPhone && (
        <a
          href={`tel:${item.sellerPhone}`}
          style={{ display: 'inline-block', marginTop: 20, padding: '14px 20px', borderRadius: 14, background: '#dc2626', color: '#fff', textDecoration: 'none', fontWeight: 900 }}
        >
          전화하기: {item.sellerPhone}
        </a>
      )}

      {viewerOpen && images.length > 0 && (
        <div
          onClick={() => setViewerOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.96)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <button
            onClick={() => setViewerOpen(false)}
            style={{ position: 'absolute', top: 18, right: 24, fontSize: 32, background: 'transparent', color: '#fff', border: 'none' }}
          >
            ✕
          </button>

          <button onClick={(e) => { e.stopPropagation(); movePrev(); }} style={{ position: 'absolute', left: 20, fontSize: 48, background: 'transparent', color: '#fff', border: 'none' }}>‹</button>
          <button onClick={(e) => { e.stopPropagation(); moveNext(); }} style={{ position: 'absolute', right: 20, fontSize: 48, background: 'transparent', color: '#fff', border: 'none' }}>›</button>

          <img
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
            style={{
              maxWidth: '92%',
              maxHeight: '76%',
              objectFit: 'contain',
              transform: `scale(${zoom})`,
              transition: 'transform 0.12s ease'
            }}
          />

          <div style={{ display: 'flex', gap: 8, marginTop: 18, maxWidth: '92%', overflowX: 'auto' }} onClick={(e) => e.stopPropagation()}>
            {thumbs.map((url, i) => (
              <img
                key={`${url}-thumb-${i}`}
                src={url}
                onClick={() => { setCurrentIndex(i); setZoom(1); }}
                style={{
                  width: 64,
                  height: 64,
                  objectFit: 'cover',
                  borderRadius: 8,
                  cursor: 'pointer',
                  border: currentIndex === i ? '2px solid #ef4444' : '2px solid #333',
                  opacity: currentIndex === i ? 1 : 0.65
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
