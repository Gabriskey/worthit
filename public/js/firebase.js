import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDTZ57NAU_ywcjuoEVGYlWV1DxZPjATtWk",
  authDomain: "worthitright.firebaseapp.com",
  projectId: "worthitright",
  storageBucket: "worthitright.firebasestorage.app",
  messagingSenderId: "215740801837",
  appId: "1:215740801837:web:42f4f0d3c4a18ca8a929a4"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export {
  app,
  auth,
  googleProvider
};