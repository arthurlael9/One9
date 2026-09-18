// api/check-payment.js
// Function serverless da Vercel. Consulta no Mercado Pago se um pagamento
// (criado por /api/create-pix-payment) já foi aprovado. O site chama essa
// rota a cada poucos segundos enquanto a pessoa está na tela do Pix.
//
// Usa a mesma variável de ambiente MP_ACCESS_TOKEN configurada na Vercel.

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    res.status(500).json({ error: 'MP_ACCESS_TOKEN não configurado no servidor' });
    return;
  }

  const paymentId = req.query.id;
  if (!paymentId) {
    res.status(400).json({ error: 'Parâmetro "id" é obrigatório' });
    return;
  }

  try {
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments/' + encodeURIComponent(paymentId), {
      headers: { 'Authorization': 'Bearer ' + accessToken }
    });

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('Mercado Pago recusou a consulta do pagamento:', data);
      res.status(mpResponse.status).json({ error: 'Falha ao consultar pagamento', details: data });
      return;
    }

    // status possíveis do Mercado Pago: pending, approved, authorized,
    // in_process, in_mediation, rejected, cancelled, refunded, charged_back
    res.status(200).json({ id: data.id, status: data.status });
  } catch (err) {
    console.error('Erro inesperado em check-payment:', err);
    res.status(500).json({ error: 'Erro interno ao consultar pagamento' });
  }
}
