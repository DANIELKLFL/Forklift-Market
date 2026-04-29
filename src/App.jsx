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
import { Routes, Route } from 'react-router-dom';
import ListingDetail from './ListingDetail';

export default function App() {
  const [companies, setCompanies] = useState([]);
  const [listings, setListings] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentCompany, setCurrentCompany] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    companyName: '',
    name: '',
    phone: '',
    email: '',
    password: '',
  });
  const [notice, setNotice] = useState('');
  const [visitorCount, setVisitorCount] = useState(0);

  // 🔥 방문자
  useEffect(() => {
    const statRef = doc(db, 'siteStats', 'homepage');

    const unsub = onSnapshot(statRef, (snap) => {
      if (snap.exists()) {
        setVisitorCount(Number(snap.data().visitorCount || 0));
      }
    });

    setDoc(statRef, { visitorCount: increment(1) }, { merge: true });

    return () => unsub();
  }, []);

  // 🔥 로그인 상태
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user || null);
      if (!user) setCurrentCompany(null);
    });
    return () => unsub();
  }, []);

  // 🔥 데이터 불러오기
  useEffect(() => {
    const unsubCompanies = onSnapshot(collection(db, 'companies'), (snap) => {
      setCompanies(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubListings = onSnapshot(
      query(collection(db, 'listings'), orderBy('createdAt', 'desc')),
      (snap) => {
        setListings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );

    return () => {
      unsubCompanies();
      unsubListings();
    };
  }, []);

  // 🔥 핵심 수정 (로그인 복구)
  useEffect(() => {
    if (!currentUser || companies.length === 0) return;

    const found = companies.find(
      (c) =>
        c.authUserId === currentUser.uid ||
        c.id === currentUser.uid
    );

    setCurrentCompany(found || null);
  }, [currentUser, companies]);

  // 🔥 회원가입
  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        signupForm.email,
        signupForm.password
      );

      await setDoc(doc(db, 'companies', cred.user.uid), {
        authUserId: cred.user.uid,
        companyName: signupForm.companyName,
        name: signupForm.name,
        phone: signupForm.phone,
        email: signupForm.email,
        sellerPostingAllowed: false,
        createdAt: serverTimestamp(),
      });

      setNotice('회원가입 완료');
    } catch (err) {
      setNotice(err.message);
    }
  };

  // 🔥 로그인
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(
        auth,
        loginForm.email,
        loginForm.password
      );
      setNotice('로그인 성공');
    } catch (err) {
      setNotice(err.message);
    }
  };

  // 🔥 로그아웃
  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <>
      <div style={{ padding: 20 }}>
        <h2>FORKLIFT MARKET</h2>
        <div>방문자 {visitorCount}</div>

        {!currentUser ? (
          <>
            <h3>회원가입</h3>
            <form onSubmit={handleSignup}>
              <input placeholder="업체명" onChange={(e) => setSignupForm({ ...signupForm, companyName: e.target.value })} />
              <input placeholder="이름" onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })} />
              <input placeholder="전화" onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })} />
              <input placeholder="이메일" onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })} />
              <input type="password" placeholder="비번" onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })} />
              <button>가입</button>
            </form>

            <h3>로그인</h3>
            <form onSubmit={handleLogin}>
              <input placeholder="이메일" onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} />
              <input type="password" placeholder="비번" onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} />
              <button>로그인</button>
            </form>
          </>
        ) : (
          <>
            <h3>로그인됨: {currentUser.email}</h3>
            <button onClick={handleLogout}>로그아웃</button>

            <div>
              <h3>매물 리스트</h3>
              {listings.map((item) => (
                <div key={item.id} style={{ border: '1px solid #ccc', margin: 10 }}>
                  {item.title} / {item.price}만원
                </div>
              ))}
            </div>
          </>
        )}

        {notice && <div>{notice}</div>}
      </div>

      <Routes>
        <Route path="/listing/:id" element={<ListingDetail />} />
      </Routes>
    </>
  );
}
