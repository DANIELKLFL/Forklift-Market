// ⭐ 기존 App.jsx 전부 삭제하고 이거 통으로 복붙

import React, { useEffect, useMemo, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import ListingDetail from './ListingDetail';

export default function App() {
  const navigate = useNavigate();

  // 임시 데이터 (기존 firebase 연결 그대로 쓰면 됨)
  const [listings, setListings] = useState([
    {
      id: 1,
      title: '도요타 2.5톤 전동지게차',
      year: '2006',
      mast: '3M',
      battery: 'A급',
      price: 1100,
      image: 'https://via.placeholder.com/300'
    },
    {
      id: 2,
      title: '클라크 2톤 디젤지게차',
      year: '2010',
      mast: '4M',
      battery: 'B급',
      price: 700,
      image: 'https://via.placeholder.com/300'
    }
  ]);

  return (
    <>
      <style>{`
        body {
          margin: 0;
          background: #0a0a0a;
          color: white;
          font-family: Arial;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .visitor-badge {
          background: rgba(239,68,68,0.2);
          padding: 10px 14px;
          border-radius: 12px;
          font-weight: bold;
          white-space: nowrap;
        }

        .listing-card {
          background: #111;
          border-radius: 20px;
          overflow: hidden;
        }

        .listing-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .listing-body {
          padding: 14px;
        }

        .listing-title {
          font-size: 18px;
          font-weight: bold;
        }

        .price {
          color: #ef4444;
          font-size: 20px;
          font-weight: bold;
        }

        .spec {
          font-size: 12px;
          margin-top: 6px;
          color: #ccc;
        }

        /* 🔥 모바일 핵심 */
        @media (max-width: 720px) {

          .listing-card {
            display: grid;
            grid-template-columns: 120px 1fr;
            gap: 10px;
          }

          .listing-image {
            height: 120px;
          }

          .listing-title {
            font-size: 15px;
          }

          .price {
            font-size: 18px;
          }

        }
      `}</style>

      <div className="container">
        <div className="header">
          <h2>FORKLIFT MARKET</h2>
          <div className="visitor-badge">방문자 1,234명</div>
        </div>

        <h3 style={{ marginTop: 30 }}>매물보기</h3>

        <div style={{ display: 'grid', gap: 14 }}>
          {listings.map((item) => (
            <div
              key={item.id}
              className="listing-card"
              onClick={() => navigate(`/listing/${item.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <div className="listing-image">
                <img src={item.image} />
              </div>

              <div className="listing-body">
                <div className="listing-title">{item.title}</div>
                <div className="price">{item.price}만원</div>

                <div className="spec">
                  {item.year}년식 / {item.mast} / {item.battery}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Routes>
        <Route path="/listing/:id" element={<ListingDetail />} />
      </Routes>
    </>
  );
}
