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
            Transforming outdoor spaces through landscape architecture,
            horticulture, and environmental stewardship — anywhere in Kenya and East Africa.
          </p>
        </div>

        {/* Services */}
        <div>
          <h4 className="font-semibold mb-4">Services</h4>
          <ul className="space-y-2 text-sm text-gray-300">
            <li><Link to="/services/landscape-architecture" className="hover:text-white transition">Landscape Architecture</Link></li>
            <li><Link to="/services/eia-studies" className="hover:text-white transition">EIA Studies</Link></li>
            <li><Link to="/services/implementation" className="hover:text-white transition">Project Implementation</Link></li>
            <li><Link to="/services/maintenance" className="hover:text-white transition">Garden Maintenance</Link></li>
          </ul>
        </div>

        {/* Areas */}
        <div>
          <h4 className="font-semibold mb-4">Areas We Serve</h4>
          <ul className="space-y-2 text-sm text-gray-300">
            <li><Link to="/areas/nairobi" className="hover:text-white transition">Nairobi</Link></li>
            <li><Link to="/areas/mombasa" className="hover:text-white transition">Mombasa & Coast</Link></li>
            <li><Link to="/areas/kisumu" className="hover:text-white transition">Kisumu & Nyanza</Link></li>
            <li><Link to="/areas/nakuru" className="hover:text-white transition">Nakuru & Rift Valley</Link></li>
            <li><Link to="/areas/eldoret" className="hover:text-white transition">Eldoret & North Rift</Link></li>
            <li><Link to="/areas/karen" className="hover:text-white transition">Karen, Runda & Westlands</Link></li>
            <li>
              <span className="text-botanique-green text-xs font-medium">
                + Nyeri, Thika, Machakos, Lamu, Nanyuki & all of Kenya
              </span>
            </li>
          </ul>
        </div>

        {/* Contact + Social */}
        <div>
          <h4 className="font-semibold mb-4">Contact</h4>
          <ul className="space-y-2 text-sm text-gray-300 mb-6">
            <li>📍 Nairobi, Kenya</li>
            <li>
              <a href="mailto:botaniquedesigners@gmail.com" className="hover:text-white transition">
                📧 botaniquedesigners@gmail.com
              </a>
            </li>
            <li>
              <a href="tel:+254720861592" className="hover:text-white transition">
                📞 +254 720 861 592
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
