/** Build a UPI collect / pay deep link */
export function buildUpiLink(opts: {
  pa: string;
  pn?: string;
  am?: number;
  tn?: string;
}): string {
  const pa = opts.pa.trim();
  const params = new URLSearchParams();
  params.set("pa", pa);
  params.set("pn", opts.pn || "Retail Buddy");
  params.set("cu", "INR");
  if (opts.am && opts.am > 0) params.set("am", opts.am.toFixed(2));
  if (opts.tn) params.set("tn", opts.tn.slice(0, 50));
  return `upi://pay?${params.toString()}`;
}

export function isLikelyUpiId(s: string) {
  return /^[\w.\-]{2,}@[\w]{2,}$/.test(s.trim());
}

export function upiQrImageUrl(upiUrl: string, size = 180) {
  if (!upiUrl) return "";
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(upiUrl)}`;
}

export function buildBillUpi(opts: {
  upiId: string;
  shopName: string;
  amountDue: number;
  billNo: string;
}) {
  const upiUrl = buildUpiLink({
    pa: opts.upiId,
    pn: opts.shopName,
    am: opts.amountDue,
    tn: opts.billNo,
  });
  return { upiUrl, qrUrl: upiQrImageUrl(upiUrl) };
}
