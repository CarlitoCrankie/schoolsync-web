import LandingHero from "../components/new/LandingHero";
import LandingFooter from "@/components/new/LandingFooter";
import SchoolShowcase from "../components/new/SchoolShowcase";
import RegistrationFlow from "../components/new/RegistrationFlow";
import { useState } from "react";
import { useNavigate } from "react-router-dom";  // ADD THIS
import { Button } from "../components/ui/enhanced-button";
import { LogIn } from "lucide-react";
import diamondLogo from "/school-logos/diamond-logo.jpg";

export default function Landing() {
  const navigate = useNavigate();  // ADD THIS
  const [showRegistration, setShowRegistration] = useState(false);

  if (showRegistration) {
    return <RegistrationFlow />;
  }

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-md border-b border-border z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img 
                src={diamondLogo} 
                alt="Diamond Attendance" 
                className="w-8 h-8 object-contain"
              />
              <span className="text-xl font-bold">Diamond Attendance</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => setShowRegistration(true)}>
                Register
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/login')}  // CHANGED THIS
              >
                <LogIn className="h-4 w-4 mr-2" />
                Login
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <LandingHero />

      {/* School Showcase */}
      <SchoolShowcase />

      {/* Footer Section */}
      <LandingFooter/>

    </div>
  );
}