import Link from "next/link";
import {
  ArrowUpRight,
  Scissors,
  Sparkles,
  Flower2,
  Heart,
  Phone,
  MapPin,
} from "lucide-react";
import ContactForm from "@/components/contact-form";
import BookingForm from "@/components/booking-form";
import { configured } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { Service, money, sampleServices } from "@/lib/types";
export const dynamic = "force-dynamic";
export default async function Home() {
  let services: Service[] = sampleServices;
  let ready = false;
  if (configured())
    try {
      const db = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      );
      const { data, error } = await db
        .from("salon_services")
        .select("*")
        .eq("active", true)
        .order("price", { ascending: false });
      if (!error && data) {
        services = data;
        ready = Boolean(process.env.SUPABASE_SECRET_KEY);
      }
    } catch {
      /* Keep the public concept available while setup is pending. */
    }
  return (
    <div className="publicsite">
      <div className="conceptbar">
        A website concept for MUSK · Illustrative packages & imagery
      </div>
      <nav className="publicnav">
        <Link className="musklogo" href="/">
          MUSK<span>BY LUBNA ARIF</span>
        </Link>
        <div>
          <a href="#services">Our services</a>
          <a href="#studio">The studio</a>
          <a href="#gallery">The moodboard</a>
        </div>
        <a className="publiccta" href="#book">
          Book your moment <ArrowUpRight size={15} />
        </a>
      </nav>
      <main>
        <section className="publichero">
          <div className="herocopy">
            <span className="publiceyebrow">
              MAKEUP · HAIR · SKINCARE · BRIDAL
            </span>
            <h1>
              Your beauty.
              <br />
              <em>Our artistry.</em>
            </h1>
            <p>
              For the everyday glow and the once-in-a-lifetime moment. Discover
              your next look at MUSK by Lubna Arif, Karachi.
            </p>
            <div className="heroactions">
              <a className="primary" href="#book">
                Find your moment <ArrowUpRight size={17} />
              </a>
              <a href="#services">
                Explore our services <span>→</span>
              </a>
            </div>
            <div className="heronote">
              <span>♡</span> A little care. A beautiful feeling.
            </div>
          </div>
          <div className="herovisual">
            <img
              src="/images/salon-interior.webp"
              alt="Illustrative salon interior with styling chairs"
            />
            <span className="photoannotation">
              An atmosphere to inspire your visit · stock image
            </span>
            <div className="herostamp">
              MADE FOR
              <br />
              <em>your moment.</em>
              <Sparkles size={18} />
            </div>
          </div>
        </section>
        <div className="valuesstrip">
          <span>Bridal artistry</span>
          <i>✧</i>
          <span>Hair & styling</span>
          <i>✧</i>
          <span>Skin rituals</span>
          <i>✧</i>
          <span>A moment for you</span>
        </div>
        <section className="publicsection" id="services">
          <div className="publicsectionhead">
            <div>
              <span className="publiceyebrow">THE MUSK EDIT</span>
              <h2>
                A little transformation.
                <br />
                <em>A lot of you.</em>
              </h2>
            </div>
            <p>
              Choose your service and let us help you plan your visit.
              <br />
              Prices below are illustrative for this concept.
            </p>
          </div>
          <div className="publicservices">
            {services.map((s, i) => {
              const Icon = [Heart, Sparkles, Scissors, Flower2, Sparkles][
                i % 5
              ];
              return (
                <article key={s.id}>
                  <span className="servicenumber">0{i + 1}</span>
                  <Icon size={26} strokeWidth={1.2} />
                  <span className="publiceyebrow">{s.category}</span>
                  <h3>{s.name}</h3>
                  <p>{s.duration} minutes of dedicated care.</p>
                  <div>
                    <strong>{money(s.price)}</strong>
                    <a aria-label={`Request ${s.name}`} href="#book">
                      <ArrowUpRight size={20} />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
        <section id="studio" className="studioblock">
          <div className="studioart">
            <Flower2 size={150} strokeWidth={0.6} />
            <span>
              THE BEAUTY OF
              <br />
              <em>being yourself.</em>
            </span>
          </div>
          <div>
            <span className="publiceyebrow">MUSK BY LUBNA ARIF</span>
            <h2>
              Every occasion
              <br />
              deserves <em>a little care.</em>
            </h2>
            <p>
              A bridal celebration, a fresh haircut or simply time for yourself.
              Explore makeup, hair and skincare services, then tell us what you
              have in mind.
            </p>
            <a href="#book" className="textlink">
              Let’s plan your visit <ArrowUpRight size={17} />
            </a>
          </div>
        </section>
        <section id="gallery" className="publicsection">
          <div className="publicsectionhead">
            <div>
              <span className="publiceyebrow">A LITTLE INSPIRATION</span>
              <h2>
                The beauty <em>moodboard.</em>
              </h2>
            </div>
            <p>
              Illustrative stock photography.
              <br />
              The salon’s own work will replace these before launch.
            </p>
          </div>
          <div className="moodboard">
            <figure>
              <img
                loading="lazy"
                src="/images/beauty-essentials.webp"
                alt="Makeup brushes and beauty essentials, illustrative stock photo"
              />
              <figcaption>THE FINISHING TOUCH</figcaption>
            </figure>
            <figure>
              <img
                loading="lazy"
                src="/images/styling-space.webp"
                alt="Salon styling space, illustrative stock photo"
              />
              <figcaption>A SPACE TO RESET</figcaption>
            </figure>
          </div>
        </section>
        <section id="book" className="bookingsection">
          <div>
            <span className="publiceyebrow">YOUR NEXT CHAPTER</span>
            <h2>
              Let’s make
              <br />
              <em>time for you.</em>
            </h2>
            <p>
              Tell us your preferred service and time. The salon will contact
              you to discuss your request and confirm availability.
            </p>
            <div className="contactline">
              <MapPin size={19} />
              <span>North Nazimabad, Karachi</span>
            </div>
            <a className="contactline" href="tel:+923304374405">
              <Phone size={19} />
              <span>0330 4374405</span>
            </a>
            <a
              className="textlink"
              href="https://wa.me/923304374405"
              target="_blank"
              rel="noreferrer"
            >
              Prefer WhatsApp? Talk to the salon <ArrowUpRight size={17} />
            </a>
          </div>
          <div className="bookingcard">
            <h3>Your appointment request</h3>
            <BookingForm services={services} enabled={ready} />
          </div>
        </section>
        <section id="contact" className="bookingsection">
          <div>
            <span className="publiceyebrow">LET’S TALK</span>
            <h2>
              A question
              <br />
              <em>before your visit?</em>
            </h2>
            <p>
              Ask about a service, your occasion or planning your look. Your
              message goes directly to the salon team’s dashboard.
            </p>
          </div>
          <div className="bookingcard">
            <h3>Send us a message</h3>
            <ContactForm enabled={ready} />
          </div>
        </section>
      </main>
      <footer className="publicfooter">
        <Link className="musklogo" href="/">
          MUSK<span>BY LUBNA ARIF</span>
        </Link>
        <p>Make time for yourself.</p>
        <Link href="/login">Staff login ↗</Link>
        <small>Independent concept demo · Not an official MUSK website</small>
      </footer>
    </div>
  );
}
