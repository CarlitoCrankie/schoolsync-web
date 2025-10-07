import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/enhanced-button";
import { Building, Users, TrendingUp, Star } from "lucide-react";

export default function SchoolShowcase() {
  const testimonials = [
    {
      school: "Peculiar International School",
      logo: "/api/placeholder/60/60",
      quote: "Diamond Attendance transformed how we manage student tracking. The real-time updates keep parents informed and our administration organized.",
      admin: "Mrs. Sarah Johnson",
      position: "Head Administrator",
      students: "450+ Students",
      rating: 5
    },
    {
      school: "Excellence Academy",
      logo: "/api/placeholder/60/60",
      quote: "The custom branding feature makes our school feel unique while maintaining professional attendance management.",
      admin: "Dr. Michael Chen",
      position: "Principal",
      students: "320+ Students",
      rating: 5
    },
    {
      school: "Future Leaders Institute",
      logo: "/api/placeholder/60/60",
      quote: "Parents love receiving instant notifications. It's improved our communication dramatically.",
      admin: "Ms. Rachel Adams",
      position: "Operations Manager",
      students: "280+ Students",
      rating: 5
    }
  ];

  const stats = [
    { icon: Building, label: "Schools Registered", value: "150+", color: "text-primary" },
    { icon: Users, label: "Students Tracked", value: "45,000+", color: "text-accent" },
    { icon: TrendingUp, label: "Attendance Rate Improved", value: "25%", color: "text-success" },
    { icon: Star, label: "Customer Satisfaction", value: "98%", color: "text-warning" }
  ];

  return (
    <section className="py-20 bg-gradient-subtle">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6">Trusted by Leading Schools</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Join hundreds of educational institutions that have revolutionized their attendance management
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-8 mb-20">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="bg-card border border-border rounded-2xl p-8 shadow-card hover:shadow-elegant transition-all duration-300 hover:-translate-y-2">
                <div className={`w-16 h-16 rounded-xl bg-muted/20 flex items-center justify-center mx-auto mb-4`}>
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
                <div className="text-3xl font-bold mb-2">{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="shadow-card hover:shadow-elegant transition-all duration-300 hover:-translate-y-2">
              <CardContent className="p-8">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mr-4">
                    <Building className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{testimonial.school}</h4>
                    <div className="flex items-center mt-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                      ))}
                    </div>
                  </div>
                </div>
                
                <blockquote className="text-muted-foreground mb-6 italic">
                  "{testimonial.quote}"
                </blockquote>
                
                <div className="border-t border-border pt-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{testimonial.admin}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.position}</div>
                    </div>
                    <Badge variant="secondary">{testimonial.students}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <div className="bg-card border border-border rounded-3xl p-12 shadow-elegant max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold mb-4">Ready to Transform Your School?</h3>
            <p className="text-xl text-muted-foreground mb-8">
              Join the growing community of schools using Diamond Attendance
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="xl">
                Start Free Trial
              </Button>
              <Button variant="outline" size="xl">
                Schedule Demo
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}