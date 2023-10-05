import { Routes, Route, Navigate } from "react-router-dom";
import { WagmiConfig } from 'wagmi'

import AdminLayout from "layouts/admin";
import {chains, config} from 'wagmiConfig'
import './index.css';
import { ToastContainer } from "react-toastify";
import {
  RecoilRoot,

} from 'recoil';
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";


const App = () => {
  return (
    <RecoilRoot>
    <WagmiConfig config={config}>
    <RainbowKitProvider chains={chains}>
      <ToastContainer />
    <Routes>
      <Route path="app/*" element={<AdminLayout />} />
      <Route path="/" element={<Navigate to="/app" replace />} />
    </Routes>
    </RainbowKitProvider>
    </WagmiConfig>
    </RecoilRoot>
  );
};

export default App;
