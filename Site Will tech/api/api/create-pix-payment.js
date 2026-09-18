// api/create-pix-payment.js
// Function serverless da Vercel. Cria uma cobrança Pix DE VERDADE no Mercado
// Pago. Roda no servidor — é o único lugar que enxerga o Access Token,
// que nunca deve aparecer no código do site (index.html) nem no navegador.
//
// Configuração necessária na Vercel (Project Settings > Environment Variables):
//   MP_ACCESS_TOKEN = seu Access Token de produção do Mercado Pago
//   (Mercado Pago > Seu negócio > Configurações > Credenciais > Credenciais de produção)
//
// Depois de configurar a variável, é preciso fazer um novo deploy (redeploy)
// para ela passar a valer.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    res.status(500).json({ error: 'MP_ACCESS_TOKEN não configurado no servidor' });
    return;
  }

  try {
    const { amount, description, email } = req.body || {};

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      res.status(400).json({ error: 'Valor (amount) inválido' });
      return;
    }
    if (!email || typeof email !== 'string' || email.indexOf('@') === -1) {
      res.status(400).json({ error: 'E-mail do pagador inválido' });
      return;
    }

    const idempotencyKey =
      (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'idem-' + Date.now() + '-' + Math.random().toString(36).slice(2);

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + accessToken,
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({
        transaction_amount: numericAmount,
        description: description || 'Certificado iOS - WillTech',
        payment_method_id: 'pix',
        payer: { email: email }
      })
    });

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('Mercado Pago recusou a criação do pagamento:', data);
      res.status(mpResponse.status).json({ error: 'Falha ao criar pagamento no Mercado Pago', details: data });
      return;
    }

    const tx = data.point_of_interaction && data.point_of_interaction.transaction_data;

    res.status(200).json({
      id: data.id,
      status: data.status,
      qr_code: tx ? tx.qr_code : null,               // Pix Copia e Cola
      qr_code_base64: tx ? tx.qr_code_base64 : null   // imagem do QR Code em base64
    });
  } catch (err) {
    console.error('Erro inesperado em create-pix-payment:', err);
    res.status(500).json({ error: 'Erro interno ao criar pagamento' });
  }
}
