# 💡 Idei și Îmbunătățiri Viitoare (Backlog & Feature Ideas)

Acest document reunește ideile de funcționalități, optimizări de interfață (UI/UX) și îmbunătățiri de arhitectură care pot fi implementate în versiunile viitoare.

---

## 1. Scope Selector pentru Căutarea în Istoric (Search Scope Pill)

### 📌 Context & Nevoie
În ecranul **History**, utilizatorul dorește uneori să caute strict în săptămâna pe care o vizualizează (ex: Săptămâna 1), alteori în toată luna selectată (ex: Octombrie), iar alteori în întregul istoric (All History).

În loc ca utilizatorul să comute manual între ecrane înainte de a căuta, căutarea poate include un selector discret de domeniu (*Scope Selector*).

---

### 🎨 Mockup Vizual & Poziționare

Când se apasă pe iconița de căutare (lupa 🔍), bara de căutare din antet se deschide, iar sub ea (la începutul listei) apare un toggle stil capsulă (*Pill Segmented Control*):

```text
┌─────────────────────────────────────────────────────────────┐
│ 🔍  [ Search transactions...                    ]     ( X ) │  <-- Header Input
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│     [  WEEK 01  ]       [  OCTOMBRIE  ]       [  ALL  ]     │  <-- Scope Selector
└─────────────────────────────────────────────────────────────┘

  SEARCH RESULTS (3)                            TOTAL: -120 RON
  -------------------------------------------------------------
  🛒 Supermarket • 14:30 • Mâncare                    -50 RON
  ☕ Cafea • 09:15 • Birou                            -15 RON
  ⛽ Benzină • 18:00 • Auto                           -55 RON
```

---

### ⚙️ Specificații de Funcționare & Comportament

1. **Default Inteligent (Context-Aware):**
   * Dacă utilizatorul era pe o săptămână anume (ex: Săptămâna 1) $\rightarrow$ selectorul pornește automat pe **`WEEK`**. Căutarea filtrează instant strict tranzacțiile acelei săptămâni.
   * Dacă utilizatorul era pe modul `ALL` $\rightarrow$ selectorul pornește automat pe **`ALL`**.
2. **Comutare Rapidă cu 1 Atingere:**
   * Utilizatorul poate atinge **`OCTOMBRIE`** (sau luna curentă) pentru a extinde căutarea la nivelul întregii luni, fără să părăsească modul de căutare.
   * Atingerea oricărei opțiuni filtrează datele instant în memorie (0 citiri Firestore suplimentare, 0 ms lag).
3. **Recalculare Dinamică:**
   * Totalurile din antet (`TOTAL INCOME`, `TOTAL EXPENSE`, `TOTAL BALANCE`) și numărul de rezultate din badge (`txCount`) se actualizează pe loc pentru domeniul selectat.
4. **Design & Estetică:**
   * Fundal semitransparent `rgba(255, 255, 255, 0.05)` cu colțuri complet rotunjite (stil pastilă).
   * Butonul activ iluminat în albastru (`#3b82f6`) cu text alb.
   * Butoanele inactive cu text gri discret `rgba(255, 255, 255, 0.5)`.

---
