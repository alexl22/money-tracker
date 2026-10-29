# Plan de Implementare: Optimizare Firestore (1 Citire la Startup)

## 1. Obiectiv Principal
Reducerea numărului de citiri Firestore la deschiderea aplicației de la **141+ citiri (toate tranzacțiile)** la **exact 1 singură citire de document (`users/{userId}`)**, păstrând acuratețea de 100% a tuturor calculelor, statisticilor și cardurilor din carusel.

---

## 2. Starea Curentă a Implementării

- [x] **Pasul 1: Totaluri agregate și incremente atomice** (`utils/statsManager.ts`)
  - Toate totalurile globale (`totalIncomeUSD`, `totalExpenseUSD`, număr tranzacții, prima dată) sunt agregate în `users/{userId}`.
  - Subcolecția `users/{userId}/monthlyStats/{YYYY-MM}` conține totalurile lunare și descompunerea pe săptămâni.
  - Funcția `computeDisplayFromStats` acoperă toate formatele de monedă și chei.

- [x] **Pasul 2: Formule validate și calibrate pentru Insights** (`components/InsightsCarousel.tsx`)
  - Regula de înghețare la $\ge 7$ zile de inactivitate funcționează conform specificației.
  - Media săptămânală include săptămâna curentă doar dacă este parcursă $\ge 75\%$.
  - Media lunară include o lună doar dacă are venituri (`income > 0`), data primei tranzacții din acea lună este $\le 15$ și (dacă e luna curentă) este parcursă $\ge 75\%$.
  - Calculele pentru Best Day Ever, Best Week Ever, Saving Rate și Summer Projection sunt calibrate.

- [x] **Pasul 3: Decuplarea parțială a istoricului** (`app/(tabs)/history.tsx`)
  - Header-ul lunii și cardurile săptămânale citesc direct din `monthlyStats`.

---

## 3. Pasul Final: Persistență `insights` & Înlăturare Descărcare Globală Tranzacții

Pe ecranul **Home** nu există o listă de tranzacții recente (există doar cardurile de Total/Lună și `InsightsCarousel`). Deoarece caruselul era singurul motiv pentru care descărcam toate tranzacțiile la pornire, salvarea `insights` în baza de date elimină complet această nevoie.

### 3.1. Structura extinsă în `users/{userId}`
Vom adăuga în documentul de utilizator:
```typescript
interface UserStatsDoc {
  // ... câmpurile existente de totaluri ...
  firstTransactionDate?: string;
  lastTransactionDate?: string;
  insights?: {
    avgDailyProfitUSD: number;
    avgWeeklyProfitUSD: number;
    avgMonthlyProfitUSD: number;
    bestDayEver: {
      date: string;
      amountUSD: number;
    } | null;
    bestWeekEver: {
      weekKey: string;
      amountUSD: number;
    } | null;
    savingRate: number;
    daysTotalElapsed: number;
    eligibleWeeksCount: number;
    eligibleMonthsCount: number;
    lastCalculatedAt: string;
  };
}
```

### 3.2. Actualizare `utils/statsManager.ts`
1. **În `calibrateUserStats`**:
   - Calculăm întregul set de `insights` folosind regulile calibrate (înghețare la 7 zile, 75% săptămâni, $\le 15$ & venituri pentru luni, best day, best week).
   - Scriem obiectul `insights` și `lastTransactionDate` direct în documentul `users/{userId}`.
2. **În trigger-ele de tranzacție (`onTransactionCreated`, `onTransactionDeleted`, `onTransactionUpdated`)**:
   - Actualizăm `lastTransactionDate`.
   - Ajustăm incremental sau recalibrăm rapid `insights` fără a forța citiri suplimentare.

### 3.3. Actualizare `components/InsightsCarousel.tsx`
- În Fast Path, dacă `userStats.insights` există:
  - Consumăm direct mediile precalculate, `bestDayEver`, `bestWeekEver`, `savingRate`.
  - Nu mai iterăm și nu mai avem nevoie deloc de array-ul de tranzacții (`transactions = []`).
  - Caruselul se afișează instantaneu la deschiderea aplicației.

### 3.4. Refactorizare `context/TransactionsContext.tsx`
- Eliminăm ascultătorul global:
  ```typescript
  // SE ELIMINĂ LA PORNIRE:
  const q = query(collection(db, 'transactions'), where('userId', '==', user.uid));
  ```
- `TransactionsContext` va asculta **doar** documentul utilizatorului:
  `doc(db, 'users', user.uid)` $\rightarrow$ **1 singură citire de document la deschiderea aplicației!**

### 3.5. Încărcare la cerere în `app/(tabs)/history.tsx`
- Tranzacțiile nu se mai țin în memorie global pentru toată aplicația.
- Când utilizatorul deschide tab-ul **History**, încărcăm tranzacțiile:
  - Doar pentru luna curentă selectată (`where('dateString', '>=', startOfMonth)` și `<= endOfMonth`).
  - Sau cu paginare (`limit(25)` / infinite scroll) dacă utilizatorul alege modul „All”.
- Astfel, utilizatorul descarcă doar documentele pe care chiar vrea să le vadă.

---

## 4. Beneficii Confirmate
1. **Reducere masivă a costurilor Firestore**: de la 140+ citiri la fiecare deschidere a aplicației la **exact 1 singură citire** pe Home.
2. **Viteză instantanee**: Ecranul Home apare la milisecundă, fără buffering sau lag cauzat de transferul JSON.
3. **Căutare completă păstrată**: Căutarea funcționează fără compromisuri, aducând datele la cerere când utilizatorul chiar folosește căutarea.
4. **Protecție completă a recordurilor**: Recordurile Best Day și Best Week se actualizează automat atât la câștigarea unui nou record, cât și la ștergerea tranzacțiilor din acea zi record.
