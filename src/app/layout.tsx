import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@fontsource-variable/fraunces";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Learn Form", template: "%s · Learn Form" },
  description: "A private studio for learning musical form — and using it.",
  robots: { index: false, follow: false },
};

const themeScript = `try{var t=localStorage.getItem('lf-theme');if(t==='light'){document.documentElement.classList.remove('dark')}}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${GeistSans.variable} ${GeistMono.variable} h-full`}
      style={{ ["--font-serif-display" as string]: "'Fraunces Variable', Georgia, serif" }}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
