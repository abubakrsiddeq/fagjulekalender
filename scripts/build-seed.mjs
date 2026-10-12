// Generates database/seed.sql and database/sporsmal-2026.csv from the
// 24 questions in the original prototype.
//
//   node scripts/build-seed.mjs
//
// Edit the data below and re-run to regenerate both files.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const SRC = {
  brann: { title: "ELISE/Gerica – Brannrisikovurdering – tjenester i hjemmet", eqs: "38729" },
  gerica: { title: "Gerica – Brannsjekk i Gerica", eqs: "49676" },
  ernaering: { title: "Gerica – Ernæring – Forebygging og behandling av underernæring", eqs: "39407" },
  kognisjon: { title: "Kartlegging av tidlige tegn på kognitiv svikt hos personer med utviklingshemming", eqs: "65800" },
  demens: { title: "Samhandling mellom demenskoordinator/hukommelsesteam og fastleger", eqs: "65365" },
};

// a = index of the correct option (0 = A)
const QUESTIONS = [
  { t: "Brann", s: SRC.brann, q: "Hvor lang tid etter oppstart av helse- og omsorgstjenester i hjemmet skal brannrisikovurderingen senest være gjennomført?", o: ["Innen én uke", "Innen to uker", "Innen én måned", "Innen tre måneder"], a: 1, e: "Brannrisikovurdering skal gjøres senest to uker etter oppstart, og deretter minimum én gang i året." },
  { t: "Brann", s: SRC.brann, q: "Hva er minstekravet til brannsikkerhetsutstyr i alle hjem?", o: ["Røykvarsler på soverommet", "Komfyrvakt og røykvarsler", "Fungerende slukkeutstyr og minst én røykvarsler i hver etasje", "Brannteppe og trygghetsalarm"], a: 2, e: "Alle hjem skal ha fungerende brannslukningsutstyr (slukkeapparat eller brannslange) og minimum én røykvarsler i hver etasje." },
  { t: "Brann", s: SRC.brann, q: "Hvordan skal røykvarsleren være plassert?", o: ["På veggen, i øyehøyde", "I taket, minst 50 cm fra veggen", "I taket, helt inntil veggen", "Over komfyren"], a: 1, e: "Røykvarsleren skal sitte i taket, minst 50 cm fra veggen. Innbygger skal også kunne høre den bak lukket soveromsdør." },
  { t: "Brann", s: SRC.gerica, q: "Hvilket tiltak skal opprettes i Gerica med årlig tidsplan for brannrisikovurdering?", o: ["x.13.2.6 Vurdere ernæringsstatus", "x.3.9.6 Vektkontroll", "x.13.1.2 Brannskjema – fylle ut", "x.15.10.1 Evaluering av ernæringsplan"], a: 2, e: "Alle oppretter tiltaket «x.13.1.2 Brannskjema – fylle ut» med årlig tidsplan i innbyggers tiltaksplan." },
  { t: "Brann", s: SRC.brann, q: "Innbygger takker nei til brannrisikovurdering. Hvilket brannrisikonivå får innbygger i ELISE?", o: ["Tiltaksnivå 1", "Tomt statusfelt", "Tiltaksnivå 3", "«Ikke vurdert»"], a: 3, e: "Velg «Innbygger ønsker ikke kartlegging», skriv obligatorisk begrunnelse og fyll inn dato. Innbygger får nivå «Ikke vurdert»." },
  { t: "Brann", s: SRC.brann, q: "Hvilket tiltaksnivå i ELISE inkluderer mobilt vanntåkeanlegg?", o: ["Tiltaksnivå 1", "Tiltaksnivå 2", "Tiltaksnivå 3", "Alle nivåer"], a: 2, e: "Tiltaksnivå 3 har alt fra nivå 2 og i tillegg mobilt vanntåkeanlegg." },
  { t: "Brann", s: SRC.brann, q: "Hvordan sjekker du at et pulverapparat fungerer?", o: ["Trykker inn utløseren et kort øyeblikk", "Snur det opp ned og lytter etter pulver som renner", "Rister det kraftig sidelengs", "Veier det på badevekten"], a: 1, e: "Pulverapparat snus opp ned mens du lytter etter pulveret. Pilen skal stå på grønt, og sikring og splint skal være på plass." },
  { t: "Brann", s: SRC.brann, q: "Hvor skal bydelen i hovedsak bestille komfyrvakt?", o: ["NAV Hjelpemiddelsentral", "Direkte fra elektriker", "Brann- og redningsetaten først", "Innbygger kjøper selv i butikk"], a: 0, e: "Komfyrvakt bestilles hovedsakelig gjennom NAV Hjelpemiddelsentral. Ved avslag kan du sende forespørsel til BRE servicesenteret." },
  { t: "Brann", s: SRC.brann, q: "Du er bekymret for brannsikkerheten hjemme hos en innbygger. Hva gjør du først?", o: ["Ringer 110", "Vurderer saken sammen med leder og leser om bekymringsmelding på branntips.no", "Sender PLO-melding til fastlegen", "Skriver avvik i EQS"], a: 1, e: "Vurder saken med leder og les om bekymringsmelding og taushetsplikt på branntips.no. Meldingen registreres der og går videre til lokalt brannvesen." },
  { t: "Brann", s: SRC.gerica, q: "Hvilken frekvens setter du i tidsplanen i Gerica når brannsjekken skal komme på arbeidslisten én gang i året?", o: ["1", "12", "52", "365"], a: 2, e: "Frekvensen er i uker. Frekvens 52 betyr hver 52. uke, altså én gang i året." },
  { t: "Brann", s: SRC.brann, q: "Hvilken av disse hendelsene skal utløse en ny brannrisikovurdering før det har gått et år?", o: ["Innbygger får ny fastlege", "Innbygger blir aleneboende", "Innbygger får ny primærkontakt", "Det er bytte av årstid"], a: 1, e: "Ny vurdering gjøres ved endringer i ADL, medisiner eller funksjonsnivå, og når innbygger blir aleneboende." },
  { t: "Brann", s: SRC.brann, q: "Hvem passer flammehemmende sengetøy for?", o: ["Innbyggere som bruker levende lys", "Innbyggere som røyker i senga eller sofaen", "Alle over 80 år", "Innbyggere med nedsatt hørsel"], a: 1, e: "Flammehemmende sengetøy reduserer risikoen hvis innbygger som røyker sovner eller mister sigaretten. Det skaffes av innbygger, pårørende eller bydelen." },
  { t: "Ernæring", s: SRC.ernaering, q: "Hvilke to verktøy brukes for å vurdere risiko for underernæring?", o: ["MST og KMI", "MMSE og ADL", "IPLOS og MST", "Vekt og livvidde"], a: 0, e: "MST (Malnutrition Screening Tool) og kroppsmasseindeks (KMI, BMI i Gerica) brukes ved vurdering av risiko for underernæring." },
  { t: "Ernæring", s: SRC.ernaering, q: "Hvilken MST-skår betyr at bruker er i risiko for underernæring?", o: ["1 eller mer", "2 eller mer", "3 eller mer", "5 eller mer"], a: 1, e: "En total poengskår på 2 eller mer betyr risiko for underernæring og behov for individuell kartlegging." },
  { t: "Ernæring", s: SRC.ernaering, q: "Under hvilken KMI regnes en person over 70 år som undervektig?", o: ["18,5", "20", "22", "25"], a: 2, e: "Over 70 år: under 22 er undervekt og 22–27 er normalvekt. Under 70 år går grensen ved 18,5." },
  { t: "Ernæring", s: SRC.ernaering, q: "Bruker med hjemmesykepleie skårer under 2 og har KMI over grenseverdiene. Når skal ny risikovurdering gjøres?", o: ["Minimum hver måned", "Minimum hver 3. måned", "Minimum hver 6. måned", "Én gang i året"], a: 1, e: "Ved hjemmesykepleie minimum hver 3. måned. Ved andre helsetjenester og praktisk bistand innen matomsorg minimum hver 6. måned." },
  { t: "Ernæring", s: SRC.ernaering, q: "Hvilken journaltype brukes for å dokumentere resultatet av risikovurderingen?", o: ["101 Helsehjelpjournal", "136 OL-fagjournal", "170 Kartleggingsjournal", "8 Laboratoriejournal"], a: 2, e: "Resultatet dokumenteres i 170-kartleggingsjournal knyttet til tiltaket «x.13.2.6 Vurdere ernæringsstatus»." },
  { t: "Ernæring", s: SRC.ernaering, q: "Hvor ofte skal brukere i risiko for underernæring eller som er underernærte veies?", o: ["Daglig", "Minimum ukentlig", "Hver fjerde uke", "Hver 3. måned"], a: 1, e: "Tiltaket «x.3.9.6 Vektkontroll» legges inn med fast tidsplan, minimum ukentlig eller etter annet faglig begrunnet opplegg." },
  { t: "Ernæring", s: SRC.ernaering, q: "Hvem skal gjennomføre individuell kartlegging ved risiko for underernæring, og innen når?", o: ["Fastlegen, innen en måned", "Tjenesteansvarlig eller primærkontakt, innen to uker", "Klinisk ernæringsfysiolog, innen en uke", "Den som har vakt, ved neste besøk"], a: 1, e: "Tiltaket «x.13.2.10 Individuell kartlegging ernæring» opprettes, og kartleggingen utføres av TA eller PK innen to uker." },
  { t: "Ernæring", s: SRC.ernaering, q: "Hvor ofte skal ernæringsplanen minimum evalueres ved hjemmesykepleie?", o: ["Hver uke", "Hver måned", "Hver tredje måned", "Hver sjette måned"], a: 1, e: "TA følger opp sammen med PK minimum månedlig ved hjemmesykepleie, og ved endringer i brukers situasjon. Evalueringen føres i 136 OL-fagjournal." },
  { t: "Kognisjon", s: SRC.kognisjon, q: "Ved hvilken alder anbefales første «Tidlig tegn»-kartlegging for personer med Downs syndrom?", o: ["25 år", "30 år", "40 år", "50 år"], a: 1, e: "For alle brukere lages en baseline ved fylte 40 år. For personer med Downs syndrom anbefales første kartlegging ved fylte 30, sammen med Adaptiv Demensscreening." },
  { t: "Kognisjon", s: SRC.kognisjon, q: "Hvem skal gjennomføre «Tidlig tegn»-kartleggingen?", o: ["Fastlegen alene", "Bruker og to ansatte, helst én som kjenner bruker godt", "Én ansatt og pårørende", "Spesialisthelsetjenesten"], a: 1, e: "Kartleggingen gjøres sammen med bruker og to ansatte, helst med en ansatt som kjenner bruker godt. Pårørende kan involveres ved behov." },
  { t: "Kognisjon", s: SRC.kognisjon, q: "Hvilken diagnosekode registreres i Gerica for å angi demens?", o: ["P70", "P85", "F03", "170"], a: 0, e: "P70 angir demens. P85 psykisk utviklingshemning registreres i tillegg der det er relevant." },
  { t: "Demens", s: SRC.demens, q: "Demenskoordinator og fastlege kommuniserer vanligvis med dialogmelding. Hva gjør du hvis noe haster?", o: ["Sender dialogmelding merket «haster»", "Ringer", "Skriver i ELISE", "Venter til neste samarbeidsmøte"], a: 1, e: "Om noe haster, ring. Fastlegen bør ha telefonnummeret til demenskoordinator, og demenskoordinator bør vite hvordan fastlegen nås." },
];

const DEPARTMENTS = [
  "Hjemmesykepleien Sone 1",
  "Hjemmesykepleien Sone 2",
  "Hjemmesykepleien Sone 3",
  "Hjemmesykepleien Natt",
  "Praktisk bistand",
];

if (QUESTIONS.length !== 24) throw new Error(`Expected 24 questions, got ${QUESTIONS.length}`);

const sql = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`);

// ---------- seed.sql ----------
let out = `-- =====================================================================
-- Fagjulekalender – seed data (generated by scripts/build-seed.mjs)
-- Import AFTER schema.sql. Creates one organization, example departments
-- and the 2026 calendar with the 24 questions from the prototype.
-- The calendar starts as a draft: review, approve and publish it in /admin.
-- =====================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

INSERT INTO organizations (id, name, allowed_email_domains, allow_department_proposals)
VALUES (1, 'Helsetjenester i hjemmet', 'oslo.kommune.no', 1);

`;
for (const d of DEPARTMENTS) {
  out += `INSERT INTO departments (org_id, name, status) VALUES (1, ${sql(d)}, 'active');\n`;
}
out += `
-- Door 1 opens 1 Dec 2026 00:00 Oslo time. Closes 31 Dec 2026 23:59:59 Oslo time (= 22:59:59 UTC).
INSERT INTO calendars (id, org_id, name, slug, year, start_date, door_count, timezone, closes_at,
  points_correct, same_day_bonus, late_answers_allowed, min_answers_to_count, shuffle_options, notify_time, status)
VALUES (1, 1, 'Fagjulekalender 2026', '2026', 2026, '2026-12-01', 24, 'Europe/Oslo', '2026-12-31 22:59:59',
  10, 0, 1, 1, 0, '07:30', 'draft');
`;
QUESTIONS.forEach((q, i) => {
  const door = i + 1;
  out += `
-- Door ${door}
INSERT INTO questions (calendar_id, door_number, topic, text, explanation, source_title, source_eqs_id)
VALUES (1, ${door}, ${sql(q.t)}, ${sql(q.q)}, ${sql(q.e)}, ${sql(q.s.title)}, ${sql(q.s.eqs)});
SET @q = LAST_INSERT_ID();
INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES
${q.o.map((o, j) => `  (@q, ${sql(o)}, ${j === q.a ? 1 : 0}, ${j})`).join(",\n")};
`;
});
writeFileSync(join(root, "database", "seed.sql"), out);

// ---------- sporsmal-2026.csv (same format as the admin import/export) ----------
const HEAD = ["door", "topic", "question", "option_a", "option_b", "option_c", "option_d", "option_e", "option_f", "correct", "explanation", "source_title", "source_eqs_id", "source_revision_date", "image_url", "approved_by", "approved_at"];
const cell = (v) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const rows = [HEAD];
QUESTIONS.forEach((q, i) => {
  const opts = [...q.o, "", "", "", "", "", ""].slice(0, 6);
  rows.push([i + 1, q.t, q.q, ...opts, "ABCDEF"[q.a], q.e, q.s.title, q.s.eqs, "", "", "", ""]);
});
writeFileSync(join(root, "database", "sporsmal-2026.csv"), "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n");

console.log("Wrote database/seed.sql and database/sporsmal-2026.csv");
