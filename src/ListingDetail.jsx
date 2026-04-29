import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export default function ListingDetail({ currentCompany }) {
  const { id } = useParams();

  const [item, setItem] = useState(null);
  const [dealerPrice, setDealerPrice] = useState(null);

  // 🔥 기존 매물 불러오기 (그대로 유지)
  useEffect(() => {
    if (!id) return;

    return onSnapshot(doc(db, 'listings', id), (snap) => {
      if (snap.exists()) {
        setItem({ id: snap.id, ...snap.data() });
      }
    });
  }, [id]);

  // 🔥 업자가격 추가 (기능만 추가됨)
  useEffect(() => {
    if (!id) return;

    return onSnapshot(doc(db, 'dealerPrices', id), (snap) => {
      if (snap.exists()) {
        setDealerPrice(snap.data().dealerPrice);
      } else {
        setDealerPrice(null);
      }
    });
  }, [id]);

  if (!item) return <div style={{ padding: 20 }}>로딩중...</div>;

  const canSeeDealer =
    currentCompany &&
    currentCompany.sellerPostingAllowed === true;

  return (
    <div style={{ padding: 20 }}>

      {/* 🔥 기존 UI 유지 */}
      <h2>{item.title}</h2>

      <div style={{ marginTop: 10 }}>
        <strong>가격:</strong> {item.price}만원
      </div>

      <div style={{ marginTop: 10 }}>
        <strong>연식:</strong> {item.year || '-'}
      </div>

      <div style={{ marginTop: 10 }}>
        <strong>마스트:</strong> {item.mast || '-'}
      </div>

      <div style={{ marginTop: 10 }}>
        <strong>배터리:</strong> {item.battery || '-'}
      </div>

      <div style={{ marginTop: 10 }}>
        <strong>설명:</strong> {item.description || '-'}
      </div>

      {/* 🔥 여기부터 추가된 업자가격 */}
      {canSeeDealer && dealerPrice && (
        <div style={{
          marginTop: 20,
          padding: 14,
          borderRadius: 14,
          background: 'rgba(34,197,94,0.1)',
          color: '#86efac',
          fontWeight: 900,
          fontSize: 16
        }}>
          업자가격: {dealerPrice}만원
        </div>
      )}

      {!canSeeDealer && (
        <div style={{
          marginTop: 20,
          padding: 14,
          borderRadius: 14,
          background: 'rgba(255,255,255,0.05)',
          color: '#aaa'
        }}>
          승인된 업체회원만 업자가격 확인 가능
        </div>
      )}
    </div>
  );
}
