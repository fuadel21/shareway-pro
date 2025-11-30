const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentUpdated, onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

const db = admin.firestore();
const REGION = "us-central1";

/**
 * Se dispara cuando se crea un nuevo usuario.
 * Crea automáticamente la wallet para el usuario.
 */
exports.onUserCreated = onDocumentCreated({
    document: "users/{userId}",
    region: REGION
}, async (event) => {
    const userId = event.params.userId;
    console.log(`onUserCreated: Nuevo usuario detectado: ${userId}`);

    const walletRef = db.collection('wallets').doc(userId);

    try {
        // Verificar si ya existe (por si acaso)
        const walletDoc = await walletRef.get();
        if (walletDoc.exists) {
            console.log(`onUserCreated: Wallet ya existe para ${userId}`);
            return null;
        }

        // Crear wallet inicial
        await walletRef.set({
            balance: 0,
            heldBalance: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`onUserCreated: Wallet creada exitosamente para ${userId}`);
        return null;
    } catch (error) {
        console.error(`onUserCreated: Error creando wallet para ${userId}:`, error);
        return null;
    }
});

/**
 * Se dispara cuando se actualiza un documento de usuario.
 * Sincroniza el rol de la base de datos con los Custom Claims de Firebase Auth.
 */
exports.syncUserRole = onDocumentUpdated({ document: "users/{userId}", region: REGION }, async (event) => {
    console.log(`Sync User Role: Detectado cambio en el documento del usuario: ${event.params.userId}`);

    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();

    if (!beforeData || !afterData) {
        console.log("Sync User Role: Faltan datos (before o after), probablemente es una creación de documento. Abortando.");
        return null;
    }

    if (beforeData.role === afterData.role) {
        console.log(`Sync User Role: El rol no ha cambiado (${afterData.role}). No se requieren acciones.`);
        return null;
    }

    console.log(`Sync User Role: ¡Cambio de rol detectado! Antes: ${beforeData.role}, Ahora: ${afterData.role}`);

    const userId = event.params.userId;
    const newRole = afterData.role;

    try {
        await admin.auth().setCustomUserClaims(userId, { role: newRole });
        console.log(`Sync User Role: Custom Claim 'role: ${newRole}' establecido con éxito para el usuario ${userId}.`);
        return null;
    } catch (error) {
        console.error(`Sync User Role: Error al establecer Custom Claims para el usuario ${userId}:`, error);
        return null;
    }
});

exports.updateUserProfile = onCall({ region: REGION, cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
    }

    const uid = request.auth.uid;
    const data = request.data;

    // Validar datos básicos (opcional, pero recomendado)
    if (!data.displayName) {
        throw new HttpsError('invalid-argument', 'El nombre es obligatorio.');
    }

    // FIX Missing #3: Validate gender to prevent abuse
    if (data.gender && !['male', 'female', 'other', 'prefer_not_to_say'].includes(data.gender)) {
        throw new HttpsError('invalid-argument', 'Género no válido. Valores permitidos: male, female, other, prefer_not_to_say');
    }

    try {
        // Filtrar solo los campos permitidos para actualizar
        const allowedFields = ['displayName', 'phoneNumber', 'bio', 'gender', 'preferences', 'vehicle', 'photoURL'];
        const updateData = {};

        allowedFields.forEach(field => {
            if (data[field] !== undefined) {
                updateData[field] = data[field];
            }
        });

        // Actualizar en Firestore
        await db.collection('users').doc(uid).update(updateData);

        return { success: true, message: 'Perfil actualizado correctamente.' };
    } catch (error) {
        console.error("Error actualizando perfil:", error);
        throw new HttpsError('internal', 'Error al actualizar el perfil.');
    }
});
