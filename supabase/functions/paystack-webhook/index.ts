// Supabase Edge Function: paystack-webhook
// Receives charge.success webhooks directly from Paystack with HMAC SHA512 signature validation

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 454 });
  }

  try {
    const signature = req.headers.get("x-paystack-signature");
    const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");

    const bodyText = await req.text();

    if (secretKey && signature) {
      // Verify HMAC SHA512 signature using Web Crypto API
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secretKey);
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-512" },
        false,
        ["verify", "sign"]
      );

      const signatureBytes = new Uint8Array(
        signature.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
      );
      const bodyBytes = encoder.encode(bodyText);

      const isValid = await crypto.subtle.verify("HMAC", cryptoKey, signatureBytes, bodyBytes);
      if (!isValid) {
        return new Response(JSON.stringify({ error: "Invalid Paystack Webhook Signature" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    const payload = JSON.parse(bodyText);
    const event = payload.event;
    const data = payload.data;

    if (event === "charge.success" && data) {
      const reference = data.reference;
      const metadata = data.metadata || {};
      const invoiceId = metadata.invoice_id || reference?.split("_")?.[1];

      if (invoiceId) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
        const supabase = createClient(supabaseUrl, supabaseKey);

        await supabase
          .from("invoices")
          .update({
            status: "paid",
            total_label_override: "paid",
          })
          .eq("id", invoiceId);
      }
    }

    return new Response(JSON.stringify({ status: "success", message: "Webhook processed" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Webhook error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
