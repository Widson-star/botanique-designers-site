import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import FadeIn from "../components/FadeIn";

const team = [
  {
    name: "Widson Ambaisi",
    title: "Founder & Principal Landscape Designer",
    image: "/team/widson-ambaisi.jpg",
    credentials: [
      "BSc Environmental Science, University of Nairobi",
      "Associate's in Horticultural Science, Egerton University",
      "Kenya Horticultural Society (KHS) member",
      "AIPH World Green City Awards — Youth Jury Member, 2024",
      "African Climate Summit delegate",
      "Builder of Ask Botanique — proprietary plant intelligence platform",
      "Specialist in plant taxonomy and botanical labelling",
    ],
  },
  {
    name: "Martine Lotom",
    title: "Landscape Architect",
    image: "/team/lotom.jpg",
    credentials: [
      "BSc Landscape Architecture, Jomo Kenyatta University of Agriculture and Technology (JKUAT)",
      "Member, Architectural Association of Kenya (AAK)",
      "JKUAT is the only institution in Kenya offering the Landscape Architecture degree, accredited by IFLA and recognised by BORAQS",
      "In charge of operations — garden implementation and site oversight",
    ],
  },
];

const affiliations = [
  { name: "Kenya Horticultural Society (KHS)", abbr: "KHS" },
  { name: "Architectural Association of Kenya (AAK)", abbr: "AAK" },
  {
    name: "International Association of Horticultural Producers (AIPH)",
    abbr: "AIPH",
  },
];

const countries = [
  { name: "Kenya", position: "top-[48%] left-[62%]" },
  { name: "Tanzania", position: "top-[62%] left-[58%]" },
  { name: "Uganda", position: "top-[38%] left-[52%]" },
  { name: "Rwanda", position: "top-[46%] left-[48%]" },
  { name: "Somalia", position: "top-[28%] left-[72%]" },
];

export default function About() {
  return (
    <>
      <Helmet>
        <title>About Us | Botanique Designers</title>
        <link rel="canonical" href="https://www.botaniquedesigners.com/about" />
      </Helmet>
      <div className="pt-20">
      {/* Hero */}
      <section className="relative h-[40vh] min-h-[300px] flex items-center justify-center bg-botanique-dark">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: "url('/projects/project-5.jpg')" }}
        />
        <div className="relative z-10 text-center px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            About Botanique Designers
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            A landscape practice founded on plant science.
          </p>
        </div>
      </section>

      {/* Breadcrumb */}
      <div className="bg-botanique-beige py-3 px-4">
        <div className="max-w-6xl mx-auto text-sm text-gray-500">
          <Link to="/" className="hover:text-botanique-green">
            Home
          </Link>{" "}
          / <span className="text-botanique-green">About</span>
        </div>
      </div>

      {/* The Story */}
      <FadeIn>
        <section className="py-16 md:py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-botanique-charcoal mb-8">
              The Story
            </h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                Botanique Designers started with trees — specifically, with the
                work of identifying and labelling them. At learning institutions
                across Kenya, Widson Ambaisi walked campus grounds, keyed out
                species using botanical references, and installed labels showing
                each tree's scientific name, common name, family, and origin.
                That work — applied plant taxonomy — became the foundation of
                everything that followed.
              </p>
              <p>
                The name "Botanique" comes directly from this botanical
                practice. It reflects a belief that knowing a plant at the
                species level — its growth habits, its soil preferences, its
                altitude range, its water needs — is the starting point for any
                landscape decision. Not aesthetics first. Science first.
              </p>
              <p>
                Today the practice covers landscape design, landscape
                architecture, garden implementation, and ongoing maintenance.
                Widson leads design and plant science. Martine Lotom, a
                landscape architect from JKUAT, leads architectural-scale
                planning and site supervision. Together they deliver projects
                across Kenya, Tanzania, Uganda, Rwanda, and Somalia.
              </p>
            </div>
          </div>
        </section>
      </FadeIn>

      {/* The Team */}
      <FadeIn>
        <section className="py-16 md:py-20 px-4 bg-botanique-beige">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-botanique-charcoal mb-12 text-center">
              The Team
            </h2>
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
              {team.map((member) => (
                <div
                  key={member.name}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden"
                >
                  {/* Green accent top bar */}
                  <div className="h-2 bg-botanique-green" />

                  {/* Portrait + info layout */}
                  <div className="p-8 md:p-10">
                    <div className="flex flex-col items-center mb-6">
                      {/* Circular portrait with ring */}
                      <div className="w-40 h-40 md:w-48 md:h-48 rounded-full ring-4 ring-botanique-green/20 ring-offset-4 overflow-hidden mb-5">
                        <img
                          src={member.image}
                          alt={member.name}
                          className="w-full h-full object-cover object-top"
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.parentElement.innerHTML = `<div class="flex items-center justify-center h-full bg-botanique-beige"><span class="text-5xl font-bold text-botanique-green/40">${member.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}</span></div>`;
                          }}
                        />
                      </div>
                      <h3 className="text-xl font-bold text-botanique-charcoal text-center">
                        {member.name}
                      </h3>
                      <p className="text-botanique-green font-semibold text-sm mt-1">
                        {member.title}
                      </p>
                    </div>

                    {/* Divider */}
                    <div className="w-12 h-0.5 bg-botanique-green/30 mx-auto mb-6" />

                    {/* Credentials */}
                    <ul className="space-y-3">
                      {member.credentials.map((cred, i) => (
                        <li
                          key={i}
                          className="text-sm text-gray-600 flex items-start gap-3"
                        >
                          <span className="w-5 h-5 bg-botanique-green/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg
                              className="w-3 h-3 text-botanique-green"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </span>
                          {cred}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* Ask Botanique */}
      <FadeIn>
        <section className="py-16 md:py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-botanique-charcoal mb-6">
              Ask Botanique
            </h2>
            <p className="text-gray-600 leading-relaxed max-w-2xl mx-auto mb-6">
              A proprietary plant intelligence platform scaling to 5,000 East
              African species in a structured database. Built to support species
              selection during design, client education, and botanical labelling
              projects. Every species entry reflects real growing experience in
              East African conditions — altitude, rainfall, soil type.
            </p>
            <p className="text-sm text-gray-500">
              Look for the chat icon in the bottom-right corner of any page to
              try it.
            </p>
          </div>
        </section>
      </FadeIn>

      {/* Coverage Map */}
      <FadeIn>
        <section className="py-16 md:py-20 px-4 bg-botanique-beige">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-botanique-charcoal mb-4 text-center">
              Where We Work
            </h2>
            <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
              Projects across five East African countries — from residential
              gardens to large-scale landscape designs spanning over 30,000
              acres.
            </p>
            <div className="grid md:grid-cols-5 gap-4">
              {[
                {
                  country: "Kenya",
                  detail: "Residential, commercial & institutional projects nationwide",
                  flag: "🇰🇪",
                },
                {
                  country: "Tanzania",
                  detail: "Garden design and landscape architecture",
                  flag: "🇹🇿",
                },
                {
                  country: "Uganda",
                  detail: "Garden design and landscape architecture",
                  flag: "🇺🇬",
                },
                {
                  country: "Rwanda",
                  detail: "Garden design and landscape architecture",
                  flag: "🇷🇼",
                },
                {
                  country: "Somalia",
                  detail: "Zaara Park — over 30,000 acres",
                  flag: "🇸🇴",
                },
              ].map((c) => (
                <div
                  key={c.country}
                  className="bg-white rounded-xl p-6 text-center shadow-sm"
                >
                  <span className="text-3xl mb-3 block">{c.flag}</span>
                  <h3 className="font-bold text-botanique-charcoal">
                    {c.country}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{c.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* Professional Affiliations */}
      <FadeIn>
        <section className="py-16 md:py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-botanique-charcoal mb-10">
              Professional Affiliations
            </h2>
            <div className="flex flex-wrap justify-center gap-8">
              {affiliations.map((a) => (
                <div
                  key={a.abbr}
                  className="bg-botanique-beige rounded-xl px-8 py-6 min-w-[200px]"
                >
                  <span className="text-2xl font-bold text-botanique-green">
                    {a.abbr}
                  </span>
                  <p className="text-sm text-gray-500 mt-2">{a.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* Press */}
      <FadeIn>
        <section className="py-16 md:py-20 px-4 bg-botanique-beige">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-botanique-charcoal mb-10 text-center">
              In the Press
            </h2>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden md:flex">
              <div className="md:w-1/2">
                <img
                  src="/press/standard-feature.jpg"
                  alt="The Standard newspaper feature on Widson Ambaisi"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-center">
                <span className="text-xs font-semibold text-botanique-green uppercase tracking-wider mb-2">
                  The Standard
                </span>
                <h3 className="text-xl font-bold text-botanique-charcoal mb-3">
                  "In the thick of quarter life crisis"
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Featured in The Standard newspaper as a young landscape designer
                  running Botanical Landscaping (Botanique Designers), alongside a
                  profile on building a career in the horticulture and landscaping
                  industry in Kenya.
                </p>
              </div>
            </div>
          </div>
        </section>
      </FadeIn>

      {/* CTA */}
      <section className="py-16 px-4 bg-botanique-green text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Work with us</h2>
          <p className="text-white/80 mb-8">
            Whether you need a garden designed, plants identified, or an
            established landscape maintained — we'd like to hear about your
            project.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/#contact"
              className="bg-white text-botanique-green px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition"
            >
              Get in Touch
            </Link>
            <a
              href="https://wa.me/254720861592?text=Hi%20Botanique%20Designers%2C%20I'd%20like%20to%20discuss%20a%20project."
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white/10 transition"
            >
              WhatsApp Us
            </a>
          </div>
        </div>
      </section>
    </div>
    </>
  );
}
