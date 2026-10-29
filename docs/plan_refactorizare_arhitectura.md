# 🗺️ Plan Complet de Refactorizare & Arhitectură (Toată Aplicația)

Acest document reprezintă auditul arhitectural complet și ghidul pas cu pas pentru refactorizarea întregii aplicații **MoneyTracker**. Planul acoperă nu doar fișierele de peste 800 de linii, ci și problemele de structură, duplicare de cod și anti-pattern-uri descoperite în proiect.

---

## 📊 Tabloul General al Întregii Aplicații

| Categorie | Fișiere Vizate | Linii Actual | Problemă Cheie Identificată |
| :--- | :--- | :--- | :--- |
| **Top Monoliți** | [history.tsx](file:///d:/MoneyTracker/app/(tabs)/history.tsx) | **1.167** | Calcule masive în ecran, listeneri, header uriaș, 3 modale. |
| **Top Monoliți** | [statsManager.ts](file:///d:/MoneyTracker/utils/statsManager.ts) | **1.008** | Amestec de calcule pure cu mutări atomice Firestore și calibrare. |
| **Top Monoliți** | [LoansTab.tsx](file:///d:/MoneyTracker/components/LoansTab.tsx) | **937** | Modal complet inline de 200 linii + 270 linii stiluri. |
| **Top Monoliți** | [TransactionOptionsMenu.tsx](file:///d:/MoneyTracker/components/TransactionOptionsMenu.tsx) | **921** | Calendar custom desenat de mână + formular editare + 300 linii stiluri. |
| **Top Monoliți** | [GoalsTab.tsx](file:///d:/MoneyTracker/components/GoalsTab.tsx) | **843** | Calcule complexe de ritm/pace făcute inline în JSX + 250 linii stiluri. |
| **Ecrane Aglomerate** | [settings.tsx](file:///d:/MoneyTracker/app/(tabs)/settings.tsx) | **801** | Operațiuni batch Firestore (Clear all/Delete account), Export PDF/CSV și Modal de monedă. |
| **Ecrane Aglomerate** | [home.tsx](file:///d:/MoneyTracker/app/(tabs)/home.tsx) | **633** | 190 linii de stiluri inline + sub-componente animate inline. |
| **Componente de Bază** | [FinanceModalBase.tsx](file:///d:/MoneyTracker/components/FinanceModalBase.tsx) | **538** | 240 linii de stiluri inline partajate prin import direct de stiluri. |
| **Componente de Bază** | [DatePicker.tsx](file:///d:/MoneyTracker/components/DatePicker.tsx) | **450** | Calendar range selector cu stiluri și calcule de date inline. |
| **Navigație & Rute** | [app/(tabs)/_layout.tsx](file:///d:/MoneyTracker/app/(tabs)/_layout.tsx) | **464** | `CustomTabBar` inline (200 linii) + căutare globală în antet. |
| **Anti-Pattern Rute** | [app/(tabs)/speedEntry.tsx](file:///d:/MoneyTracker/app/(tabs)/speedEntry.tsx) | **217** | **Atenție:** Un modal a fost pus în folderul de rute Expo Router `(tabs)/`, fiind tratat eronat ca ecran de tab. |
| **Duplicare Cod** | [login.tsx](file:///d:/MoneyTracker/app/login.tsx) & [register.tsx](file:///d:/MoneyTracker/app/register.tsx) | **702** | Inputuri, validări, comutare parolă și design carduri duplicate 1 la 1. |

---

## 🛡️ Principii de Bază pentru Refactorizare

1. **Risc Zero de Regresie:** Funcționalitatea rămâne 100% identică. Se mută bucăți de cod în fișiere dedicate, fără a schimba logica sau formulele matematice.
2. **TypeScript ca Arbitru:** La fiecare pas se rulează `npx tsc --noEmit`. 0 erori = undă verde.
3. **Branch Git Dedicat:** Totul se lucrează pe `git checkout -b refactor/architecture-cleanup`.

---

## 📋 Fazele de Execuție Structurate

---

### 🟢 FAZA 1: Corecția de Rute Expo & Izolarea Stilurilor (Risc Zero)

#### 1.1 Mutarea `speedEntry.tsx` în afara folderului `app/(tabs)/`
* **Problemă:** În Expo Router, orice fișier din `app/(tabs)/` devine rută. `speedEntry.tsx` este de fapt componenta `TransactionModal` (un dialog pop-up), nu un ecran cu tab.
* **Soluție:** Se mută în `components/modals/TransactionModal.tsx`. Se actualizează importul din `_layout.tsx`.

#### 1.2 Extragerea Stilurilor din Fișierele Mari
Se creează fișiere dedicate `.styles.ts` pentru componentele care încă au 200–300 de linii de stiluri la final:
* `styles/loans.styles.ts` (din [LoansTab.tsx](file:///d:/MoneyTracker/components/LoansTab.tsx)) ➔ **-270 linii**
* `styles/transactionOptions.styles.ts` (din [TransactionOptionsMenu.tsx](file:///d:/MoneyTracker/components/TransactionOptionsMenu.tsx)) ➔ **-300 linii**
* `styles/goals.styles.ts` (din [GoalsTab.tsx](file:///d:/MoneyTracker/components/GoalsTab.tsx)) ➔ **-250 linii**
* `styles/home.styles.ts` (din [home.tsx](file:///d:/MoneyTracker/app/(tabs)/home.tsx)) ➔ **-190 linii**
* `styles/financeModal.styles.ts` (din [FinanceModalBase.tsx](file:///d:/MoneyTracker/components/FinanceModalBase.tsx)) ➔ **-240 linii**

---

### 🟡 FAZA 2: Modularizarea Tab-urilor de Finanțe (`LoansTab` & `GoalsTab`)

#### 2.1 Refactorizare `LoansTab.tsx` (937 ➔ ~200 linii)
1. **Extragere `LoanModal`:** Mutat în `components/loans/LoanModal.tsx` (~190 linii).
2. **Extragere `LoanCard`:** Mutat JSX-ul din bucla `.map()` în `components/loans/LoanCard.tsx` (~80 linii).
3. **Rezultat:** `LoansTab.tsx` rămâne un ecran suplu care doar afișează comutatorul Active/Settled și lista.

#### 2.2 Refactorizare `GoalsTab.tsx` (843 ➔ ~240 linii)
1. **Extragere Calcule Matematice:** Toată logica de ritm, zile rămase și calibrare (liniile 380–450) se mută în `utils/goalMetrics.ts`.
2. **Extragere Carduri:**
   - `components/goals/AddGoalCard.tsx` (cardul punctat cu buton de adăugare).
   - `components/goals/GoalCardItem.tsx` (cardul cu cercul SVG și progresul).

---

### 🟠 FAZA 3: Meniul de Tranzacții & Componentele Partajate

#### 3.1 Refactorizare `TransactionOptionsMenu.tsx` (921 ➔ ~200 linii)
1. **Extragere Calendar Inline:** Grila de zile (liniile 180–292) devine `components/common/InlineMonthCalendar.tsx`.
2. **Separare Formular Editare:** Partea de editare tranzacție (câmpuri, validare, salvare) devine `components/transactions/TransactionEditView.tsx`.
3. **Rezultat:** Fișierul principal rămâne strict un meniu modal care decide dacă afișează butoanele sau formularul.

#### 3.2 Refactorizare `app/(tabs)/_layout.tsx` (464 ➔ ~180 linii)
1. **Extragere `CustomTabBar`:** Bara animată de jos cu efect de Blur și indicatoare se mută în `components/navigation/CustomTabBar.tsx` (~200 linii).
2. **Rezultat:** `_layout.tsx` rămâne curat, ocupându-se doar de configurarea tab-urilor Expo Router.

---

### 🔴 FAZA 4: Ecranul `Settings.tsx` (801 ➔ ~250 linii)

Ecranul de setări face în prezent prea multe operațiuni grele de Firestore și fișiere:

1. **Extragere Serviciu de Export:**
   - Funcția `handleExportAudit` (55 linii) se mută în `services/auditExportService.ts`.
2. **Extragere Serviciu de Curățare / Ștergere Cont:**
   - `handleClearTransactions`, `handleClearLoans` și `deleteAccount` fac batch delete-uri Firestore de câte 500 de documente (peste 130 linii de cod). Se mută în `services/userDataCleanup.ts`.
3. **Extragere Modal Monedă:**
   - Modalul cu căutare și selecție a monedei (liniile 728–796) devine `components/settings/CurrencyPickerModal.tsx`.

---

### 🟣 FAZA 5: Ecranul `History.tsx` (1.167 ➔ ~200 linii)

Fiind cel mai mare ecran:

1. **Extragere `TransactionRow.tsx`:** Rândul memoizat cu Swipeable se mută în `components/history/TransactionRow.tsx` (~130 linii).
2. **Creare Hook `useHistoryData.ts`:**
   - Preia listenerul Firestore de tranzacții lunare.
   - Preia listenerul de `monthlyStatsDoc`.
   - Preia blocul `useMemo` de 250 linii care grupează și însumează datele pe zile și săptămâni.
3. **Extragere Sub-Componente de Header:**
   - `components/history/HistorySummaryCard.tsx` (Total Income / Expense / Profit).
   - `components/history/WeekSelector.tsx` (Selectorul 01-04).
   - `components/history/HistoryFilterBar.tsx` (Range, Sortare, Tip).

---

### 🔵 FAZA 6: Logica de Business `utils/statsManager.ts` (1.008 ➔ 4 sub-module)

Pentru a nu afecta performanța sau sincronizarea atomica din Firestore:

1. `utils/stats/types.ts` (~80 linii): Toate interfețele TypeScript.
2. `utils/stats/calculators.ts` (~250 linii): Funcții matematice pure (`computeDisplayFromStats`, calcul chei săptămâni/luni).
3. `utils/stats/sync.ts` (~400 linii): Funcțiile de scriere Firestore (`onTransactionCreated`, `onTransactionDeleted`, `onTransactionUpdated`).
4. `utils/stats/insights.ts` (~250 linii): Calibrare și căutare `bestDayEver` / `bestWeekEver`.
5. **Fișierul principal [statsManager.ts](file:///d:/MoneyTracker/utils/statsManager.ts)** devine un barrel file (`export * from './stats/...'`), garantând că **niciun import din restul aplicației nu se sparge**.

---

### ⚪ FAZA 7: Ecranele de Autentificare (`login.tsx` & `register.tsx`)

* `login.tsx` (298 linii) și `register.tsx` (404 linii) au peste 60% cod identic (layout, inputuri cu parolă afișată/ascunsă, validări regex, butoane de social auth).
* **Soluție:** Se extrag componentele comune în `components/auth/AuthInputField.tsx` și `components/auth/AuthContainer.tsx`.

---

## 🧪 Matrice de Verificare & Testare Manuală

După fiecare fază, se testează:
- [ ] **TypeScript Check:** `npx tsc --noEmit` fără erori.
- [ ] **Rulare Expo:** Navigare în toate cele 4 tab-uri principale.
- [ ] **Creare Tranzacție:** Adăugare tranzacție din butonul central `+` ➔ verificat dacă se actualizează totalurile din Home și History.
- [ ] **Swipe & Edit:** Swipe to delete pe o tranzacție; Long press ➔ Edit tranzacție din meniul de opțiuni.
- [ ] **Împrumuturi:** Adăugare împrumut nou, bifare ca `settled`, verificare persistență la reload.
- [ ] **Obiective:** Creare obiectiv, verificare calcul cerc SVG, ștergere.
- [ ] **Export & Setări:** Test export PDF/CSV, test selecție monedă.
