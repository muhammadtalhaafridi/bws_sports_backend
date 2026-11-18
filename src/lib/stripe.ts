import Stripe from "stripe";
import { env } from "../config/env";

/** Null when STRIPE_SECRET_KEY is not set, so card payment is simply unavailable. */
export const stripe = env.stripeSecretKey ? new Stripe(env.stripeSecretKey) : null;
