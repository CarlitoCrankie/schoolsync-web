import { useState } from "react";
import { Button } from "../../components/ui/enhanced-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { ArrowLeft } from "lucide-react";
import type { School, SchoolSettings } from "../../types/school";
import { useToast } from "../../hooks/use-toast";

interface SchoolThemedRegistrationProps {
  school: School;
  onBack: () => void;
}

export default function SchoolThemedRegistration({ school, onBack }: SchoolThemedRegistrationProps) {
  const [formData, setFormData] = useState({
    parentName: "",
    email: "",
    phone: "",
    childName: "",
    childClass: "",
    password: ""
  });
  const { toast } = useToast();

  const handleRegister = () => {
    toast({
      title: "Registration Successful!",
      description: `Welcome to ${school.name}. Please check your email for verification.`,
    });
  };

  const isCustomSchool = school.settings.customBranding;
  const showPasswordField = school.settings.allowParentPasswordEdit;
  const loginMethod = school.settings.parentLoginMethod;

  return (
    <section className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full">
        <div className="flex items-center mb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            {isCustomSchool && school.logo && (
              <div className="flex items-center mb-4">
                <img 
                  src={school.logo} 
                  alt={`${school.name} logo`} 
                  className="h-12 w-12 rounded-lg mr-3"
                />
                <h2 className="text-xl sm:text-2xl font-bold">{school.name}</h2>
              </div>
            )}
            {!isCustomSchool && (
              <h2 className="text-xl sm:text-2xl font-bold">Join {school.name}</h2>
            )}
            <p className="text-muted-foreground text-sm">
              {loginMethod === "child-details" 
                ? "Register using your child's details" 
                : "Create your parent account"
              }
            </p>
          </div>
        </div>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Parent Registration</CardTitle>
            <CardDescription>
              {loginMethod === "child-details" 
                ? "Use your child's information to create your account"
                : "Fill in your details to create an account"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="parentName">Parent/Guardian Name</Label>
              <Input 
                id="parentName" 
                placeholder="Enter your full name"
                value={formData.parentName}
                onChange={(e) => setFormData({...formData, parentName: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="Enter email address"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input 
                id="phone" 
                type="tel" 
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="childName">Child's Full Name</Label>
              <Input 
                id="childName" 
                placeholder="Enter your child's full name"
                value={formData.childName}
                onChange={(e) => setFormData({...formData, childName: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="childClass">Child's Class/Grade</Label>
              <Input 
                id="childClass" 
                placeholder="e.g., Grade 5A, Class 3B"
                value={formData.childClass}
                onChange={(e) => setFormData({...formData, childClass: e.target.value})}
              />
            </div>

            {showPasswordField && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
            )}

            {!showPasswordField && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> Your login credentials will be provided by {school.name}. 
                  You'll receive them via email after registration approval.
                </p>
              </div>
            )}

            <Button 
              variant="hero" 
              className="w-full" 
              onClick={handleRegister}
            >
              Register with {school.name}
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}