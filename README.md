# Retail Buddy — Open Source Kirana POS, Inventory & GST Billing

**Retail Buddy** is a free, open-source **kirana shop POS** and **inventory management** app for neighbourhood grocery stores, medical shops, and general stores in India. Scan stock, sell at the counter, print GST bills, take UPI, and send the bill on WhatsApp — all in the browser.

> Previously named StockScan. Same product, new name.

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Node.js 22](https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)

## Why Retail Buddy

Most Indian kirana and medical shops still run on paper, Excel, or expensive locked POS hardware. Retail Buddy is a **PWA-ready retail billing software** you can run on a phone or laptop:

- **Barcode / product search** for Maggi, milk, salt, and the rest of the shelf
- **Stock buckets** — in stock, low stock, expired, returns
- **GST invoices** with regular, composition, and unregistered shop modes
- **UPI QR** and WhatsApp bill share
- **Staff roles** — owner, salesman, maker, checker, accountant, HR
- **CA pack** — month-end PIN-locked file for your chartered accountant
- **Hindi + 12 more languages**
- Works **offline-first** (PGLite / local store). No Postgres required to try it.

## Who it is for

- Kirana / general store owners
- Medical shop / pharmacy counters
- Wholesale counters that need GST bills and day-close
- Developers building **India retail POS**, **kirana inventory**, or **WhatsApp commerce**

## Quick start

Need **Node.js 22** and **npm**.

```bash
git clone https://github.com/Akshit1018/S.RetailBuddy.git
cd S.RetailBuddy
npm install
VITE_AUTH_ENABLED=false npm run dev
```

Open [http://127.0.0.1:8080](http://127.0.0.1:8080).

Optional AI copilot: set `XAI_API_KEY`. Do not commit `.env`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 8080 |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |

## Tech stack

React 19 · TanStack Start / Router · Vite · Tailwind CSS · Zustand · PGLite · better-auth (optional Grok login)

## License

[MIT](LICENSE) — use it, fork it, sell with it. Star the repo if it helps a shop.

## Keywords

kirana POS, grocery store billing software, GST invoice app India, inventory management for small shops, WhatsApp bill, UPI QR POS, medical shop software, open source retail POS, offline-first POS, Hindi billing app
