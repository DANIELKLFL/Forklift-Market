import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import ListingDetail from './ListingDetail';

// 🔥 남은시간 계산
function getTimeLeftText(endTime) {
  if (!endTime) return '-';
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return '종료';

  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff / (1000 * 60)) % 60);

  return `${h}시간 ${m}분`;
}

// 🔥 매물 카드
function ListingCard({ item }) {
  const navigate = useNavigate();
  const isAuction = item.saleType === 'auction';
  const currentPrice = item.currentBid || item.auctionStartPrice || item.price;

  return (
    <div
      style={{
        background: '#111',
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid #222'
      }}
    >
      {/* 🔥 이미지 최적화 */}
      <div style={{ height: 170, overflow: 'hidden' }}>
        {item.imageUrls?.length > 0 ? (
          <img
            src={item.imageUrls[0]} // ✅ 1장만
            alt={item.title}
            loading="lazy" // ✅ lazy 로딩
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        ) : (
          <div style={{ color: '#666', padding: 20 }}>이미지 없음</div>
        )}
      </div>

      <div style={{ padding: 16 }}>
        <h3 style={{ margin: 0 }}>{item.title}</h3>

        <p style={{ color: '#888', marginTop: 8 }}>
          {item.brand} · {item.year}
        </p>

        {item.saleType === 'auction' && (
          <p style={{ color: '#f87171' }}>
            입찰수 {item.bidCount || 0}회 · {getTimeLeftText(item.auctionEndsAt)}
          </p>
        )}

        <h2 style={{ color: '#ef4444' }}>
          {currentPrice ? `${currentPrice}만원` : '-'}
        </h2>

        <button
          onClick={() => navigate(`/listing/${item.id}`)}
          style={{
            marginTop: 10,
            padding: '10px 14px',
            borderRadius: 10,
            background: '#dc2626',
            color: '#fff',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          {isAuction ? '경매보기' : '상세보기'}
        </button>
      </div>
    </div>
  );
}

// 🔥 홈 화면
function Home() {
  const dummy = [
    {
      id: '1',
      title: '지게차 1',
      brand: '도요타',
      year: 2015,
      price: 800,
      imageUrls: ['https://via.placeholder.com/400'],
      saleType: 'normal'
    },
    {
      id: '2',
      title: '경매 지게차',
      brand: '니찌유',
      year: 2018,
      auctionStartPrice: 500,
      currentBid: 650,
      bidCount: 3,
      auctionEndsAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      imageUrls: ['https://via.placeholder.com/400'],
      saleType: 'auction'
    }
  ];

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ color: '#fff' }}>매물 목록</h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: 16
        }}
      >
        {dummy.map((item) => (
          <ListingCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

// 🔥 전체 App
export default function App() {
  return (
    <BrowserRouter>
      <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/listing/:id" element={<ListingDetail />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
