import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cycle Overview",
  description: "View cycle pitches and team assignments",
};

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout removes the main app header for a clean shareable view
  return <>{children}</>;
}

