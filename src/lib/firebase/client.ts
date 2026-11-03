"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

// Firebase 웹 앱 설정값입니다. 화면에서 쓰는 공개값이라 비밀이 아니며, .env.local에 적습니다.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);

/** 설정값이 모두 있을 때만 Firebase 로그인 기능을 돌려줍니다. */
export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured) return null;
  const app = getApps().length > 0 ? getApp() : initializeApp(config);
  return getAuth(app);
}
