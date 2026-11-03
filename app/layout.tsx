import type { Metadata } from "next"
import { DM_Sans } from "next/font/google"
import { Toaster } from "sonner"
import { AuthProvider } from "@/lib/auth"
import "./globals.css"

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap", axes: ["opsz"] })

export const metadata: Metadata = {
  title: "Synago · Church office",
  description: "Synago church management",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body className="font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
        <Toaster position="top-right" toastOptions={{ classNames: { toast: "font-sans rounded-xl border-border" } }} />
      </body>
    </html>
  )
}
