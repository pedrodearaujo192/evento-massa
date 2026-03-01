import { NextResponse } from 'next/server';
import MercadoPagoConfig, { Preference } from 'mercadopago';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // Busca o token tentando as duas variações comuns de nome de variável
    const token = (process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim();

    if (!token || token === 'SEU_TOKEN_AQUI' || token === '') {
      console.error('[Mercado Pago] Token não encontrado no ambiente.');
      return NextResponse.json(
        { error: 'Configuração pendente: Adicione o MERCADO_PAGO_ACCESS_TOKEN no painel do App Hosting.' },
        { status: 500 }
      );
    }

    const { orderId, title, quantity, unitPrice, buyerEmail, buyerName } = await req.json();

    const client = new MercadoPagoConfig({ 
      accessToken: token,
      options: { timeout: 15000 }
    });
    
    const preference = new Preference(client);

    // Detecção da URL base para os retornos
    const origin = new URL(req.url).origin;
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || origin).replace(/\/$/, '');

    // IMPORTANTE: O Mercado Pago exige Nome (name) e Sobrenome (surname) separados.
    const nameParts = (buyerName || '').trim().split(/\s+/);
    const firstName = nameParts[0] || 'Participante';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Visitante';

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
        name: firstName,
        surname: lastName,
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
      // Expira a preferência em 1 hora para evitar lixo
      expiration_date_to: new Date(Date.now() + 3600000).toISOString(),
    };

    const result = await preference.create({ body });

    return NextResponse.json({
      id: result.id,
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point,
    });
  } catch (err: any) {
    console.error('[Mercado Pago] Erro ao criar preferência:', err);
    
    const apiError = err.cause?.[0];
    const mpErrorMessage = apiError?.description || err.message || 'Erro ao processar checkout.';
    
    return NextResponse.json({ 
      error: `Mercado Pago: ${mpErrorMessage}`,
      detail: apiError?.code || 'unknown_error'
    }, { status: 500 });
  }
}
