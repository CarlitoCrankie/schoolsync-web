import { useState } from "react";
import CustomSchoolDashboard from "@/components/new/CustomSchoolDashboard";
import schoolLogo from "@/assets/school-logo-example.jpg";

export default function PeculiarDashboard() {
  const [showDashboard, setShowDashboard] = useState(true);

  const peculiarSchool = {
    id: "peculiar",
    name: "Peculiar Nursery and Primary School",
    logo: schoolLogo,
    theme: {
      primary: "210 100% 50%",    // Blue
      secondary: "0 100% 50%",    // Red  
      accent: "0 0% 100%",        // White
    },
    settings: {
      allowParentPasswordEdit: false,
      parentLoginMethod: "child-details",
      customBranding: true,
      hideCompanyBranding: true
    }
  };

  const handleLogout = () => {
    setShowDashboard(false);
    // Redirect to login or home page
    window.location.href = "/";
  };

  if (!showDashboard) {
    return <div>Redirecting...</div>;
  }

  return (
    <CustomSchoolDashboard 
      school={peculiarSchool} 
      onLogout={handleLogout}
    />
  );
}