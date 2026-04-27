import { useEffect, useState } from 'react';
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

const ADMIN_EMAIL = 'best@example.com';

export default function ListingDetail() {
  const { id } = useParams();

  const [item, setItem] = useState(null);
  const [dealerPrice, setDealerPrice] = useState(null);
  const [user, setUser] = useState(null);
  const [memberType, setMemberType] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
    });

    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setMemberType(null);
      return;
    }

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
    if (memberType !== 'seller' && user?.email !== ADMIN_EMAIL) return;

    const unsub = onSnapshot(doc(db, 'dealerPrices', id), (snap) => {
      if (snap.exists()) {
        setDealerPrice(snap.data().dealerPrice);
      } else {
        setDealerPrice(null);
      }
    });

    return () => unsub();
  }, [id, memberType, user]);

  const handleBid = async () => {
    if (!user) {
      setNotice('로그인 후 입찰할 수 있습니다.');
      return;
    }

    if (!item || item.saleType !== 'auction') {
      setNotice('경매 물품이 아닙니다.');
      return;
    }

    const bidNumber = Number(bidAmount);

    if (!bidNumber || bidNumber <= 0) {
      setNotice('입찰 금액을 입력해주세요.');
      return;
    }

    try {
      const listingRef = doc(db, 'listings', id);
      const bidRef = doc(collection(db, 'listings', id, 'bids'));

      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(listingRef);

        if (!snap.exists()) {
          throw new Error('매물을 찾을 수 없습니다.');
        }

        const data = snap.data();

        if (data.saleType !== 'auction') {
          throw new Error('경매 물품이 아닙니다.');
        }

        if (data.status !== 'active') {
          throw new Error('승인된 경매만 입찰할 수 있습니다.');
        }

        const now = Date.now();
        const start = data.auctionStartAt ? new Date(data.auctionStartAt).getTime() : null;
        const end = data.auctionEndsAt ? new Date(data.auctionEndsAt).getTime() : null;

        if (start && now < start) {
          throw new Error('아직 경매 시작 전입니다.');
        }

        if (end && now > end) {
          throw new Error('이미 종료된 경매입니다.');
        }

        const currentBid = Number(data.currentBid || data.auctionStartPrice || data.price || 0);
        const bidUnit = Number(data.bidUnit || 1);
        const minBid = currentBid + bidUnit;

        if (bidNumber < minBid) {
          throw new Error(`최소 입찰가는 ${minBid}만원입니다.`);
        }

        transaction.update(listingRef, {
          currentBid: bidNumber,
          bidCount: Number(data.bidCount || 0) + 1,
          highestBidderId: user.uid,
          highestBidderEmail: user.email,
          highestBidderName: user.email,
        });

        transaction.set(bidRef, {
          amount: bidNumber,
          bidderId: user.uid,
          bidderEmail: user.email,
          bidderName: user.email,
          memberType: memberType || 'unknown',
          type: 'bid',
          createdAt: serverTimestamp(),
        });
      });

      setBidAmount('');
      setNotice('입찰이 완료되었습니다.');
    } catch (error) {
      setNotice(error.message || '입찰 중 오류가 발생했습니다.');
    }
  };

  const handleBuyNow = async () => {
    if (!user) {
      setNotice('로그인 후 즉시구매할 수 있습니다.');
      return;
    }

    if (!item?.buyNowPrice) {
      setNotice('즉시구매가가 없습니다.');
      return;
    }

    const ok = window.confirm(`${item.buyNowPrice}만원에 즉시구매하시겠습니까?`);
    if (!ok) return;

    try {
      const listingRef = doc(db, 'listings', id);
      const bidRef = doc(collection(db, 'listings', id, 'bids'));

      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(listingRef);

        if (!snap.exists()) {
          throw new Error('매물을 찾을 수 없습니다.');
        }

        const data = snap.data();

        transaction.update(listingRef, {
          currentBid: Number(data.buyNowPrice),
          bidCount: Number(data.bidCount || 0) + 1,
          highestBidderId: user.uid,
          highestBidderEmail: user.email,
          highestBidderName: user.email,
          auctionStatus: 'ended',
          status: 'sold',
        });

        transaction.set(bidRef, {
          amount: Number(data.buyNowPrice),
          bidderId: user.uid,
          bidderEmail: user.email,
          bidderName: user.email,
          memberType: memberType || 'unknown',
          type: 'buyNow',
          createdAt: serverTimestamp(),
        });
      });

      setNotice('즉시구매가 완료되었습니다.');
    } catch (error) {
      setNotice(error.message || '즉시구매 중 오류가 발생했습니다.');
    }
  };

  if (!item) {
    return <div style={{ padding: 40 }}>매물 불러오는 중...</div>;
  }

  const isAuction = item.saleType === 'auction';
  const currentPrice = item.currentBid || item.auctionStartPrice || item.price;
  const minBid = Number(currentPrice || 0) + Number(item.bidUnit || 1);

  return (
    <div style={{ padding: 40, background: '#0a0a0a', color: '#fff', minHeight: '100vh' }}>
      <Link to="/" style={{ color: '#f87171' }}>← 홈으로</Link>

      {notice && (
        <div style={{
          marginTop: 20,
          padding: 15,
          borderRadius: 12,
          background: 'rgba(220,38,38,0.15)',
          border: '1px solid rgba(220,38,38,0.3)',
          color: '#fecaca'
        }}>
          {notice}
        </div>
      )}

      <h1>{item.title}</h1>

      {item.imageUrls?.[0] && (
        <img
          src={item.imageUrls[0]}
          alt={item.title}
          style={{ width: '100%', maxWidth: 800, borderRadius: 20, marginTop: 20 }}
        />
      )}

      <h2 style={{ color: '#ef4444' }}>
        {isAuction ? `현재 입찰가 ${currentPrice}만원` : `판매가 ${item.price}만원`}
      </h2>

      {(memberType === 'seller' || user?.email === ADMIN_EMAIL) && dealerPrice && (
        <h3 style={{ color: '#facc15' }}>
          업체가 {dealerPrice}만원
        </h3>
      )}

      <div style={{ marginTop: 20, lineHeight: 1.8 }}>
        <p>{item.brand} · {item.ton} · {item.year}년식</p>
        <p>지역: {item.location || '-'}</p>
        <p>마스트: {item.mast || '-'}</p>
        <p>가동시간: {item.hours || '-'}</p>
        <p>배터리/옵션: {item.battery || '-'}</p>
        <p>{item.description}</p>
      </div>

      {isAuction && (
        <div style={{
          marginTop: 30,
          maxWidth: 800,
          padding: 24,
          borderRadius: 20,
          background: '#111',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <h2 style={{ color: '#ef4444', marginTop: 0 }}>경매 입찰</h2>

          <p>시작가: {item.auctionStartPrice || '-'}만원</p>
          <p>현재가: {currentPrice || '-'}만원</p>
          <p>입찰 단위: {item.bidUnit || '-'}만원</p>
          <p>최소 입찰가: {minBid}만원</p>
          <p>입찰 수: {item.bidCount || 0}회</p>
          <p>최고입찰자: {item.highestBidderEmail || '아직 없음'}</p>
          <p>경매 시작: {item.auctionStartAt || '미정'}</p>
          <p>경매 종료: {item.auctionEndsAt || '미정'}</p>

          {item.auctionDesc && (
            <p style={{ marginTop: 20, lineHeight: 1.7 }}>
              {item.auctionDesc}
            </p>
          )}

          <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>
            <input
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder={`최소 ${minBid}만원 이상 입력`}
              type="number"
              style={{
                padding: 15,
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.15)',
                background: '#050505',
                color: '#fff'
              }}
            />

            <button
              onClick={handleBid}
              style={{
                padding: 16,
                borderRadius: 14,
                border: 'none',
                background: '#dc2626',
                color: '#fff',
                fontWeight: 900,
                cursor: 'pointer'
              }}
            >
              입찰하기
            </button>

            {item.buyNowPrice && (
              <button
                onClick={handleBuyNow}
                style={{
                  padding: 16,
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.18)',
                  background: '#fff',
                  color: '#111',
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
              >
                즉시구매 {item.buyNowPrice}만원
              </button>
            )}
          </div>
        </div>
      )}

      {item.sellerPhone && (
        <a
          href={`tel:${item.sellerPhone}`}
          style={{
            display: 'inline-block',
            marginTop: 20,
            padding: '14px 20px',
            borderRadius: 14,
            background: '#dc2626',
            color: '#fff',
            textDecoration: 'none',
            fontWeight: 900
          }}
        >
          전화하기: {item.sellerPhone}
        </a>
      )}
    </div>
  );
}
