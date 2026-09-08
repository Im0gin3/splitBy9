import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { auth, db, getInternalEmail } from '../lib/firebase';
import { MealEntry, Person, ClaimedProfile, DayOfWeek, MealType, TempLockInfo } from '../types';
import { PREDEFINED_PEOPLE, generateInitialMeals } from '../data/mockData';
import { getMaxDecisionsForPersonAndWeek } from '../utils/allocationUtils';

// Collection references
const CLAIMED_PROFILES_COLLECTION = 'claimed_profiles';
const USERS_COLLECTION = 'users';
const MEAL_SLOTS_COLLECTION = 'meal_slots';
const USER_WEEKLY_DECISIONS_COLLECTION = 'user_weekly_decisions';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Subscribes to real-time claimed status for all 9 predefined people.
 */
export function subscribeToClaimedProfiles(
  callback: (claimedMap: Record<string, ClaimedProfile>) => void
) {
  const colRef = collection(db, CLAIMED_PROFILES_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const map: Record<string, ClaimedProfile> = {};
      // Initialize default for all 9
      PREDEFINED_PEOPLE.forEach((p) => {
        map[p.id] = {
          predefinedId: p.id,
          displayName: p.name,
          claimed: false,
        };
      });

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.predefinedId) {
          map[data.predefinedId] = {
            predefinedId: data.predefinedId,
            displayName: data.displayName || map[data.predefinedId]?.displayName || '',
            claimed: !!data.claimed,
            claimedByUid: data.claimedByUid,
          };
        }
      });

      callback(map);
    },
    (err) => {
      console.error('Error listening to claimed profiles:', err);
    }
  );
}

/**
 * Register and claim a predefined person with a password.
 */
export async function registerAndClaimPerson(
  person: Person,
  password: string
): Promise<{ user: User; person: Person }> {
  const internalEmail = getInternalEmail(person.id);

  // 1. Check in Firestore if already claimed
  const profileRef = doc(db, CLAIMED_PROFILES_COLLECTION, person.id);
  const profileSnap = await getDoc(profileRef);
  if (profileSnap.exists() && profileSnap.data()?.claimed) {
    throw new Error(`${person.name} has already been claimed. Please log in with your password.`);
  }

  // 2. Create user with Firebase Auth (passwords handled strictly by Firebase Auth)
  const userCredential = await createUserWithEmailAndPassword(auth, internalEmail, password);
  const user = userCredential.user;

  // 3. Mark profile as claimed in Firestore
  await setDoc(profileRef, {
    predefinedId: person.id,
    displayName: person.name,
    claimed: true,
    claimedByUid: user.uid,
    claimedAt: serverTimestamp(),
  });

  // 4. Record user profile document
  await setDoc(doc(db, USERS_COLLECTION, user.uid), {
    uid: user.uid,
    predefinedId: person.id,
    displayName: person.name,
    internalEmail,
    createdAt: serverTimestamp(),
  });

  return { user, person };
}

/**
 * Login an existing claimed predefined person using password.
 */
export async function loginPerson(
  person: Person,
  password: string
): Promise<{ user: User; person: Person }> {
  const internalEmail = getInternalEmail(person.id);
  const userCredential = await signInWithEmailAndPassword(auth, internalEmail, password);
  return { user: userCredential.user, person };
}

/**
 * Get person object for an authenticated user UID.
 */
export async function getPersonForUid(uid: string): Promise<Person | null> {
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  const userDocSnap = await getDoc(userDocRef);
  if (!userDocSnap.exists()) return null;

  const data = userDocSnap.data();
  const person = PREDEFINED_PEOPLE.find((p) => p.id === data.predefinedId);
  return person || null;
}

/**
 * Sign out current user.
 */
export async function logout(): Promise<void> {
  await signOut(auth);
}

/**
 * Helper to construct slot document ID.
 */
export function getSlotDocId(weekId: string, day: DayOfWeek, mealType: MealType): string {
  return `${weekId}_${day}_${mealType}`;
}

/**
 * Subscribes to real-time meal slots for the specified week.
 */
export function subscribeToWeekMeals(
  weekId: string,
  callback: (meals: MealEntry[]) => void,
  onError?: (err: unknown) => void
) {
  const q = query(
    collection(db, MEAL_SLOTS_COLLECTION),
    where('weekId', '==', weekId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const meals: MealEntry[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        meals.push({
          id: docSnap.id,
          weekId: data.weekId,
          day: data.day,
          dateStr: data.dateStr,
          mealType: data.mealType,
          title: data.title || '',
          notes: data.notes || '',
          tags: data.tags || [],
          decidedByPersonId: data.decidedByPersonId || '',
          decidedByPersonName: data.decidedByPersonName || '',
          decidedByUid: data.decidedByUid,
          isLocked: !!data.isLocked,
          lockedAt: data.lockedAt || new Date().toISOString(),
          status: data.status || (data.isLocked ? 'confirmed' : 'open'),
          tempLock: data.tempLock || null,
        });
      });
      callback(meals);
    },
    (err) => {
      if (onError) {
        onError(err);
      } else {
        handleFirestoreError(err, OperationType.LIST, `${MEAL_SLOTS_COLLECTION}?weekId=${weekId}`);
      }
    }
  );
}

/**
 * Ensures the user's decision tracking document exists in Firestore for the given week.
 * This guarantees atomic security rule validation on meal slot confirmation.
 */
export async function ensureUserWeeklyDecision(
  weekId: string,
  user: { uid: string; personId: string; name?: string }
): Promise<void> {
  if (!user || !user.uid || !user.personId) return;

  const userDecisionRef = doc(db, USER_WEEKLY_DECISIONS_COLLECTION, `${weekId}_${user.personId}`);
  const snap = await getDoc(userDecisionRef);
  if (!snap.exists()) {
    const maxDecisions = getMaxDecisionsForPersonAndWeek(weekId, user.personId);

    // Baseline query for any existing confirmed meals for this user this week
    const weekSlotsQuery = query(
      collection(db, MEAL_SLOTS_COLLECTION),
      where('weekId', '==', weekId),
      where('decidedByPersonId', '==', user.personId)
    );
    const slotsSnap = await getDocs(weekSlotsQuery);
    const existingSlotIds: string[] = [];
    slotsSnap.forEach((d) => {
      const data = d.data();
      if (data.isLocked || data.status === 'confirmed') {
        existingSlotIds.push(d.id);
      }
    });

    await setDoc(userDecisionRef, {
      weekId,
      personId: user.personId,
      uid: user.uid,
      maxDecisions,
      confirmedSlotIds: existingSlotIds,
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Acquire a temporary editing reservation lock for a slot.
 * Ensures no two users can edit or claim the same slot concurrently.
 * Locks expire after 10 minutes automatically.
 */
export async function acquireTempLock(
  slotId: string,
  weekId: string,
  day: DayOfWeek,
  dateStr: string,
  mealType: MealType,
  user: { uid: string; personId: string; name: string }
): Promise<void> {
  // Ensure the decision tracking document exists prior to acquiring reservation
  await ensureUserWeeklyDecision(weekId, user);

  const slotRef = doc(db, MEAL_SLOTS_COLLECTION, slotId);
  const userDecisionRef = doc(db, USER_WEEKLY_DECISIONS_COLLECTION, `${weekId}_${user.personId}`);

  // Deterministically compute maximum allowed decisions for this user in this week
  const maxDecisions = getMaxDecisionsForPersonAndWeek(weekId, user.personId);

  await runTransaction(db, async (transaction) => {
    const slotDoc = await transaction.get(slotRef);
    const userDecisionDoc = await transaction.get(userDecisionRef);

    // 1. Verify user still has remaining decisions
    const currentConfirmedSlotIds: string[] = userDecisionDoc.exists()
      ? userDecisionDoc.data().confirmedSlotIds || []
      : [];
    const otherConfirmed = currentConfirmedSlotIds.filter((id) => id !== slotId);
    if (otherConfirmed.length >= maxDecisions) {
      throw new Error(
        `Weekly allocation limit reached. You have already claimed all ${maxDecisions} of your meal decisions for this week.`
      );
    }

    // 2. Verify slot state
    if (slotDoc.exists()) {
      const data = slotDoc.data();

      // If already permanently confirmed and locked
      if (data.status === 'confirmed' || data.isLocked) {
        throw new Error('This meal slot has already been confirmed and locked by another member.');
      }

      // If temporarily locked by someone else and lock hasn't expired (10 minutes)
      if (
        data.tempLock &&
        data.tempLock.lockedByUid !== user.uid &&
        data.tempLock.expiresAt > Date.now()
      ) {
        throw new Error(
          `This slot is currently being planned by ${data.tempLock.lockedByName || 'another member'}. Please choose another open slot or wait for their reservation to finish.`
        );
      }
    }

    const tempLock: TempLockInfo = {
      lockedByUid: user.uid,
      lockedByPersonId: user.personId,
      lockedByName: user.name,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minute lock per audit specifications
    };

    transaction.set(
      slotRef,
      {
        weekId,
        day,
        dateStr,
        mealType,
        status: 'reserved',
        isLocked: false,
        tempLock,
        title: '',
        notes: '',
        tags: [],
        decidedByPersonId: user.personId,
        decidedByPersonName: user.name,
        decidedByUid: user.uid,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
}

/**
 * Releases temporary editing reservation lock if user cancels or leaves modal.
 */
export async function releaseTempLock(slotId: string, uid: string): Promise<void> {
  try {
    const slotRef = doc(db, MEAL_SLOTS_COLLECTION, slotId);
    await runTransaction(db, async (transaction) => {
      const slotDoc = await transaction.get(slotRef);
      if (!slotDoc.exists()) return;

      const data = slotDoc.data();
      // CRITICAL: Never delete a slot that has already been confirmed or locked!
      if (data.status === 'confirmed' || data.isLocked) {
        return;
      }
      // Only release if still in reserved state and owned by this user
      if (data.status === 'reserved' && data.tempLock?.lockedByUid === uid) {
        transaction.delete(slotRef);
      }
    });
  } catch (err) {
    console.warn('Error releasing temporary lock:', err);
  }
}

/**
 * Permanently confirms and locks a meal slot using an atomic Firestore transaction.
 * Atomically validates and commits in a single transaction:
 * 1. Slot is not already claimed or locked.
 * 2. Slot is not actively reserved by another member.
 * 3. User has not exceeded their weekly allocation limit (via user_weekly_decisions tracker).
 * 4. Concurrent attempts by two users to claim the same slot or exceed allocations cannot both succeed.
 */
export async function confirmMealSlot(params: {
  slotId: string;
  weekId: string;
  day: DayOfWeek;
  dateStr: string;
  mealType: MealType;
  title: string;
  notes?: string;
  tags?: string[];
  user: { uid: string; personId: string; name: string };
  maxDecisions?: number;
}): Promise<MealEntry> {
  const { slotId, weekId, day, dateStr, mealType, title, notes, tags, user } = params;
  const slotRef = doc(db, MEAL_SLOTS_COLLECTION, slotId);
  const userDecisionRef = doc(db, USER_WEEKLY_DECISIONS_COLLECTION, `${weekId}_${user.personId}`);

  // Deterministically calculate max decisions from rotation algorithm (never trust client parameter)
  const deterministicMaxDecisions = getMaxDecisionsForPersonAndWeek(weekId, user.personId);

  // Baseline query for any existing confirmed meals for this user this week
  const weekSlotsQuery = query(
    collection(db, MEAL_SLOTS_COLLECTION),
    where('weekId', '==', weekId),
    where('decidedByPersonId', '==', user.personId)
  );
  const weekSlotsSnap = await getDocs(weekSlotsQuery);
  const existingSlotIds: string[] = [];
  weekSlotsSnap.forEach((docItem) => {
    const d = docItem.data();
    if (d.isLocked || d.status === 'confirmed') {
      existingSlotIds.push(docItem.id);
    }
  });

  // Ensure the decision tracking document exists in Firestore before transaction
  await ensureUserWeeklyDecision(weekId, user);

  return await runTransaction(db, async (transaction) => {
    // 1. Atomically read both slot and user decision tracking documents
    const slotDoc = await transaction.get(slotRef);
    const userDecisionDoc = await transaction.get(userDecisionRef);

    // 2. Atomically verify current slot availability
    if (slotDoc.exists()) {
      const data = slotDoc.data();
      if (data.isLocked || data.status === 'confirmed') {
        throw new Error('This meal slot has already been confirmed and locked for the group.');
      }
      // Check if slot is actively reserved by another user (10 min expiration)
      if (
        data.tempLock &&
        data.tempLock.lockedByUid !== user.uid &&
        data.tempLock.expiresAt > Date.now()
      ) {
        throw new Error(
          `This slot is currently locked by ${data.tempLock.lockedByName || 'another member'}.`
        );
      }
    }

    // 3. Atomically verify user's weekly decisions
    const currentConfirmedSlotIds: string[] = userDecisionDoc.exists()
      ? userDecisionDoc.data().confirmedSlotIds || []
      : existingSlotIds;

    const otherConfirmedSlots = currentConfirmedSlotIds.filter((id) => id !== slotId);
    if (otherConfirmedSlots.length >= deterministicMaxDecisions) {
      throw new Error(
        `Weekly allocation limit reached. You have already claimed ${otherConfirmedSlots.length} of ${deterministicMaxDecisions} meal decisions for this week.`
      );
    }

    const lockedAt = new Date().toISOString();
    const confirmedData = {
      weekId,
      day,
      dateStr,
      mealType,
      status: 'confirmed',
      isLocked: true,
      title,
      notes: notes || '',
      tags: tags || [],
      decidedByPersonId: user.personId,
      decidedByPersonName: user.name,
      decidedByUid: user.uid,
      lockedAt,
      tempLock: null,
      confirmedAt: serverTimestamp(),
    };

    // 4. Atomically commit both slot and user decision tracking writes
    transaction.set(slotRef, confirmedData);
    transaction.set(userDecisionRef, {
      weekId,
      personId: user.personId,
      uid: user.uid,
      maxDecisions: deterministicMaxDecisions,
      confirmedSlotIds: [...otherConfirmedSlots, slotId],
      updatedAt: serverTimestamp(),
    });

    return {
      id: slotId,
      weekId,
      day,
      dateStr,
      mealType,
      title,
      notes,
      tags,
      decidedByPersonId: user.personId,
      decidedByPersonName: user.name,
      decidedByUid: user.uid,
      isLocked: true,
      lockedAt,
      status: 'confirmed',
      tempLock: null,
    };
  });
}

/**
 * Normal users cannot delete confirmed meals.
 */
export async function unlockMealSlot(_slotId: string, _currentUid: string): Promise<void> {
  throw new Error('Confirmed meals are permanently locked for the group and cannot be deleted.');
}

/**
 * Checks if the specified week has any meals in Firestore.
 * If completely empty (e.g. on first launch), seeds the 5 initial sample meals
 * so the initial experience is ready and backed by Firestore.
 */
export async function seedInitialWeekMealsIfEmpty(weekId: string): Promise<void> {
  if (!auth.currentUser) {
    return;
  }
  try {
    const q = query(
      collection(db, MEAL_SLOTS_COLLECTION),
      where('weekId', '==', weekId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      // Already has data in Firestore
      return;
    }

    // Seed the 5 initial meals matching rotation rules
    const initialMeals = generateInitialMeals();
    const batch = writeBatch(db);

    initialMeals.forEach((meal) => {
      const docId = getSlotDocId(meal.weekId, meal.day, meal.mealType);
      const slotRef = doc(db, MEAL_SLOTS_COLLECTION, docId);
      batch.set(slotRef, {
        weekId: meal.weekId,
        day: meal.day,
        dateStr: meal.dateStr,
        mealType: meal.mealType,
        status: 'confirmed',
        isLocked: true,
        title: meal.title,
        notes: meal.notes || '',
        tags: meal.tags || [],
        decidedByPersonId: meal.decidedByPersonId,
        decidedByPersonName: meal.decidedByPersonName,
        lockedAt: meal.lockedAt,
        tempLock: null,
        isSeededData: true,
      });
    });

    await batch.commit();
  } catch (err) {
    console.warn('Could not seed initial meals:', err);
  }
}
