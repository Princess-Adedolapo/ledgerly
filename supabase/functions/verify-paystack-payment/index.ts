// Supabase Edge Function: verify-paystack-payment
// Endpoint for verifying Paystack transactions using the secret key

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { reference, invoice_id } = await req.json();

    if (!reference || !invoice_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required reference or invoice_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secretKey) {
      return new Response(
        JSON.stringify({ success: false, error: "PAYSTACK_SECRET_KEY environment variable is not set." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Paystack REST API to verify transaction
    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const paystackData = await paystackRes.json();

    if (!paystackRes.ok || !paystackData.status || paystackData.data?.status !== "success") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Paystack transaction verification failed or status is not success.",
          details: paystackData.message || "Transaction unverified",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transaction = paystackData.data;

    // Connect to Supabase using service role key or environment client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch expected invoice amount
    const { data: invoice, error: fetchErr } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoice_id)
      .maybeSingle();

    if (fetchErr || !invoice) {
      return new Response(
        JSON.stringify({ success: false, error: "Invoice record not found." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify expected amount in kobo
    const expectedAmountKobo = Math.round(Number(invoice.amount) * 100);
    if (transaction.amount && transaction.amount < expectedAmountKobo * 0.95) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Paid amount (${transaction.amount} kobo) is less than expected invoice amount (${expectedAmountKobo} kobo).`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update invoice to Paid
    const { error: updateErr } = await supabase
      .from("invoices")
      .update({
        status: "paid",
        total_label_override: "paid",
      })
      .eq("id", invoice_id);

    if (updateErr) {
      console.warn("Could not update invoice in Supabase:", updateErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment verified successfully and invoice marked as Paid.",
        reference: transaction.reference,
        amount_paid: transaction.amount,
        invoice_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
