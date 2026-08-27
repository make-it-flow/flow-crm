import type { ResearchBriefInput, ResearchPersonInput } from '../data/validators'

const CONTACTS: Array<Omit<ResearchPersonInput, 'email'> & { local: string }> = [
  {
    name: 'Anna Kowalska',
    title: 'Dyrektor sprzedaży',
    local: 'anna.kowalska',
    phone: '+48 600 100 200',
    note: 'Pierwszy kontakt operacyjny. Zna proces handlowy od środka.',
  },
  {
    name: 'Marek Zieliński',
    title: 'Head of Sales',
    local: 'marek.zielinski',
    phone: '+48 512 440 118',
    note: 'Łączy marketing i sprzedaż. Dobry start, zanim wejdziesz do zarządu.',
  },
  {
    name: 'Karolina Wójcik',
    title: 'Opiekun klienta kluczowego',
    local: 'karolina.wojcik',
    phone: '+48 693 221 087',
    note: 'Trzyma relacje z większymi kontami. Szybko powie, gdzie boli handlowiec.',
  },
  {
    name: 'Tomasz Lewandowski',
    title: 'Kierownik działu handlowego',
    local: 'tomasz.lewandowski',
    phone: '+48 501 778 334',
    note: 'Operacyjny owner lejka. Warto z nim potwierdzić, jak dziś wygląda discovery.',
  },
  {
    name: 'Natalia Kamińska',
    title: 'Business Development Manager',
    local: 'natalia.kaminska',
    phone: '+48 608 915 442',
    note: 'Otwiera nowe tematy. Dobrze kotwiczyć rozmowę w jednym konkretnym sygnale.',
  },
]

const DECISION_MAKERS: Array<Omit<ResearchPersonInput, 'email'> & { local: string }> = [
  {
    name: 'Piotr Nowak',
    title: 'Prezes zarządu',
    local: 'piotr.nowak',
    phone: '+48 600 100 201',
    note: 'Zamyka budżet i tempo wdrożenia. Rozmowę kotwicz w jednym problemie.',
  },
  {
    name: 'Ewa Wiśniewska',
    title: 'Współwłaścicielka',
    local: 'ewa.wisniewska',
    phone: '+48 601 333 219',
    note: 'Decyduje razem z prezesem. Pyta o ROI i kto u nich dowiezie zmianę.',
  },
  {
    name: 'Jakub Dąbrowski',
    title: 'Członek zarządu, finanse',
    local: 'jakub.dabrowski',
    phone: '+48 504 882 671',
    note: 'Liczy się koszt wdrożenia i payback. Unikaj ogólników o AI.',
  },
  {
    name: 'Magdalena Szymańska',
    title: 'CEO',
    local: 'magdalena.szymanska',
    phone: '+48 530 147 908',
    note: 'Sama domyka większe tematy. Chce konkret: kto, jaki ból, jaki następny krok.',
  },
  {
    name: 'Robert Jankowski',
    title: 'Wiceprezes ds. sprzedaży',
    local: 'robert.jankowski',
    phone: '+48 607 256 140',
    note: 'Ma mandat na narzędzia dla handlu. Decyzję i tak potwierdza z prezesem.',
  },
]

const INSIGHTS = [
  'skaluje sprzedaż bez uporządkowanego procesu discovery. To otwiera rozmowę o powtarzalnym lejku i briefie na pierwszy cykl.',
  'rośnie zatrudnieniem, a CRM nie dociąga insightu do handlowca. Hak: jeden zweryfikowany problem zamiast generycznego maila.',
  'ma sygnał przetargowy i dłuższy cykl B2B. Warto sprawdzić, kto u nich zamyka budżet na proces sprzedaży.',
  'buduje zespół handlowy szybciej niż playbook. Discovery jest ad hoc, więc research musi dawać konkret, nie ogólnik.',
]

function pick<T>(items: readonly T[], variant: number, salt: number): T {
  const index = ((variant % items.length) + salt) % items.length
  return items[index < 0 ? index + items.length : index] as T
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'firma'
}

function domainFromWebsite(websiteUrl?: string | null): string {
  if (!websiteUrl) return 'example.com'
  try {
    const host = new URL(websiteUrl.includes('://') ? websiteUrl : `https://${websiteUrl}`).hostname
    return host.replace(/^www\./, '') || 'example.com'
  } catch {
    return 'example.com'
  }
}

function registryDigits(variant: number, salt: number): string {
  let value = Math.abs((variant * 1_103_515_245 + salt * 12_345) >>> 0)
  let digits = ''
  while (digits.length < 10) {
    value = (value * 1_664_525 + 1_013_904_223) >>> 0
    digits += String(value)
  }
  const raw = digits.slice(0, 10)
  return raw.startsWith('0') ? `1${raw.slice(1)}` : raw
}

function toPerson(
  item: Omit<ResearchPersonInput, 'email'> & { local: string },
  domain: string,
): ResearchPersonInput {
  return {
    name: item.name,
    title: item.title,
    email: `${item.local}@${domain}`,
    phone: item.phone,
    note: item.note,
  }
}

export function buildMockResearchBrief(params: {
  companyName: string
  websiteUrl?: string | null
  industry?: string | null
  variant?: number
}): ResearchBriefInput {
  const name = params.companyName.trim() || 'ta firma'
  const industry = params.industry?.trim() || null
  const variant = Math.max(1, params.variant ?? 1)
  const slug = slugify(name)
  const websiteUrl = pick([
    `https://www.${slug}.pl`,
    `https://${slug}.pl`,
    `https://www.${slug}.pl/o-nas`,
    `https://${slug}.eu`,
    `https://www.${slug}.com/pl`,
  ], variant - 1, 0)
  const domain = domainFromWebsite(websiteUrl)
  const contact = toPerson(pick(CONTACTS, variant - 1, 0), domain)
  const decisionMaker = toPerson(pick(DECISION_MAKERS, variant - 1, 1), domain)
  const insightTail = pick(INSIGHTS, variant - 1, 0)
  const industryClause = industry ? ` w branży ${industry}` : ''
  const companyDescription = pick([
    `${name} to polskie MŚP${industryClause}, które sprzedaje usługi B2B i buduje zespół handlowy. Opis z mock researchu, do weryfikacji w KRS.`,
    `${name} działa${industryClause || ' w usługach dla biznesu'}. Widać wzrost zatrudnienia i ręczny proces sprzedaży. To punkt startu, nie gotowy hak.`,
    `${name} skaluje delivery${industryClause} i szuka powtarzalności w lejku. Strona i ogłoszenia sugerują fazę wzrostu, nie korporacyjny playbook.`,
    `${name} wygląda na firmę właścicielską${industryClause}: krótkie decyzje, rozproszona wiedza o kliencie. Research ma dać jeden konkretny kąt rozmowy.`,
    `${name} łączy sprzedaż projektową z retainerem${industryClause}. Cykl jest dłuższy niż przy transakcji, więc liczy się decydent i jeden zweryfikowany ból.`,
  ], variant - 1, 0)
  const estimatedHeadcount = pick(['8-15', '12-19', '20-49', '50-99', '100-149'], variant - 1, 0)

  return {
    mainInsight: `${name} ${insightTail}`,
    mainInsightSource: `WWW: ${websiteUrl}`,
    actionItems: [
      `Umów discovery z ${decisionMaker.name} i potwierdź, kto zamyka budżet.`,
      `Wejdź przez ${contact.name} (${contact.title}) i zbierz jeden konkret z ostatnich 90 dni.`,
      'Sprawdź, czy jest żywy deal i na jakim etapie stoi.',
    ].join('\n'),
    specificProblems: [
      {
        text: 'Brak jednego miejsca, w którym handlowiec widzi insight, deala i osoby decyzyjne. Research firmy jest ręczny i wraca w generycznych hakach.',
        source: 'Fixture: wzorzec MŚP i wywiad sprzedażowy Flow',
      },
    ],
    topNews: [
      {
        title: `${name}: ${pick([
          'wzrost zatrudnienia i nowe ogłoszenia.',
          'nowe treści na stronie i ruch rekrutacyjny.',
          'sygnał przetargowy i dłuższy cykl decyzji.',
          'rozbudowa oferty B2B i zmiana w zarządzie (mock).',
        ], variant - 1, 0)} Rynek usług B2B w Polsce: większy nacisk na ROI.`,
        url: websiteUrl,
        source: 'Mock news',
      },
    ],
    genericProblems: [
      {
        text: 'Ręczny research i CRM, które nie dają handlowcowi gotowego kąta rozmowy. Wiedza o kliencie ginie między notatką, mailem i głową handlowca.',
        source: 'Fixture: problemy generyczne ICP',
      },
    ],
    timeline: [
      {
        event: `2024-03: rejestracja i pierwsze lata działalności ${name}.\n2025-09: rozbudowa oferty i widoczny ruch rekrutacyjny.\n2026-06: sygnał wzrostu, nowe treści na stronie i aktywność przetargowa.`,
        source: 'Mock KRS / WWW / news',
      },
    ],
    companyDescription,
    websiteUrl,
    estimatedHeadcount,
    publicTendersParticipates: variant % 2 === 0,
    publicTenderSources: variant % 2 === 0 ? ['https://ezamowienia.gov.pl', 'Monitor Sądowy (mock)'] : [],
    contactPerson: contact,
    decisionMaker,
    annualRevenue: pick(['860 tys. PLN', '1,8 mln PLN', '4,2 mln PLN', '7,6 mln PLN', '12,1 mln PLN'], variant - 1, 0),
    profit: pick(['-120 tys. PLN', '210 tys. PLN', '380 tys. PLN', '640 tys. PLN', '1,1 mln PLN'], variant - 1, 1),
    nip: registryDigits(variant, 17),
    krs: registryDigits(variant, 89),
    relatedCompanies: pick([
      `${name} Holding sp. z o.o.\n${name} Invest sp. z o.o.`,
      `${name} Group sp. z o.o.\nNordic ${name} AB`,
      `${name} Property sp. z o.o.\n${name} Serwis sp. z o.o.\n${name} Lab sp. z o.o.`,
      `Fundacja ${name}\n${name} Digital sp. z o.o.`,
      `${name} Czech s.r.o.\n${name} DE GmbH`,
    ], variant - 1, 0),
    note: pick([
      `Research ${name}: pierwszy kąt to discovery bez playbooka. Warto potwierdzić decydenta, zanim poleci mail.`,
      `Research ${name}: widać wzrost i ręczny lejek. Notatka z mocka, do weryfikacji na discovery.`,
      `Research ${name}: sygnał przetargowy i dłuższy cykl. Nie wysyłaj generycznego haka.`,
      `Research ${name}: właściciel zamyka tempo. Wejdź przez kontakt operacyjny i zbierz jeden konkret z 90 dni.`,
      `Research ${name}: CRM nie dociąga insightu do handlowca. Brief jest punktem startu, nie ofertą.`,
    ], variant - 1, 0),
  }
}
