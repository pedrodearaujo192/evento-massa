
import { NextResponse } from 'next/server';
import MercadoPagoConfig, { Preference } from 'mercadopago';

export async function POST(req: Request) {
  try {
    const token = (process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN || '').trim();

    if (!token || token === 'SEU_TOKEN_DE_TESTE_AQUI') {
      return NextResponse.json(
        { error: 'Token do Mercado Pago não configurado no .env' },
        { status: 500 }
      );
    }

    const { orderId, title, quantity, unitPrice, buyerEmail, buyerName } = await req.json();

    const client = new MercadoPagoConfig({ 
      accessToken: token,
      options: { timeout: 15000 }
    });
    
    const preference = new Preference(client);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9002';

    const body = {
      external_reference: String(orderId),
      items: [
        {
          id: String(orderId),
          title: String(title),
          quantity: Number(quantity),
          unit_price: Number(unitPrice),
          currency_id: 'BRL',
        },
      ],
      payer: {
        email: buyerEmail,
        name: buyerName,
      },
      back_urls: {
        success: `${siteUrl}/pagamento/sucesso?orderId=${orderId}`,
        pending: `${siteUrl}/pagamento/sucesso?orderId=${orderId}`,
        failure: `${siteUrl}/pagamento/erro?orderId=${orderId}`,
      },
      auto_return: 'approved' as const,
      payment_methods: {
        excluded_payment_types: [],
        installments: 12,
      },
    };

    const result = await preference.create({ body });

    return NextResponse.json({
      id: result.id,
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point,
    });
  } catch (err: any) {
    console.error('Erro ao criar preferência MP:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao processar checkout.' }, 
      { status: 500 }
    );
  }
}
