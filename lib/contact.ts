const COUNTRY_CODE = process.env.NEXT_PUBLIC_PHONE_COUNTRY_CODE ?? "256"

/** "0772 123456" → "256772123456" for wa.me links. */
export function whatsappNumber(phone: string) {
  const digits = phone.replace(/\D/g, "")
  if (phone.trim().startsWith("+")) return digits
  return digits.startsWith("0") ? COUNTRY_CODE + digits.slice(1) : digits
}

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`
export const waHref = (phone: string, text?: string) => `https://wa.me/${whatsappNumber(phone)}${text ? `?text=${encodeURIComponent(text)}` : ""}`
export const mailHref = (email: string) => `mailto:${email}`
export const mapsHref = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
