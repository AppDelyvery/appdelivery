import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const SITE = "https://appdelivery-psi.vercel.app";
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "APPDELYVERY — Entrega de encomendas em Palmas-TO com entregador verificado",
    template: "%s · APPDELYVERY",
  },
  description:
    "Entrega de encomendas para empresas em Palmas e região, com entregador verificado por antecedentes, rastreamento ao vivo no mapa e comprovante de entrega. Moto, carro e van.",
  keywords: [
    "entrega Palmas", "motoboy Palmas", "entrega de encomendas Palmas Tocantins",
    "entrega empresa Palmas", "delivery B2B Palmas", "entregador verificado",
    "entrega Luzimangues", "entrega Porto Nacional", "van entrega Tocantins",
    "rastreamento de entrega Palmas",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE,
    siteName: "APPDELYVERY",
    title: "APPDELYVERY — Entrega de encomendas em Palmas-TO com entregador verificado",
    description:
      "A empresa pede, o sistema aciona um entregador de ficha checada, com rastreio ao vivo e comprovante. Palmas e região.",
  },
  robots: { index: true, follow: true },
  verification: process.env.NEXT_PUBLIC_GSC_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION }
    : undefined,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        {GA_ID && (
          <>
            {/* eslint-disable-next-line @next/next/next-script-for-ga */}
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`,
              }}
            />
          </>
        )}
      </body>
    </html>
  );
}
