import { BrowserRouter } from "react-router-dom";
import { ConfigProvider } from "antd";
import { AuthProvider } from "@/store/AuthContext";
import AppRouter from "@/router/AppRouter";

const theme = {
  token: {
    colorPrimary: "#1677ff",
    borderRadius: 6,
  },
};

export default function App() {
  return (
    <BrowserRouter>
      <ConfigProvider theme={theme}>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </ConfigProvider>
    </BrowserRouter>
  );
}
