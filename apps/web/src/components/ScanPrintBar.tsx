"use client";

import { useEffect, useState } from "react";

const QR_SIZE = 160;

/**
 * The QR and the print control for the printable menu.
 *
 * The code has to encode the address this page is actually served from, which
 * is only known in the browser — so it is read after mount rather than during
 * render, where it would disagree with the server's HTML. The address is also
 * printed as text, so the sheet still works if the QR service is unreachable.
 */
export default function ScanPrintBar() {
  const [origin, setOrigin] = useState("");
  const [qrFailed, setQrFailed] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const readableUrl = origin.replace(/^https?:\/\//, "");

  return (
    <>
      <div className="border-b border-ink/10 px-6 py-8 text-center">
        <p className="text-sm text-ink-muted">Scan for the menu online</p>

        <div
          className="mx-auto mt-4 flex items-center justify-center"
          style={{ width: QR_SIZE, height: QR_SIZE }}
        >
          {origin && !qrFailed ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=${QR_SIZE}x${QR_SIZE}&data=${encodeURIComponent(
                origin
              )}`}
              alt={`QR code linking to ${readableUrl}`}
              width={QR_SIZE}
              height={QR_SIZE}
              onError={() => setQrFailed(true)}
            />
          ) : (
            <span
              aria-hidden="true"
              className="h-full w-full border border-dashed border-ink/15"
            />
          )}
        </div>

        {readableUrl && (
          <p className="mt-3 text-sm font-semibold text-ink">{readableUrl}</p>
        )}
      </div>

      <div className="no-print px-6 pt-6 text-center">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-12 items-center rounded-sm bg-charcoal px-8 text-sm font-semibold text-cream transition-colors duration-300 hover:bg-charcoal/90"
        >
          Print this menu
        </button>
      </div>
    </>
  );
}
