import { useState } from "react";
import { Button } from "../../components/ui/enhanced-button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { useToast } from "../../hooks/use-toast";
import { ArrowLeft, Building2, Users, MapPin, Phone, Mail } from "lucide-react";

interface SchoolRegistrationProps {
  onBack: () => void;
}

export default function SchoolRegistration({ onBack }: SchoolRegistrationProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    schoolName: "",
    principalName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    studentCount: "",
    grades: "",
    requirements: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would normally send the data to your backend
    toast({
      title: "Registration Submitted!",
      description: "We'll contact you within 24 hours to discuss your requirements.",
    });
    
    // Reset form
    setFormData({
      schoolName: "",
      principalName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      studentCount: "",
      grades: "",
      requirements: "",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-card/90 backdrop-blur-sm border-white/10">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" onClick={onBack} className="text-white hover:bg-white/10">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">School Registration</h1>
              <p className="text-muted-foreground">Join the Diamond Attendance family</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* School Information */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                School Information
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="schoolName" className="text-white">School Name *</Label>
                  <Input
                    id="schoolName"
                    name="schoolName"
                    value={formData.schoolName}
                    onChange={handleInputChange}
                    required
                    className="bg-background/50 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="principalName" className="text-white">Principal/Head Name *</Label>
                  <Input
                    id="principalName"
                    name="principalName"
                    value={formData.principalName}
                    onChange={handleInputChange}
                    required
                    className="bg-background/50 border-white/20 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                Contact Information
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email" className="text-white">Email Address *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="bg-background/50 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-white">Phone Number *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="bg-background/50 border-white/20 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Location
              </h3>
              
              <div>
                <Label htmlFor="address" className="text-white">School Address *</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                  className="bg-background/50 border-white/20 text-white"
                />
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city" className="text-white">City *</Label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                    className="bg-background/50 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="state" className="text-white">State *</Label>
                  <Input
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    required
                    className="bg-background/50 border-white/20 text-white"
                  />
                </div>
              </div>
            </div>

            {/* School Details */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                School Details
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="studentCount" className="text-white">Number of Students</Label>
                  <Input
                    id="studentCount"
                    name="studentCount"
                    type="number"
                    value={formData.studentCount}
                    onChange={handleInputChange}
                    className="bg-background/50 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="grades" className="text-white">Grade Levels (e.g., K-12)</Label>
                  <Input
                    id="grades"
                    name="grades"
                    value={formData.grades}
                    onChange={handleInputChange}
                    className="bg-background/50 border-white/20 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Special Requirements */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="requirements" className="text-white">Special Requirements or Notes</Label>
                <Textarea
                  id="requirements"
                  name="requirements"
                  value={formData.requirements}
                  onChange={handleInputChange}
                  rows={4}
                  className="bg-background/50 border-white/20 text-white"
                  placeholder="Tell us about any specific needs, custom branding requirements, or other details..."
                />
              </div>
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full">
              Submit Registration
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>After submission, we'll send you an email with next steps and additional requirements.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}