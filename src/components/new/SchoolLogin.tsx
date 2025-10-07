import { useState } from "react";
import { Button } from "../../components/ui/enhanced-button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { ArrowLeft, Search, MapPin, Building2, Users, Shield } from "lucide-react";
import diamondLogo from "@/assets/diamond-logo-new.jpg";
import schoolLogo from "@/assets/school-logo-example.jpg";

interface SchoolLoginProps {
  onBack: () => void;
  onSchoolSelect: (school: any, role: string) => void;
}

// Mock school data
const schools = [
  {
    id: "1",
    name: "Peculiar Nursery and Primary School",
    city: "Lagos",
    state: "Lagos State",
    logo: schoolLogo,
    customBranding: true,
    theme: {
      primary: "210 100% 50%",    // Blue
      secondary: "0 100% 50%",    // Red  
      accent: "0 0% 100%",        // White
      logo: schoolLogo,
    }
  },
  {
    id: "2",
    name: "Green Valley High School",
    city: "Abuja",
    state: "FCT",
    customBranding: false,
  },
  {
    id: "3", 
    name: "Royal Academy",
    city: "Port Harcourt",
    state: "Rivers State",
    customBranding: false,
  },
  {
    id: "4",
    name: "Sunrise International School",
    city: "Lagos",
    state: "Lagos State", 
    customBranding: false,
  },
  {
    id: "5",
    name: "Heritage College",
    city: "Kano",
    state: "Kano State",
    customBranding: false,
  }
];

export default function SchoolLogin({ onBack, onSchoolSelect }: SchoolLoginProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [showRoleSelection, setShowRoleSelection] = useState(false);

  const filteredSchools = schools.filter(school =>
    school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    school.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    school.state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSchoolClick = (school: any) => {
    setSelectedSchool(school);
    setShowRoleSelection(true);
  };

  const handleRoleSelect = (role: string) => {
    onSchoolSelect(selectedSchool, role);
  };

  const handleBackToSchools = () => {
    setSelectedSchool(null);
    setShowRoleSelection(false);
  };

  if (showRoleSelection && selectedSchool) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card backdrop-blur-sm border-border">
          <div className="p-8">
            <div className="flex items-center gap-4 mb-8">
              <Button variant="ghost" onClick={handleBackToSchools} className="text-foreground hover:bg-muted">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>

            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-4 mb-4">
                {selectedSchool.logo ? (
                  <img 
                    src={selectedSchool.logo} 
                    alt={selectedSchool.name}
                    className="w-16 h-16 object-contain rounded-lg border border-border"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gradient-hero rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xl">
                      {selectedSchool.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">{selectedSchool.name}</h1>
              <p className="text-muted-foreground">Select your role to continue</p>
            </div>

            <div className="space-y-4">
              <Card 
                className="p-4 border-border hover:bg-muted transition-all cursor-pointer group"
                onClick={() => handleRoleSelect('parent')}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      Parent Login
                    </h3>
                    <p className="text-sm text-muted-foreground">Access your child's attendance records</p>
                  </div>
                </div>
              </Card>

              <Card 
                className="p-4 border-border hover:bg-muted transition-all cursor-pointer group"
                onClick={() => handleRoleSelect('school-admin')}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground group-hover:text-secondary transition-colors">
                      School Administration
                    </h3>
                    <p className="text-sm text-muted-foreground">Manage school attendance system</p>
                  </div>
                </div>
              </Card>

              <Card 
                className="p-4 border-border hover:bg-muted transition-all cursor-pointer group"
                onClick={() => handleRoleSelect('company-admin')}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                    <Shield className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors">
                      Company Admin
                    </h3>
                    <p className="text-sm text-muted-foreground">Diamond Attendance system management</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl bg-card backdrop-blur-sm border-border">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" onClick={onBack} className="text-foreground hover:bg-muted">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-4">
              <img 
                src={diamondLogo} 
                alt="Diamond Attendance" 
                className="w-12 h-12 object-contain bg-white/10 rounded-lg p-1"
              />
              <div>
                <h1 className="text-3xl font-bold text-foreground">Select Your School</h1>
                <p className="text-muted-foreground">Choose your school to continue</p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by school name or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background border-border text-foreground"
            />
          </div>

          {/* Schools Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {filteredSchools.map((school) => (
              <Card 
                key={school.id}
                className="p-4 bg-card border-border hover:bg-muted transition-all cursor-pointer group"
                onClick={() => handleSchoolClick(school)}
              >
                <div className="flex items-start gap-3">
                  {school.logo ? (
                    <img 
                      src={school.logo} 
                      alt={school.name}
                      className="w-12 h-12 object-contain rounded-lg border border-border"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-hero rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {school.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                      {school.name}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{school.city}, {school.state}</span>
                    </div>
                    {school.customBranding && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/20 text-primary border border-primary/30">
                          Premium
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {filteredSchools.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No schools found matching your search.</p>
              <p className="text-sm mt-2">Try searching with different keywords or contact support.</p>
            </div>
          )}

          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>Don't see your school? <span className="text-primary cursor-pointer hover:underline">Contact support</span> to get it added.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}