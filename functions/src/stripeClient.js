const stripe = require('stripe');

let stripeInstance;

/**
 * Inicializa y devuelve de forma segura una instancia del cliente de Stripe.
 * Utiliza una única instancia (singleton) para evitar recrearla en cada invocación.
 * @returns {stripe}
 */
function getStripeClient() {
    if (!stripeInstance) {
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) {
            // Este error solo ocurrirá en tiempo de ejecución si la variable no está configurada en producción.
            // No detendrá el despliegue.
            throw new Error("FATAL: La variable de entorno STRIPE_SECRET_KEY no está configurada en el entorno de Firebase.");
        }
        stripeInstance = stripe(stripeKey);
    }
    return stripeInstance;
}

module.exports = { getStripeClient };
