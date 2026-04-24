import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function ListingDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);

  useEffect(() => {
    const loadListing = async () => {
      const snap = await getDoc(doc(db, 'listings', id));
      if (snap.exists()) {
        setItem({ id: snap.id, ...snap.data() });
      }
    };

    loadListing();
  }, [id]);

  if (!item) {
    return <div style={{ padding: 40 }}>매물을 불러오는 중입니다...</div>;
  }

  return (
    <div style={{ padding: 40, background: '#0a0a0a', color: '#fff', minHeight: '100vh' }}>
      <Link to="/" style={{ color: '#f87171' }}>← 홈으로</Link>

      <h1>{item.title}</h1>

      {item.imageUrls?.[0] && (
        <img
          src={item.imageUrls[0]}
          alt={item.title}
          style={{ width: '100%', maxWidth: 800, borderRadius: 20, marginTop: 20 }}
        />
      )}

      <h2 style={{ color: '#ef4444' }}>{item.price}만원</h2>
      <p>{item.brand} · {item.ton} · {item.year}년식</p>
      <p>{item.location}</p>
      <p>{item.description}</p>

      {item.sellerPhone && (
        <a href={`tel:${item.sellerPhone}`} style={{ color: '#fff' }}>
          전화하기: {item.sellerPhone}
        </a>
      )}
    </div>
  );
}
