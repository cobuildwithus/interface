"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTheme } from "next-themes";
import type QRCodeStyling from "qr-code-styling";
import type { Options } from "qr-code-styling";

type WalletQrProps = {
  address: `0x${string}`;
  size?: number;
  image?: string;
  imageDark?: string;
  imageLight?: string;
};

export function WalletQr({ address, size = 100, image, imageDark, imageLight }: WalletQrProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === "dark";
  const foregroundColor = isDark ? "#ffffff" : "#000000";
  const backgroundColor = isDark ? "#09090b" : "#ffffff";
  const themedImage = isDark ? (imageDark ?? image) : (imageLight ?? image);

  const qrOptions = useMemo<Partial<Options>>(
    () => ({
      width: size,
      height: size,
      type: "svg",
      data: address,
      image: themedImage,
      dotsOptions: {
        color: foregroundColor,
        type: "dots",
      },
      backgroundOptions: {
        color: backgroundColor,
      },
      cornersSquareOptions: {
        type: "extra-rounded",
        color: foregroundColor,
      },
      cornersDotOptions: {
        type: "dot",
        color: foregroundColor,
      },
      imageOptions: {
        crossOrigin: "anonymous",
        margin: 4,
        imageSize: 0.4,
        hideBackgroundDots: true,
      },
      qrOptions: {
        errorCorrectionLevel: "H",
      },
    }),
    [address, backgroundColor, foregroundColor, size, themedImage]
  );
  const qrOptionsRef = useRef(qrOptions);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || qrCodeRef.current) return;
    let isActive = true;

    const init = async () => {
      const { default: QRCodeStyling } = await import("qr-code-styling");
      if (!isActive) return;

      qrCodeRef.current = new QRCodeStyling(qrOptionsRef.current);
      container.innerHTML = "";
      qrCodeRef.current.append(container);
    };

    void init();

    return () => {
      isActive = false;
      container.innerHTML = "";
      qrCodeRef.current = null;
    };
  }, []);

  useEffect(() => {
    const qrCode = qrCodeRef.current;
    qrOptionsRef.current = qrOptions;
    if (!qrCode) return;

    qrCode.update(qrOptions);
  }, [qrOptions]);

  return <div ref={containerRef} style={{ width: size, height: size }} />;
}
