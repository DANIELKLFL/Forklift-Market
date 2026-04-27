import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  doc,
  onSnapshot,
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function ListingDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [dealerPrice, setDealerPrice] = useState(null);
  const [user, setUser] = useState(null);
  const [memberType, setMemberType] = useState(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(doc(db, 'companies', user.uid), (snap) => {
      if (snap.exists()) {
        setMemberType(snap.data().memberType);
      }
    });

    return () => unsub();
  }, [user]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'listings', id), (snap) => {
      if (snap.exists()) {
        setItem({ id: snap.id, ...snap.data() });
      }
    });

    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    if (memberType !== 'seller' && !user?.email?.includes('best')) return;

    const unsub = onSnapshot(doc(db, 'dealerPrices', id), (snap) => {
      if (snap.exists()) {
        setDealerPrice(snap.data().dealerPrice);
      }
    });

    return () => unsub();
  }, [id, memberType, user]);

  if (!item) {
    return <div style={{ padding: 40 }}>매물 불러오는 중...</div>;
  }

  const isAuction = item.saleType === 'auction';

  return (
    <div style={{ padding: 40, color: '#fff' }}>
      <Link to="/">← 홈으로</Link>

      <h1>{item.title}</h1>

      {item.imageUrls?.[0] && (
        <img
          src={item.imageUrls[0]}
          style={{ width: '100%', maxWidth: 600 }}
        />
      )}

      <h2 style={{ color: 'red' }}>
        {isAuction
          ? `${item.currentBid || item.auctionStartPrice}만원`
          : `${item.price}만원`}
      </h2>

      {/* 🔥 업체가 (완벽 차단) */}
      {(memberType === 'seller' || user?.email === 'best@example.com') &&
        dealerPrice && (
          <h3 style={{ color: 'yellow' }}>
            업체가 {dealerPrice}만원
          </h3>
        )}

      <p>{item.brand} · {item.ton} · {item.year}</p>
      <p>{item.location}</p>
      <p>{item.description}</p>

      {/* 경매 UI */}
      {isAuction && (
        <div style={{ marginTop: 20 }}>
          <p>입찰수: {item.bidCount || 0}</p>
          <p>종료일: {item.auctionEndsAt}</p>

          <button
            onClick={async () => {
              const bid = prompt('입찰 금액 입력');
              if (!bid) return;

              await addDoc(collection(db, 'listings', id, 'bids'), {
                amount: Number(bid),
                userId: user.uid,
                createdAt: serverTimestamp(),
              });
            }}
          >
            입찰하기
          </button>

          {item.buyNowPrice && (
            <button
              onClick={() => alert('즉시구매 구현 가능')}
              style={{ marginLeft: 10 }}
            >
              즉시구매 {item.buyNowPrice}만원
            </button>
          )}
        </div>
      )}
    </div>
  );
}
