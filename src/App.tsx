import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { SubmitComplaintView } from './components/SubmitComplaintView';
import { TrackComplaintView } from './components/TrackComplaintView';
import { MyComplaintsView } from './components/MyComplaintsView';
import { AboutView } from './components/AboutView';
import { OfficialDashboardView } from './components/OfficialDashboardView';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { DeveloperConsoleModal } from './components/DeveloperConsoleModal';
import {
  ActiveTab,
  Complaint,
  ComplaintCategory,
  ComplaintStatus,
  AuthUser,
  UserRole,
  OfficialUser,
} from './types';
import {
  getStoredAuthUser,
  setStoredAuthUser,
} from './utils/storage';
import {
  subscribeToComplaints,
  addComplaintToFirebase,
  updateComplaintStatusInFirebase,
  deleteComplaintFromFirebase,
  logoutUserFromFirebase,
  getLocalCachedComplaints,
} from './lib/firebase';
import { CheckCircle2, ShieldCheck, User, Terminal, LayoutDashboard } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [complaints, setComplaints] = useState<Complaint[]>(() => getLocalCachedComplaints());
  const [trackTargetId, setTrackTargetId] = useState<string>('');
  const [preselectedCategory, setPreselectedCategory] = useState<ComplaintCategory | ''>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Authentication State
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => getStoredAuthUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalInitialRole, setAuthModalInitialRole] = useState<UserRole>('consumer');

  // Developer Console State
  const [isDevConsoleOpen, setIsDevConsoleOpen] = useState<boolean>(false);

  // Subscribe to real-time Firebase complaints
  useEffect(() => {
    const unsubscribe = subscribeToComplaints(
      (liveComplaints) => {
        setComplaints(liveComplaints);
      },
      (err) => {
        console.warn('Real-time listener warning:', err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAuth = (role: UserRole) => {
    setAuthModalInitialRole(role);
    setIsAuthModalOpen(true);
  };

  const handleLoginSuccess = (user: AuthUser) => {
    setAuthUser(user);
    setStoredAuthUser(user);
    if (user.role === 'official') {
      setActiveTab('official_dashboard');
      showToast(
        `Welcome Officer ${user.name}! Municipal Office Dashboard opened.`
      );
    } else {
      showToast(
        `Welcome Citizen Consumer: ${user.name}`
      );
    }
  };

  const handleLogout = async () => {
    await logoutUserFromFirebase();
    setAuthUser(null);
    setStoredAuthUser(null);
    showToast('Signed out of ComplainX session');
  };

  const handleComplaintSubmitted = async (newComplaint: Complaint) => {
    await addComplaintToFirebase(newComplaint);
    showToast(`Complaint registered in Firebase with ID: ${newComplaint.complaintId}`);
  };

  const handleSelectComplaintToTrack = (id: string) => {
    setTrackTargetId(id);
    setActiveTab('track');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePreselectCategory = (category: ComplaintCategory) => {
    setPreselectedCategory(category);
    setActiveTab('submit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateStatus = async (id: string, newStatus: ComplaintStatus) => {
    await updateComplaintStatusInFirebase(id, newStatus);
    showToast(`Complaint #${id} status updated to "${newStatus}" in Firestore`);
  };

  const handleDeleteComplaint = async (id: string) => {
    await deleteComplaintFromFirebase(id);
    showToast(`Complaint #${id} deleted from database`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900 font-sans antialiased">
      {/* Navbar with Official login | Consumer login & Dev Console */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={handleTabChange}
        complaintCount={complaints.length}
        authUser={authUser}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
        onOpenDevConsole={() => setIsDevConsoleOpen(true)}
      />

      {/* Official Privilege Notice when logged in as Official */}
      {authUser?.role === 'official' && (
        <div className="bg-indigo-900 text-indigo-100 text-xs py-2 px-4 border-b border-indigo-950 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center justify-between max-w-7xl mx-auto w-full gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-semibold text-white">
                Official Authority Active:
              </span>
              <span>
                Logged in as {authUser.name} ({authUser.department || 'Municipal Dept'} • {authUser.designation || 'Officer'}). Administrative privileges enabled.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleTabChange('official_dashboard')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'official_dashboard'
                    ? 'bg-amber-400 text-slate-950 shadow-xs ring-2 ring-amber-300'
                    : 'bg-indigo-800 hover:bg-indigo-700 text-amber-300 border border-indigo-600/70'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Office Dashboard</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDevConsoleOpen(true)}
                className="text-amber-300 hover:text-amber-100 text-xs underline flex items-center gap-1 shrink-0 cursor-pointer px-1 py-1"
              >
                <Terminal className="w-3 h-3" />
                <span>Dev Console</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Consumer Banner when logged in as Consumer */}
      {authUser?.role === 'consumer' && (
        <div className="bg-blue-900 text-blue-100 text-xs py-2 px-4 border-b border-blue-950 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <User className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="font-semibold text-white">
              Verified Citizen Account:
            </span>
            <span>
              Logged in as {authUser.name} (Consumer ID: {authUser.consumerId}). Submissions attach your verified contact details.
            </span>
          </div>
        </div>
      )}

      {/* Floating Action Toast Notification */}
      {toastMessage && (
        <div
          id="app-toast-notification"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-xl border border-slate-700 text-sm font-medium animate-bounce"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Areas */}
      <main className="flex-1">
        {activeTab === 'home' && (
          <HomeView
            complaints={complaints}
            onNavigate={handleTabChange}
            onSelectComplaintToTrack={handleSelectComplaintToTrack}
            onPreselectCategory={handlePreselectCategory}
            authUser={authUser}
            onOpenAuth={handleOpenAuth}
          />
        )}

        {activeTab === 'submit' && (
          <SubmitComplaintView
            initialCategory={preselectedCategory}
            onComplaintSubmitted={handleComplaintSubmitted}
            onNavigateToTrack={handleSelectComplaintToTrack}
            authUser={authUser}
            onOpenAuth={handleOpenAuth}
          />
        )}

        {activeTab === 'track' && (
          <TrackComplaintView
            initialSearchId={trackTargetId}
            allComplaints={complaints}
            onRefreshComplaints={() => {
              setComplaints(getLocalCachedComplaints());
            }}
            onNavigateToSubmit={() => handleTabChange('submit')}
          />
        )}

        {activeTab === 'complaints' && (
          <MyComplaintsView
            complaints={complaints}
            onNavigateToSubmit={() => handleTabChange('submit')}
            onNavigateToTrack={handleSelectComplaintToTrack}
            onUpdateStatus={handleUpdateStatus}
            onDeleteComplaint={handleDeleteComplaint}
            onRefreshFromFirebase={() => {
              setComplaints(getLocalCachedComplaints());
              showToast('Refreshed complaints records from Firestore');
            }}
          />
        )}

        {activeTab === 'official_dashboard' && (
          <OfficialDashboardView
            officialUser={authUser?.role === 'official' ? (authUser as OfficialUser) : null}
            complaints={complaints}
            onUpdateStatus={handleUpdateStatus}
            onDeleteComplaint={handleDeleteComplaint}
            onNavigate={handleTabChange}
            onRefreshFromFirebase={() => {
              setComplaints(getLocalCachedComplaints());
              showToast('Refreshed complaints records from Firestore');
            }}
            onSelectComplaintToTrack={handleSelectComplaintToTrack}
          />
        )}

        {activeTab === 'about' && (
          <AboutView onNavigate={handleTabChange} />
        )}
      </main>

      {/* Footer */}
      <Footer
        onNavigate={handleTabChange}
        onPreselectCategory={handlePreselectCategory}
      />

      {/* Official & Consumer Login Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialRole={authModalInitialRole}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onOpenDevConsole={() => {
          setIsAuthModalOpen(false);
          setIsDevConsoleOpen(true);
        }}
      />

      {/* Developer & Master Admin Console */}
      <DeveloperConsoleModal
        isOpen={isDevConsoleOpen}
        onClose={() => setIsDevConsoleOpen(false)}
        onNotify={(msg) => showToast(msg)}
      />
    </div>
  );
}
