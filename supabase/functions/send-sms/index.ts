/**
 * Supabase Edge Function — send-sms
 * Sends SMS alerts via Twilio for AgroSync drift warnings.
 *
 * Required secrets (supabase secrets set):
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Destinatario { telefono: string; nombre: string; }
interface SmsRequest { destinatarios: Destinatario[]; mensaje: string; }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken  = Deno.env.get("TWILIO_AUTH_TOKEN");
    const fromNumber = Deno.env.get("TWILIO_FROM_NUMBER");

    if (!accountSid || !authToken || !fromNumber) {
      return new Response(
        JSON.stringify({ error: "Twilio no configurado. Agrega TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_FROM_NUMBER como secrets." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { destinatarios, mensaje }: SmsRequest = await req.json();
    const conTelefono = destinatarios.filter(d => d.telefono?.startsWith("+"));

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const basicAuth = btoa(`${accountSid}:${authToken}`);

    const results = await Promise.allSettled(
      conTelefono.map(async (d) => {
        const body = new URLSearchParams({ From: fromNumber, To: d.telefono, Body: mensaje });
        const res = await fetch(twilioUrl, {
          method: "POST",
          headers: { Authorization: `Basic ${basicAuth}`, "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        });
        if (!res.ok) {
          const err = await res.json() as { message?: string };
          throw new Error(err.message ?? `Twilio HTTP ${res.status}`);
        }
        return d.nombre;
      }),
    );

    return new Response(
      JSON.stringify({
        sent: results.filter(r => r.status === "fulfilled").length,
        sinTelefono: destinatarios.length - conTelefono.length,
        failed: results.filter(r => r.status === "rejected").map(r => (r as PromiseRejectedResult).reason?.message),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
