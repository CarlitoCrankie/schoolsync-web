import { Mail, Phone} from "lucide-react";
import diamondLogo from "/school-logos/diamond-logo.jpg";

export default function LandingFooter() {
  return (
        <footer className="mt-32 pt-16 border-t border-white/10">
          <div className="grid md:grid-cols-4 gap-12 max-w-6xl mx-auto">
            {/* Brand */}
            <div className="animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src={diamondLogo} 
                  alt="Diamond Attendance" 
                  className="w-10 h-10 object-contain"
                />
                <h3 className="text-xl font-bold text-white">Diamond Attendance</h3>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Revolutionizing attendance management for educational institutions worldwide.
              </p>
            </div>

            {/* Product */}
            <div className="animate-fade-in delay-100">
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#features" className="text-muted-foreground hover:text-primary transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-muted-foreground hover:text-primary transition-colors">Pricing</a></li>
                <li><a href="#demo" className="text-muted-foreground hover:text-primary transition-colors">Demo</a></li>
                <li><a href="#support" className="text-muted-foreground hover:text-primary transition-colors">Support</a></li>
              </ul>
            </div>

            {/* Company */}
            <div className="animate-fade-in delay-200">
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#about" className="text-muted-foreground hover:text-primary transition-colors">About</a></li>
                <li><a href="#blog" className="text-muted-foreground hover:text-primary transition-colors">Blog</a></li>
                <li><a href="#careers" className="text-muted-foreground hover:text-primary transition-colors">Careers</a></li>
                <li><a href="#contact" className="text-muted-foreground hover:text-primary transition-colors">Contact</a></li>
              </ul>
            </div>

            {/* Contact Info - HIGHLIGHTED */}
            <div className="card-glow rounded-2xl p-6 animate-fade-in delay-300">
              <h4 className="text-white font-semibold mb-4 text-lg flex items-center gap-2">
                <Phone className="w-5 h-5 text-primary" />
                Get in Touch
              </h4>
              <div className="space-y-4">
                {/* Phone & WhatsApp */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Call or WhatsApp</p>
                  <div className="flex flex-col gap-2">
                    <a 
                      href="tel:0241863946"
                      className="flex items-center gap-2 px-4 py-2.5 bg-green-500/10 border border-green-500/30 rounded-lg hover:bg-green-500/20 hover:border-green-500/50 transition-all group"
                    >
                      <svg className="w-5 h-5 text-green-400 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                      </svg>
                      <span className="text-green-400 font-semibold text-sm">📞 Call Now</span>
                    </a>
                    <a 
                      href="https://wa.me/233241863946"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 bg-green-500/10 border border-green-500/30 rounded-lg hover:bg-green-500/20 hover:border-green-500/50 transition-all group"
                    >
                      <svg className="w-5 h-5 text-green-400 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                      <span className="text-green-400 font-semibold text-sm">💬 WhatsApp</span>
                    </a>
                  </div>
                  <p className="text-white text-sm mt-2 font-mono font-semibold">024 186 3946</p>
                </div>

                {/* Email */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Email Us</p>
                  <a 
                    href="mailto:kabila32000@gmail.com"
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 border border-primary/30 rounded-lg hover:bg-primary/20 hover:border-primary/50 transition-all group"
                  >
                    <Mail className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                    <span className="text-primary text-sm font-semibold">✉️ Send Email</span>
                  </a>
                  <p className="text-white text-xs mt-2 break-all font-mono">kabila32000@gmail.com</p>
                </div>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-12 pt-8 border-t border-white/10 text-center">
            <p className="text-muted-foreground text-sm">
              © 2024 Diamond Attendance. All rights reserved.
            </p>
          </div>
        </footer>

  );
}