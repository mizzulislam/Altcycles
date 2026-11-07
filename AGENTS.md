# Konvensi Proyek Altcycles

Dokumen ini mencatat konvensi arsitektur komponen dan penggunaan skill untuk **Altcycles** (sistem administrasi keuangan dan akuntansi internal / ERP keuangan milik Altvira).

## 1. Fondasi Komponen & Token Desain UI

- **Fondasi Utama:** `shadcn` adalah fondasi utama seluruh komponen UI aplikasi.
- **Komponen Tambahan di Atas Fondasi:** Komponen dan blok dari `21st.dev`, `reactbits`, dan `tailark` ditambahkan **di atas `shadcn`** menggunakan **token desain yang sama** (variabel warna, tipografi, radius, spacing, dan tema yang seragam), bukan membawa sistem token terpisah yang saling bertabrakan.
- **Koordinasi Skill Desain:** Workspace ini memiliki beberapa skill desain dan UX (`frontend-design`, `ui-ux-pro-max`, `design-taste-frontend`, `awesome-design-md`, `web-design-guidelines`, `motion`, `driver-js`). Skill desain tidak boleh saling menimpa konfigurasi proyek atau menetapkan keputusan desain/stack secara sepihak sebelum dokumen kebutuhan dan arahan desain disetujui.

## 2. Keamanan & Kerahasiaan Data Keuangan

- Jangan pernah menyimpan API key, token, kredensial, atau secret di dalam file skill, konfigurasi repo, maupun kode sumber.
- Jangan mempublikasikan komponen, tema, atau kode internal Altcycles ke registri publik eksternal (seperti fitur publish `21st-registry` atau `21st-design-sync`).

