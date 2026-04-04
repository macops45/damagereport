import { collection, deleteDoc, doc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { firestoreDb, isFirebaseConfigured } from './firebase';

const USERS_COLLECTION_NAME = 'users';
const COMPANIES_COLLECTION_NAME = 'companies';

function ensureFirebaseAvailability() {
  if (!isFirebaseConfigured || !firestoreDb) {
    throw new Error('Firebase is not configured.');
  }
}

function normalizeUserId(userId) {
  return String(userId ?? '').trim();
}

function ensureUserId(userId) {
  const normalized = normalizeUserId(userId);
  if (!normalized) {
    throw new Error('Authenticated user id is required.');
  }
  return normalized;
}

function companiesCollectionRef(userId) {
  const normalizedUserId = ensureUserId(userId);
  return collection(firestoreDb, USERS_COLLECTION_NAME, normalizedUserId, COMPANIES_COLLECTION_NAME);
}

function companyDocRef(userId, companyId) {
  const normalizedUserId = ensureUserId(userId);
  const normalizedCompanyId = String(companyId ?? '').trim();
  if (!normalizedCompanyId) {
    throw new Error('Company id is required.');
  }

  return doc(firestoreDb, USERS_COLLECTION_NAME, normalizedUserId, COMPANIES_COLLECTION_NAME, normalizedCompanyId);
}

export function isFirebaseCompaniesEnabled() {
  return Boolean(isFirebaseConfigured && firestoreDb);
}

export async function fetchCompaniesFromFirebase(userId) {
  ensureFirebaseAvailability();

  const snapshot = await getDocs(companiesCollectionRef(userId));

  return snapshot.docs.map((entry) => ({
    id: entry.id,
    ...entry.data(),
  }));
}

export async function saveCompanyToFirebase(userId, company) {
  ensureFirebaseAvailability();

  const companyId = String(company?.id ?? '').trim();
  if (!companyId) {
    throw new Error('Company id is required to save in Firebase.');
  }

  await setDoc(companyDocRef(userId, companyId), company);
}

export async function deleteCompanyFromFirebase(userId, companyId) {
  ensureFirebaseAvailability();

  const normalizedId = String(companyId ?? '').trim();
  if (!normalizedId) {
    throw new Error('Company id is required to delete from Firebase.');
  }

  await deleteDoc(companyDocRef(userId, normalizedId));
}

export async function replaceDeletedCompanyWithFallbackInFirebase(userId, deletedCompanyId, fallbackCompany) {
  ensureFirebaseAvailability();

  const deletedId = String(deletedCompanyId ?? '').trim();
  const fallbackId = String(fallbackCompany?.id ?? '').trim();

  if (!deletedId || !fallbackId) {
    throw new Error('Both deleted and fallback company ids are required for Firebase replacement.');
  }

  const batch = writeBatch(firestoreDb);
  batch.delete(companyDocRef(userId, deletedId));
  batch.set(companyDocRef(userId, fallbackId), fallbackCompany);
  await batch.commit();
}
