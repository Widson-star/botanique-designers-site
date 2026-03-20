import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useApp } from "../../context/AppContext";

const deliverables = [
  { icon: "📋", title: "Project Description Report", desc: "Detailed documentation of the proposed development, its scope and intended use." },
  { icon: "🌍", title: "Environmental Baseline Study", desc: "Assessment of existing ecological conditions — flora, fauna, soils and water bodies." },
  { icon: "⚠️", title: "Impact Identification & Mitigation", desc: "Systematic identification of potential environmental impacts and proposed mitigation measures." },
  { icon: "📊", title: "Environmental Management Plan", desc: "A structured plan to monitor and manage environmental aspects during and after construction." },
  { icon: "🏛️", title: "NEMA Submission Package", desc: "Complete documentation prepared and formatted for submission to NEMA Kenya for approval." },
  { icon: "✅", title: "Follow-up & Compliance Support", desc: "We assist with NEMA queries, site inspections and any compliance reporting required." },
];

export default function EIAStudies() {
  const { openQuoteWizard } = useApp();

  return (
    <div className="pt-24 font-sans text-botanique-charcoal">
      <Helmet>
        <title>Environmental Impact Assessment Studies Kenya · NEMA Compliance | Botanique Designers</title>
        <meta name="description" content="NEMA-compliant Environmental Impact Assessment (EIA) studies in Kenya. Botanique Designers prepares full EIA reports, baseline studies, impact mitigation plans and NEMA submission packages." />
        <link rel="canonical" href="https://www.botaniquedesigners.com/services/eia-studies" />
      </Helmet>

      {/* Hero */}
      <section className="relative min-h-[50vh] flex items-center justify-center text-center">
        <img
          src="/project-public.jpg"
          alt="Environmental Impact Assessment Kenya"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />
        <div className="relative z-10 px-6 max-w-3xl">
          <p className="text-white/70 uppercase tracking-widest text-sm mb-3">Our Services</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            EIA Studies
          </h1>
          <p className="text-white/80 text-lg">
            NEMA-compliant Environmental Impact Assessments delivered with
            accuracy and speed — so your project stays on schedule.
          </p>
        </div>
      </section>

      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-6 py-4 text-sm text-gray-500">
        <Link to="/" className="hover:text-botanique-green">Home</Link>
        <span className="mx-2">/</span>
        <span>EIA Studies</span>
      </div>

      {/* Intro */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6">
            What Is an EIA and When Do You Need One?
          </h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            In Kenya, the Environmental Management and Co-ordination Act (EMCA) requires
            an Environmental Impact Assessment for any project likely to have a significant
            effect on the environment. This includes housing developments, commercial buildings,
            roads, subdivisions, and land clearing above certain thresholds.
          </p>
          <p className="text-gray-600 leading-relaxed mb-4">
            NEMA (the National Environment Management Authority) must approve your EIA before
            construction can legally begin. Without it, projects face stop-work orders, fines,
            or permit refusals.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Botanique Designers provides comprehensive, professionally prepared EIA studies
            that satisfy NEMA requirements and get your project approved efficiently.
          </p>
        </div>
      </section>

      {/* Why us */}
      <section className="py-16 bg-botanique-beige">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-10">
            Why Choose Botanique for Your EIA?
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              { title: "NEMA Experience", desc: "We understand exactly what NEMA reviewers look for and prepare submissions accordingly." },
              { title: "Fast Turnaround", desc: "Streamlined workflows so your EIA doesn't become a bottleneck to your project timeline." },
              { title: "Landscape Integration", desc: "As landscape professionals, we identify and propose genuine ecological mitigation measures." },
              { title: "Full Support", desc: "We attend site inspections and respond to NEMA queries on your behalf throughout the process." },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl p-6 shadow-sm flex gap-4">
                <span className="text-2xl text-botanique-green mt-1">✓</span>
                <div>
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-gray-500 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Deliverables */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">What We Deliver</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {deliverables.map((item) => (
              <div key={item.title} className="bg-botanique-beige rounded-2xl p-6">
                <span className="text-3xl mb-3 block">{item.icon}</span>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-botanique-green text-white text-center">
        <h2 className="text-3xl font-bold mb-4">Start Your EIA Process Today</h2>
        <p className="text-white/80 mb-8 max-w-xl mx-auto">
          Don't let regulatory requirements delay your project. Request a quote
          and we'll advise on scope, timeline and cost within 24 hours.
        </p>
        <button
          onClick={() => openQuoteWizard("Environmental Impact Assessment (EIA)")}
          className="px-8 py-4 rounded-full bg-white text-botanique-green font-semibold hover:scale-105 transition"
        >
          Request EIA Quote
        </button>
      </section>

      {/* Related */}
      <section className="py-12 bg-botanique-beige text-center">
        <p className="text-gray-500 text-sm mb-4">Explore related services</p>
        <div className="flex flex-wrap justify-center gap-3">
          {[
            { label: "Landscape Architecture", path: "/services/landscape-architecture" },
            { label: "Project Implementation", path: "/services/implementation" },
          ].map((r) => (
            <Link
              key={r.path}
              to={r.path}
              className="px-5 py-2 rounded-full border border-botanique-green text-botanique-green text-sm hover:bg-botanique-green hover:text-white transition"
            >
              {r.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
