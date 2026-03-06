import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Naos Attendance MVP",
  description: "Security guard time and attendance system for Naos Complex"
};

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
        {props.children}
      </body>
    </html>
  );
}

