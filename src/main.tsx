import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import '@carbon/react/index.scss';

// Hide loading screen after app is ready
const hideLoadingScreen = () => {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.classList.add('hidden');
    // Remove from DOM after animation completes
    setTimeout(() => {
      loadingScreen.remove();
      document.body.style.overflow = 'auto';
    }, 300);
  }
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Hide loading screen after React renders
setTimeout(hideLoadingScreen, 100);
