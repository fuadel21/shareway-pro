const functions = require("firebase-functions"); // Re-introducing V1 functions
const admin = require("firebase-admin");
admin.initializeApp();

// V2 IMPORTS (Only for onCall, which is stable)
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");

// --- MÓDULOS DE FUNCIONES ---
const bookings = require("./src/bookings");
const rides = require("./src/rides");
const payments = require("./src/payments");
const users = require("./src/users");
const wallet = require("./src/wallet");
const chat = require("./src/chat");
const cron = require("./src/cron");
const platform = require("./src/platform");
const rideRequests = require("./src/rideRequests");
const joins = require("./src/joins");
const scheduled = require("./src/scheduled");
const stripe = require("./src/stripe");

const REGION = "us-central1";

// ================================================================================================
// === TAREAS PROGRAMADAS (CRON JOBS) ===
// ================================================================================================

exports.hourlyCleanup = cron.hourlyCleanup;

// ================================================================================================
// === TRIGGERS (DISPARADORES) ===
// ================================================================================================

// --- User Triggers ---
exports.syncUserRole = users.syncUserRole;
exports.initializeNewUser = users.onUserCreated;  // FIX: Auto-create wallet for new users

// --- Ride Completion Trigger (V2) ---
exports.handleRideCompletion = onDocumentUpdated({
    document: "rides/{rideId}",
    region: REGION
}, async (event) => {
    return payments.handleRideCompletion(event);
});

// ================================================================================================
// === FUNCIONES LLAMABLES (CALLABLE - V2 Syntax is OK here) ===
// ================================================================================================

exports.getPlatformStats = platform.getPlatformStats;
exports.requestPlatformPayout = platform.requestPlatformPayout;
exports.updateUserProfile = users.updateUserProfile;
exports.addFunds = payments.addFunds;
exports.requestPayout = payments.requestPayout;
exports.createStripeAccountLink_v2 = stripe.createStripeAccountLink_v2;
exports.releaseHeldFunds = wallet.releaseHeldFunds;
exports.getOrCreateChat = chat.getOrCreateChat;

// --- Scheduled Functions ---
exports.expireOldRides = scheduled.expireOldRides;

// --- Ride Requests ---
exports.createRideRequest = rideRequests.createRideRequest;
exports.cancelRideRequest = rideRequests.cancelRideRequest;
exports.acceptRequest = rideRequests.acceptRequest;

// --- Rides ---
exports.createRide = rides.createRide;
exports.confirmTripAndPay = rides.confirmTripAndPay;
exports.startRide = rides.startRide;
exports.completeRide = rides.completeRide;
exports.cancelRide = rides.cancelRide;

// --- Bookings ---
exports.requestSeatAndHoldFunds = bookings.requestSeatAndHoldFunds;
exports.cancelBookingAndRefund = bookings.cancelBookingAndRefund;
exports.createBookingPaymentIntent = bookings.createBookingPaymentIntent;

// --- Joins ---
exports.requestToJoinInProgressRide = joins.requestToJoinInProgressRide;
exports.respondToJoinRequest = joins.respondToJoinRequest;

// --- Ratings ---
const ratings = require("./src/ratings");
exports.createRating = ratings.createRating;
exports.getUserRatings = ratings.getUserRatings;

// --- Emergency ---
const emergency = require("./src/emergency");
exports.reportEmergency = emergency.reportEmergency;

// --- Notifications ---
const notifications = require("./src/notifications");
exports.onRideUpdated = notifications.onRideUpdated;
exports.onChatMessageCreated = notifications.onChatMessageCreated;

// --- ETA ---
const eta = require("./src/eta");
exports.calculateETA = eta.calculateETA;

// --- Achievements ---
const achievements = require("./src/achievements");
exports.checkRideAchievements = achievements.checkRideAchievements;
exports.getUserAchievements = achievements.getUserAchievements;

// --- Share ---
const share = require("./src/share");
exports.getRideShareLink = share.getRideShareLink;
exports.getPublicRideDetails = share.getPublicRideDetails;

// --- Referrals ---
const referrals = require("./src/referrals");
exports.getReferralCode = referrals.getReferralCode;
exports.redeemReferralCode = referrals.redeemReferralCode;
exports.processReferralReward = referrals.processReferralReward;

// --- Webhooks ---
const webhook = require("./src/webhook");
exports.stripeWebhook = webhook.stripeWebhook;
