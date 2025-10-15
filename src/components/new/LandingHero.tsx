import { Button } from "@/components/ui/enhanced-button";
import { MessageSquare, Mail, Fingerprint, Settings, Clock, Shield, Users } from "lucide-react";
import diamondLogo from "/school-logos/diamond-logo.jpg";

export default function LandingHero() {
  return (
    <section className="min-h-screen relative overflow-hidden bg-animated-gradient">
      {/* Background Pattern - Enhanced with cyan tint */}
      <div className="absolute inset-0 bg-grid-cyan" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background/90" />
      
      {/* Content */}
      <div className="container mx-auto px-6 py-20 relative z-10">
        
        {/* ========== HERO SECTION ========== */}
        <div className="text-center max-w-5xl mx-auto pb-20">
          {/* Logo with glow effect */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
              <img 
                src={diamondLogo} 
                alt="Diamond Attendance" 
                className="relative w-32 h-32 md:w-40 md:h-40 object-contain animate-fade-in animate-float"
              />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-gradient-hero animate-fade-in delay-200">
            Never miss a beat with biometric attendance that talks to you
          </h1>
          <p className="text-xl md:text-2xl text-primary mb-8 animate-fade-in delay-300 font-semibold glow-cyan">
            "Smart Alerts, Smarter Work"
          </p>
          <p className="text-lg text-muted-foreground mb-12 max-w-3xl mx-auto animate-fade-in delay-400">
            Get instant SMS and email alerts for every clock-in and clock-out. It's timekeeping that keeps you in the loop, no excuses.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in delay-500">
            <Button variant="hero" size="xl" className="group btn-glow">
              Get Started Today
              <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
            </Button>
            <Button variant="outline" size="xl" className="border-primary/30 text-white hover:bg-primary/10 hover:border-primary/50">
              Watch Demo
            </Button>
          </div>
        </div>

        {/* ========== GRADIENT DIVIDER ========== */}
        <div className="relative h-px w-full mb-20">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
          <div className="absolute inset-0 blur-sm bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
        </div>

        {/* ========== MAIN FEATURES SECTION ========== */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 animate-fade-in">Core Features</h2>
            <p className="text-muted-foreground text-lg animate-fade-in delay-100">Everything you need for modern attendance tracking</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <div className="card-glow rounded-xl p-6 text-center hover:scale-105 transition-all duration-300 animate-fade-in delay-200">
              <MessageSquare className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-white">Instant Alerts</h3>
              <p className="text-muted-foreground">Get notified via SMS or email the second someone punches in or out. No more guessing games.</p>
            </div>
            <div className="card-glow rounded-xl p-6 text-center hover:scale-105 transition-all duration-300 animate-fade-in delay-300">
              <Fingerprint className="h-12 w-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-white">Biometric Magic</h3>
              <p className="text-muted-foreground">Fingerprints and faces are your new time cards. Accurate and secure, every time.</p>
            </div>
            <div className="card-glow rounded-xl p-6 text-center hover:scale-105 transition-all duration-300 animate-fade-in delay-400">
              <Settings className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-white">Easy Setup</h3>
              <p className="text-muted-foreground">Plug it in, set it up, and let the notifications flow. Simplicity is key.</p>
            </div>
            <div className="card-glow rounded-xl p-6 text-center hover:scale-105 transition-all duration-300 animate-fade-in delay-500">
              <Users className="h-12 w-12 text-orange-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-white">Customizable</h3>
              <p className="text-muted-foreground">Tailor alert settings to fit your company's unique rhythm and needs.</p>
            </div>
          </div>
        </div>

        {/* ========== DECORATIVE DIVIDER ========== */}
        <div className="relative h-20 mb-20">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
            <div className="mx-4 w-3 h-3 rounded-full bg-primary animate-pulse glow-cyan"></div>
            <div className="h-px w-32 bg-gradient-to-r from-primary via-transparent to-transparent"></div>
          </div>
        </div>

        {/* ========== BEYOND BASIC TRACKING SECTION ========== */}
        <div className="mb-20 card-dark-solid rounded-3xl p-12 border border-primary/20 animate-fade-in delay-600">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Beyond Basic Tracking</h2>
            <p className="text-muted-foreground text-lg">Advanced features that set us apart</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="card-glow rounded-2xl p-8 text-center hover:scale-105 transition-all duration-300 transform">
              <div className="bg-gradient-to-br from-cyan-500 to-blue-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-cyan-500/50">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">Real-time Updates</h3>
              <p className="text-muted-foreground">See who's in and who's out, right as it happens. No more waiting for reports.</p>
            </div>
            <div className="card-glow rounded-2xl p-8 text-center hover:scale-105 transition-all duration-300 transform">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/50">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">Reduced Errors</h3>
              <p className="text-muted-foreground">Say goodbye to manual entry mistakes. Biometrics are your friend.</p>
            </div>
            <div className="card-glow rounded-2xl p-8 text-center hover:scale-105 transition-all duration-300 transform">
              <div className="bg-gradient-to-br from-violet-500 to-purple-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-violet-500/50">
                <Mail className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">Peace of Mind</h3>
              <p className="text-muted-foreground">Know your team's presence without constant checking. Relax, we've got this.</p>
            </div>
          </div>
        </div>

        {/* ========== GRADIENT DIVIDER ========== */}
        <div className="relative h-px w-full mb-20">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
          <div className="absolute inset-0 blur-sm bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
        </div>

        {/* ========== EFFORTLESS ATTENDANCE SECTION ========== */}
        <div className="card-dark-solid rounded-3xl p-12 border border-primary/20 mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Effortless Attendance</h2>
            <p className="text-muted-foreground text-lg">Choose your preferred notification method</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl opacity-20 group-hover:opacity-30 transition-opacity blur-xl"></div>
              <div className="relative card-glow rounded-2xl p-10 text-center hover:border-blue-400/50 transition-all duration-300">
                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/50">
                  <MessageSquare className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-white">SMS Power</h3>
                <h4 className="text-lg font-medium mb-4 text-blue-400">Instant Text</h4>
                <p className="text-muted-foreground leading-relaxed">Get immediate text messages for every attendance event. Quick and direct communication.</p>
              </div>
            </div>
            
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl opacity-20 group-hover:opacity-30 transition-opacity blur-xl"></div>
              <div className="relative card-glow rounded-2xl p-10 text-center hover:border-purple-400/50 transition-all duration-300">
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-purple-500/50">
                  <Mail className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-white">Email Updates</h3>
                <h4 className="text-lg font-medium mb-4 text-purple-400">Digital Digest</h4>
                <p className="text-muted-foreground leading-relaxed">Receive comprehensive email notifications for a detailed overview. Stay organized digitally.</p>
              </div>
            </div>
          </div>
        </div>
        {/* ========== BOTTOM SPACING ========== */}
        <div className="h-20"></div>
      </div>
    </section>
  );
}