import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Palette, Save, Eye, Upload, X, Check } from 'lucide-react';
import { apiGet, apiPost, apiDelete } from '@/lib/api';  // ✅ ADD apiGet and apiDelete

export default function ThemeManagementTab({ companyId }) {
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [themeForm, setThemeForm] = useState({
    primaryColor: '#1e40af',
    secondaryColor: '#dc2626',
    accentColor: '#eff6ff',
    logoUrl: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    loadSchools();
  }, []);

  // ✅ FIXED - Use apiGet instead of fetch
  const loadSchools = async () => {
    setLoading(true);
    try {
      const data = await apiGet(`/api/schools?company_id=${companyId}`);
      
      if (data.success) {
        setSchools(data.data || []);  // ✅ Changed from data.schools to data.data
      }
    } catch (error) {
      console.error('Error loading schools:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ CORRECT - Already uses apiGet
  const loadSchoolTheme = async (schoolId) => {
    try {
      const data = await apiGet(`/api/schools/${schoolId}/theme`);
      
      if (data.success && data.theme) {
        setThemeForm({
          primaryColor: data.theme.primary_color || '#1e40af',
          secondaryColor: data.theme.secondary_color || '#dc2626',
          accentColor: data.theme.accent_color || '#eff6ff',
          logoUrl: data.theme.logo_url || ''
        });
      } else {
        // Reset to defaults if no theme exists
        setThemeForm({
          primaryColor: '#1e40af',
          secondaryColor: '#dc2626',
          accentColor: '#eff6ff',
          logoUrl: ''
        });
      }
    } catch (error) {
      console.error('Error loading school theme:', error);
    }
  };

  const handleSchoolSelect = (school) => {
    setSelectedSchool(school);
    loadSchoolTheme(school.school_id);  // ✅ Changed from school.id to school.school_id
    setPreviewMode(false);
  };

  // ✅ CORRECT - Already uses apiPost
  const handleSaveTheme = async () => {
    if (!selectedSchool) return;
    
    setSaving(true);
    try {
      const data = await apiPost(`/api/schools/${selectedSchool.school_id}/theme`, {  // ✅ Changed to school_id
        primary_color: themeForm.primaryColor,
        secondary_color: themeForm.secondaryColor,
        accent_color: themeForm.accentColor,
        logo_url: themeForm.logoUrl
      });
      
      if (data.success) {
        alert('Theme saved successfully!');
        loadSchools();
      } else {
        alert('Failed to save theme: ' + data.message);
      }
    } catch (error) {
      console.error('Error saving theme:', error);
      alert('Error saving theme');
    } finally {
      setSaving(false);
    }
  };

  // ✅ FIXED - Use apiDelete instead of fetch
  const handleDeleteTheme = async () => {
    if (!selectedSchool || !confirm('Remove custom theme for this school?')) return;
    
    try {
      const data = await apiDelete(`/api/schools/${selectedSchool.school_id}/theme`);  // ✅ Use apiDelete and school_id
      
      if (data.success) {
        alert('Theme removed successfully!');
        setThemeForm({
          primaryColor: '#1e40af',
          secondaryColor: '#dc2626',
          accentColor: '#eff6ff',
          logoUrl: ''
        });
        loadSchools();
      }
    } catch (error) {
      console.error('Error deleting theme:', error);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading schools...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">School Theme Management</h2>
          <p className="text-gray-600 mt-1">Customize dashboard appearance for individual schools</p>
        </div>
        <Palette className="h-8 w-8 text-indigo-600" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* School List */}
        <Card className="lg:col-span-1 p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            Schools
            <Badge variant="outline">{schools.length}</Badge>
          </h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {schools.map(school => (
              <button
                key={school.school_id}  
                onClick={() => handleSchoolSelect(school)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  selectedSchool?.school_id === school.school_id  // ✅ Changed comparisons
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{school.name}</p>
                    <p className="text-xs text-gray-500">{school.location}</p>
                  </div>
                  {school.has_theme && (
                    <Badge className="bg-green-100 text-green-800">
                      <Check className="h-3 w-3 mr-1" />
                      Custom
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Theme Editor */}
        <Card className="lg:col-span-2 p-6">
          {selectedSchool ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{selectedSchool.name}</h3>
                  <p className="text-sm text-gray-600">Configure custom theme</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewMode(!previewMode)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {previewMode ? 'Edit' : 'Preview'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteTheme}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
              </div>

              {!previewMode ? (
                <>
                  {/* Color Inputs */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Primary Color
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={themeForm.primaryColor}
                          onChange={(e) => setThemeForm({...themeForm, primaryColor: e.target.value})}
                          className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={themeForm.primaryColor}
                          onChange={(e) => setThemeForm({...themeForm, primaryColor: e.target.value})}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="#1e40af"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Secondary Color
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={themeForm.secondaryColor}
                          onChange={(e) => setThemeForm({...themeForm, secondaryColor: e.target.value})}
                          className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={themeForm.secondaryColor}
                          onChange={(e) => setThemeForm({...themeForm, secondaryColor: e.target.value})}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="#dc2626"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Accent Color
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={themeForm.accentColor}
                          onChange={(e) => setThemeForm({...themeForm, accentColor: e.target.value})}
                          className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={themeForm.accentColor}
                          onChange={(e) => setThemeForm({...themeForm, accentColor: e.target.value})}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="#eff6ff"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Logo URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Logo Path (from assets folder)
                    </label>
                    <input
                      type="text"
                      value={themeForm.logoUrl}
                      onChange={(e) => setThemeForm({...themeForm, logoUrl: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="@/assets/school-logo-example.jpg"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Example: @/assets/school-logo-example.jpg
                    </p>
                  </div>

                  {/* Quick Presets */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quick Presets
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => setThemeForm({
                          primaryColor: '#1e40af',
                          secondaryColor: '#dc2626',
                          accentColor: '#eff6ff',
                          logoUrl: themeForm.logoUrl
                        })}
                        className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50 text-sm"
                      >
                        Red/Blue/White
                      </button>
                      <button
                        onClick={() => setThemeForm({
                          primaryColor: '#059669',
                          secondaryColor: '#0891b2',
                          accentColor: '#f0fdf4',
                          logoUrl: themeForm.logoUrl
                        })}
                        className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50 text-sm"
                      >
                        Green/Cyan
                      </button>
                      <button
                        onClick={() => setThemeForm({
                          primaryColor: '#7c3aed',
                          secondaryColor: '#ea580c',
                          accentColor: '#faf5ff',
                          logoUrl: themeForm.logoUrl
                        })}
                        className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50 text-sm"
                      >
                        Purple/Orange
                      </button>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end gap-2">
                    <Button onClick={handleSaveTheme} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Theme'}
                    </Button>
                  </div>
                </>
              ) : (
                /* Preview Mode */
                <div className="space-y-4">
                  <div 
                    className="p-6 rounded-lg border-2"
                    style={{
                      backgroundColor: `${themeForm.accentColor}`,
                      borderColor: `${themeForm.primaryColor}50`
                    }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: themeForm.primaryColor }}
                      >
                        <span className="text-white text-xl">🏫</span>
                      </div>
                      <div>
                        <h3 className="font-bold" style={{ color: themeForm.primaryColor }}>
                          {selectedSchool.name}
                        </h3>
                        <p className="text-sm text-gray-600">Preview Dashboard</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div 
                        className="p-4 rounded-lg"
                        style={{ backgroundColor: `${themeForm.primaryColor}20` }}
                      >
                        <p className="text-sm font-medium" style={{ color: themeForm.primaryColor }}>
                          Students
                        </p>
                        <p className="text-2xl font-bold mt-1" style={{ color: themeForm.primaryColor }}>
                          450
                        </p>
                      </div>
                      <div 
                        className="p-4 rounded-lg"
                        style={{ backgroundColor: `${themeForm.secondaryColor}20` }}
                      >
                        <p className="text-sm font-medium" style={{ color: themeForm.secondaryColor }}>
                          Present
                        </p>
                        <p className="text-2xl font-bold mt-1" style={{ color: themeForm.secondaryColor }}>
                          425
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm font-medium text-green-600">Rate</p>
                        <p className="text-2xl font-bold text-green-600 mt-1">94%</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div 
                      className="h-20 rounded-lg"
                      style={{ backgroundColor: themeForm.primaryColor }}
                    >
                      <p className="text-white text-center py-6 text-sm">Primary</p>
                    </div>
                    <div 
                      className="h-20 rounded-lg"
                      style={{ backgroundColor: themeForm.secondaryColor }}
                    >
                      <p className="text-white text-center py-6 text-sm">Secondary</p>
                    </div>
                    <div 
                      className="h-20 rounded-lg border-2"
                      style={{ backgroundColor: themeForm.accentColor, borderColor: '#e5e7eb' }}
                    >
                      <p className="text-gray-700 text-center py-6 text-sm">Accent</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Palette className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p>Select a school to configure its theme</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}