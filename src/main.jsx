import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { ThemeProvider } from "./contexts/ThemeContext";

// ¡CORREGIDO! Importa la clave pública de Stripe desde el archivo de configuración con el nombre correcto.
import { STRIPE_PUBLISHABLE_KEY } from './lib/firebaseConfig';

// Carga Stripe con la clave importada y estandarizada.
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

const container = document.getElementById("root");
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <ThemeProvider>
      <Elements stripe={stripePromise}>
        <App />
      </Elements>
    </ThemeProvider>
  </React.StrictMode>
);

