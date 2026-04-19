/**
 * SERVICE FINANCIER (Mock Stripe Integration)
 */

export const processPayment = async (amount, currency = 'EUR', description = 'Location Véhicule') => {
  console.log(`%c[STRIPE-MOCK] %cProcessing payment of ${amount}${currency} for ${description}...`, "color: #6366f1; font-weight: bold", "color: inherit");
  
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const success = Math.random() > 0.05; // 95% success rate
  
  if (success) {
    const transactionId = 'pi_' + Math.random().toString(36).substr(2, 9);
    console.log(`%c[STRIPE-MOCK] %cSuccess! Transaction ID: ${transactionId}`, "color: #10b981; font-weight: bold", "color: inherit");
    return { success: true, transactionId, amount, status: 'succeeded' };
  } else {
    console.error("[STRIPE-MOCK] Payment failed: Insufficient funds.");
    return { success: false, error: 'Insufficient funds' };
  }
};

export const preAuthorizeDeposit = async (amount, clientName) => {
  console.log(`%c[STRIPE-MOCK] %cPre-authorizing caution of ${amount}€ for ${clientName}...`, "color: #6366f1; font-weight: bold", "color: inherit");
  await new Promise(resolve => setTimeout(resolve, 1200));
  
  const id = 'auth_' + Math.random().toString(36).substr(2, 9);
  return { success: true, id, status: 'authorized' };
};

export const releaseDeposit = async (authId) => {
  console.log(`%c[STRIPE-MOCK] %cReleasing caution ${authId}...`, "color: #10b981; font-weight: bold", "color: inherit");
  await new Promise(resolve => setTimeout(resolve, 800));
  return { success: true };
};

export const captureDeposit = async (authId, amount) => {
  console.log(`%c[STRIPE-MOCK] %cCapturing ${amount}€ from caution ${authId} due to damages.`, "color: #f43f5e; font-weight: bold", "color: inherit");
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { success: true, capturedAmount: amount };
};
