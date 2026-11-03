import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// 서버 전용 Firebase 연결입니다. 서버용 비밀키는 코드에 넣지 않고 아래 두 곳 중 하나에서 읽습니다.
//  1) 환경 변수 FIREBASE_SERVICE_ACCOUNT (내려받은 비밀키 파일 내용 전체) — 배포 서버용
//  2) 프로젝트 폴더의 .secrets/firebase-service-account.json — 내 컴퓨터용 (GitHub에 올라가지 않음)
const LOCAL_KEY_FILE = path.join(process.cwd(), ".secrets", "firebase-service-account.json");

type ServiceAccount = { project_id?: string; client_email?: string; private_key?: string };

function readServiceAccount(): ServiceAccount | null {
  try {
    const fromEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (fromEnv) return JSON.parse(fromEnv) as ServiceAccount;
    return JSON.parse(readFileSync(/* turbopackIgnore: true */ LOCAL_KEY_FILE, "utf8")) as ServiceAccount;
  } catch {
    return null;
  }
}

let db: Firestore | null | undefined;

/** Firestore 연결을 돌려줍니다. 서버용 비밀키가 없으면 null입니다. */
export function getDb(): Firestore | null {
  if (db !== undefined) return db;
  const account = readServiceAccount();
  if (!account?.project_id || !account.client_email || !account.private_key) {
    db = null;
    return db;
  }
  const app =
    getApps().length > 0
      ? getApp()
      : initializeApp({
          credential: cert({
            projectId: account.project_id,
            clientEmail: account.client_email,
            privateKey: account.private_key,
          }),
        });
  db = getFirestore(app);
  return db;
}
