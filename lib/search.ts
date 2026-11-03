/** Opens the global search palette from anywhere (sidebar button, mobile bar). */
export const openSearch = () => window.dispatchEvent(new Event("synago:search"))

export const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
