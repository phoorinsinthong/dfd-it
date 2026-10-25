import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/auth-context";

export const metadata: Metadata = {
  title: "ระบบบริหารจัดการแผนกสนับสนุนทางเทคนิค | IT Support & Resource Management",
  description: "ระบบแจ้งซ่อม จองห้องประชุม ยืม-คืนอุปกรณ์ และงานบำรุงรักษาเชิงป้องกัน แผนกสนับสนุนเทคนิค",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "IT Support",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="h-full">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 antialiased selection:bg-blue-500 selection:text-white">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
