
import { NextResponse } from 'next/server';
import MercadoPagoConfig, { Preference } from 'mercadopago';

export async function POST(req: Request) {
  try {
    // Busca o token em ambas as variações comuns de nome no .env
    const token = (process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN || '').trim();

    if (!token || token === 'SEU_TOKEN_AQUI') {
      return NextResponse.json(
        { error: 'Token do Mercado Pago não configurado no arquivo .env' },
        { status: 500 }
      );
    }

    const { orderId, title, quantity, unitPrice, buyerEmail, buyerName } = await req.json();

    const client = new MercadoPagoConfig({ 
      accessToken: token,
      options: { timeout: 15000 }
    });
    
    const preference = new Preference(client);

    // DETECÇÃO DINÂMICA DA URL: Tenta pegar do .env ou reconstrói a partir do request
    // Em ambientes de proxy (Cloud Workstations), o .env é mais confiável para o MP
    const origin = new URL(req.url).origin;
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || origin).replace(/\/$/, '');

    console.log(`[Mercado Pago] Gerando preferência: Pedido ${orderId} | Site URL: ${siteUrl}`);

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
        email: buyerEmail.trim(),
        name: buyerName.trim(),
      },
      // O Mercado Pago exige URLs ABSOLUTAS e ACESSÍVEIS externamente
      back_urls: {
        success: `${siteUrl}/pagamento/sucesso?orderId=${orderId}`,
        pending: `${siteUrl}/pagamento/sucesso?orderId=${orderId}`,
        failure: `${siteUrl}/pagamento/erro?orderId=${orderId}`,
      },
      // Se auto_return for 'approved', back_urls.success DEVE ser absoluto e válido
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
    console.error('[Mercado Pago] Erro ao criar preferência:', err);
    
    // Captura mensagens específicas da API do Mercado Pago para ajudar no debug
    const mpErrorMessage = err.cause?.[0]?.description || err.message || 'Erro ao processar checkout.';
    
    return NextResponse.json(
      { error: `Erro Mercado Pago: ${mpErrorMessage}` }, 
      { status: 500 }
    );
  }
}
