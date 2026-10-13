-- =====================================================================
-- Fagjulekalender – TEST calendar, 14 Oct – 14 Nov 2026
-- Import AFTER schema.sql and seed.sql (uses organization 1 from seed.sql).
--
-- phpMyAdmin: select the database → "Import" (or "SQL" tab → paste) → Go.
--
-- Door 1 opens 14 Oct 2026 00:00 Oslo time, door 31 opens 13 Nov.
-- Answers are accepted until 14 Nov 2026 23:59:59 Oslo time (= 22:59:59 UTC).
-- (The app allows max 31 doors, so 14 Nov itself has no door.)
--
-- Link: /kalender/test   Status: published, so it can be tested right away.
-- Doors 1–24 are the active test questions; doors 25–31 repeat doors 1–7.
--
-- Safe to re-run: it deletes the old test calendar (and its answers) first.
-- =====================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

SET @old = (SELECT id FROM calendars WHERE slug = 'test');
DELETE FROM answers WHERE calendar_id = @old;
DELETE FROM calendars WHERE id = @old;

INSERT INTO calendars (org_id, name, slug, year, start_date, door_count, timezone, closes_at,
  points_correct, same_day_bonus, late_answers_allowed, min_answers_to_count, shuffle_options, notify_time, status)
VALUES (1, 'Testkalender (14. okt – 14. nov)', 'test', 2026, '2026-10-14', 31, 'Europe/Oslo', '2026-11-14 22:59:59',
  10, 0, 1, 1, 0, '07:30', 'published');
SET @cal = LAST_INSERT_ID();

-- Door 1
INSERT INTO questions (calendar_id, door_number, topic, text, explanation, source_title, source_eqs_id)
VALUES (@cal, 1, 'Sikkerhet', 'Hva er den viktigste grunn til å gjøre en sikkerhetsvurdering ved første besøk i hjemmet?', 'Sikkerhetsvurdering skal avdekke risiko for ulykker, brann, fall og andre hendelser før tiltak kan planlegges og dokumenteres.', 'Hjemmetjenestens sikkerhetsrutiner', '10001');
SET @q = LAST_INSERT_ID();
INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES
  (@q, 'For å vite hvor mange ansatte som trenger å være med', 0, 0),
  (@q, 'For å finne risikofaktorer som kan påvirke brukerens trygghet', 1, 1),
  (@q, 'For å oppdatere innbyggerens medisinske journal', 0, 2),
  (@q, 'For å få tilgang til elektronisk post', 0, 3);

-- Door 2
INSERT INTO questions (calendar_id, door_number, topic, text, explanation, source_title, source_eqs_id)
VALUES (@cal, 2, 'Sikkerhet', 'Hva skal du gjøre dersom du ser et tydelig brannfarlig forhold i hjemmet?', 'Du skal varsle ansvarlig leder og dokumentere situasjonen, og eventuelt tilkalle riktig hjelpeinstans når det vurderes nødvendig.', 'Hjemmetjenestens sikkerhetsrutiner', '10002');
SET @q = LAST_INSERT_ID();
INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES
  (@q, 'Ignorere det hvis ingen klager', 0, 0),
  (@q, 'Dokumentere og varsle ansvarlig person eller leder', 1, 1),
  (@q, 'Ta med det til neste avdelingsmøte', 0, 2),
  (@q, 'Fjerne faren uten å varsle noen', 0, 3);

-- Door 3
INSERT INTO questions (calendar_id, door_number, topic, text, explanation, source_title, source_eqs_id)
VALUES (@cal, 3, 'Sikkerhet', 'Hva er riktig måte å håndtere en røykvarsler på?', 'Røykvarsleren skal være testet, plassert riktig og fungere i hver etasje for å kunne gi tidlig varsel ved brann.', 'Brannvern i hjemmet', '10003');
SET @q = LAST_INSERT_ID();
INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES
  (@q, 'Lagre den i skapet og bruke den kun ved ferie', 0, 0),
  (@q, 'Sørge for at den er fungerende og plassert i hver etasje', 1, 1),
  (@q, 'Koble den til strømnettet med egen adapter', 0, 2),
  (@q, 'Montere den bak dør eller i garderobe', 0, 3);

-- Door 4
INSERT INTO questions (calendar_id, door_number, topic, text, explanation, source_title, source_eqs_id)
VALUES (@cal, 4, 'Dokumentasjon', 'Hva bør du alltid gjøre før du registrerer et avvik i journalen?', 'Korrekt og tidssvarende dokumentasjon gjør at andre ansatte kan forstå hva som skjedde, hva som ble gjort og hvorfor.', 'Dokumentasjonsstandard', '10004');
SET @q = LAST_INSERT_ID();
INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES
  (@q, 'Sørge for at teksten er objektiv og faglig korrekt', 1, 0),
  (@q, 'Skrive bare i korte, private notater', 0, 1),
  (@q, 'Bruke bare emojis som forklaring', 0, 2),
  (@q, 'Ikke merke dokumentasjonen med dato', 0, 3);

-- Door 5
INSERT INTO questions (calendar_id, door_number, topic, text, explanation, source_title, source_eqs_id)
VALUES (@cal, 5, 'Dokumentasjon', 'Når et tiltak er planlagt i pasientens hjem, hva er viktigst å dokumentere?', 'Tiltak, ansvar, tidsplan og oppfølging er viktige deler av god dokumentasjon i hjemmetjenesten.', 'Tiltaksplanlegging', '10005');
SET @q = LAST_INSERT_ID();
INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES
  (@q, 'Kun hvem som er ansvarlig', 0, 0),
  (@q, 'Hva som skal gjennomføres, hvem som gjør det og når', 1, 1),
  (@q, 'Kun antall timer brukt', 0, 2),
  (@q, 'Kun at tiltaket ble diskutert', 0, 3);

-- Door 6
INSERT INTO questions (calendar_id, door_number, topic, text, explanation, source_title, source_eqs_id)
VALUES (@cal, 6, 'Kommunikasjon', 'Hva er den beste måten å håndtere bekymring for en bruker som virker forvirret?', 'Tydelig observasjon, faglig vurdering og riktig kommunikasjon med leder eller helsepersonell er avgjørende.', 'Kommunikasjon og observasjon', '10006');
SET @q = LAST_INSERT_ID();
INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES
  (@q, 'Ignorere det og gjøre som vanlig', 0, 0),
  (@q, 'Dokumentere observasjonene og gi informasjon til ansvarlig leder', 1, 1),
  (@q, 'Løse problemet uten å ta opp det med noen', 0, 2),
  (@q, 'Be bruker om å vente til neste uke', 0, 3);

-- Door 7
INSERT INTO questions (calendar_id, door_number, topic, text, explanation, source_title, source_eqs_id)
VALUES (@cal, 7, 'Kommunikasjon', 'Hva bør du gjøre dersom bruker ønsker å få med pårørende i samtalen?', 'Brukerens ønsker om deltakelse skal vurderes i tråd med lovgivning, konfidensialitet og praksis for samtykke.', 'Samtykke og deltakelse', '10007');
SET @q = LAST_INSERT_ID();
INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES
  (@q, 'Avslå alltid fordi det tar for mye tid', 0, 0),
  (@q, 'Vurdere brukerens ønsker og følge gjeldende rutiner for samtykke', 1, 1),
  (@q, 'Be om at pårørende skriver under uten samtale', 0, 2),
  (@q, 'Ta bare med pårørende hvis det er en lege', 0, 3);

-- Door 8
INSERT INTO questions (calendar_id, door_number, topic, text, explanation, source_title, source_eqs_id)
VALUES (@cal, 8, 'Medisin', 'Hva er riktige tiltak før du hjelper en bruker med å ta medisiner?', 'Kontroll av riktig medikament, dose og tidspunkt er grunnleggende for trygg medisinering.', 'Medikamenthåndtering', '10008');
SET @q = LAST_INSERT_ID();
INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES
  (@q, 'Sørge for at medisinering følger ordinasjon og sjekke identitet og dosering', 1, 0),
  (@q, 'Gi medisinen når du vil, det viktigste er at brukeren får den', 0, 1),
  (@q, 'Bare kontrollere om brukeren ser frisk ut', 0, 2),
  (@q, 'Gi dobbel dose hvis brukeren er sliten', 0, 3);

-- Door 9
INSERT INTO questions (calendar_id, door_number, topic, text, explanation, source_title, source_eqs_id)
VALUES (@cal, 9, 'Medisin', 'Hva skal du gjøre dersom en bruker får uventede bivirkninger etter en medisin?', 'Uventede bivirkninger må rapporteres og dokumenteres etter gjeldende rutiner for trygg behandling.', 'Bivirkninger og rapportering', '10009');
SET @q = LAST_INSERT_ID();
INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES
  (@q, 'Avvente og håpe det går over', 0, 0),
  (@q, 'Dokumentere og følge rutiner for melding til ansvarlig helsepersonell', 1, 1),
  (@q, 'Kaste medisinen i avløpet', 0, 2),
  (@q, 'Be bruker om å ta ekstra dose for å komme over det', 0, 3);

-- Door 10
INSERT INTO questions (calendar_id, door_number, topic, text, explanation, source_title, source_eqs_id)
VALUES (@cal, 10, 'Fysisk aktivitet', 'Hva er viktigst når du vurderer om en bruker kan være fysisk aktiv?', 'Selv om aktivitet er viktig, må den tilpasses brukerens funksjonss nivå, risikofaktorer og sykehistorie.', 'Aktivitetsvurdering', '10010');
SET @q = LAST_INSERT_ID();
INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES
  (@q, 'Bare gjøre det som er mest fysisk krevende', 0, 0),
  (@q, 'Vurdere funksjon, smerte, trygghet og mål med aktiviteten', 1, 1),
  (@q, 'Gi samme aktivitet til alle', 0, 2),
  (@q, 'Unngå aktivitet dersom bruker er alene', 0, 3);

-- Door 11
INSERT INTO questions (calendar_id, door_number, topic, text, explanation, source_title, source_eqs_id)
VALUES (@cal, 11, 'Fall', 'Hva er den viktigste årsaken til at fallrisiko skal vurderes systematisk?', 'Fallrisiko oppstår ofte som følge av flere små faktorer som sammen gjør det vanskelig å stå, gå eller balansere.', 'Fallforebygging', '10011');
SET @q = LAST_INSERT_ID();
INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES
  (@q, 'For å unngå brukeren fra å bevege seg', 0, 0),
  (@q, 'For å identifisere risikofaktorer og sette inn målrettede tiltak', 1, 1),
  (@q, 'For å gi legen mer arbeid', 0, 2),
  (@q, 'For å kunne slutte å følge opp brukeren', 0, 3);

-- Door 12
INSERT INTO questions (calendar_id, door_number, topic, text, explanation, source_title, source_eqs_id)
VALUES (@cal, 12, 'Fall', 'Hva bør du gjøre hvis en bruker har hatt et fall?', 'Et fall skal vurderes med øyeblikkelig fokus på trygghet, observasjon og dokumentasjon, og eventuelt videre vurdering.', 'Fallprotokoll', '10012');
SET @q = LAST_INSERT_ID();
INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES
  (@q, 'Løfte brukeren opp og fortsette som ingenting har hendt', 0, 0),
  (@q, 'Sjekke brukeren for skade, sikre trygghet og dokumentere hendelsen', 1, 1),
  (@q, 'Sørge for at det ikke blir rapportert', 0, 2),
  (@q, 'Fortelle bare pårørende uten å dokumentere', 0, 3);

-- Door 13
INSERT INTO questions (calendar_id, door_number, topic, text, explanation, source_title, source_eqs_id)
VALUES (@cal, 13, 'Ernæring', 'Hva er vanligste tegn på at en bruker kan ha økt risiko for underernæring?', 'Uten tilstrekkelig energi- og næringsinntak kan vekttap og redusert funksjon oppstå, noe som må oppdages tidlig.', 'Ernæringsvurdering', '10013');
SET @q = LAST_INSERT_ID();
INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES
  (@q, 'Økt appetitt og bedre søvn', 0, 0),
  (@q, 'Uventet vektendring, tretthet eller redusert matinntak', 1, 1),
  (@q, 'Økt muskelstyrke', 0, 2),
  (@q, 'Mindre behov for væske', 0, 3);

-- Door 14
INSERT INTO questions (calendar_id, door_number, topic, text, explanation, source_title, source_eqs_id)
VALUES (@cal, 14, 'Ernæring', 'Hva er viktig når du hjelper en bruker med måltid?', 'Måltidet skal tilpasses brukerens behov, preferanser og evner for å sikre trygg og tilstrekkelig inntak.', 'Måltidsstøtte', '10014');
SET @q = LAST_INSERT_ID();
INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES
  (@q, 'Gå raskt gjennom måltidet for å spare tid', 0, 0),
  (@q, 'Tilpasse mat og drikke til brukerens behov og toleranse', 1, 1),
  (@q, 'Gi samme mengde til alle uansett situasjon', 0, 2),
  (@q, 'La brukeren spise alene uten oppfølging', 0, 3);

-- Door 15
INSERT INTO questions (calendar_id, door_number, topic, text, explanation, source_title, source_eqs_id)
VALUES (@cal, 15, 'Hud', 'Hva er viktigst for å forebygge trykksår?', 'Riktig posisjonering, observasjon og skift i trykk er sentrale tiltak for å redusere risiko for trykksår.', 'Hud- og sårpleie', '10015');
SET @q = LAST_INSERT_ID();
INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES
  (@q, 'Å la brukeren ligge i samme stilling hele dagen', 0, 0),
  (@q, 'Å skifte stilling, holde huden ren og følge tiltaket', 1, 1),
  (@q, 'Å bruke bare en pute', 0, 2),
  (@q, 'Å unngå kontakt med huden', 0, 3);

-- Door 16
INSERT INTO questions (calendar_id, door_number, topic, text, explanation, source_title, source_eqs_id)
VALUES (@cal, 16, 'Hud', 'Hva bør du gjøre dersom du ser et rødt område på huden som ikke bleker ved trykk?', 'Et rødt, uvanlig område kan være et tidlig tegn på sår eller skade og skal følges opp med dokumentasjon og tiltak.', 'Hud- og sårpleie', '10016');
SET @q = LAST_INSERT_ID();
INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES
  (@q, 'Ignorere det hvis brukeren ikke klager', 0, 0),
  (@q, 'Dokumentere, følge opp og varsle ansvarlig person etter retningslinjer', 1, 1),
  (@q, 'Dekke det med plastfolie', 0, 2),
  (@q, 'Gripe det med en kraftig renselse', 0, 3);

-- Door 17
INSERT INTO questions (calendar_id, door_number, topic, text, explanation, source_title, source_eqs_id)
VALUES (@cal, 17, 'Demens', 'Hva er ofte mest effektivt når du kommuniserer med en bruker med demens?', 'Enkel, rolig og tydelig kommunikasjon, samt bruk av kjent språk og jevn pace, øker forståelse og trygghet.', 'Demens og kommunikasjon', '10017');
SET @q = LAST_INSERT_ID();
INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES
  (@q, 'Å snakke raskt og med mange spørsmål samtidig', 0, 0),
  (@q, 'Å bruke tydelige, korte setninger og være rolig', 1, 1),
  (@q, 'Å gi lange forklaringer uten pauser', 0, 2),
  (@q, 'Å endre emne hele tiden', 0, 3);

-- Door 18
INSERT INTO questions (calendar_id, door_number, topic, text, explanation, source_title, source_eqs_id)
VALUES (@cal, 18, 'Demens', 'Hva bør du gjøre når en bruker blir forvirret om tidspunkt eller sted?', 'Støttende og rolig tilnærming er ofte bedre enn å korrigere brukeren hardt, fordi dette kan øke uro og stress.', 'Demens og trygghetsarbeid', '10018');
SET @q = LAST_INSERT_ID();
INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES
  (@q, 'Rette brukeren hardt og få ham til å innse feilen', 0, 0),
  (@q, 'Bruke rolig støtte, validering og tydelige beskrivelser', 1, 1),
  (@q, 'Unngå all kontakt og gå ut av rommet', 0, 2),
  (@q, 'Gjør alt som om brukeren ikke er til stede', 0, 3);

-- Door 19
INSERT INTO questions (calendar_id, door_number, topic, text, explanation, source_title, source_eqs_id)
VALUES (@cal, 19, 'Personvern', 'Hva er riktig når du skal dele opplysninger om en bruker med andre ansatte?', 'Personopplysninger skal deles kun når det er nødvendig for tjenesteytelsen og i tråd med krav om taushetsplikt.', 'Personvern og taushetsplikt', '10019');
SET @q = LAST_INSERT_ID();
INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES
  (@q, 'Del så mye som mulig for å være sikker', 0, 0),
  (@q, 'Del kun nødvendig informasjon med rette personer og formål', 1, 1),
  (@q, 'Del opplysninger i sosialt nettverk', 0, 2),
  (@q, 'Del opplysninger på offentlige chatgrupper', 0, 3);

-- Door 20
INSERT INTO questions (calendar_id, door_number, topic, text, explanation, source_title, source_eqs_id)
VALUES (@cal, 20, 'Personvern', 'Hva er riktig måte å håndtere tilgang til journal eller digitale systemer?', 'Tilgang skal være begrenset til det som er nødvendig for jobben, og systemene bør brukes i tråd med sikkerhetsrutiner.', 'Sikkerhetsrutiner i digitale systemer', '10020');
SET @q = LAST_INSERT_ID();
INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES
  (@q, 'Bruk samme innlogging til alle i avdelingen', 0, 0),
  (@q, 'Logg av når du er ferdig og bruk kun nødvendige opplysninger', 1, 1),
  (@q, 'Lett alltid inn med en felles passordliste', 0, 2),
  (@q, 'Gi kolleger tilgang uten tillatelse', 0, 3);

-- Door 21
INSERT INTO questions (calendar_id, door_number, topic, text, explanation, source_title, source_eqs_id)
VALUES (@cal, 21, 'Samarbeid', 'Hva er viktigst når du samarbeider med andre profesjoner om en bruker?', 'God koordineringsarbeid og tydelig kommunikasjon gjør at brukerens behov blir møtt i et helhetlig perspektiv.', 'Teamarbeid og samhandling', '10021');
SET @q = LAST_INSERT_ID();
INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES
  (@q, 'Alle gjør det de vil uten koordinering', 0, 0),
  (@q, 'Del mål, ansvar og oppdateringer i et tydelig samarbeid', 1, 1),
  (@q, 'Bare hjemmetjenesten tar beslutninger', 0, 2),
  (@q, 'Unngå å involvere andre faggrupper', 0, 3);

-- Door 22
INSERT INTO questions (calendar_id, door_number, topic, text, explanation, source_title, source_eqs_id)
VALUES (@cal, 22, 'Samarbeid', 'Hva er mest hensiktsmessig når flere ansatte er involvert i en brukers oppfølging?', 'Tydelig dokumentasjon og koordinering gjør det lettere å følge samme plan og unngå feil eller overlappende tiltak.', 'Koordinert oppfølging', '10022');
SET @q = LAST_INSERT_ID();
INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES
  (@q, 'La hver ansatt gjøre sitt uten å dele informasjon', 0, 0),
  (@q, 'Koordinere tiltak og oppdatere andre på relevante endringer', 1, 1),
  (@q, 'Hold alle kommentarer private', 0, 2),
  (@q, 'Be brukeren om å velge hvem som skal gjøre hva', 0, 3);

-- Door 23
INSERT INTO questions (calendar_id, door_number, topic, text, explanation, source_title, source_eqs_id)
VALUES (@cal, 23, 'Vurdering', 'Hva er viktig når du vurderer om en bruker trenger økt støtte?', 'Vurderingen bør bygge på observasjon, brukerens egne opplysninger og endringer i funksjon eller hverdagsliv.', 'Vurderingsprinsipper', '10023');
SET @q = LAST_INSERT_ID();
INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES
  (@q, 'Bare vurder de fysiske symptomene', 0, 0),
  (@q, 'Se på funksjon, mål, risikofaktorer og brukerens egne erfaringer', 1, 1),
  (@q, 'Vurder kun det som er registrert forrige måned', 0, 2),
  (@q, 'Unngå å dokumentere endringer', 0, 3);

-- Door 24
INSERT INTO questions (calendar_id, door_number, topic, text, explanation, source_title, source_eqs_id)
VALUES (@cal, 24, 'Oppfølging', 'Hva bør du gjøre når du ser at en bruker trenger en ny vurdering av sine behov?', 'Endringer i helse, funksjon eller livssituasjon bør føre til en ny faglig vurdering og eventuelt ny plan.', 'Oppfølgingsplan', '10024');
SET @q = LAST_INSERT_ID();
INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES
  (@q, 'Fortsette som før og håpe det løser seg', 0, 0),
  (@q, 'Vurdere behovet, dokumentere og gi informasjon til ansvarlig leder', 1, 1),
  (@q, 'Be bruker om å ta ansvar uten hjelp', 0, 2),
  (@q, 'Avslutte tjenesten uten samtale', 0, 3);

-- Door 1
INSERT INTO questions (calendar_id, door_number, topic, text, explanation, source_title, source_eqs_id)
VALUES (@cal, 1, 'Sikkerhet', 'Hva er den viktigste grunn til å gjøre en sikkerhetsvurdering ved første besøk i hjemmet?', 'Sikkerhetsvurdering skal avdekke risiko for ulykker, brann, fall og andre hendelser før tiltak kan planlegges og dokumenteres.', 'Hjemmetjenestens sikkerhetsrutiner', '10001');
SET @q = LAST_INSERT_ID();
INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES
  (@q, 'For å vite hvor mange ansatte som trenger å være med', 0, 0),
  (@q, 'For å finne risikofaktorer som kan påvirke brukerens trygghet', 1, 1),
  (@q, 'For å oppdatere innbyggerens medisinske journal', 0, 2),
  (@q, 'For å få tilgang til elektronisk post', 0, 3);

-- Door 2
INSERT INTO questions (calendar_id, door_number, topic, text, explanation, source_title, source_eqs_id)
VALUES (@cal, 2, 'Sikkerhet', 'Hva skal du gjøre dersom du ser et tydelig brannfarlig forhold i hjemmet?', 'Du skal varsle ansvarlig leder og dokumentere situasjonen, og eventuelt tilkalle riktig hjelpeinstans når det vurderes nødvendig.', 'Hjemmetjenestens sikkerhetsrutiner', '10002');
SET @q = LAST_INSERT_ID();
INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES
  (@q, 'Ignorere det hvis ingen klager', 0, 0),
  (@q, 'Dokumentere og varsle ansvarlig person eller leder', 1, 1),
  (@q, 'Ta med det til neste avdelingsmøte', 0, 2),
  (@q, 'Fjerne faren uten å varsle noen', 0, 3);

-- Door 3
INSERT INTO questions (calendar_id, door_number, topic, text, explanation, source_title, source_eqs_id)
VALUES (@cal, 3, 'Sikkerhet', 'Hva er riktig måte å håndtere en røykvarsler på?', 'Røykvarsleren skal være testet, plassert riktig og fungere i hver etasje for å kunne gi tidlig varsel ved brann.', 'Brannvern i hjemmet', '10003');
SET @q = LAST_INSERT_ID();
INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES
  (@q, 'Lagre den i skapet og bruke den kun ved ferie', 0, 0),
  (@q, 'Sørge for at den er fungerende og plassert i hver etasje', 1, 1),
  (@q, 'Koble den til strømnettet med egen adapter', 0, 2),
  (@q, 'Montere den bak dør eller i garderobe', 0, 3);

-- Door 4
INSERT INTO questions (calendar_id, door_number, topic, text, explanation, source_title, source_eqs_id)
VALUES (@cal, 4, 'Dokumentasjon', 'Hva bør du alltid gjøre før du registrerer et avvik i journalen?', 'Korrekt og tidssvarende dokumentasjon gjør at andre ansatte kan forstå hva som skjedde, hva som ble gjort og hvorfor.', 'Dokumentasjonsstandard', '10004');
SET @q = LAST_INSERT_ID();
INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES
  (@q, 'Sørge for at teksten er objektiv og faglig korrekt', 1, 0),
  (@q, 'Skrive bare i korte, private notater', 0, 1),
  (@q, 'Bruke bare emojis som forklaring', 0, 2),
  (@q, 'Ikke merke dokumentasjonen med dato', 0, 3);

-- Door 5
INSERT INTO questions (calendar_id, door_number, topic, text, explanation, source_title, source_eqs_id)
VALUES (@cal, 5, 'Dokumentasjon', 'Når et tiltak er planlagt i pasientens hjem, hva er viktigst å dokumentere?', 'Tiltak, ansvar, tidsplan og oppfølging er viktige deler av god dokumentasjon i hjemmetjenesten.', 'Tiltaksplanlegging', '10005');
SET @q = LAST_INSERT_ID();
INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES
  (@q, 'Kun hvem som er ansvarlig', 0, 0),
  (@q, 'Hva som skal gjennomføres, hvem som gjør det og når', 1, 1),
  (@q, 'Kun antall timer brukt', 0, 2),
  (@q, 'Kun at tiltaket ble diskutert', 0, 3);

-- Door 6
INSERT INTO questions (calendar_id, door_number, topic, text, explanation, source_title, source_eqs_id)
VALUES (@cal, 6, 'Kommunikasjon', 'Hva er den beste måten å håndtere bekymring for en bruker som virker forvirret?', 'Tydelig observasjon, faglig vurdering og riktig kommunikasjon med leder eller helsepersonell er avgjørende.', 'Kommunikasjon og observasjon', '10006');
SET @q = LAST_INSERT_ID();
INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES
  (@q, 'Ignorere det og gjøre som vanlig', 0, 0),
  (@q, 'Dokumentere observasjonene og gi informasjon til ansvarlig leder', 1, 1),
  (@q, 'Løse problemet uten å ta opp det med noen', 0, 2),
  (@q, 'Be bruker om å vente til neste uke', 0, 3);

-- Door 7
INSERT INTO questions (calendar_id, door_number, topic, text, explanation, source_title, source_eqs_id)
VALUES (@cal, 7, 'Kommunikasjon', 'Hva bør du gjøre dersom bruker ønsker å få med pårørende i samtalen?', 'Brukerens ønsker om deltakelse skal vurderes i tråd med lovgivning, konfidensialitet og praksis for samtykke.', 'Samtykke og deltakelse', '10007');
SET @q = LAST_INSERT_ID();
INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES
  (@q, 'Avslå alltid fordi det tar for mye tid', 0, 0),
  (@q, 'Vurdere brukerens ønsker og følge gjeldende rutiner for samtykke', 1, 1),
  (@q, 'Be om at pårørende skriver under uten samtale', 0, 2),
  (@q, 'Ta bare med pårørende hvis det er en lege', 0, 3);

