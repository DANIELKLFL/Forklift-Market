import { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword
} from "firebase/auth";
import {
  collection,
  addDoc,
  onSnapshot
} from "firebase/firestore";

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [title, setTitle] = useState("");
  const [listingsCount, setListingsCount] = useState(0);
  const [companiesCount, setCompaniesCount] = useState(0);

  // 🔥 실시간 데이터
  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, "listings"), (snap) => {
      setListingsCount(snap.size);
    });

    const unsub2 = onSnapshot(collection(db, "companies"), (snap) => {
      setCompaniesCount(snap.size);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  // 🔥 회원가입
  const handleSignup = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);

      await addDoc(collection(db, "companies"), {
        email,
        createdAt: Date.now()
      });

      alert("회원가입 완료");
    } catch (e) {
      alert("에러: " + e.message);
    }
  };

  // 🔥 매물 등록
  const handleAddListing = async () => {
    try {
      await addDoc(collection(db, "listings"), {
        title,
        createdAt: Date.now()
      });

      setTitle("");
    } catch (e) {
      alert("에러: " + e.message);
    }
  };

  return (
    <div style={{ padding: 30 }}>
      <h1>🚜 FORKLIFT MARKET</h1>

      <h3>📊 실시간 데이터</h3>
      <p>등록 매물: {listingsCount}개</p>
      <p>참여 업체: {companiesCount}개</p>

      <hr />

      <h3>🏢 업체 회원가입</h3>
      <input
        placeholder="이메일"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <br />
      <input
        placeholder="비밀번호"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <br />
      <button onClick={handleSignup}>회원가입</button>

      <hr />

      <h3>📦 매물 등록</h3>
      <input
        placeholder="지게차 이름"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <br />
      <button onClick={handleAddListing}>매물 등록</button>
    </div>
  );
}
