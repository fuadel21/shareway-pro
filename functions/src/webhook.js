const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const db = admin.firestore();
const REGION = "us-central1";

exports.stripeWebhook = onRequest({ region: REGION }, async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
        console.error("El secreto del webhook no está configurado.");
        return res.status(500).send("Configuración incompleta.");
    }

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const metadata = paymentIntent.metadata;
        const userId = metadata.userId || metadata.firebaseUID || metadata.firebase_uid;

        // Amount in cents -> convert to main currency (EUR)
        const amount = paymentIntent.amount / 100;

        if (userId) {
            console.log(`Procesando pago exitoso de ${amount}€ para usuario ${userId}`);

            try {
                const walletRef = db.collection('wallets').doc(userId);
                const transactionRef = walletRef.collection('transactions').doc(paymentIntent.id);

                await db.runTransaction(async (transaction) => {
                    const transactionDoc = await transaction.get(transactionRef);
                    if (transactionDoc.exists) {
                        console.log(`Transacción ${paymentIntent.id} ya procesada. Ignorando.`);
                        return;
                    }

                    const walletDoc = await transaction.get(walletRef);
                    if (!walletDoc.exists) {
                        // Si no existe wallet, crearla
                        transaction.set(walletRef, {
                            balance: amount,
                            heldBalance: 0,
                            createdAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                    } else {
                        transaction.update(walletRef, {
                            balance: admin.firestore.FieldValue.increment(amount)
                        });
                    }

                    // Registrar transacción usando el ID del PaymentIntent
                    transaction.set(transactionRef, {
                        type: 'deposit',
                        amount: amount,
                        stripePaymentIntentId: paymentIntent.id,
                        status: 'completed',
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        description: 'Recarga de saldo via Stripe (Webhook)'
                    });
                });

                console.log(`Saldo actualizado correctamente para ${userId}`);
            } catch (error) {
                console.error(`Error actualizando wallet para ${userId}:`, error);
                return res.status(500).send("Error actualizando wallet");
            }
        } else {
            console.warn("PaymentIntent exitoso sin userId en metadata:", paymentIntent.id);
        }
    }

    res.status(200).send({ received: true });
});
