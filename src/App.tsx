import { Routes, Route, Navigate } from "react-router-dom";
import { WagmiConfig } from 'wagmi'

import RtlLayout from "layouts/rtl";
import AdminLayout from "layouts/admin";
import AuthLayout from "layouts/auth";
import {config} from 'wagmiConfig'
import './index.css';
import { ToastContainer } from "react-toastify";
import {
  RecoilRoot,

} from 'recoil';


const App = () => {
  return (
    <RecoilRoot>
    <WagmiConfig config={config}>
      <ToastContainer />
    <Routes>
      <Route path="auth/*" element={<AuthLayout />} />
      <Route path="app/*" element={<AdminLayout />} />
      <Route path="rtl/*" element={<RtlLayout />} />
      <Route path="/" element={<Navigate to="/app" replace />} />
    </Routes>
    </WagmiConfig>
    </RecoilRoot>
  );
};

export default App;
