import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import FadeIn from "../components/FadeIn";
import faqs from "../data/faqs";

function AccordionItem({ question, answer, isOpen, onToggle }) {
  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full text-left py-5 px-1 flex items-start justify-between gap-4 cursor-pointer"
      >
        <span className="font-semibold text-botanique-charcoal pr-4">
          {question}
        </span>
        <svg
          className={`w-5 h-5 text-botanique-green flex-shrink-0 mt-0.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-[500px] pb-5" : "max-h-0"}`}
      >
        <p className="text-gray-600 leading-relaxed px-1">{answer}</p>
      </div>
    </div>
  );
}

export default function FAQ() {
  const [openItems, setOpenItems] = useState({});

  const toggle = (key) => {
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      <Helmet>
        <title>FAQ | Botanique Designers</title>
        <link rel="canonical" href="https://www.botaniquedesigners.com/faq" />
      </Helmet>
      <div className="pt-20">
      {/* Hero */}
      <section className="relative h-[35vh] min-h-[260px] flex items-center justify-center bg-botanique-dark">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: "url('/projects/project-9.jpg')" }}
        />
        <div className="relative z-10 text-center px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Common questions about our services, process, and pricing.
          </p>
        </div>
      </section>

      {/* Breadcrumb */}
      <div className="bg-botanique-beige py-3 px-4">
        <div className="max-w-6xl mx-auto text-sm text-gray-500">
          <Link to="/" className="hover:text-botanique-green">Home</Link> /{" "}
          <span className="text-botanique-green">FAQ</span>
        </div>
      </div>

      {/* FAQ Groups */}
      <section className="py-16 md:py-20 px-4">
        <div className="max-w-3xl mx-auto space-y-12">
          {faqs.map((group, gi) => (
            <FadeIn key={group.category}>
              <div>
                <h2 className="text-2xl font-bold text-botanique-charcoal mb-6">
                  {group.category}
                </h2>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6">
                  {group.questions.map((item, qi) => {
                    const key = `${gi}-${qi}`;
                    return (
                      <AccordionItem
                        key={key}
                        question={item.q}
                        answer={item.a}
                        isOpen={!!openItems[key]}
                        onToggle={() => toggle(key)}
                      />
                    );
                  })}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-botanique-green text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Still have questions?</h2>
          <p className="text-white/80 mb-8">
            We're happy to answer anything not covered here. Reach out and we'll
            get back to you within 24 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/#contact"
              className="bg-white text-botanique-green px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition"
            >
              Contact Us
            </Link>
            <a
              href="https://wa.me/254720861592?text=Hi%20Botanique%20Designers%2C%20I%20have%20a%20question."
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
