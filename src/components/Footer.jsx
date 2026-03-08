import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-botanique-charcoal text-white py-20">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-10">

        {/* Brand */}
        <div className="space-y-4">
          <img
            src="/botanique.png"
            alt="Botanique Designers"
            className="h-20 w-auto object-contain brightness-0 invert"
          />
          <p className="text-sm text-gray-300">
            East Africa's botanical-led landscape practice. Garden design,
            landscape architecture, plant taxonomy, and garden maintenance
            across Kenya, Tanzania, Uganda, Rwanda, and Somalia.
          </p>
        </div>

        {/* Services */}
        <div>
          <h4 className="font-semibold mb-4">Services</h4>
          <ul className="space-y-2 text-sm text-gray-300">
            <li><Link to="/services/landscape-design" className="hover:text-white transition">Landscape Design</Link></li>
            <li><Link to="/services/landscape-architecture" className="hover:text-white transition">Landscape Architecture</Link></li>
            <li><Link to="/services/plant-taxonomy" className="hover:text-white transition">Plant Taxonomy</Link></li>
            <li><Link to="/services/garden-implementation" className="hover:text-white transition">Garden Implementation</Link></li>
            <li><Link to="/services/garden-maintenance" className="hover:text-white transition">Garden Maintenance</Link></li>
            <li><Link to="/services/lawn-care" className="hover:text-white transition">Lawn Care</Link></li>
            <li><Link to="/services" className="text-botanique-green hover:text-white transition text-xs font-medium">View all services →</Link></li>
          </ul>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-semibold mb-4">Quick Links</h4>
          <ul className="space-y-2 text-sm text-gray-300">
            <li><Link to="/about" className="hover:text-white transition">About Us</Link></li>
            <li><Link to="/projects" className="hover:text-white transition">Projects</Link></li>
            <li><Link to="/blog" className="hover:text-white transition">Blog</Link></li>
            <li><Link to="/faq" className="hover:text-white transition">FAQ</Link></li>
          </ul>

          <h4 className="font-semibold mb-3 mt-6">Areas We Serve</h4>
          <ul className="space-y-1.5 text-sm text-gray-300">
            <li><Link to="/areas/nairobi" className="hover:text-white transition">Nairobi</Link></li>
            <li><Link to="/areas/mombasa" className="hover:text-white transition">Mombasa</Link></li>
            <li><Link to="/areas/kisumu" className="hover:text-white transition">Kisumu</Link></li>
            <li><Link to="/areas/karen" className="hover:text-white transition">Karen & Runda</Link></li>
            <li>
              <span className="text-botanique-green text-xs font-medium">
                + Kenya, Tanzania, Uganda, Rwanda, Somalia
              </span>
            </li>
          </ul>
        </div>

        {/* Contact + Social */}
        <div>
          <h4 className="font-semibold mb-4">Contact</h4>
          <ul className="space-y-2 text-sm text-gray-300 mb-6">
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Nairobi, Kenya
            </li>
            <li>
              <a href="mailto:botaniquedesigners@gmail.com" className="hover:text-white transition flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                botaniquedesigners@gmail.com
              </a>
            </li>
            <li>
              <a href="tel:+254720861592" className="hover:text-white transition flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                +254 720 861 592
              </a>
            </li>
          </ul>
          <div className="flex gap-4">
            <a href="https://www.instagram.com/botaniquedesigners/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/instagram.svg" alt="Instagram" className="h-6 w-6 invert hover:opacity-70 transition" />
            </a>
            <a href="https://www.facebook.com/botaniquedesigners" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/facebook.svg" alt="Facebook" className="h-6 w-6 invert hover:opacity-70 transition" />
            </a>
            <a href="https://www.youtube.com/@Botaniquedesigners" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
              <img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/youtube.svg" alt="YouTube" className="h-6 w-6 invert hover:opacity-70 transition" />
            </a>
            <a href="https://x.com/widson_ambaisi" target="_blank" rel="noopener noreferrer" aria-label="X">
              <img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/x.svg" alt="X" className="h-6 w-6 invert hover:opacity-70 transition" />
            </a>
          </div>
        </div>

      </div>

      <div className="mt-12 border-t border-gray-700 pt-6 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} Botanique Designers. All rights reserved.
      </div>
    </footer>
  );
}
