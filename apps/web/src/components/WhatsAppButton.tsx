import { whatsappLink, whatsappMessages } from "@/data/restaurant";
import { WhatsAppIcon } from "@/components/icons";

/**
 * The always-present way to reach the restaurant. Carries the WhatsApp mark in
 * its own colours so guests recognise it; the text buttons elsewhere on the
 * site set their label in charcoal, which the green can actually hold.
 */
export default function WhatsAppButton() {
  return (
    <a
      href={whatsappLink(whatsappMessages.reservation)}
      target="_blank"
      rel="noopener noreferrer"
      className="no-print fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-lg shadow-charcoal/25 transition-transform duration-300 hover:scale-105 hover:bg-whatsapp-dark"
      aria-label="Message us on WhatsApp"
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}
