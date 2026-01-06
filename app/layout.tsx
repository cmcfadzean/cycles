import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cycles - Shape Up Planning",
  description: "Plan and manage your engineering cycles with ease",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#7c3aed",
          colorBackground: "#111827",
          colorInputBackground: "#1f2937",
          colorInputText: "#f3f4f6",
        },
      }}
    >
      <html lang="en">
        <body className="antialiased">
          {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#171717",
              color: "#e5e5e5",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
              borderRadius: "0.5rem",
              padding: "0.75rem 1rem",
              border: "1px solid #262626",
              fontSize: "0.875rem",
            },
            success: {
              iconTheme: {
                primary: "#10b981",
                secondary: "#171717",
              },
            },
            error: {
              iconTheme: {
                primary: "#ef4444",
                secondary: "#171717",
              },
            },
          }}
        />
        </body>
      </html>
    </ClerkProvider>
  );
}
