import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { Complaint, OfficialAccount, ConsumerUser } from '../types';
import { INITIAL_SEED_COMPLAINTS } from '../utils/storage';

export const DEFAULT_SEED_OFFICIALS: OfficialAccount[] = [
  {
    id: 'OFF-7721',
    officialId: 'OFF-7721',
    govtEmail: 'vikram.mcd@gov.in',
    name: 'Er. Vikram Malhotra',
    designation: 'Zonal Chief Grievance Officer',
    department: 'Municipal Public Works & Utilities Dept.',
    badgeNumber: 'MCD-ENG-089',
    jurisdiction: 'Zone 4 (Central & West Sectors)',
    pin: '7721',
    createdAt: new Date().toISOString(),
    isActive: true,
  },
  {
    id: 'OFF-101',
    officialId: 'OFF-101',
    govtEmail: 'alsheikhrehan922@gmail.com',
    name: 'Sheikh Rehan (Admin Officer)',
    designation: 'Senior Municipal Superintendent',
    department: 'Municipal Administrative Office',
    badgeNumber: 'MCD-SUP-101',
    jurisdiction: 'Headquarters & All City Zones',
    pin: '8969',
    createdAt: new Date().toISOString(),
    isActive: true,
  },
];

// User provided Firebase configuration for ComplainX
export const firebaseConfig = {
  apiKey: "AIzaSyDBvNQVufMLwuwDWC03SSRFqnVm6RpvdpA",
  authDomain: "complainx-4d4e3.firebaseapp.com",
  projectId: "complainx-4d4e3",
  storageBucket: "complainx-4d4e3.firebasestorage.app",
  messagingSenderId: "483898748789",
  appId: "1:483898748789:web:5fba5ef3f8a6cb1df1ed3c",
  measurementId: "G-MEH06YQY2B",
};

// Initialize Firebase safely (avoid multiple initializations)
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize analytics safely in browser environment
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      try {
        getAnalytics(app);
      } catch (e) {
        console.warn('Firebase analytics initialization skipped:', e);
      }
    }
  });
}

// Local storage fallback keys
const LOCAL_COMPLAINTS_KEY = 'complainx_real_complaints';
const LOCAL_OFFICIALS_KEY = 'complainx_real_officials';

// Helper to get local cache
export function getLocalCachedComplaints(): Complaint[] {
  try {
    const raw = localStorage.getItem(LOCAL_COMPLAINTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    // Fallback to initial realistic seed complaints so the app is never empty
    const legacyRaw = localStorage.getItem('smart_community_complaints');
    if (legacyRaw) {
      const legacyParsed = JSON.parse(legacyRaw);
      if (Array.isArray(legacyParsed) && legacyParsed.length > 0) {
        return legacyParsed;
      }
    }
    return INITIAL_SEED_COMPLAINTS;
  } catch {
    return INITIAL_SEED_COMPLAINTS;
  }
}

export function setLocalCachedComplaints(complaints: Complaint[]): void {
  try {
    localStorage.setItem(LOCAL_COMPLAINTS_KEY, JSON.stringify(complaints));
  } catch (e) {
    console.error('Failed to cache complaints locally:', e);
  }
}

export function getLocalCachedOfficials(): OfficialAccount[] {
  try {
    const raw = localStorage.getItem(LOCAL_OFFICIALS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    return DEFAULT_SEED_OFFICIALS;
  } catch {
    return DEFAULT_SEED_OFFICIALS;
  }
}

export function setLocalCachedOfficials(officials: OfficialAccount[]): void {
  try {
    localStorage.setItem(LOCAL_OFFICIALS_KEY, JSON.stringify(officials));
  } catch (e) {
    console.error('Failed to cache officials locally:', e);
  }
}

// =========================================================================
// REAL COMPLAINTS FIRESTORE OPERATIONS
// =========================================================================

export function subscribeToComplaints(
  onUpdate: (complaints: Complaint[]) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    const complaintsCol = collection(db, 'complaints');
    const q = query(complaintsCol);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Complaint[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            complaintId: data.complaintId || docSnap.id,
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            category: data.category || 'Other',
            title: data.title || '',
            description: data.description || '',
            location: data.location || '',
            priority: data.priority || 'Medium',
            status: data.status || 'Pending',
            date: data.date || new Date().toISOString().split('T')[0],
            lastUpdated: data.lastUpdated,
            adminNotes: data.adminNotes,
          });
        });

        // Sort latest first
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const finalComplaints = list.length > 0 ? list : getLocalCachedComplaints();
        setLocalCachedComplaints(finalComplaints);
        onUpdate(finalComplaints);
      },
      (err) => {
        console.warn('Firestore complaints live sync error, using local storage cache:', err);
        const cached = getLocalCachedComplaints();
        onUpdate(cached);
        if (onError) onError(err);
      }
    );

    return unsubscribe;
  } catch (e) {
    console.warn('Failed to subscribe to complaints in Firestore:', e);
    const cached = getLocalCachedComplaints();
    onUpdate(cached);
    return () => {};
  }
}

export async function addComplaintToFirebase(complaint: Complaint): Promise<void> {
  // Update local cache immediately
  const existing = getLocalCachedComplaints();
  const updated = [complaint, ...existing.filter((c) => c.complaintId !== complaint.complaintId)];
  setLocalCachedComplaints(updated);

  try {
    const docRef = doc(db, 'complaints', complaint.complaintId);
    await setDoc(docRef, {
      ...complaint,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('Could not write complaint directly to Firestore, cached locally:', e);
  }
}

export async function updateComplaintStatusInFirebase(
  complaintId: string,
  newStatus: Complaint['status'],
  adminNotes?: string
): Promise<void> {
  const existing = getLocalCachedComplaints();
  const now = new Date().toISOString();
  const updated = existing.map((c) =>
    c.complaintId === complaintId
      ? { ...c, status: newStatus, lastUpdated: now, adminNotes: adminNotes ?? c.adminNotes }
      : c
  );
  setLocalCachedComplaints(updated);

  try {
    const docRef = doc(db, 'complaints', complaintId);
    await updateDoc(docRef, {
      status: newStatus,
      lastUpdated: now,
      ...(adminNotes ? { adminNotes } : {}),
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('Failed to update complaint in Firestore, updated locally:', e);
  }
}

export async function updateComplaintOfficialDetailsInFirebase(
  complaintId: string,
  updates: Partial<Complaint>
): Promise<void> {
  const existing = getLocalCachedComplaints();
  const now = new Date().toISOString();
  const updated = existing.map((c) =>
    c.complaintId === complaintId
      ? { ...c, ...updates, lastUpdated: now }
      : c
  );
  setLocalCachedComplaints(updated);

  try {
    const docRef = doc(db, 'complaints', complaintId);
    await updateDoc(docRef, {
      ...updates,
      lastUpdated: now,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('Failed to update complaint in Firestore, updated locally:', e);
  }
}

export async function deleteComplaintFromFirebase(complaintId: string): Promise<void> {
  const existing = getLocalCachedComplaints();
  const filtered = existing.filter((c) => c.complaintId !== complaintId);
  setLocalCachedComplaints(filtered);

  try {
    const docRef = doc(db, 'complaints', complaintId);
    await deleteDoc(docRef);
  } catch (e) {
    console.warn('Failed to delete complaint from Firestore:', e);
  }
}

// =========================================================================
// DEVELOPER CONSOLE: OFFICIAL STAFF ACCOUNTS MANAGEMENT
// =========================================================================

export function subscribeToOfficials(
  onUpdate: (officials: OfficialAccount[]) => void
): () => void {
  try {
    const officialsCol = collection(db, 'officials');
    const unsubscribe = onSnapshot(
      officialsCol,
      (snapshot) => {
        const list: OfficialAccount[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            officialId: d.officialId || docSnap.id,
            govtEmail: d.govtEmail || '',
            name: d.name || '',
            designation: d.designation || '',
            department: d.department || '',
            badgeNumber: d.badgeNumber || '',
            jurisdiction: d.jurisdiction || '',
            pin: d.pin || '',
            createdAt: d.createdAt || new Date().toISOString(),
            createdBy: d.createdBy || 'alsheikhrehan922@gmail.com',
            isActive: d.isActive !== false,
          });
        });
        setLocalCachedOfficials(list);
        onUpdate(list);
      },
      (err) => {
        console.warn('Firestore officials live sync error, using local storage cache:', err);
        onUpdate(getLocalCachedOfficials());
      }
    );
    return unsubscribe;
  } catch (e) {
    console.warn('Failed to subscribe to officials:', e);
    onUpdate(getLocalCachedOfficials());
    return () => {};
  }
}

export async function saveOfficialAccountToFirebase(official: OfficialAccount): Promise<void> {
  // Update local cache first
  const existing = getLocalCachedOfficials();
  const updated = [
    ...existing.filter(
      (o) => o.officialId !== official.officialId && o.govtEmail !== official.govtEmail
    ),
    official,
  ];
  setLocalCachedOfficials(updated);

  try {
    const docId = official.officialId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const docRef = doc(db, 'officials', docId);
    await setDoc(
      docRef,
      {
        ...official,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('Failed to write official to Firestore, saved in local cache:', e);
  }
}

export async function deleteOfficialAccountFromFirebase(officialId: string): Promise<void> {
  const existing = getLocalCachedOfficials();
  const filtered = existing.filter((o) => o.officialId !== officialId);
  setLocalCachedOfficials(filtered);

  try {
    const docId = officialId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const docRef = doc(db, 'officials', docId);
    await deleteDoc(docRef);
  } catch (e) {
    console.warn('Failed to delete official from Firestore:', e);
  }
}

// Find and validate official credentials
export async function authenticateOfficial(
  identifier: string, // officialId OR govtEmail
  pin: string
): Promise<OfficialAccount | null> {
  const cleanId = identifier.trim().toLowerCase();
  const cleanPin = pin.trim();

  // Check local cache first
  const cached = getLocalCachedOfficials();
  const match = cached.find(
    (o) =>
      o.isActive &&
      (o.officialId.toLowerCase() === cleanId || o.govtEmail.toLowerCase() === cleanId) &&
      o.pin === cleanPin
  );

  if (match) return match;

  // Try fetching directly from Firestore
  try {
    const officialsCol = collection(db, 'officials');
    const snapshot = await getDocs(officialsCol);
    let found: OfficialAccount | null = null;

    snapshot.forEach((docSnap) => {
      const d = docSnap.data();
      if (
        (d.officialId?.toLowerCase() === cleanId || d.govtEmail?.toLowerCase() === cleanId) &&
        d.pin === cleanPin &&
        d.isActive !== false
      ) {
        found = {
          id: docSnap.id,
          officialId: d.officialId,
          govtEmail: d.govtEmail,
          name: d.name,
          designation: d.designation,
          department: d.department,
          badgeNumber: d.badgeNumber,
          jurisdiction: d.jurisdiction,
          pin: d.pin,
          createdAt: d.createdAt,
          isActive: true,
        };
      }
    });

    if (found) {
      // update cache
      setLocalCachedOfficials([...cached.filter((o) => o.officialId !== (found as OfficialAccount).officialId), found]);
      return found;
    }
  } catch (e) {
    console.warn('Failed to query Firestore for official login:', e);
  }

  return null;
}

// =========================================================================
// CONSUMER FIREBASE AUTHENTICATION
// =========================================================================

export async function registerConsumerWithFirebase(
  name: string,
  email: string,
  password: string,
  phone: string,
  address?: string,
  wardNo?: string
): Promise<ConsumerUser> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const fbUser = userCredential.user;

  const consumerId = 'CNS-' + Math.floor(1000 + Math.random() * 9000);
  const consumerUser: ConsumerUser = {
    role: 'consumer',
    consumerId,
    name: name.trim() || fbUser.displayName || 'Citizen',
    email: fbUser.email || email,
    phone: phone.trim() || 'N/A',
    address: address?.trim() || '',
    wardNo: wardNo?.trim() || '',
  };

  // Save profile to Firestore
  try {
    const docRef = doc(db, 'consumers', fbUser.uid);
    await setDoc(docRef, {
      ...consumerUser,
      uid: fbUser.uid,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('Failed to save consumer profile in Firestore:', e);
  }

  return consumerUser;
}

export async function loginConsumerWithFirebase(
  email: string,
  password: string
): Promise<ConsumerUser> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const fbUser = userCredential.user;

  // Try to retrieve consumer profile from Firestore
  try {
    const docRef = doc(db, 'consumers', fbUser.uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const d = snap.data();
      return {
        role: 'consumer',
        consumerId: d.consumerId || 'CNS-' + fbUser.uid.slice(0, 4).toUpperCase(),
        name: d.name || fbUser.displayName || fbUser.email?.split('@')[0] || 'Citizen',
        email: fbUser.email || email,
        phone: d.phone || '',
        address: d.address || '',
        wardNo: d.wardNo || '',
      };
    }
  } catch (e) {
    console.warn('Failed to fetch consumer document from Firestore:', e);
  }

  return {
    role: 'consumer',
    consumerId: 'CNS-' + Math.floor(1000 + Math.random() * 9000),
    name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Citizen',
    email: fbUser.email || email,
    phone: '',
  };
}

export async function logoutUserFromFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('Error signing out from Firebase:', e);
  }
}
