import { useState } from "react";
import { Button } from "../../components/ui/enhanced-button";
import { Card } from "../../components/ui/card";
import { ArrowLeft, Building2 } from "lucide-react";
import SchoolRegistration from "./SchoolRegistration";
import diamondLogo from "/school-logos/diamond-logo.jpg";

export default function RegistrationFlow() {
  const [step, setStep] = useState<"select" | "school-registration">("select");

  if (step === "school-registration") {
    return <SchoolRegistration onBack={() => setStep("select")} />;
  }

  return (
    <div className="min-h-screen bg-gradient-dark">
      {step === "select" && (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="flex justify-center mb-6">
                <img 
                  src={diamondLogo} 
                  alt="Diamond Attendance" 
                  className="w-24 h-24 object-contain bg-white/10 rounded-lg p-2"
                />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
                Register Your School
              </h1>
              <p className="text-xl text-foreground">
                Join our attendance management platform
              </p>
            </div>

            <div className="flex justify-center">
              <Card className="p-8 bg-card backdrop-blur-sm border-border hover:bg-muted transition-all cursor-pointer group max-w-md" onClick={() => setStep("school-registration")}>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <Building2 className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-4">School Registration</h3>
                  <p className="text-muted-foreground mb-6">
                    Educational institutions interested in our attendance management system
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-2 text-left">
                    <li>• Complete school information</li>
                    <li>• Contact details for follow-up</li>
                    <li>• Custom branding options</li>
                    <li>• Requirements assessment</li>
                  </ul>
                </div>
              </Card>
            </div>

            <div className="text-center mt-12">
              <Button variant="ghost" onClick={() => window.history.back()} className="text-foreground hover:bg-muted">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}