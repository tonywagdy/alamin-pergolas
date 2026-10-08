import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

const firebaseConfig = {
  "projectId": "gen-lang-client-0718695041",
  "appId": "1:764560451576:web:3c21174569dcc275e5d80d",
  "apiKey": "AIzaSyDtB9Wgt5VVWvVaCfzu0YxKmtLCxrLM-a8",
  "authDomain": "gen-lang-client-0718695041.firebaseapp.com",
  "firestoreDatabaseId": "ai-studio-c9dea870-1bc9-4dc9-9cf3-99089ddb6a4a",
  "storageBucket": "gen-lang-client-0718695041.firebasestorage.app",
  "messagingSenderId": "764560451576",
  "measurementId": ""
};

export const app = initializeApp(firebaseConfig);

// Configure the domain in Firebase App Check before setting this public key.
// Enforce App Check for Firestore and Storage in the Firebase console after QA.
const appCheckKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY;
if (appCheckKey) {
  initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(appCheckKey), isTokenAutoRefreshEnabled: true });
}

// Initialize standard lightweight Firestore instance
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Lazy Auth instance: Only initialized when /admin is accessed (prevents 93KiB auth/iframe.js from loading for public visitors)
let _authInstance: any = null;
export const auth: any = new Proxy({} as any, {
  get(_target, prop) {
    if (!_authInstance) {
      _authInstance = getAuth(app);
    }
    const val = _authInstance[prop];
    return typeof val === 'function' ? val.bind(_authInstance) : val;
  }
});

// Lazy Storage instance: Only initialized when upload/storage methods are accessed
let _storageInstance: any = null;
export const storage: any = new Proxy({} as any, {
  get(_target, prop) {
    if (!_storageInstance) {
      _storageInstance = getStorage(app);
    }
    const val = _storageInstance[prop];
    return typeof val === 'function' ? val.bind(_storageInstance) : val;
  }
});
