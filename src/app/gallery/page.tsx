import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import GalleryGrid from "@/components/GalleryGrid";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "The dining room, the bar, the plates and the drinks — photographed across a week of service.",
  alternates: { canonical: "/gallery" },
};

export default function GalleryPage() {
  return (
    <>
      <PageHero
        title="Gallery"
        subtitle="The room, the plates and the bar"
        image="https://images.unsplash.com/photo-1559339352-11d035aa65de?w=2000&h=1000&fit=crop"
      />

      <section className="bg-cream py-24">
        <div className="mx-auto max-w-7xl px-6">
          <GalleryGrid />
        </div>
      </section>
    </>
  );
}
