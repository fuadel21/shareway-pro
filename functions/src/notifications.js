const { onDocumentUpdated, onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

const db = admin.firestore();
const REGION = "us-central1";

/**
 * Helper to send FCM notification to a user
 */
async function sendPushNotification(userId, notification) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();

        if (!userData || !userData.fcmToken) {
            console.log(`User ${userId} has no FCM token`);
            return false;
        }

        const message = {
            notification: {
                title: notification.title,
                body: notification.body
            },
            data: notification.data || {},
            token: userData.fcmToken
        };

        await admin.messaging().send(message);
        console.log(`Notification sent to ${userId}: ${notification.title}`);
        return true;
    } catch (error) {
        console.error(`Error sending notification to ${userId}:`, error);
        // If token is invalid, we could remove it here
        return false;
    }
}

/**
 * Trigger: Ride Updates (Requests, Status Changes)
 */
exports.onRideUpdated = onDocumentUpdated({
    document: "rides/{rideId}",
    region: REGION
}, async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    const rideId = event.params.rideId;

    if (!before || !after) return;

    // FIX Bug #23: Prevent notification loops - only process specific changes
    const hasRelevantChanges =
        JSON.stringify(before.pendingJoinRequests) !== JSON.stringify(after.pendingJoinRequests) ||
        JSON.stringify(before.passengers) !== JSON.stringify(after.passengers) ||
        before.status !== after.status;

    if (!hasRelevantChanges) {
        console.log(`Skipping notification for ride ${rideId} - no relevant changes`);
        return;
    }

    // 1. New Join Request -> Notify Driver
    const beforeRequests = before.pendingJoinRequests || [];
    const afterRequests = after.pendingJoinRequests || [];

    const newRequests = afterRequests.filter(req =>
        !beforeRequests.some(old => old.id === req.id)
    );

    for (const req of newRequests) {
        await sendPushNotification(after.driver.id, {
            title: "Nueva solicitud de viaje",
            body: `${req.displayName} quiere unirse a tu viaje`,
            data: {
                type: "join_request",
                rideId: rideId,
                passengerId: req.id
            }
        });
    }

    // 2. Request Accepted/Rejected -> Notify Passenger
    // Check confirmed passengers
    const beforeConfirmed = before.passengers?.filter(p => p.status === 'confirmed') || [];
    const afterConfirmed = after.passengers?.filter(p => p.status === 'confirmed') || [];

    const newConfirmed = afterConfirmed.filter(p =>
        !beforeConfirmed.some(old => old.id === p.id)
    );

    for (const p of newConfirmed) {
        await sendPushNotification(p.id, {
            title: "¡Solicitud Aceptada!",
            body: "El conductor ha aceptado tu solicitud de viaje.",
            data: {
                type: "request_accepted",
                rideId: rideId
            }
        });
    }

    // Note: Rejections are harder to track if they are just removed from pending without moving to another list.
    // If we want to notify rejection, we need to see who was in pending but is not in pending AND not in confirmed.
    const removedFromPending = beforeRequests.filter(req =>
        !afterRequests.some(newReq => newReq.id === req.id)
    );

    const rejected = removedFromPending.filter(req =>
        !afterConfirmed.some(p => p.id === req.id)
    );

    for (const req of rejected) {
        await sendPushNotification(req.id, {
            title: "Solicitud Rechazada",
            body: "El conductor no ha aceptado tu solicitud.",
            data: {
                type: "request_rejected",
                rideId: rideId
            }
        });
    }

    // 3. Ride Started -> Notify Passengers
    if (before.status !== 'in_progress' && after.status === 'in_progress') {
        const passengers = after.passengers?.filter(p => p.status === 'confirmed') || [];
        for (const p of passengers) {
            await sendPushNotification(p.id, {
                title: "Viaje Iniciado",
                body: "El conductor ha iniciado el viaje. ¡Buen viaje!",
                data: {
                    type: "ride_started",
                    rideId: rideId
                }
            });
        }
    }

    // 4. Ride Completed -> Notify Passengers (Rate Reminder)
    if (before.status !== 'completed' && after.status === 'completed') {
        const passengers = after.passengers?.filter(p => p.status === 'confirmed') || [];
        for (const p of passengers) {
            await sendPushNotification(p.id, {
                title: "Viaje Completado",
                body: "Has llegado a tu destino. Por favor valora al conductor.",
                data: {
                    type: "ride_completed",
                    rideId: rideId
                }
            });
        }
    }
});

/**
 * Trigger: New Chat Message
 */
exports.onChatMessageCreated = onDocumentCreated({
    document: "chats/{chatId}/messages/{messageId}",
    region: REGION
}, async (event) => {
    const message = event.data.data();
    const chatId = event.params.chatId;

    if (!message) return;

    // Get chat metadata to find participants
    const chatDoc = await db.collection('chats').doc(chatId).get();
    if (!chatDoc.exists) return;

    const chatData = chatDoc.data();
    const participants = chatData.participants || [];

    // Identify recipient (the one who is NOT the sender)
    const recipientId = participants.find(uid => uid !== message.senderId);

    if (recipientId) {
        // Get sender name
        const senderDoc = await db.collection('users').doc(message.senderId).get();
        const senderName = senderDoc.data()?.displayName || "Usuario";

        await sendPushNotification(recipientId, {
            title: `Nuevo mensaje de ${senderName}`,
            body: message.text || "Te ha enviado una imagen",
            data: {
                type: "chat_message",
                chatId: chatId,
                rideId: chatData.rideId || ""
            }
        });
    }
});