export interface School {
  id: string;
  name: string;
  logo?: string;
  theme: SchoolTheme;
  settings: SchoolSettings;
}

export interface SchoolTheme {
  type: "default" | "custom";
  colors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
  logo?: string;
}

export interface SchoolSettings {
  allowParentPasswordEdit: boolean;
  parentLoginMethod: "credentials" | "child-details";
  customBranding: boolean;
  hideCompanyBranding: boolean;
}

export interface SchoolCustomization {
  schoolId: string;
  theme: SchoolTheme;
  settings: SchoolSettings;
}