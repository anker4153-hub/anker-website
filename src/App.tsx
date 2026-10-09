import { FormEvent, ReactNode, useEffect, useState } from "react"
import { Icon, Logo } from "@/components/ui"
import AdminPanel from "@/admin/AdminPanel"
import { createReservation, sendConfirmationEmail } from "@/lib/reservations"
import type { NewReservation, Seating } from "@/lib/supabase"
import { photos } from "@/assets/photos"

type Page = "home" | "menu" | "reservation" | "about" | "admin"

const pagePaths: Record<Page, string> = {
  home: "/",
  menu: "/menu",
  reservation: "/reservation",
  about: "/about",
  admin: "/admin",
}

function pageFromPath(pathname: string): Page {
  // Normalisieren: Trailing-Slash entfernen (ausser Root)
  const clean = pathname.replace(/\/+$/, "") || "/"
  // Letztes Pfadsegment betrachten, damit auch Preview-URLs mit Prefix
  // (z.B. /abc123/admin) korrekt erkannt werden.
  const last = "/" + clean.split("/").filter(Boolean).pop()
  if (clean === "/" || last === "/") return "home"
  const match = (Object.entries(pagePaths) as [Page, string][]).find(
    ([, path]) => path !== "/" && (clean.endsWith(path) || last === path),
  )
  return match ? match[0] : "home"
}

const navItems: { label: string; page: Page }[] = [
  { label: "Home", page: "home" },
  { label: "Speisekarte", page: "menu" },
  { label: "Über Uns", page: "about" },
  { label: "Reservierung", page: "reservation" },
]

function Header({ page, go }: { page: Page; go: (p: Page) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <header className="header">
      <button
        className="logo-button"
        onClick={() => go("home")}
        aria-label="Zur Startseite"
      >
        <Logo />
      </button>
      <nav className={open ? "nav open" : "nav"}>
        {navItems.map((item) => (
          <button
            key={item.page}
            className={page === item.page ? "active" : ""}
            onClick={() => {
              go(item.page)
              setOpen(false)
            }}
          >
            {item.label}
          </button>
        ))}
        <button
          onClick={() => {
            document
              .querySelector("footer")
              ?.scrollIntoView({ behavior: "smooth" })
            setOpen(false)
          }}
        >
          Kontakt
        </button>
      </nav>
      <div className="header-actions">
        <div className="language">
          <b>DE</b>
          <span>/</span>
          <span>EN</span>
        </div>
        <button className="btn primary small" onClick={() => go("reservation")}>
          Tisch reservieren
        </button>
      </div>
      <button
        className="mobile-menu"
        onClick={() => setOpen(!open)}
        aria-label="Menü öffnen"
      >
        <Icon name={open ? "close" : "menu"} />
      </button>
    </header>
  )
}

function Eyebrow({
  children,
  light = false,
}: {
  children: ReactNode
  light?: boolean
}) {
  return (
    <div className={`eyebrow ${light ? "light" : ""}`}>
      <span />
      {children}
    </div>
  )
}

function Home({ go }: { go: (p: Page) => void }) {
  const highlights = [
    {
      no: "01",
      name: "Paniertes Schnitzel, Wiener Art",
      desc: "Mit Pommes und Salat · auf Wunsch mit Champignonsauce",
      price: "18,50 €",
      photo: photos.dishSchnitzelFoto,
    },
    {
      no: "02",
      name: "Lachsfilet",
      desc: "Zitronentopping · Spinat-Sahnesauce · Reis",
      price: "22,50 €",
      photo: photos.dishLachsfiletFoto,
    },
    {
      no: "03",
      name: "Currypfanne vegan",
      desc: "Mit Reis · wahlweise mit Hähnchenbrust oder Garnelen",
      price: "15 €",
      photo: photos.dishCurrypfanneFoto,
    },
  ]
  return (
    <main>
      <section
        className="hero"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(24,18,16,.78) 0%, rgba(24,18,16,.42) 50%, rgba(24,18,16,.12) 100%), url(${photos.terrasseSonnenschirme})`,
        }}
      >
        <div className="hero-content">
          <Eyebrow light>Restaurant & Terrasse am Moselufer · Pfalzel</Eyebrow>
          <h1>
            Zum Anker
            <br />
            <i>am Moselufer</i>
          </h1>
          <p>
            Gemütlich essen und trinken auf unserer Terrasse direkt an der
            Mosel. Regionale Küche, kühle Getränke und der schönste Flussblick
            in Pfalzel.
          </p>
          <div className="hero-buttons">
            <button className="btn primary" onClick={() => go("reservation")}>
              Tisch reservieren <Icon name="arrow" />
            </button>
            <button className="btn ghost" onClick={() => go("menu")}>
              Speisekarte entdecken
            </button>
          </div>
        </div>
        <div className="hero-note">
          <Icon name="pin" />
          <span>
            <small>Direkt an der Mosel</small>Zum Anker · Pfalzel
          </span>
        </div>
        <div className="scroll-note">
          Entdecken <span />
        </div>
      </section>

      <section className="intro section">
        <div>
          <Eyebrow>Willkommen im Anker</Eyebrow>
          <h2>
            Wo die Mosel
            <br />
            <i>zu Hause ist.</i>
          </h2>
        </div>
        <div className="intro-copy">
          <p>
            Ein Ort, an dem die Zeit ein wenig langsamer fließt. Auf unserer
            Terrasse mit „Zum Anker"-Laternen genießen Sie frische Küche,
            kühles Bitburger und den weiten Blick über den Fluss.
          </p>
          <button className="text-link" onClick={() => go("about")}>
            Unsere Geschichte <Icon name="arrow" />
          </button>
        </div>
      </section>

      <section className="signature section">
        <div className="section-head">
          <div>
            <Eyebrow>Aus unserer Küche</Eyebrow>
            <h2>Beliebt bei unseren Gästen</h2>
          </div>
          <button className="text-link" onClick={() => go("menu")}>
            Zur Speisekarte <Icon name="arrow" />
          </button>
        </div>
        <div className="dish-grid">
          {highlights.map((d) => (
            <article className="dish-card" key={d.name}>
              <div
                className="dish-photo"
                style={{ backgroundImage: `url(${d.photo})` }}
              >
                <span>{d.no}</span>
              </div>
              <div className="dish-info">
                <div>
                  <h3>{d.name}</h3>
                  <p>{d.desc}</p>
                </div>
                <b>{d.price}</b>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="wine-feature">
        <div
          className="wine-image"
          style={{ backgroundImage: `url(${photos.tischFlussblick})` }}
        >
          <span className="image-tag">
            Unsere Terrasse
            <br />
            <b>direkt am Fluss</b>
          </span>
        </div>
        <div className="wine-copy">
          <Eyebrow light>Mosel im Blick</Eyebrow>
          <h2>
            Terrasse.
            <br />
            <i>Flussblick inklusive.</i>
          </h2>
          <p>
            Vom ersten Kaffee am Morgen bis zum kühlen Weissbier am Abend:
            Unsere „Zum Anker Terrasse" liegt unmittelbar an der Mosel – mit
            Sonnenschirmen, Laternen und Blick über das Wasser.
          </p>
          <div className="wine-facts">
            <div>
              <b>60+</b>
              <span>
                Plätze
                <br />
                auf der Terrasse
              </span>
            </div>
            <div>
              <b>1A</b>
              <span>
                Flussblick
                <br />
                über die Mosel
              </span>
            </div>
          </div>
          <button className="btn gold" onClick={() => go("reservation")}>
            Platz sichern <Icon name="arrow" />
          </button>
        </div>
      </section>

      <section className="village section">
        <div className="village-copy">
          <Eyebrow>Für Ihre Feier</Eyebrow>
          <h2>
            Festsaal
            <br />
            <i>mit Moselblick.</i>
          </h2>
          <p>
            Geburtstag, Familienfeier oder Firmenevent? Unser heller Saal mit
            Blick auf den Fluss bietet den passenden Rahmen – festlich
            eingedeckt und ganz nach Ihren Wünschen.
          </p>
          <button className="text-link" onClick={() => go("reservation")}>
            Anfrage senden <Icon name="arrow" />
          </button>
        </div>
        <div className="village-images">
          <img src={photos.saalInnen} alt="Festsaal mit eingedeckten Tischen" />
          <img src={photos.schildHerbst} alt="Zum Anker Terrasse im Herbst" />
        </div>
      </section>
    </main>
  )
}

const menuData: Record<string, {
  name: string
  desc: string
  price: string
}[]> = {
  Vorspeisen: [
    {
      name: "Antipasti Gemüse kalt",
      desc: "",
      price: "8 €",
    },
    {
      name: "Rindercarpaccio",
      desc: "Rucola, Parmesan",
      price: "14,50 €",
    },
    {
      name: "Kürbissuppe",
      desc: "",
      price: "7,50 €",
    },
  ],
  Hauptspeisen: [
    {
      name: "Paniertes Schnitzel, Wiener Art",
      desc: "mit Pommes und Salat · Champignonsauce +2,50 €",
      price: "18,50 €",
    },
    {
      name: "Salatteller vegetarisch",
      desc: "Blattsalat mit Möhren, Tomaten, Gurken · wahlweise mit Italian Dressing oder Joghurtdressing · mit Hähnchenbrust +4,50 € · mit Garnelen +6,50 €",
      price: "12 €",
    },
    {
      name: "Lachsfilet",
      desc: "mit Zitronentopping, Spinat-Sahnesauce und Reis",
      price: "22,50 €",
    },
    {
      name: "Currypfanne vegan",
      desc: "mit Reis · mit Hähnchenbrust +4,50 € · mit Garnelen +6,50 €",
      price: "15 €",
    },
  ],
  Kinderspeisen: [
    {
      name: "Chicken Nuggets",
      desc: "mit Pommes",
      price: "7,50 €",
    },
    {
      name: "Schweineschnitzel",
      desc: "mit Pommes",
      price: "8,50 €",
    },
  ],
}

function MenuPage() {
  const [tab, setTab] = useState("Hauptspeisen")
  return (
    <main className="inner-page menu-page">
      <section className="page-title">
        <Eyebrow>Die Speisekarte</Eyebrow>
        <h1>
          Von hier. <i>Für heute.</i>
        </h1>
        <p>
          Unsere Küche folgt der Landschaft und den Jahreszeiten. Was reif ist,
          kommt auf den Teller.
        </p>
      </section>
      <div className="menu-tabs">
        {Object.keys(menuData).map((name) => (
          <button
            className={tab === name ? "active" : ""}
            onClick={() => setTab(name)}
            key={name}
          >
            {name}
          </button>
        ))}
      </div>
      <section className="menu-list">
        <div className="menu-list-head">
          <span>{tab}</span>
          <small>Alle Preise inkl. MwSt.</small>
        </div>
        {menuData[tab].map((dish, i) => (
          <article className="menu-item" key={dish.name}>
            <span className="menu-number">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="menu-detail">
              <h3>{dish.name}</h3>
              {dish.desc && <p>{dish.desc}</p>}
            </div>
            <b>{dish.price}</b>
          </article>
        ))}
      </section>
      <p className="allergen-note">
        Bei Allergien oder Unverträglichkeiten sprechen Sie uns bitte an. Unser
        Serviceteam berät Sie gerne persönlich.
      </p>
    </main>
  )
}

function Reservation() {
  const [step, setStep] = useState(1)
  const [seating, setSeating] = useState<Seating>("Terrasse")
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [emailWarning, setEmailWarning] = useState(false)

  const [date, setDate] = useState("")
  const [time, setTime] = useState("19:00")
  const [guests, setGuests] = useState(2)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [requests, setRequests] = useState("")

  const resetForm = () => {
    setSubmitted(false)
    setStep(1)
    setErrorMsg(null)
    setEmailWarning(false)
    setDate("")
    setTime("19:00")
    setGuests(2)
    setSeating("Terrasse")
    setFirstName("")
    setLastName("")
    setEmail("")
    setPhone("")
    setRequests("")
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSending(true)
    setErrorMsg(null)
    const payload: NewReservation = {
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      reservation_date: date,
      reservation_time: time,
      party_size: guests,
      seating,
      special_requests: requests.trim() ? requests.trim() : null,
      status: "Ausstehend",
    }
    try {
      const created = await createReservation(payload)
      // E-Mail ist best-effort und darf die Reservierung nicht blockieren.
      const mail = await sendConfirmationEmail(created)
      if (!mail.ok) setEmailWarning(true)
      setSubmitted(true)
    } catch (err) {
      setErrorMsg(
        "Die Reservierung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut oder rufen Sie uns an: +49 651 981 42 60.",
      )
      console.error("Reservation failed:", err)
    } finally {
      setSending(false)
    }
  }

  if (submitted)
    return (
      <main className="inner-page reserve-page success">
        <span className="success-icon">
          <Icon name="check" size={34} />
        </span>
        <Eyebrow>Anfrage gesendet</Eyebrow>
        <h1>Vielen Dank.</h1>
        <p>
          Wir prüfen Ihren Wunschtermin und senden Ihnen in Kürze eine
          Bestätigung per E-Mail.
        </p>
        {emailWarning && (
          <p className="reserve-softnote">
            Hinweis: Die Bestätigungs-E-Mail konnte nicht sofort versendet
            werden. Ihre Reservierung ist dennoch bei uns eingegangen.
          </p>
        )}
        <button className="btn primary" onClick={resetForm}>
          Weitere Reservierung
        </button>
      </main>
    )
  return (
    <main className="inner-page reserve-page">
      <section className="page-title">
        <Eyebrow>Ihr Platz am Fluss</Eyebrow>
        <h1>
          Tisch<i>reservierung</i>
        </h1>
        <p>Wir freuen uns darauf, Sie bei uns willkommen zu heißen.</p>
      </section>
      <div className="reservation-shell">
        <aside
          className="reserve-aside"
          style={{
            backgroundImage: `linear-gradient(rgba(34,28,26,.25),rgba(34,28,26,.8)),url(${photos.tischFlussblick})`,
          }}
        >
          <div>
            <Eyebrow light>Gut zu wissen</Eyebrow>
            <h2>
              Ein Abend
              <br />
              am Anker.
            </h2>
          </div>
          <div>
            <p>
              <Icon name="clock" />
              <span>
                <b>Öffnungszeiten</b>Mi–So · 17:30–23:00 Uhr
              </span>
            </p>
            <p>
              <Icon name="phone" />
              <span>
                <b>Lieber persönlich?</b>+49 651 981 42 60
              </span>
            </p>
          </div>
        </aside>
        <form className="reserve-form" onSubmit={submit}>
          <div className="steps">
            {[
              ["01", "Termin"],
              ["02", "Sitzplatz"],
              ["03", "Kontaktdaten"],
            ].map((s, i) => (
              <div className={step >= i + 1 ? "active" : ""} key={s[0]}>
                <span>
                  {step > i + 1 ? <Icon name="check" size={15} /> : s[0]}
                </span>
                <b>{s[1]}</b>
              </div>
            ))}
          </div>
          {step === 1 && (
            <div className="form-step">
              <h2>Wann dürfen wir Sie begrüßen?</h2>
              <div className="field-row">
                <label>
                  <span>Datum</span>
                  <div className="field">
                    <Icon name="calendar" />
                    <input
                      type="date"
                      required
                      value={date}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                </label>
                <label>
                  <span>Uhrzeit</span>
                  <div className="field">
                    <Icon name="clock" />
                    <select
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    >
                      <option>18:00</option>
                      <option>18:30</option>
                      <option>19:00</option>
                      <option>19:30</option>
                      <option>20:00</option>
                      <option>20:30</option>
                      <option>21:00</option>
                    </select>
                  </div>
                </label>
              </div>
              <label>
                <span>Personen</span>
                <div className="field">
                  <Icon name="users" />
                  <select
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? "Person" : "Personen"}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
              <button
                type="button"
                className="btn primary form-next"
                onClick={() => setStep(2)}
                disabled={!date}
              >
                Weiter zur Sitzplatzwahl <Icon name="arrow" />
              </button>
            </div>
          )}
          {step === 2 && (
            <div className="form-step">
              <h2>Wo möchten Sie sitzen?</h2>
              <div className="seat-options">
                <button
                  type="button"
                  className={seating === "Terrasse" ? "active" : ""}
                  onClick={() => setSeating("Terrasse")}
                >
                  <span className="seat-art terrace" />
                  <span>
                    <b>Mosel-Terrasse</b>
                    <small>Unter freiem Himmel mit Flussblick</small>
                  </span>
                  <i>{seating === "Terrasse" && <Icon name="check" />}</i>
                </button>
                <button
                  type="button"
                  className={seating === "Innen" ? "active" : ""}
                  onClick={() => setSeating("Innen")}
                >
                  <span className="seat-art inside" />
                  <span>
                    <b>Innenbereich</b>
                    <small>Stimmungsvoll und elegant</small>
                  </span>
                  <i>{seating === "Innen" && <Icon name="check" />}</i>
                </button>
              </div>
              <div className="form-buttons">
                <button
                  type="button"
                  className="btn back"
                  onClick={() => setStep(1)}
                >
                  Zurück
                </button>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => setStep(3)}
                >
                  Weiter <Icon name="arrow" />
                </button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="form-step">
              <h2>Wie erreichen wir Sie?</h2>
              <div className="field-row">
                <label>
                  <span>Vorname</span>
                  <input
                    required
                    placeholder="Anna"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </label>
                <label>
                  <span>Nachname</span>
                  <input
                    required
                    placeholder="Becker"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </label>
              </div>
              <label>
                <span>E-Mail</span>
                <input
                  required
                  type="email"
                  placeholder="anna@beispiel.de"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label>
                <span>Telefon</span>
                <input
                  required
                  type="tel"
                  placeholder="+49 151 12345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
              <label>
                <span>Besondere Wünsche</span>
                <textarea
                  placeholder="Allergien, Anlass oder weitere Hinweise..."
                  rows={3}
                  value={requests}
                  onChange={(e) => setRequests(e.target.value)}
                />
              </label>
              {errorMsg && <p className="reserve-error">{errorMsg}</p>}
              <div className="form-buttons">
                <button
                  type="button"
                  className="btn back"
                  onClick={() => setStep(2)}
                  disabled={sending}
                >
                  Zurück
                </button>
                <button className="btn primary" disabled={sending}>
                  {sending ? "Wird gesendet…" : "Anfrage senden"}{" "}
                  {!sending && <Icon name="arrow" />}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </main>
  )
}

function About() {
  return (
    <main className="about-page">
      <section
        className="about-hero"
        style={{
          backgroundImage: `linear-gradient(rgba(25,18,16,.25),rgba(25,18,16,.58)),url(${photos.pfalzelFluss})`,
        }}
      >
        <div>
          <h1>
            Am Fluss
            <br />
            <i>verwurzelt.</i>
          </h1>
        </div>
      </section>
      <section className="about-intro section">
        <span className="big-year">1896</span>
        <div>
          <Eyebrow>Unsere Geschichte</Eyebrow>
          <h2>
            Ein Haus mit
            <br />
            <i>offener Tür.</i>
          </h2>
        </div>
        <div>
          <p>
            Was als Schenke für Schiffer und Winzer begann, ist über
            Generationen zu einem kulinarischen Zuhause gewachsen.
          </p>
          <p>
            Noch heute prägen Gastfreundschaft, Handwerk und der Blick auf die
            Mosel jeden Abend im Zum Anker.
          </p>
        </div>
      </section>
      <section className="story-grid section">
        <img src={photos.tischFlussblick} alt="Gedeckter Tisch mit Blick auf die Mosel" />
        <div>
          <span className="quote">“</span>
          <h2>
            Wir kochen nicht laut.
            <br />
            Wir kochen <i>nah.</i>
          </h2>
          <p>
            „Die Region gibt uns alles, was wir brauchen: charaktervolle
            Produkte, großartige Winzer und eine Landschaft, die Demut lehrt.
            Unsere Aufgabe ist es, das Wesentliche sichtbar zu machen.“
          </p>
          <div className="chef">
            <span>JL</span>
            <div>
              <b>Johannes Lorenz</b>
              <small>Küchenchef & Gastgeber</small>
            </div>
          </div>
        </div>
      </section>
      <section className="values section">
        <Eyebrow>Unsere Haltung</Eyebrow>
        <div className="value-grid">
          <article>
            <span>01</span>
            <h3>Aus der Region</h3>
            <p>
              Kurze Wege, vertraute Produzenten und Zutaten, die ihre Herkunft
              nicht verstecken.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>Mit der Saison</h3>
            <p>
              Unsere Karte verändert sich mit dem, was Felder, Wälder und Fluss
              gerade schenken.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Ehrliches Handwerk</h3>
            <p>
              Klassische Techniken, zeitgemäß interpretiert und mit Ruhe auf den
              Teller gebracht.
            </p>
          </article>
        </div>
      </section>
    </main>
  )
}

function Footer({ go }: { go: (p: Page) => void }) {
  return (
    <footer>
      <div className="footer-main">
        <div className="footer-brand">
          <Logo />
          <p>
            Regionale Küche am Moselufer.
            <br />
            Verwurzelt in Trier-Pfalzel.
          </p>
        </div>
        <div>
          <h3>Öffnungszeiten</h3>
          <p>
            Mittwoch – Sonntag
            <br />
            <b>17:30 – 23:00 Uhr</b>
          </p>
          <p>
            Montag & Dienstag
            <br />
            <span>Ruhetag</span>
          </p>
        </div>
        <div>
          <h3>Kontakt</h3>
          <p>
            Zurmaiener Straße 123
            <br />
            54293 Trier-Pfalzel
          </p>
          <p>
            +49 651 981 42 60
            <br />
            hallo@zumanker-trier.de
          </p>
        </div>
        <div>
          <h3>Entdecken</h3>
          <button onClick={() => go("menu")}>Speisekarte</button>
          <button onClick={() => go("reservation")}>Reservierung</button>
          <button onClick={() => go("about")}>Über uns</button>
          <button onClick={() => go("admin")}>Admin Dashboard</button>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Zum Anker Trier-Pfalzel</span>
        <div>
          <button>Impressum</button>
          <button>Datenschutz</button>
          <button>Cookies</button>
        </div>
        <span>Instagram · Facebook</span>
      </div>
    </footer>
  )
}

export default function App() {
  const [page, setPage] = useState<Page>(() =>
    pageFromPath(window.location.pathname),
  )

  useEffect(() => {
    const onPopState = () => setPage(pageFromPath(window.location.pathname))
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  const go = (next: Page) => {
    // Mögliches Preview-Prefix beibehalten (alles vor dem bekannten Segment).
    const current = window.location.pathname
    const knownSegments = Object.values(pagePaths)
      .map((p) => p.replace(/^\//, ""))
      .filter(Boolean)
    const parts = current.split("/").filter(Boolean)
    while (parts.length && knownSegments.includes(parts[parts.length - 1])) {
      parts.pop()
    }
    const prefix = parts.length ? "/" + parts.join("/") : ""
    const target = (prefix + pagePaths[next]).replace(/\/+/g, "/") || "/"
    if (current !== target) {
      window.history.pushState({}, "", target)
    }
    setPage(next)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  if (page === "admin") return <AdminPanel exit={() => go("home")} />
  return (
    <div>
      <Header page={page} go={go} />
      {page === "home" && <Home go={go} />}
      {page === "menu" && <MenuPage />}
      {page === "reservation" && <Reservation />}
      {page === "about" && <About />}
      <Footer go={go} />
    </div>
  )
}
