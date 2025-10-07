import { Button } from "../../components/ui/enhanced-button.tsx";
import { MessageSquare, Mail, Fingerprint, Settings, Clock, Shield, Users } from "lucide-react";
import diamondLogo from "/school-logos/diamond-logo.jpg";

export default function LandingHero() {
  return (
    <section className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-dark">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
      
      {/* Content */}
      <div className="container mx-auto px-6 py-20 relative z-10">
        <div className="text-center max-w-5xl mx-auto">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img 
              src={diamondLogo} 
              alt="Diamond Attendance" 
              className="w-32 h-32 md:w-40 md:h-40 object-contain animate-fade-in"
            />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-accent animate-fade-in delay-200">
            Never miss a beat with biometric attendance that talks to you
          </h1>
          <p className="text-xl md:text-2xl text-primary mb-8 animate-fade-in delay-300 font-semibold">
            "Smart Alerts, Smarter Work"
          </p>
          <p className="text-lg text-muted-foreground mb-12 max-w-3xl mx-auto animate-fade-in delay-400">
            Get instant SMS and email alerts for every clock-in and clock-out. It's timekeeping that keeps you in the loop, no excuses.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in delay-500">
            <Button variant="hero" size="xl" className="group">
              Get Started Today
              <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
            </Button>
            <Button variant="outline" size="xl" className="border-white/20 text-white hover:bg-white/10">
              Watch Demo
            </Button>
          </div>
        </div>

        {/* Main Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-16 animate-fade-in delay-700">
          <div className="bg-card/10 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center hover:bg-card/20 transition-all duration-300">
            <MessageSquare className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-white">Instant Alerts</h3>
            <p className="text-muted-foreground">Get notified via SMS or email the second someone punches in or out. No more guessing games.</p>
          </div>
          <div className="bg-card/10 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center hover:bg-card/20 transition-all duration-300">
            <Fingerprint className="h-12 w-12 text-secondary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-white">Biometric Magic</h3>
            <p className="text-muted-foreground">Fingerprints and faces are your new time cards. Accurate and secure, every time.</p>
          </div>
          <div className="bg-card/10 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center hover:bg-card/20 transition-all duration-300">
            <Settings className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-white">Easy Setup</h3>
            <p className="text-muted-foreground">Plug it in, set it up, and let the notifications flow. Simplicity is key.</p>
          </div>
          <div className="bg-card/10 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center hover:bg-card/20 transition-all duration-300">
            <Users className="h-12 w-12 text-secondary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-white">Customizable</h3>
            <p className="text-muted-foreground">Tailor alert settings to fit your company's unique rhythm and needs.</p>
          </div>
        </div>

        {/* Beyond Basic Tracking Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-12">Beyond Basic Tracking</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-card/10 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center hover:bg-card/20 transition-all duration-300">
              <Clock className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-white">Real-time Updates</h3>
              <p className="text-muted-foreground">See who's in and who's out, right as it happens. No more waiting for reports.</p>
            </div>
            <div className="bg-card/10 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center hover:bg-card/20 transition-all duration-300">
              <Shield className="h-12 w-12 text-secondary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-white">Reduced Errors</h3>
              <p className="text-muted-foreground">Say goodbye to manual entry mistakes. Biometrics are your friend.</p>
            </div>
            <div className="bg-card/10 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center hover:bg-card/20 transition-all duration-300">
              <Mail className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-white">Peace of Mind</h3>
              <p className="text-muted-foreground">Know your team's presence without constant checking. Relax, we've got this.</p>
            </div>
          </div>
        </div>

        {/* Effortless Attendance Section */}
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-12">Effortless Attendance</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-card/10 backdrop-blur-sm border border-white/10 rounded-xl p-8 text-center hover:bg-card/20 transition-all duration-300">
              <MessageSquare className="h-16 w-16 text-primary mx-auto mb-6" />
              <h3 className="text-2xl font-semibold mb-4 text-white">SMS Power</h3>
              <h4 className="text-lg font-medium mb-2 text-secondary">Instant Text</h4>
              <p className="text-muted-foreground">Get immediate text messages for every attendance event. Quick and direct communication.</p>
            </div>
            <div className="bg-card/10 backdrop-blur-sm border border-white/10 rounded-xl p-8 text-center hover:bg-card/20 transition-all duration-300">
              <Mail className="h-16 w-16 text-primary mx-auto mb-6" />
              <h3 className="text-2xl font-semibold mb-4 text-white">Email Updates</h3>
              <h4 className="text-lg font-medium mb-2 text-secondary">Digital Digest</h4>
              <p className="text-muted-foreground">Receive comprehensive email notifications for a detailed overview. Stay organized digitally.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}