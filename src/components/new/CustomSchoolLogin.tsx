import { useState } from "react";
import { Button } from "../../components/ui/enhanced-button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { ArrowLeft, LogIn } from "lucide-react";
import { useToast } from "../../hooks/use-toast";

interface CustomSchoolLoginProps {
  school: any;
  onBack: () => void;
}

export default function CustomSchoolLogin({ school, onBack }: CustomSchoolLoginProps) {
  const { toast } = useToast();
  const [childName, setChildName] = useState("");
  const [childClass, setChildClass] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would normally validate credentials
    toast({
      title: "Login Successful!",
      description: `Welcome to ${school.name} parent portal.`,
    });
  };

  // Apply custom theme if available
  const customStyle = school.theme ? {
    '--primary': school.theme.primary,
    '--secondary': school.theme.secondary,
    '--accent': school.theme.accent,
  } as React.CSSProperties : {};

  return (
    <div className="min-h-screen flex items-center justify-center p-4" 
         style={{ 
           background: school.theme ? 
             `linear-gradient(135deg, hsl(${school.theme.primary}), hsl(${school.theme.secondary}))` :
             'linear-gradient(135deg, hsl(220 50% 25%), hsl(210 100% 25%))'
         }}>
      <Card className="w-full max-w-md bg-white shadow-2xl" style={customStyle}>
        <div className="p-8">
          <div className="flex items-center gap-2 mb-6">
            <Button variant="ghost" onClick={onBack} className="text-gray-600 hover:bg-gray-100">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* School Branding */}
          <div className="text-center mb-8">
            {school.logo && (
              <img 
                src={school.logo} 
                alt={school.name}
                className="w-20 h-20 object-contain mx-auto mb-4"
              />
            )}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {school.name}
            </h1>
            <p className="text-gray-600">Parent Portal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <Label htmlFor="childName" className="text-gray-700">Child's Full Name</Label>
              <Input
                id="childName"
                type="text"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                required
                className="mt-1 border-gray-300 focus:border-blue-500"
                placeholder="Enter your child's full name"
              />
            </div>

            <div>
              <Label htmlFor="childClass" className="text-gray-700">Child's Class</Label>
              <Input
                id="childClass"
                type="text"
                value={childClass}
                onChange={(e) => setChildClass(e.target.value)}
                required
                className="mt-1 border-gray-300 focus:border-blue-500"
                placeholder="e.g., Primary 3A"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-gray-700">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 border-gray-300 focus:border-blue-500"
                placeholder="Enter your password"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full text-white font-semibold py-3"
              style={{
                background: school.theme ? 
                  `linear-gradient(135deg, hsl(${school.theme.primary}), hsl(${school.theme.secondary}))` :
                  'linear-gradient(135deg, hsl(210 100% 50%), hsl(0 100% 50%))'
              }}
            >
              <LogIn className="h-4 w-4 mr-2" />
              Login to Portal
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Having trouble logging in? Contact the school office.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}