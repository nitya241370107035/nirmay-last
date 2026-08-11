import React, { useState } from 'react';
import {
  Hospital,
  Building2,
  MapPin,
  UserCheck,
  Phone,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Lock,
  Stethoscope,
  FileCheck,
  Layers
} from 'lucide-react';

export interface ClinicProfile {
  clinicName: string;
  facilityCode: string;
  address: string;
  cityDistrict: string;
  state: string;
  pincode: string;
  phone: string;
  email?: string;
  doctorInCharge: string;
  doctorDegree: string;
  department: string;
  isLoggedIn: boolean;
}

interface ClinicLoginProps {
  onLoginSuccess: (profile: ClinicProfile) => void;
  onBackToPortalSelector?: () => void;
}

export function ClinicLogin({ onLoginSuccess, onBackToPortalSelector }: ClinicLoginProps) {
  const [formData, setFormData] = useState<ClinicProfile>({
    clinicName: '',
    facilityCode: `PHC-${Math.floor(1000 + Math.random() * 9000)}`,
    address: '',
    cityDistrict: '',
    state: 'Gujarat',
    pincode: '',
    phone: '',
    email: '',
    doctorInCharge: '',
    doctorDegree: 'MBBS',
    department: 'General OPD & Triage',
    isLoggedIn: true
  });

  const [rememberStation, setRememberStation] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Quick Preset Facilities for instant 1-click login
  const handleLoadPreset = (type: 'anand_phc' | 'civil_emergency' | 'urban_clinic') => {
    setErrorMsg('');
    if (type === 'anand_phc') {
      setFormData({
        clinicName: 'Aarogyam Primary Health Center (PHC)',
        facilityCode: 'GJ-PHC-388001',
        address: 'Opposite Gram Panchayat, Station Road',
        cityDistrict: 'Anand',
        state: 'Gujarat',
        pincode: '388001',
        phone: '+91 2692 245100',
        email: 'phc.anand@gujarathealth.gov.in',
        doctorInCharge: 'Dr. Ramesh K. Patel',
        doctorDegree: 'MBBS, DNB (Family Medicine)',
        department: 'General OPD & Triage',
        isLoggedIn: true
      });
    } else if (type === 'civil_emergency') {
      setFormData({
        clinicName: 'Civil Hospital Emergency & Trauma Care',
        facilityCode: 'CIVIL-EMG-04',
        address: 'Medical Campus, Asarwa',
        cityDistrict: 'Ahmedabad',
        state: 'Gujarat',
        pincode: '380016',
        phone: '+91 79 2268 0074',
        email: 'triage@civilhospital.org',
        doctorInCharge: 'Dr. Priya Shah',
        doctorDegree: 'MD (Emergency Medicine), GMC #48921',
        department: 'Acute Resuscitation & Triage Unit',
        isLoggedIn: true
      });
    } else if (type === 'urban_clinic') {
      setFormData({
        clinicName: 'Nirāmay Community Health Clinic',
        facilityCode: 'NIR-CHC-902',
        address: 'Sector 4, Near Community Center, Gandhinagar',
        cityDistrict: 'Gandhinagar',
        state: 'Gujarat',
        pincode: '382010',
        phone: '+91 79 2322 4110',
        email: 'contact@niramayclinic.in',
        doctorInCharge: 'Dr. Alkesh Varma',
        doctorDegree: 'MBBS, MD (Medicine)',
        department: 'Primary Care & Chronic OPD',
        isLoggedIn: true
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clinicName.trim()) {
      setErrorMsg('Please enter the Clinic / Hospital Name.');
      return;
    }
    if (!formData.address.trim()) {
      setErrorMsg('Please enter the Clinic Address.');
      return;
    }
    if (!formData.doctorInCharge.trim()) {
      setErrorMsg('Please enter the Medical Officer In-Charge Name.');
      return;
    }

    const completeProfile: ClinicProfile = {
      ...formData,
      isLoggedIn: true
    };

    if (rememberStation) {
      localStorage.setItem('niramay_clinic_profile', JSON.stringify(completeProfile));
    } else {
      localStorage.removeItem('niramay_clinic_profile');
    }

    onLoginSuccess(completeProfile);
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Header Strip */}
        <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-cyan-900 text-white p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner">
                <Hospital className="w-9 h-9 text-teal-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-widest font-extrabold bg-teal-400/20 text-teal-200 px-2.5 py-0.5 rounded-full border border-teal-300/30">
                    Facility Verification
                  </span>
                  <span className="text-xs text-teal-200/80">Station Setup</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
                  Clinic Portal Registration & Login
                </h1>
                <p className="text-teal-100 text-xs sm:text-sm mt-0.5">
                  Register clinic facility credentials for ML-powered disease-risk triage & official referral slips.
                </p>
              </div>
            </div>

            {onBackToPortalSelector && (
              <button
                type="button"
                onClick={onBackToPortalSelector}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-teal-100 hover:text-white rounded-xl border border-white/20 text-xs font-bold transition flex items-center gap-1.5 shrink-0"
              >
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                <span>Exit to Portal Selection</span>
              </button>
            )}
          </div>

          {/* Quick Preset Buttons */}
          <div className="mt-6 pt-5 border-t border-white/15 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-teal-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Quick Demo Stations:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleLoadPreset('anand_phc')}
                className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-xl border border-white/20 transition font-medium backdrop-blur-sm"
              >
                Anand PHC
              </button>
              <button
                type="button"
                onClick={() => handleLoadPreset('civil_emergency')}
                className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-xl border border-white/20 transition font-medium backdrop-blur-sm"
              >
                Civil Emergency
              </button>
              <button
                type="button"
                onClick={() => handleLoadPreset('urban_clinic')}
                className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-xl border border-white/20 transition font-medium backdrop-blur-sm"
              >
                Nirāmay CHC
              </button>
            </div>
          </div>
        </div>

        {/* Login Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2 animate-shake">
              <ShieldCheck className="w-4 h-4 text-red-600 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Section 1: Facility Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
              <Building2 className="w-4 h-4 text-teal-600" />
              1. Healthcare Facility & Department
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Clinic / Hospital Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.clinicName}
                  onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
                  placeholder="e.g. Aarogyam Primary Health Center"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Facility Code / Reg No.
                </label>
                <input
                  type="text"
                  value={formData.facilityCode}
                  onChange={(e) => setFormData({ ...formData, facilityCode: e.target.value })}
                  placeholder="e.g. PHC-388001"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Department / Triage Unit
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm font-medium"
                >
                  <option value="General OPD & Triage">General OPD & Triage</option>
                  <option value="Emergency & Acute Resuscitation">Emergency & Acute Resuscitation</option>
                  <option value="Community Health Unit">Community Health Unit</option>
                  <option value="Maternal & Child Health OPD">Maternal & Child Health OPD</option>
                  <option value="Chronic Disease Care Unit">Chronic Disease Care Unit</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Clinic Helpline / Contact Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Address & Location */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
              <MapPin className="w-4 h-4 text-teal-600" />
              2. Clinic Location & Address
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Street Address / Landmark <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g. Near Gram Panchayat Office, Station Road"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  City / District
                </label>
                <input
                  type="text"
                  value={formData.cityDistrict}
                  onChange={(e) => setFormData({ ...formData, cityDistrict: e.target.value })}
                  placeholder="e.g. Anand"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="e.g. Gujarat"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  PIN Code
                </label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  placeholder="e.g. 388001"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Attending Medical Officer */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
              <Stethoscope className="w-4 h-4 text-teal-600" />
              3. Attending Physician / Medical Officer
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Medical Officer / Doctor Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.doctorInCharge}
                  onChange={(e) => setFormData({ ...formData, doctorInCharge: e.target.value })}
                  placeholder="e.g. Dr. Ramesh Patel"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Qualifications & Reg No.
                </label>
                <input
                  type="text"
                  value={formData.doctorDegree}
                  onChange={(e) => setFormData({ ...formData, doctorDegree: e.target.value })}
                  placeholder="e.g. MBBS, MD (Med), Reg #GMC-4928"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm font-medium"
                />
              </div>
            </div>
          </div>

          {/* Remember Station Checkbox */}
          <div className="flex items-center gap-2.5 pt-2">
            <input
              type="checkbox"
              id="rememberStation"
              checked={rememberStation}
              onChange={(e) => setRememberStation(e.target.checked)}
              className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
            />
            <label htmlFor="rememberStation" className="text-xs text-slate-600 select-none cursor-pointer">
              Remember and keep this clinic station logged in on this browser
            </label>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              Encrypted Local Clinical Station
            </div>

            <button
              type="submit"
              className="px-8 py-3.5 bg-gradient-to-r from-teal-700 via-teal-800 to-cyan-900 hover:opacity-95 text-white font-extrabold rounded-2xl shadow-lg transition flex items-center gap-2 text-sm sm:text-base cursor-pointer"
            >
              Enter Clinic Triage Portal
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
