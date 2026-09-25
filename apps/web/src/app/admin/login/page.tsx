import type { Metadata } from "next";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import { restaurantInfo } from "@/data/restaurant";

export const metadata: Metadata = {
  title: "Staff sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; expired?: string }>;
}) {
  const { next, expired } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-charcoal px-6 py-24">
      <div className="w-full max-w-sm">
        <p className="text-center font-display text-3xl font-semibold tracking-wide text-gold">
          {restaurantInfo.name}
        </p>
        <h1 className="mt-2 text-center text-sm uppercase tracking-widest text-on-dark-soft">
          Staff panel
        </h1>

        <AdminLoginForm nextPath={next} expired={expired === "1"} />
      </div>
    </div>
  );
}
