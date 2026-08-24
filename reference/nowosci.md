KONCEPCJA APLIKACJI
Workspace / back office dla projektantów wnętrz
Dokument koncepcyjny dla developera • MVP
IDEA W JEDNYM ZDANIU
Projektant tworzy klienta i projekt, a następnie z własnych szablonów szybko generuje wyceny, harmonogramy i dokumenty. Wszystkie dane, wersje i materiały dotyczące klienta pozostają w jednym miejscu.


1. 1. Cel produktu
Aplikacja ma usprawnić administracyjną i organizacyjną część pracy studia projektowania wnętrz. Nie jest programem CAD, narzędziem do wizualizacji 3D ani systemem do sourcingu wyposażenia. Jej rdzeniem jest automatyzacja powtarzalnych czynności wykonywanych przy każdym kliencie: przygotowanie oferty, wyliczenie ceny i terminu, używanie własnych pakietów i cenników, przechowywanie kolejnych wersji dokumentów oraz prowadzenie projektu w jednym workspace.
GŁÓWNA OBIETNICA PRODUKTU
Ustaw studio raz: usługi, ceny, pakiety, czasy realizacji i szablony dokumentów. Przy kolejnym kliencie wybierasz zakres, a aplikacja wykonuje powtarzalną pracę za Ciebie.

2. 2. Użytkownik docelowy
Samodzielny projektant / architekt wnętrz.
Małe studio projektowania wnętrz (np. 2–10 osób).
Użytkownik, który dziś pracuje na Excelu, Wordzie, PDF-ach, folderach i własnych szablonach.
Użytkownik, który chce zachować własny sposób wyceniania i prowadzenia projektu, zamiast dostosowywać się do sztywnego systemu.
3. 3. Co pokazał otrzymany plik Excel
Plik źródłowy jest dobrym materiałem do zaprojektowania MVP, ponieważ pokazuje realny workflow projektanta. Zawiera osobne obszary dla kalkulacji terminu, dokumentu z szacowanym terminem, wyceny, rejestru ofert, etapów współpracy oraz cennika usług dodatkowych.
Obszar z Excela
Logika
Odpowiednik w aplikacji
TERMIN – DANE / DOKUMENT
Czasy etapów zależne od pomieszczeń; osobno czas architekta i inwestora; daty zakończenia.
Kalkulator terminu + harmonogram projektu.
WYCENA
Pozycje, ilości, ceny, rabaty, suma i cena po rabacie.
Generator wycen z biblioteką pozycji i szablonami.
OFERTY
Rejestr wysłanych ofert i danych inwestora.
Historia ofert przypisana do klienta/projektu.
ETAPY WSPÓŁPRACY
Lista etapów zawartych / niezawartych w projekcie.
Szablony zakresu i workflow projektu.
CENNIK USŁUG DODATKOWYCH
Usługi, ceny i przewidywany czas realizacji.
Biblioteka usług dodatkowych, wpływ na cenę i termin.

4. 4. Główna struktura aplikacji
Podstawowa hierarchia danych:
MODEL
STUDIO → KLIENT → PROJEKT → WYCENY / TERMIN / ZAKRES / DOKUMENTY / USŁUGI DODATKOWE / NOTATKI

4.1 Dashboard
Lista aktywnych klientów i projektów.
Szybki przycisk „Nowy klient / Nowy projekt”.
Ostatnio edytowane projekty.
Opcjonalnie później: nadchodzące terminy, oferty oczekujące, płatności.
4.2 Klient
Imię i nazwisko / nazwa inwestora.
Telefon, e-mail, adres inwestycji, miasto.
Notatki.
Lista projektów klienta.
Dane wpisane raz powinny automatycznie pojawiać się w dokumentach projektu.
4.3 Projekt
Nazwa projektu, klient, adres, metraż, typ inwestycji, status.
Pomieszczenia i ich liczba – jeżeli są potrzebne do kalkulacji zakresu/terminu.
Wybrany pakiet / zakres.
Historia wycen i dokumentów.
Szacowany termin i wartość projektu.
Usługi dodatkowe.
5. 5. Moduł kluczowy: generator wycen
To powinien być pierwszy i najlepiej dopracowany moduł MVP. Obecny generator HTML jest punktem odniesienia funkcjonalnego.
6. Użytkownik wybiera klienta i projekt.
7. Wybiera zapisany szablon wyceny, np. „Projekt kompleksowy”, „Projekt koncepcyjny” albo „Konsultacja”.
8. System ładuje zapisane sekcje i pozycje wraz z cenami, jednostkami i domyślnymi ustawieniami.
9. Projektant może dodawać/usuwać pozycje, zmieniać ilość, cenę, opis i kolejność.
10. System automatycznie liczy wartości pozycji, subtotal, rabaty i wartość końcową.
11. Użytkownik zapisuje wycenę jako wersję i generuje estetyczny PDF zgodny z brandingiem studia.
5.1 Wymagania wyceny
Biblioteka pozycji/usług.
Kategorie pozycji.
Jednostki: szt., m², mb, godz., ryczałt oraz własna jednostka.
Cena jednostkowa × ilość.
Rabat procentowy i/lub kwotowy.
Możliwość ręcznej korekty pozycji bez zmiany pozycji bazowej w bibliotece.
Drag & drop kolejności pozycji/sekcji.
Szablony wycen zapisywane przez użytkownika.
Duplikowanie istniejącej wyceny.
Status: szkic / wysłana / zaakceptowana / odrzucona / archiwalna.
Numer wyceny, data utworzenia, termin ważności.
PDF: logo, dane studia, dane klienta, zakres, tabela pozycji, podsumowanie, uwagi/warunki.
12. 6. Kalkulator terminu projektu
Moduł powinien odwzorować logikę z arkusza, ale ukryć skomplikowaną tabelę przed użytkownikiem końcowym. Studio definiuje własne czasy realizacji, a projektant przy konkretnym projekcie wybiera zakres i pomieszczenia.
Konfigurowalne etapy, np. inwentaryzacja, rzuty funkcjonalne, finalny rzut, spotkania, inspiracje, moodboard, wizualizacje 3D, rysunki techniczne, teczka projektowa, komunikacja.
Domyślny czas etapu dla całego projektu lub danego typu pomieszczenia.
Rozróżnienie czasu pracy projektanta oraz czasu przeznaczonego na decyzję/feedback inwestora.
Liczba dni roboczych w tygodniu konfigurowalna dla studia.
Data rozpoczęcia → automatyczne wyliczenie optymalnej i najpóźniejszej daty zakończenia.
Usługa dodatkowa może automatycznie zwiększać termin projektu.
Możliwość wygenerowania prostego dokumentu PDF „Szacowany termin realizacji”.

13. 7. Zakres i etapy współpracy
Projektant powinien móc stworzyć własne szablony przebiegu współpracy. Po wyborze pakietu system automatycznie przypisuje odpowiednie etapy do projektu.
Szablon np. „Projekt kompleksowy”.
Etapy aktywne/nieaktywne w danym pakiecie.
Opis każdego etapu widoczny w dokumentach dla klienta.
Możliwość zmiany zakresu dla konkretnego projektu bez zmiany szablonu bazowego.
W przyszłości: status realizacji każdego etapu.
14. 8. Usługi dodatkowe
Biblioteka usług dodatkowych powinna zawierać co najmniej nazwę, opis, cenę lub zakres cenowy, jednostkę oraz przewidywany czas realizacji.
Przykłady z pliku: projekt branżowy, zabudowa meblowa, projekt techniczny, aktualizacja rysunku, moodboard, dodatkowy kadr, aktualizacja wizualizacji, nowa wersja, panorama 360, spotkania, nadzór.
Dodanie usługi do projektu powinno opcjonalnie aktualizować wartość projektu.
Jeżeli usługa ma przypisany czas, system powinien opcjonalnie zwiększyć przewidywany termin.
Możliwość wygenerowania wyceny dodatkowej / dokumentu zmian.
15. 9. Dokumenty i szablony
Dokumenty powinny korzystać ze wspólnych danych klienta i projektu. Celem jest wyeliminowanie wielokrotnego przepisywania tych samych informacji.
Wycena / oferta.
Szacowany termin realizacji.
Zakres / etapy współpracy.
Cennik usług dodatkowych.
W kolejnych wersjach: umowa, aneks, brief, protokół spotkania, protokół przekazania projektu.
Branding studia: logo, kolory, dane kontaktowe, stopka.
Eksport do PDF.
Historia wygenerowanych wersji.
16. 10. Ustawienia studia – klucz do skalowalności
Aplikacja nie powinna narzucać jednego sposobu pracy. Każde studio konfiguruje własny system:
Dane i branding firmy.
Biblioteka usług i cennik.
Szablony wycen.
Szablony zakresów/pakietów.
Etapy współpracy.
Czasy realizacji etapów i pomieszczeń.
Biblioteka usług dodatkowych.
Domyślne rabaty, terminy ważności, uwagi i warunki.
Szablony dokumentów.
17. 11. Przykładowy user flow
18. Projektant zakłada klienta „Anna i Michał Kowalscy”.
19. Tworzy projekt „Dom 164 m²”.
20. Wybiera szablon wyceny „Projekt kompleksowy”.
21. Dostosowuje zakres, ilości i rabat. System liczy cenę.
22. Generuje PDF i zapisuje „Wycena v1”.
23. Po zmianach duplikuje dokument, tworzy „Wycena v2” i oznacza ją jako zaakceptowaną.
24. Z zaakceptowanego zakresu tworzy projektowy workflow i kalkulację terminu.
25. System wylicza przewidywane zakończenie na podstawie zakresu/pomieszczeń.
26. W trakcie projektu klient zamawia dodatkową usługę.
27. Projektant dodaje usługę; system aktualizuje koszt i – jeśli ustawiono – termin.
28. Wszystkie wersje i dokumenty pozostają przypisane do jednego projektu.

29. 12. MVP – rekomendowany zakres pierwszej wersji
Priorytet
Funkcja
Zakres MVP
P0
Konta / Studio
Logowanie, dane firmy, logo, podstawowy branding.
P0
Klienci
CRUD klienta, dane kontaktowe, lista projektów.
P0
Projekty
CRUD projektu, status, metraż, adres, klient.
P0
Biblioteka usług
Pozycje, kategorie, jednostki, ceny.
P0
Szablony wycen
Tworzenie, edycja, zapis, duplikowanie.
P0
Wyceny
Kalkulacje, rabaty, wersje, statusy, PDF.
P1
Kalkulator terminu
Konfiguracja czasów + wyliczenie dni i dat.
P1
Etapy współpracy
Szablony zakresu i przypisanie do projektu.
P1
Usługi dodatkowe
Biblioteka + dodawanie do projektu + wpływ na koszt/czas.
P1
Dokumenty
Lista wygenerowanych PDF przypisanych do projektu.
P2
Notatki
Proste notatki projektowe.
30. 13. Poza MVP
Portal klienta i akceptacja online.
E-podpis.
Płatności / faktury / integracja księgowa.
Brief wysyłany klientowi jako formularz.
Automatyczne przypomnienia.
Kalendarz i integracja z Google Calendar.
Role zespołowe i uprawnienia.
AI do porządkowania notatek i tworzenia opisów dokumentów.
Biblioteka plików / integracja z chmurą.
Aplikacja mobilna; na początku rekomendowany responsywny web.
31. 14. Model danych – wersja robocza
Encja
Najważniejsze pola
User / Studio
id, nazwa, dane firmy, logo, kolory, ustawienia podatkowe/językowe
Client
id, studio_id, imię/nazwa, e-mail, telefon, adres, notatki
Project
id, client_id, nazwa, adres, metraż, typ, status, start_date
ServiceItem
id, studio_id, kategoria, nazwa, opis, jednostka, cena, domyślny czas
QuoteTemplate
id, studio_id, nazwa, sekcje, pozycje, ustawienia
Quote
id, project_id, numer, wersja, status, subtotal, discount, total, valid_until
QuoteLine
id, quote_id, service_item_id/null, opis, qty, unit, unit_price, discount, total, sort_order
WorkflowTemplate
id, studio_id, nazwa, etapy
ProjectStage
id, project_id, nazwa, opis, aktywny, czas_architekt, czas_inwestor
Room
id, project_id, typ/nazwa, ilość
AdditionalService
id, project_id, service_item_id, qty, value, added_days
Document
id, project_id, typ, wersja, file_url, created_at
32. 15. Założenia techniczne
Rekomendacja: aplikacja webowa SaaS, responsywna na desktop/tablet; nie klasyczny instalator desktopowy.
Backend z relacyjną bazą danych – dane klienta, projektu, szablonów i wersji dokumentów są silnie powiązane.
Generator PDF po stronie serwera lub deterministyczny renderer HTML → PDF.
Wersjonowanie wycen: po wysłaniu dokumentu zachować snapshot pozycji i cen; późniejsza zmiana biblioteki nie może zmienić starej oferty.
Szablony muszą być oddzielone od instancji: zmiana szablonu nie może retroaktywnie zmieniać dokumentów istniejących projektów.
Kalkulator terminów powinien mieć osobny moduł reguł, a nie formuły zaszyte w UI.
Kwoty przechowywać jako wartości dziesiętne / najmniejsze jednostki walutowe; nie jako float.
PDF powinien być odtwarzalny – ta sama wersja wyceny zawsze generuje tę samą treść.
Audyt podstawowych zmian: created_at, updated_at, created_by; później pełna historia aktywności.
33. 16. Kluczowe reguły biznesowe
Wycena należy do projektu, projekt należy do klienta.
Projekt może mieć wiele wycen i wersji; jedna może być oznaczona jako zaakceptowana.
Pozycja skopiowana z biblioteki do wyceny staje się snapshotem i może być lokalnie edytowana.
Rabat może dotyczyć całości lub konkretnej pozycji; sposób liczenia musi być jednoznaczny.
Termin projektu wynika z aktywnego zakresu, pomieszczeń, reguł czasowych oraz usług dodatkowych.
Czas inwestora i projektanta powinien być możliwy do prezentowania oddzielnie.
Dodanie usługi dodatkowej może wpływać jednocześnie na koszt oraz termin, ale użytkownik powinien móc wyłączyć jeden z tych efektów.
Dokument wysłany klientowi powinien być archiwizowany jako konkretna wersja.

34. 17. Czego NIE budować w pierwszej wersji
Aby produkt nie stał się kolejnym rozbudowanym systemem project-management, pierwsza wersja powinna pozostać skoncentrowana na automatyzacji back-office studia.
CAD / rzuty / modelowanie 3D.
Moodboard editor.
Rozbudowany sourcing i katalog produktów.
Procurement i logistyka zamówień.
Pełny CRM sprzedażowy.
Chat z klientem.
Rozbudowany Gantt.
Pełna księgowość.
Marketplace.
35. 18. Pozycjonowanie względem istniejących narzędzi
Rynek potwierdza potrzebę cyfrowej obsługi ofert i projektów. Houzz Pro oferuje m.in. projekty, szablony ofert, bibliotekę pozycji, branded proposals, PDF, akceptacje online, harmonogramy płatności i konwersję ofert do faktur. Dlatego przewagą planowanego produktu nie powinno być samo „tworzenie ofert”, lecz prostota, konfiguracja pod sposób pracy małego studia wnętrzarskiego oraz ścisłe połączenie własnych szablonów wyceny, zakresu i kalkulacji czasu.
Źródła do benchmarku: Houzz Pro – Proposal Software / Interior Design Project Management Software (dostęp: 23.08.2026).
36. 19. Najważniejsze pytania do developera przed estymacją
Czy obecny generator HTML można wykorzystać jako prototyp logiki wyceny lub komponent pierwszego modułu?
Jaki stack pozwoli na szybkie MVP i późniejsze skalowanie SaaS?
Jak najlepiej rozwiązać edytowalne szablony dokumentów i generowanie identycznych PDF-ów?
Jak przechowywać snapshoty wycen i wersjonowanie dokumentów?
Czy kalkulator terminu budować jako konfigurowalny rules engine / zestaw reguł w bazie?
Jak zaprojektować model danych, aby później bez migracyjnego chaosu dodać umowy, briefy, płatności i portal klienta?
Jakie elementy z P0 są największym ryzykiem technicznym i wymagają proof-of-concept?
Jaki jest sensowny podział na sprint 0 (architektura/prototyp), sprint MVP i późniejsze moduły?
37. 20. Definicja sukcesu MVP
MVP JEST UDANE, JEŻELI
Projektant może skonfigurować własną bibliotekę usług i szablon wyceny, założyć klienta i projekt, przygotować nową ofertę w kilka minut, automatycznie policzyć wartości i rabaty, zapisać kolejne wersje oraz wygenerować estetyczny PDF – bez Excela i bez przepisywania danych klienta.


Wersja robocza • 23.08.2026