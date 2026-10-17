# 🧪 Ghid Complet de Testare & Verificare pe Scenarii

Acest ghid conține instrucțiuni practice pas cu pas pentru a testa și valida fiecare funcționalitate, scenariu și optimizare pe telefonul tău.

---

## 📋 Cuprins Scenarii de Testare

1. [Test 1: Prima Pornire după Update & Calibrarea Automată](#test-1-prima-pornire-după-update--calibrarea-automată)
2. [Test 2: Verificarea Pornirii Instantanee (1 Singură Citire)](#test-2-verificarea-pornirii-instantanee-1-singură-citire)
3. [Test 3: Multi-Valută & Testul „100 RON rămâne 100 RON”](#test-3-multi-valută--testul-100-ron-rămâne-100-ron)
4. [Test 4: Ecranul History - Vizualizare pe Lună & Săptămâni](#test-4-ecranul-history---vizualizare-pe-lună--săptămâni)
5. [Test 5: Modul `ALL` & Paginare Reală (Lazy Loading)](#test-5-modul-all--paginare-reală-lazy-loading)
6. [Test 6: Căutarea (Search) & Total Balance Complet (Scenariul „tur”)](#test-6-căutarea-search--total-balance-complet-scenariul-tur)
7. [Test 7: Funcționarea 100% OFFLINE (Mod Avion)](#test-7-funcționarea-100-offline-mod-avion)
8. [Test 8: Adăugare, Editare și Ștergere Tranzacții](#test-8-adăugare-editare-și-ștergere-tranzacții)
9. [Test 9: Insights Carousel & Recorduri](#test-9-insights-carousel--recorduri)
10. [Test 10: Export Rapoarte PDF & CSV](#test-10-export-rapoarte-pdf--csv)

---

## Test 1: Prima Pornire după Update & Calibrarea Automată

**Scop:** Să te asiguri că aplicația citește tranzacțiile tale existente (cele 360), creează structura de statistici și nu dă nicio eroare.

* [ ] **Pasul 1.1:** Instalează update-ul prin `eas update`.
* [ ] **Pasul 1.2:** Deschide aplicația. La prima pornire, va rula silențios funcția de calibrare o singură dată.
* [ ] **Pasul 1.3:** Verifică pe ecranul Home:
  * Total Income, Total Expenses și Total Profit trebuie să reflecte sumele tale corecte.
* [ ] **Pasul 1.4 (Opțional - Firebase Console):**
  * Deschide consola Firebase în browser.
  * Verifică documentul `users/{userId}`: trebuie să aibă câmpurile `byCurrency`, `totalIncomeUSD`, `totalExpenseUSD` și `statsCalibrated: true`.
  * Verifică subcolecția `monthlyStats`: trebuie să existe documente pentru lunile din contul tău (ex: `2026-10`, `2026-09`).

---

## Test 2: Verificarea Pornirii Instantanee (1 Singură Citire)

**Scop:** Să confirmi că la redeschiderea aplicației nu se mai descarcă toate tranzacțiile.

* [ ] **Pasul 2.1:** Închide complet aplicația din meniul de aplicații recente al telefonului (Swipe Up / Kill app).
* [ ] **Pasul 2.2:** Deschide din nou aplicația.
* [ ] **Pasul 2.3 (Ce trebuie să observi):**
  * Ecranul Home apare **instantaneu** (sub 0.2 secunde), fără nicio rotiță de încărcare lungă.
  * Totalurile apar pe loc.
  * În consola Firebase, cota de citiri a crescut cu doar **1 singură citire** (nu cu 360!).

---

## Test 3: Multi-Valută & Testul „100 RON rămâne 100 RON”

**Scop:** Să demonstrezi că trecerea prin alte valute și revenirea la RON nu modifică niciun ban din cauza cursului valutar.

* [ ] **Pasul 3.1:** Asigură-te că aplicația este setată pe **RON**.
* [ ] **Pasul 3.2:** Adaugă o tranzacție de test de **100 RON** (ex: titlu „Test Valută”).
* [ ] **Pasul 3.3:** Verifică în History că tranzacția apare fix ca: `+100,00 RON` (sau `-100,00 RON`).
* [ ] **Pasul 3.4:** Mergi în Settings și schimbă moneda pe **USD ($)**:
  * Verifică tranzacția în History: trebuie să apară convertită în dolari (ex: `$21.50`).
  * Totalurile mari de pe Home trebuie să fie afișate în dolari.
* [ ] **Pasul 3.5:** Schimbă moneda pe **EUR (€)**:
  * Verifică că tranzacția și totalurile se convertesc în euro (ex: `€19.80`).
* [ ] **Pasul 3.6 (Momentul Cheie):** Schimbă moneda înapoi pe **RON**:
  * Tranzacția trebuie să arate **FIX 100,00 RON** (nu 99.98, nu 100.02).
  * Totalul general în RON trebuie să revină la suma lui exactă originală.

---

## Test 4: Ecranul History - Vizualizare pe Lună & Săptămâni

**Scop:** Să verifici că navigarea prin luni și săptămâni este rapidă și exactă.

* [ ] **Pasul 4.1:** Intră pe ecranul **History**.
* [ ] **Pasul 4.2:** Verifică cardul lunii curente (Octombrie):
  * Total Income, Total Expense și Net Profit/Loss trebuie să coincidă cu calculele lunii.
* [ ] **Pasul 4.3:** Verifică cele 4 butoane de săptămână:
  * **WEEK 01** (zilele 1-7)
  * **WEEK 02** (zilele 8-14)
  * **WEEK 03** (zilele 15-21)
  * **WEEK 04** (zilele 22-sfârșit)
  * Săptămânile care conțin tranzacții trebuie să aibă indicatorul aprins.
* [ ] **Pasul 4.4:** Apasă succesiv pe fiecare săptămână:
  * Textul `WEEK BALANCE` se actualizează instant cu profitul/pierderea acelei săptămâni.
  * Lista afișează tranzacțiile acelei săptămâni.
* [ ] **Pasul 4.5:** Schimbă luna din calendar (ex: alege Septembrie):
  * Datele lunii Septembrie și săptămânile ei se încarcă instant.

---

## Test 5: Modul `ALL` & Paginare Reală (Lazy Loading)

**Scop:** Să verifici că lista completă se derulează lin și aduce tranzacții pe rând.

* [ ] **Pasul 5.1:** Pe ecranul History, apasă pe toggle-ul **`ALL`**.
* [ ] **Pasul 5.2:** Verifică deschiderea:
  * Apar primele 25 de tranzacții.
  * `TOTAL BALANCE` afișează balanța de viață a contului tău.
* [ ] **Pasul 5.3 (Scroll / Lazy Loading):**
  * Dă scroll în jos până la capătul primelor 25 de tranzacții.
  * Observă că lista se extinde lin și apar următoarele 25 de tranzacții fără blocaje.
* [ ] **Pasul 5.4 (Sortare MAX / MIN):**
  * Apasă pe butonul **SORT** până ajungi pe **MAX**:
    * Primele tranzacții din listă devin cele cu cele mai mari sume.
  * Apasă din nou pe butonul **SORT** până ajungi pe **MIN**:
    * Primele tranzacții devin cele cu cele mai mici sume.
  * Verifică că `TOTAL BALANCE` rămâne neschimbat la sortare (suma totală de bani nu se modifică).
* [ ] **Pasul 5.5 (Filtrare ANY / INCOME / EXPENSE):**
  * Apasă pe butonul de filtrare și selectează **INCOME**:
    * Lista afișează doar venituri, iar `TOTAL BALANCE` devine venitul total.
  * Selectează **EXPENSE**:
    * Lista afișează doar cheltuieli, iar `TOTAL BALANCE` devine cheltuiala totală.

---

## Test 6: Căutarea (Search) & Total Balance Complet (Scenariul „tur”)

**Scop:** Să verifici că la căutare se găsesc toate rezultatele și `TOTAL BALANCE` este suma exactă a tuturor tranzacțiilor găsite.

* [ ] **Pasul 6.1:** Deschide bara de căutare din colțul de sus (lupa).
* [ ] **Pasul 6.2:** Tastează cuvântul tău frecvent (ex: **„tur”**):
  * Verifică că apar toate rezultatele găsite (cele 230 de tranzacții).
* [ ] **Pasul 6.3 (Verificarea Cheie - Total Balance):**
  * Uită-te la eticheta `TOTAL BALANCE` de deasupra listei.
  * Suma afișată trebuie să fie **profitul total al tuturor celor 230 de tranzacții cu „tur”** (nu doar al primelor 25!).
* [ ] **Pasul 6.4:** Șterge căutarea:
  * Lista și totalul revin automat la starea inițială.
* [ ] **Pasul 6.5:** Caută un cuvânt care apare doar în **Note** (nu în titlu):
  * Verifică că tranzacția este găsită și afișată corect.

---

## Test 7: Funcționarea 100% OFFLINE (Mod Avion)

**Scop:** Să confirmi că aplicația funcționează complet fără internet, fără erori și cu cost zero citiri.

* [ ] **Pasul 7.1:** Pune telefonul în **Mod Avion** (dezactivează Wi-Fi și Datele Mobile).
* [ ] **Pasul 7.2:** Închide complet aplicația și deschide-o din nou în timp ce ești pe modul avion.
* [ ] **Pasul 7.3:** Verifică Home:
  * Se deschide instant, totalurile apar pe ecran, Insights Carousel funcționează.
* [ ] **Pasul 7.4:** Mergi în History:
  * Luna curentă și săptămânile apar complet din memoria locală SQLite.
* [ ] **Pasul 7.5 (Adăugare Tranzacție Offline):**
  * Adaugă o tranzacție de **50 lei** cu titlul „Test Offline”.
  * Salvează tranzacția.
  * Verifică: tranzacția apare imediat în History, iar Totalul din Home a crescut cu 50 lei!
* [ ] **Pasul 7.6 (Reconectarea la Net):**
  * Oprește Modul Avion și reconectează-te la internet.
  * În câteva secunde, tranzacția se sincronizează automat pe serverul Google Cloud (o poți vedea și în consola Firebase).

---

## Test 8: Adăugare, Editare și Ștergere Tranzacții

**Scop:** Să verifici că modificările aduse tranzacțiilor actualizează corect totalurile și statisticile.

### A. Test Editare Sumă
* [ ] **Pasul 8.1:** Ia o tranzacție de 50 lei și editeaz-o la **80 lei**.
* [ ] **Pasul 8.2:** Verifică: totalul general și totalul lunii cresc exact cu diferența de **+30 lei**.

### B. Test Editare Tip (Venit -> Cheltuială)
* [ ] **Pasul 8.3:** Schimbă o tranzacție de tip Venit (100 lei) în tip Cheltuială.
* [ ] **Pasul 8.4:** Verifică: Total Venituri scade cu 100 lei, iar Total Cheltuieli crește cu 100 lei.

### C. Test Editare Dată (Mutare între Luni/Săptămâni)
* [ ] **Pasul 8.5:** Ia o tranzacție din Octombrie (Săptămâna 2) și schimbă-i data în Septembrie (Săptămâna 1).
* [ ] **Pasul 8.6:** Verifică:
  * Suma a dispărut din balanța lunii Octombrie.
  * Suma a apărut corect în balanța lunii Septembrie.

### D. Test Ștergere Tranzacție
* [ ] **Pasul 8.7:** Dă swipe și șterge o tranzacție din listă.
* [ ] **Pasul 8.8:** Verifică: suma se scade din totalul general, din luna respectivă și din săptămâna respectivă, iar numărul de tranzacții din badge scade cu 1.

---

## Test 9: Insights Carousel & Recorduri

**Scop:** Să verifici că toate cardurile de statistici de pe Home funcționează corect.

* [ ] **Pasul 9.1:** Pe ecranul Home (tab-ul TOTAL), privește caruselul de jos.
* [ ] **Pasul 9.2:** Verifică rotația cardurilor:
  * **DAILY AVERAGE:** Media zilnică calculată corect.
  * **WEEKLY AVERAGE:** Media pe săptămână.
  * **MONTHLY AVERAGE:** Media pe lună.
  * **BEST DAY EVER:** Recordul celei mai bune zile din istoric.
  * **BEST WEEK EVER:** Recordul celei mai bune săptămâni.
  * **SAVING RATE:** Procentul de economisire (ex: `28.5%`).

---

## Test 10: Export Rapoarte PDF & CSV

**Scop:** Să te asiguri că exportul din Settings nu a fost afectat de nicio modificare.

* [ ] **Pasul 10.1:** Mergi pe ecranul **Settings**.
* [ ] **Pasul 10.2:** Apasă pe **Export Report** și alege formatul **PDF**:
  * Verifică că se generează fișierul PDF complet cu toate tranzacțiile tale.
* [ ] **Pasul 10.3:** Alege formatul **CSV**:
  * Verifică că se generează tabelul CSV descărcabil.
