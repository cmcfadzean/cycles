import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pitch Signup",
  description: "Sign up for your preferred pitches this cycle",
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Clean layout without app chrome — standalone public page
  return <>{children}</>;
}

