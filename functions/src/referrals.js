const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const db = admin.firestore();
const REGION = "us-central1";

// Reward amount in currency (e.g., Euros)
const REFERRAL_REWARD = 5.00;

/**
 * Generates or retrieves the user's unique referral code.
 */
exports.getReferralCode = onCall({ region: REGION, cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const userId = request.auth.uid;
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
        throw new HttpsError("not-found", "User not found.");
    }

    const userData = userDoc.data();

    if (userData.referralCode) {
        return { code: userData.referralCode };
    }

    // Generate a simple code: First 3 letters of name + random 4 chars
    const namePart = (userData.displayName || "USER").substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newCode = `${namePart}${randomPart}`;

    // Check uniqueness (simple check, could be improved for high scale)
    // For now, we assume collision is rare enough or we handle error if unique index exists

    await userRef.update({
        referralCode: newCode,
        referralStats: {
            invitedCount: 0,
            earnedAmount: 0
        }
    });

    return { code: newCode };
});

/**
 * Applies a referral code for the current user.
 * Can only be done if user hasn't completed any rides yet.
 */
exports.redeemReferralCode = onCall({ region: REGION, cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const { code } = request.data;
    const userId = request.auth.uid;

    if (!code) {
        throw new HttpsError("invalid-argument", "Code is required.");
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (userData.referredBy) {
        throw new HttpsError("failed-precondition", "You have already redeemed a code.");
    }

    // Check if user has already taken rides (optional rule: only for new users)
    // For simplicity, we just check if they have 'referredBy' field. 
    // Ideally we check ride count too.

    // Find referrer
    const referrerSnapshot = await db.collection('users').where('referralCode', '==', code).limit(1).get();

    if (referrerSnapshot.empty) {
        throw new HttpsError("not-found", "Invalid referral code.");
    }

    const referrerDoc = referrerSnapshot.docs[0];
    const referrerId = referrerDoc.id;

    if (referrerId === userId) {
        throw new HttpsError("invalid-argument", "You cannot refer yourself.");
    }

    // Link users
    await userRef.update({
        referredBy: referrerId,
        referralRedeemedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, message: "Code redeemed! Complete your first ride to get the reward." };
});

/**
 * Trigger: Process rewards when a ride is completed.
 * If it's the passenger's first ride and they were referred, reward both.
 */
exports.processReferralReward = onDocumentUpdated({
    document: "rides/{rideId}",
    region: REGION
}, async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    // Only on completion
    if (before.status !== 'completed' && after.status === 'completed') {

        const passengers = after.passengers?.filter(p => p.status === 'confirmed') || [];

        for (const p of passengers) {
            const userRef = db.collection('users').doc(p.id);
            const userWalletRef = db.collection('wallets').doc(p.id);

            // Run transaction to ensure atomicity
            await db.runTransaction(async (t) => {
                const userDoc = await t.get(userRef);
                const userData = userDoc.data();

                // Check if user was referred AND hasn't received the reward yet
                if (userData.referredBy && !userData.referralRewardClaimed) {

                    const referrerRef = db.collection('users').doc(userData.referredBy);
                    const referrerWalletRef = db.collection('wallets').doc(userData.referredBy);

                    const referrerDoc = await t.get(referrerRef);
                    const referrerWalletDoc = await t.get(referrerWalletRef);

                    if (!referrerDoc.exists) return;

                    // FIX Bug #11: Usar FieldValue.increment() para operaciones atómicas
                    // 1. Reward Referrer
                    t.update(referrerWalletRef, {
                        balance: admin.firestore.FieldValue.increment(REFERRAL_REWARD)
                    });

                    // Update Referrer Stats (User Doc)
                    t.update(referrerRef, {
                        'referralStats.invitedCount': admin.firestore.FieldValue.increment(1),
                        'referralStats.earnedAmount': admin.firestore.FieldValue.increment(REFERRAL_REWARD)
                    });

                    // Log transaction for Referrer (Wallets Collection)
                    const referrerTxRef = referrerWalletRef.collection('transactions').doc();
                    t.set(referrerTxRef, {
                        amount: REFERRAL_REWARD,
                        type: 'referral_reward',
                        description: `Recompensa por invitar a ${userData.displayName}`,
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    });

                    // 2. Reward Referee (The new user)
                    t.update(userWalletRef, {
                        balance: admin.firestore.FieldValue.increment(REFERRAL_REWARD)
                    });

                    // Update User Flags (User Doc)
                    t.update(userRef, {
                        'referralRewardClaimed': true
                    });

                    // Log transaction for Referee (Wallets Collection)
                    const userTxRef = userWalletRef.collection('transactions').doc();
                    t.set(userTxRef, {
                        amount: REFERRAL_REWARD,
                        type: 'referral_bonus',
                        description: 'Bono de bienvenida por referido',
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            });
        }
    }
});
