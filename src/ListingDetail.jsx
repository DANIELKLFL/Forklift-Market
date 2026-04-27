import { useEffect, useState, useRef } from 'react';
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

export default function ListingDetail() {
  const { id } = useParams();

  const [item, setItem] = useState(null);
  const [user, setUser] = useState(null);
  const [bidAmount, setBidAmount] = useState('');

  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 🔥 터치 / 줌
  const startX = useRef(0);
  const scale = useRef(1);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'listings', id), (snap) => {
      if (snap.exists()) setItem({ id: snap.id, ...snap.data() });
    });
    return () => unsub();
  }, [id]);

  const handleBid = async () => {
    if (!user) return alert('로그인 필요');

    const bidNumber = Number(bidAmount);
    if (!bidNumber) return;

    const listingRef = doc(db, 'listings', id);
    const bidRef = doc(collection(db, 'listings', id, 'bids'));

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(listingRef);
      const data = snap.data();

      const current = data.currentBid || data.auctionStartPrice || 0;
      const min = current + (data.bidUnit || 1);

      if (bidNumber < min) throw new Error('입찰가 낮음');

      tx.update(listingRef, {
        currentBid: bidNumber,
        bidCount: (data.bidCount || 0) + 1,
      });

      tx.set(bidRef, {
        amount: bidNumber,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
    });

    setBidAmount('');
  };

  if (!item) return <div style={{ padding: 40 }}>로딩중...</div>;

  const isAuction = item.saleType === 'auction';

  return (
    <div style={{ padding: 40, background: '#0a0a0a', color: '#fff' }}>
      <Link to="/">← 홈</Link>

      <h1>{item.title}</h1>

      {/* 🔥 2x2 이미지 */}
      {item.imageUrls?.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 12,
            marginTop: 20,
            maxWidth: 900,
          }}
        >
          {item.imageUrls.map((url, i) => (
            <img
              key={i}
              src={url}
              onClick={() => {
                setCurrentIndex(i);
                setViewerOpen(true);
              }}
              style={{
                width: '100%',
                height: 220,
                objectFit: 'cover',
                borderRadius: 16,
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
      )}

      <h2 style={{ color: 'red' }}>
        {isAuction ? '경매중' : `${item.price}만원`}
      </h2>

      <p>{item.description}</p>

      {isAuction && (
        <>
          <p>입찰수 {item.bidCount || 0}</p>
          <input value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} />
          <button onClick={handleBid}>입찰</button>
        </>
      )}

      {/* 🔥 갤러리 */}
      {viewerOpen && (
        <div
          onClick={() => setViewerOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: '#000',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* 이미지 */}
          <img
            src={item.imageUrls[currentIndex]}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => (startX.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              const diff = e.changedTouches[0].clientX - startX.current;
              if (diff > 50) {
                setCurrentIndex((prev) =>
                  prev === 0 ? item.imageUrls.length - 1 : prev - 1
                );
              } else if (diff < -50) {
                setCurrentIndex((prev) =>
                  prev === item.imageUrls.length - 1 ? 0 : prev + 1
                );
              }
            }}
            onWheel={(e) => {
              e.preventDefault();
              scale.current += e.deltaY * -0.001;
              scale.current = Math.min(Math.max(1, scale.current), 3);
              e.target.style.transform = `scale(${scale.current})`;
            }}
            style={{
              maxWidth: '90%',
              maxHeight: '80%',
              transition: '0.2s',
            }}
          />

          {/* 썸네일 */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginTop: 20,
              overflowX: 'auto',
            }}
          >
            {item.imageUrls.map((url, i) => (
              <img
                key={i}
                src={url}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(i);
                }}
                style={{
                  width: 60,
                  height: 60,
                  objectFit: 'cover',
                  border:
                    currentIndex === i ? '2px solid red' : '2px solid #333',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>

          {/* 버튼 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex(
                currentIndex === 0
                  ? item.imageUrls.length - 1
                  : currentIndex - 1
              );
            }}
            style={{ position: 'absolute', left: 20, fontSize: 40 }}
          >
            ‹
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex(
                currentIndex === item.imageUrls.length - 1
                  ? 0
                  : currentIndex + 1
              );
            }}
            style={{ position: 'absolute', right: 20, fontSize: 40 }}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
